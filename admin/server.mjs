import http from 'node:http';
import { execFile } from 'node:child_process';
import { readFile, readdir, writeFile, rename, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import 'dotenv/config';
import COS from 'cos-nodejs-sdk-v5';
import matter from 'gray-matter';

const root = resolve(import.meta.dirname, '..');
const host = process.env.WULAB_ADMIN_HOST || '127.0.0.1';
const port = Number(process.env.WULAB_ADMIN_PORT || 4323);
// A news upload contains a list thumbnail, a detail image, and an on-demand
// high-resolution image. Base64 adds roughly 33%, so leave enough headroom for
// the three already-compressed WebP variants in one local request.
const maxBody = 28 * 1024 * 1024;
const contentDirs = {
  people: join(root, 'src/content/people'),
  news: join(root, 'src/content/news'),
  research: join(root, 'src/content/research'),
};
const publicationsFile = join(root, 'src/content/publications/publications.json');
const joinFile = join(root, 'src/join.json');
const archiveDir = join(root, 'admin/archive');
const adminHtml = join(root, 'admin/index.html');
const brandIcon = join(root, 'public/favicon.svg');
const execFileAsync = promisify(execFile);
const autoPublishEnabled = process.env.WULAB_AUTO_PUBLISH !== 'false';
const publishDelayMs = Number(process.env.WULAB_PUBLISH_DELAY_MS || 30_000);
const publishablePaths = ['src/content/', 'src/join.json', 'public/images/'];
const cosBucket = process.env.TENCENT_COS_BUCKET || 'wulab-images-1324699520';
const cosRegion = process.env.TENCENT_COS_REGION || 'ap-beijing';
const cosSecretId = process.env.TENCENT_COS_SECRET_ID;
const cosSecretKey = process.env.TENCENT_COS_SECRET_KEY;
const cosClient = cosSecretId && cosSecretKey ? new COS({ SecretId: cosSecretId, SecretKey: cosSecretKey }) : null;
const publishState = {
  enabled: autoPublishEnabled,
  status: 'idle',
  message: autoPublishEnabled ? '等待内容修改' : '自动发布已关闭',
  scheduledAt: null,
  lastPublishedAt: null,
  lastCommit: null,
};
let publishTimer;
let publishRunning = false;
let publishQueued = false;

const json = (res, status, value) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
};

async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBody) throw new Error('优化后的图片数据仍然过大，请选择稍小的原图');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function safeId(value) {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(value || '')) throw new Error('ID 只能使用小写字母、数字和连字符');
  return value;
}

function slugify(value, fallback) {
  const slug = String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
  return slug || fallback;
}

const imageContentTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function uploadToCos(key, buffer) {
  if (!cosClient) return Promise.reject(new Error('COS 自动同步尚未配置'));
  return new Promise((resolveUpload, rejectUpload) => {
    cosClient.putObject({
      Bucket: cosBucket,
      Region: cosRegion,
      Key: key,
      Body: buffer,
      ContentType: imageContentTypes[extname(key).toLowerCase()] || 'application/octet-stream',
      CacheControl: 'public, max-age=31536000, immutable',
    }, (error, data) => error ? rejectUpload(error) : resolveUpload(data));
  });
}

function cosUploadError(error) {
  const code = error?.code || error?.error?.Code;
  return code ? `COS 自动同步失败（${code}）` : 'COS 自动同步失败';
}

async function uniqueMarkdownId(type, data) {
  const fallback = `${type}-${new Date().toISOString().slice(0, 10)}`;
  const seed = type === 'people' ? data.nameEn : type === 'research' ? data.titleEn : `${data.date || ''}-${data.title || ''}`;
  const base = slugify(seed, fallback);
  const existing = new Set((await readdir(contentDirs[type])).filter((name) => name.endsWith('.md')).map((name) => name.slice(0, -3)));
  let id = base;
  let suffix = 2;
  while (existing.has(id)) id = `${base}-${suffix++}`;
  return id;
}

