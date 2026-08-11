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

后台保存只修改服务器上的源文件，并不会立即改变公网网页。每次更新流程都是：

1. 在内网管理后台编辑并查看本地预览。
2. 运行 `npm run release:check`。
3. 检查 `git diff` 和 `git status`，只提交确认过的内容与图片。
4. 推送 `main`，等待 GitHub Actions 部署完成。

若部署失败，公网会保留上一次成功版本。先查看 GitHub Actions 日志并在服务器修正，不要把 `dist/` 手工提交到仓库。

### 权限与长期维护

- 服务器维护者需要实验室服务器 SSH 权限。
- 发布者需要 GitHub 仓库 `wu-lab-imm/wu-lab-website` 的写入权限。
- 仓库由实验室 GitHub Organization `wu-lab-imm` 统一管理；维护人员应使用各自的 GitHub 账号加入，不共用个人账号。
- 管理后台固定监听 `127.0.0.1:4323`，只能通过 SSH 转发访问，不开放公网。
- `admin/archive/` 是本地内容归档，已排除在 Git 中，不会随官网公开。
- 管理后台会自动压缩新上传的成员头像和新闻照片；论文图与研究图保留原始质量。正式发布前仍应根据发布检查提示处理历史大图。

## 外网发布原理

公网使用 GitHub Pages 上的静态文件，不依赖实验室服务器持续在线。服务器只保存源代码、图片和内网编辑工具。后续维护者需要服务器 SSH 权限和 GitHub 仓库写入权限。
