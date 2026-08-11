import http from 'node:http';
import { readFile, readdir, writeFile, rename, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import matter from 'gray-matter';

const root = resolve(import.meta.dirname, '..');
const host = process.env.WULAB_ADMIN_HOST || '127.0.0.1';
const port = Number(process.env.WULAB_ADMIN_PORT || 4323);
// Base64 adds roughly 33% to the original image size, so allow enough request
// room for the advertised 10 MB upload limit.
const maxBody = 15 * 1024 * 1024;
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

const json = (res, status, value) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
};

async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBody) throw new Error('请求过大，单次最多 12 MB');
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
      return json(res, 200, { ok: true });
    }
    if (!(payload.type in contentDirs)) throw new Error('该栏目不支持删除');
    const id = safeId(payload.id);
    await rename(join(contentDirs[payload.type], `${id}.md`), join(archiveDir, `${payload.type}-${id}-${stamp}.md`));
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
    const filename = `${stem}-${Date.now()}${extension}`;
    await atomicWrite(join(directory, filename), buffer);
    return json(res, 200, { ok: true, path: `/wu-lab-website/images/${kind}/${filename}` });
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
});