async function atomicWrite(file, value) {
  const temp = `${file}.tmp`;
  await writeFile(temp, value, { mode: 0o600 });
  await rename(temp, file);
}

async function listMarkdown(type) {
  const directory = contentDirs[type];
  const files = (await readdir(directory)).filter((name) => name.endsWith('.md')).sort();
  return Promise.all(files.map(async (file) => {
    const parsed = matter(await readFile(join(directory, file), 'utf8'));
    return { id: file.slice(0, -3), data: parsed.data, body: parsed.content.trim() };
  }));
}

async function command(file, args) {
  return execFileAsync(file, args, {
    cwd: root,
    timeout: 10 * 60 * 1000,
    maxBuffer: 8 * 1024 * 1024,
  });
}

function statusPath(line) {
  const value = line.slice(3).trim();
  return value.includes(' -> ') ? value.split(' -> ').at(-1) : value;
}

function isPublishablePath(path) {
  return publishablePaths.some((allowed) => allowed.endsWith('/') ? path.startsWith(allowed) : path === allowed);
}

function publishError(error) {
  const output = [error?.stderr, error?.stdout, error?.message].filter(Boolean).join('\n').trim();
  return output.split('\n').filter(Boolean).slice(-3).join(' · ').slice(0, 500) || '自动发布失败';
}

function schedulePublish(reason = '内容已修改', delay = publishDelayMs) {
  if (!autoPublishEnabled) return;
  if (publishRunning) {
    publishQueued = true;
    publishState.message = '当前发布完成后继续处理新修改';
    return;
  }
  clearTimeout(publishTimer);
  publishState.status = 'scheduled';
  publishState.message = `${reason}，等待自动检查与发布`;
  publishState.scheduledAt = new Date(Date.now() + delay).toISOString();
  publishTimer = setTimeout(() => void runPublish(), delay);
}

async function runPublish() {
  if (!autoPublishEnabled || publishRunning) return;
  clearTimeout(publishTimer);
  publishTimer = undefined;
  publishRunning = true;
  publishState.status = 'checking';
  publishState.message = '正在检查仓库与构建网站';
  publishState.scheduledAt = null;
  try {
    const branch = (await command('git', ['branch', '--show-current'])).stdout.trim();
    if (branch !== 'main') throw new Error(`自动发布仅允许 main 分支，当前为 ${branch || '未知分支'}`);

    await command('git', ['fetch', 'origin', 'main']);
    const counts = (await command('git', ['rev-list', '--left-right', '--count', 'origin/main...HEAD'])).stdout.trim().split(/\s+/).map(Number);
    const [behind = 0] = counts;
    if (behind > 0) throw new Error('GitHub 上存在服务器尚未同步的新提交，请维护者先检查并同步');

    const lines = (await command('git', ['status', '--porcelain=v1', '--untracked-files=all'])).stdout.split('\n').filter(Boolean);
    const unexpected = lines.map(statusPath).filter((path) => !isPublishablePath(path));
    if (unexpected.length) throw new Error(`检测到程序或运维文件改动，已停止自动发布：${unexpected.slice(0, 4).join('、')}`);
    if (!lines.length) {
      publishState.status = 'idle';
      publishState.message = '没有需要发布的新内容';
      return;
    }

    await command('npm', ['run', 'release:check']);
    await command('git', ['add', '--all', '--', ...publishablePaths]);
    const staged = (await command('git', ['diff', '--cached', '--name-only'])).stdout.trim();
    if (!staged) {
      publishState.status = 'idle';
      publishState.message = '没有需要提交的新内容';
      return;
    }

    const now = new Date();
    const stamp = now.toISOString().replace('T', ' ').slice(0, 16);
    await command('git', ['commit', '-m', `Update website content (${stamp} UTC)`]);
    publishState.status = 'publishing';
    publishState.message = '构建通过，正在推送 GitHub';
    await command('git', ['push', 'origin', 'main']);
    publishState.lastCommit = (await command('git', ['rev-parse', '--short', 'HEAD'])).stdout.trim();
    publishState.lastPublishedAt = new Date().toISOString();
    publishState.status = 'success';
    publishState.message = '已推送 GitHub，Pages 正在自动更新';
  } catch (error) {
    console.error('自动发布失败：', error);
    publishState.status = 'error';
    publishState.message = publishError(error);
  } finally {
    publishRunning = false;
    if (publishQueued) {
      publishQueued = false;
      schedulePublish('发布期间检测到新修改', 5_000);
    }
  }
}

