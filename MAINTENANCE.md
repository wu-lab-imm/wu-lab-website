# Wu Lab 官网维护手册

## 系统分工

- **Astro 官网**：读取 `src/content/` 和 `public/images/`，生成可公开发布的静态网页。公网访问者不会接触服务器管理后台。
- **内容管理后台**：只在实验室服务器本机 `127.0.0.1:4323` 运行，用于编辑成员、论文、新闻和上传图片。
- **GitHub Pages**：保存构建后的公开网站。推送 `main` 后由 GitHub Actions 自动构建和发布。

## 日常维护

在自己的电脑建立 SSH 转发：

```bash
ssh -L 4321:127.0.0.1:4321 -L 4323:127.0.0.1:4323 wulab
```

然后打开：

- 官网预览：http://127.0.0.1:4321/wu-lab-website/
- 内容管理：http://127.0.0.1:4323/

后台保存内容后，Astro 预览会自动刷新。

## 服务器服务

```bash
tmux attach -t wulab-webpage-preview
tmux attach -t wulab-webpage-admin
```

## 发布前检查

```bash
cd <网站项目目录>
npm run release:check
git status
```

检查会执行 Astro 类型检查和完整构建，并检查公开页面的站内链接、内容引用图片和大图片。未引用图片只提示，不会自动删除。

### 内容定稿清单

- 每位成员确认中英文姓名、身份、个人介绍、研究方向、头像和邮箱。
- PI 页面确认 IMM、PUMC 官方链接及代表性论文。
- 论文确认题目、作者、年份、期刊、影响因子、摘要和配图。
- 新闻确认日期、摘要、正文、轮播顺序、封面和中英文内容。
- 研究方向确认中英文标题、简称、正文、图片及首页展示位置。
- Join 页面确认邮箱、申请材料和流程。
- 用电脑和手机分别检查中文、英文页面。
- 确认所有即将公开的人像、联系方式、论文图片和活动照片均可公开使用。

### 正式发布步骤

正式发布前先记录当前状态：

```bash
cd <网站项目目录>
git status --short
npm run release:check
```

确认本次文件范围后再提交：

```bash
git add <本次确认要发布的文件>
git commit -m "Prepare Wu Lab website for public launch"
git push origin main
```

推送 `main` 会触发 `.github/workflows/deploy.yml`。在 GitHub 仓库的 Actions 页面确认构建和部署成功，然后访问：

https://wu-lab-imm.github.io/wu-lab-website/

首次启用 GitHub Pages 时，仓库管理员需要在 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。不要在内容尚未定稿时提前推送 `main`，因为当前工作流会自动公开最新内容。

### 发布后的更新

管理后台保存内容后会启动安全的自动发布队列：停止修改约 30 秒后，服务器自动检查仓库状态、执行 `npm run release:check`、提交内容与图片并推送 `main`。GitHub Actions 随后更新公网网站。管理页右上角会显示等待、检查、推送、成功或失败状态，也可以点击“立即发布”跳过等待时间。

自动发布只允许提交 `src/content/`、`src/join.json` 和 `public/images/`。遇到以下情况会停止并在管理页显示原因，不会强行覆盖：

- 完整构建或图片引用检查失败；
- GitHub 远端出现服务器尚未同步的新提交；
- 工作区存在程序代码、配置或运维文档改动；
- 当前分支不是 `main`；
- Git 提交或推送失败。

程序功能、页面样式或部署配置的修改仍由维护者人工检查、提交和推送。若自动发布或 GitHub Actions 失败，公网会保留上一次成功版本；先检查管理页提示和 Actions 日志，不要把 `dist/` 手工提交到仓库。

### 权限与长期维护

- 服务器维护者需要实验室服务器 SSH 权限。
- 发布者需要 GitHub 仓库 `wu-lab-imm/wu-lab-website` 的写入权限。
- 仓库由实验室 GitHub Organization `wu-lab-imm` 统一管理；维护人员应使用各自的 GitHub 账号加入，不共用个人账号。
- 管理后台固定监听 `127.0.0.1:4323`，只能通过 SSH 转发访问，不开放公网。
- `admin/archive/` 是本地内容归档，已排除在 Git 中，不会随官网公开。
- 管理后台会把新上传的成员头像、新闻照片、论文图和研究图自动转换为适合网页加载的 WebP。新闻图片会一次生成三层：800 px 列表缩略图、最长边 2200 px 的高质量详情图，以及最长边 3200 px 的按需高清图。
- 新闻首页和列表只加载缩略图，详情页加载高质量图；点击详情图才会打开高清版。因此合照可以看清人脸，同时不会让每位访客一开始就下载大图。
- 当前上传规格：成员头像长边不超过 1000 px；新闻详情图质量 90、高清图质量 94；论文图不超过 1600 px；研究图不超过 1800 px。
- 历史原图与已确认未引用的图片保存在本机 `admin/archive/image-optimization-2026-08-11/`，该目录不进入 Git，也不会部署到公网。确认新版长期稳定前不要删除这份归档。

## 外网发布原理

公网使用 GitHub Pages 上的静态文件，不依赖实验室服务器持续在线。服务器只保存源代码、图片和内网编辑工具。后续维护者需要服务器 SSH 权限和 GitHub 仓库写入权限。
