import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const publicDir = join(root, 'public');
const distDir = join(root, 'dist');
const sourceDirs = [join(root, 'src'), join(root, 'admin')];
const basePath = '/wu-lab-website';
const errors = [];
const warnings = [];

async function filesUnder(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(path));
    else result.push(path);
  }
  return result;
}

function cleanUrl(value) {
  return value.split('#')[0].split('?')[0];
}

function localDistTarget(value) {
  const clean = cleanUrl(value);
  if (!clean.startsWith(basePath)) return null;
  let rest = clean.slice(basePath.length).replace(/^\//, '');
  if (!rest || rest.endsWith('/')) rest += 'index.html';
  else if (!extname(rest)) rest += '/index.html';
  return join(distDir, ...rest.split('/'));
}

const sourceFiles = (await Promise.all(sourceDirs.map(filesUnder))).flat();
const referencedImages = new Set();
for (const file of sourceFiles) {
  if (file.includes(`${sep}archive${sep}`)) continue;
  const text = await readFile(file, 'utf8');
  for (const match of text.matchAll(/\/wu-lab-website\/(images\/[A-Za-z0-9._~!&'()*+,;=:@%/-]+\.(?:avif|gif|jpe?g|png|svg|webp))/gi)) {
    referencedImages.add(match[1]);
  }
  for (const match of text.matchAll(/\$\{base\}\/(images\/[A-Za-z0-9._~!&'()*+,;=:@%/-]+\.(?:avif|gif|jpe?g|png|svg|webp))/gi)) {
    referencedImages.add(match[1]);
  }
}

// News cards use generated 800 px thumbnails, detail pages use the larger
// image, and a high-resolution version is available on demand. Treat both
// derived variants as required public assets too.
for (const image of [...referencedImages]) {
  if (image.startsWith('images/news/') && /\.(?:jpe?g|png|webp)$/i.test(image)) {
    referencedImages.add(image.replace(/\.(?:jpe?g|png|webp)$/i, '.thumb.webp'));
    referencedImages.add(image.replace(/\.(?:jpe?g|png|webp)$/i, '.full.webp'));
  }
}

for (const image of referencedImages) {
  try {
    await stat(join(publicDir, ...image.split('/')));
  } catch {
    errors.push(`内容引用的图片不存在：public/${image}`);
  }
}

const htmlFiles = (await filesUnder(distDir)).filter(file => file.endsWith('.html'));
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const value = match[1];
    if (/^(?:https?:|mailto:|tel:|data:|#)/.test(value)) continue;
    const target = localDistTarget(value);
    if (!target) continue;
    try {
      await stat(target);
    } catch {
      errors.push(`${relative(root, file)} 中的站内链接无对应文件：${value}`);
    }
  }
}

const imageDir = join(publicDir, 'images');
const imageFiles = await filesUnder(imageDir);
let totalBytes = 0;
let orphanCount = 0;
for (const file of imageFiles) {
  const info = await stat(file);
  totalBytes += info.size;
  const publicPath = relative(publicDir, file).split(sep).join('/');
  if (info.size > 4 * 1024 * 1024) {
    warnings.push(`大图片 ${(info.size / 1024 / 1024).toFixed(1)} MB：public/${publicPath}`);
  }
  if (!referencedImages.has(publicPath)) orphanCount += 1;
}

console.log(`发布检查：${htmlFiles.length} 个页面，${referencedImages.size} 个内容图片引用。`);
console.log(`公开图片：${imageFiles.length} 个，共 ${(totalBytes / 1024 / 1024).toFixed(1)} MB；疑似未引用 ${orphanCount} 个。`);
for (const warning of warnings) console.warn(`警告：${warning}`);
if (orphanCount) console.warn('提示：未引用图片不会导致检查失败，正式发布前可人工确认后清理。');
if (errors.length) {
  for (const error of [...new Set(errors)]) console.error(`错误：${error}`);
  process.exitCode = 1;
} else {
  console.log('发布检查通过。');
}