const peopleOrderBase = { PI: 100, ResearchAssistant: 200, Postdoc: 300, PhD: 400, Master: 500, Undergraduate: 600, Alumni: 700 };

async function nextPeopleOrder(role, excludeId) {
  const people = await listMarkdown('people');
  const base = peopleOrderBase[role] || 800;
  const used = people
    .filter((person) => person.id !== excludeId && person.data.role === role)
    .map((person) => Number(person.data.order))
    .filter((order) => Number.isFinite(order) && order >= base && order < base + 100);
  return used.length ? Math.max(...used) + 1 : base + people.filter((person) => person.id !== excludeId && person.data.role === role).length + 1;
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/publish-status') {
    return json(res, 200, publishState);
  }

  if (req.method === 'POST' && url.pathname === '/api/publish') {
    if (!autoPublishEnabled) return json(res, 409, { error: '服务器已关闭自动发布' });
    schedulePublish('已请求立即发布', 0);
    return json(res, 202, publishState);
  }

  if (req.method === 'GET' && url.pathname === '/api/content') {
    const type = url.searchParams.get('type');
    if (type === 'publications') return json(res, 200, JSON.parse(await readFile(publicationsFile, 'utf8')));
    if (type === 'join') return json(res, 200, JSON.parse(await readFile(joinFile, 'utf8')));
    if (!(type in contentDirs)) return json(res, 400, { error: '未知内容类型' });
    return json(res, 200, await listMarkdown(type));
  }

  if (req.method === 'POST' && url.pathname === '/api/content') {
    const payload = await body(req);
    if (payload.type === 'join') {
      await atomicWrite(joinFile, `${JSON.stringify(payload.data, null, 2)}\n`);
      schedulePublish('Join 页面已保存');
      return json(res, 200, { ok: true, data: payload.data });
    }
    if (payload.type === 'publications') {
      if (!Array.isArray(payload.items)) throw new Error('论文数据格式错误');
      const ids = new Set();
      for (const item of payload.items) {
        if (!item.id) {
          const base = slugify(`${item.title || ''}-${item.year || ''}`, `publication-${new Date().toISOString().slice(0, 10)}`);
          let id = base;
          let suffix = 2;
          while (ids.has(id)) id = `${base}-${suffix++}`;
          item.id = id;
        }
        safeId(item.id);
        if (ids.has(item.id)) throw new Error(`论文 ID 重复：${item.id}`);
        ids.add(item.id);
        if (item.display !== false && (!item.title || !item.journal || !Number(item.year) || !item.scope)) {
          throw new Error(`论文“${item.title || item.id}”要在官网展示，必须填写标题、期刊、年份和成果归属`);
        }
      }
      await atomicWrite(publicationsFile, `${JSON.stringify(payload.items, null, 2)}\n`);
      schedulePublish('论文内容已保存');
      return json(res, 200, { ok: true, items: payload.items });
    }
    if (!(payload.type in contentDirs)) throw new Error('未知内容类型');
    const id = payload.id ? safeId(payload.id) : await uniqueMarkdownId(payload.type, payload.data || {});
    // Never write JSON nulls into Astro frontmatter. Optional fields should be
    // omitted; keeping them as null violates the collection's typed schema.
    const data = Object.fromEntries(Object.entries(payload.data || {}).filter(([, value]) => value !== null && value !== undefined));
    const clearedIds = [];
    if (payload.type === 'people') {
      if (!data.name || !data.role) throw new Error('成员必须填写姓名和身份');
      let previousRole;
      if (payload.id) {
        try { previousRole = matter(await readFile(join(contentDirs.people, `${id}.md`), 'utf8')).data.role; } catch {}
      }
      if (!Number.isFinite(data.order) || (previousRole && previousRole !== data.role)) data.order = await nextPeopleOrder(data.role, payload.id);
    }
    if (payload.type === 'news' && (!data.title || !data.date || !data.summary)) {
      throw new Error('新闻必须填写标题、日期和摘要；未保存本次无效修改');
    }
    if (payload.type === 'research' && (!data.title || !data.description || !Number.isFinite(data.order))) {
      throw new Error('研究方向必须填写中文标题、简介和显示顺序');
    }
    if (payload.type === 'research' && data.homeSlot) {
      const researchItems = await listMarkdown('research');
      for (const item of researchItems.filter((item) => item.id !== id && item.data.homeSlot === data.homeSlot)) {
        delete item.data.homeSlot;
        const previous = matter.stringify(`${String(item.body || '').trim()}\n`, item.data);
        await atomicWrite(join(contentDirs.research, `${item.id}.md`), previous);
        clearedIds.push(item.id);
      }
    }
    if (payload.type === 'news' && typeof data.date === 'string') data.date = new Date(`${data.date}T00:00:00Z`);
    const output = matter.stringify(`${String(payload.body || '').trim()}\n`, data);
    await atomicWrite(join(contentDirs[payload.type], `${id}.md`), output);
    schedulePublish('网站内容已保存');
    return json(res, 200, { ok: true, id, data, clearedIds });
  }

  if (req.method === 'POST' && url.pathname === '/api/delete') {
    const payload = await body(req);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await mkdir(archiveDir, { recursive: true });
    if (payload.type === 'publications') {
      const items = JSON.parse(await readFile(publicationsFile, 'utf8'));
      const next = items.filter((item) => item.id !== payload.id);
      if (next.length === items.length) throw new Error('未找到要删除的论文');
      await atomicWrite(join(archiveDir, `publications-${stamp}.json`), `${JSON.stringify(items, null, 2)}\n`);
      await atomicWrite(publicationsFile, `${JSON.stringify(next, null, 2)}\n`);
      schedulePublish('论文已删除');
      return json(res, 200, { ok: true });
    }
    if (!(payload.type in contentDirs)) throw new Error('该栏目不支持删除');
    const id = safeId(payload.id);
    await rename(join(contentDirs[payload.type], `${id}.md`), join(archiveDir, `${payload.type}-${id}-${stamp}.md`));
    schedulePublish('内容已删除');
    return json(res, 200, { ok: true });
  }

  if (req.method === 'POST' && url.pathname === '/api/reorder') {
    const payload = await body(req);
    if (payload.type !== 'people' || !['up', 'down'].includes(payload.direction)) throw new Error('排序请求无效');
    const id = safeId(payload.id);
    const people = (await listMarkdown('people')).sort((a, b) => Number(a.data.order) - Number(b.data.order));
    const current = people.find((person) => person.id === id);
    if (!current) throw new Error('未找到要排序的成员');
    const group = people.filter((person) => person.data.role === current.data.role);
    const index = group.findIndex((person) => person.id === id);
    const target = group[index + (payload.direction === 'up' ? -1 : 1)];
    if (!target) return json(res, 200, { ok: true });
    const currentOrder = Number(current.data.order);
    const targetOrder = Number(target.data.order);
    current.data.order = targetOrder;
    target.data.order = currentOrder;
    for (const person of [current, target]) {
      const output = matter.stringify(`${String(person.body || '').trim()}\n`, person.data);
      await atomicWrite(join(contentDirs.people, `${person.id}.md`), output);
    }
    schedulePublish('成员顺序已调整');
    return json(res, 200, { ok: true });
  }

  if (req.method === 'POST' && url.pathname === '/api/upload') {
    const payload = await body(req);
    const kind = ['news', 'publications', 'research'].includes(payload.kind) ? payload.kind : 'members';
    const extension = extname(payload.filename || '').toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) throw new Error('仅支持 JPG、PNG 或 WebP 图片');
    const stem = slugify(String(payload.filename).slice(0, -extension.length), `${kind}-${Date.now()}`);
    const buffer = Buffer.from(String(payload.data || '').replace(/^data:image\/[^;]+;base64,/, ''), 'base64');
    if (!buffer.length || buffer.length > 10 * 1024 * 1024) throw new Error('图片为空或超过 10 MB');
    const directory = join(root, 'public/images', kind);
    await mkdir(directory, { recursive: true });
    // A unique path prevents browsers and the static preview from reusing the
    // previous portrait when a maintainer uploads a replacement with the same name.
    const uniqueStem = `${stem}-${Date.now()}`;
    const filename = `${uniqueStem}${extension}`;
    const variants = [{ filename, buffer }];
    await atomicWrite(join(directory, filename), buffer);
    if (kind === 'news' && payload.thumbnailData) {
      const thumbnail = Buffer.from(String(payload.thumbnailData).replace(/^data:image\/[^;]+;base64,/, ''), 'base64');
      if (!thumbnail.length || thumbnail.length > 2 * 1024 * 1024) throw new Error('新闻缩略图为空或超过 2 MB');
      const thumbnailFilename = `${uniqueStem}.thumb.webp`;
      await atomicWrite(join(directory, thumbnailFilename), thumbnail);
      variants.push({ filename: thumbnailFilename, buffer: thumbnail });
    }
    if (kind === 'news' && payload.fullImageData) {
      const fullImage = Buffer.from(String(payload.fullImageData).replace(/^data:image\/[^;]+;base64,/, ''), 'base64');
      if (!fullImage.length || fullImage.length > 8 * 1024 * 1024) throw new Error('新闻高清图为空或超过 8 MB');
      const fullImageFilename = `${uniqueStem}.full.webp`;
      await atomicWrite(join(directory, fullImageFilename), fullImage);
      variants.push({ filename: fullImageFilename, buffer: fullImage });
    }
    let cosSynced = false;
    let cosWarning;
    if (!cosClient) {
      cosWarning = 'COS 自动同步尚未配置，图片已保存到本地并保留 GitHub 回退';
    } else {
      try {
        await Promise.all(variants.map((variant) => uploadToCos(`images/${kind}/${variant.filename}`, variant.buffer)));
        cosSynced = true;
      } catch (error) {
        console.error('COS 自动同步失败：', error?.code || error?.message || error);
        cosWarning = `${cosUploadError(error)}，图片已保存到本地并保留 GitHub 回退`;
      }
    }
    return json(res, 200, {
      ok: true,
      path: `/wu-lab-website/images/${kind}/${filename}`,
      cosSynced,
      cosWarning,
    });
  }

  return json(res, 404, { error: '接口不存在' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(await readFile(adminHtml));
    }
    if (url.pathname === '/brand.svg') {
      res.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' });
      return res.end(await readFile(brandIcon));
    }
    json(res, 404, { error: '页面不存在' });
  } catch (error) {
    console.error(error);
    json(res, 400, { error: error.message || '操作失败' });
  }
});

server.listen(port, host, () => {
  console.log(`Wu Lab 内容管理：http://${host}:${port}`);
  console.log('仅监听本机；请通过 SSH 端口转发访问。');
  console.log(cosClient ? `COS 自动同步已启用：${cosBucket}（${cosRegion}）` : 'COS 自动同步未配置：图片仍会保存到本地并使用 GitHub 回退。');
});
