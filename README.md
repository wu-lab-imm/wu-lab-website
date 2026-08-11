# Wu Lab Website

吴惊香课题组官方网站 - 中国医学科学院药物研究所

## 技术栈

- [Astro](https://astro.build/) - 静态网站生成器
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全

## 本地开发

### 前置要求

- Node.js 18+
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:4321/wu-lab-website/ 查看网站

### 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录

正式发布前运行完整检查：

```bash
npm run release:check
```

### 预览生产版本

```bash
npm run preview
```

## 项目结构

```
├── src/
│   ├── pages/          # 页面文件
│   │   ├── index.astro          # 首页
│   │   ├── research.astro       # 研究方向
│   │   ├── people.astro        # 团队成员
│   │   ├── publications.astro  # 论文发表
│   │   ├── news.astro          # 新闻动态
│   │   └── join.astro          # 加入我们
│   ├── components/     # 可复用组件
│   │   ├── Header.astro        # 导航栏
│   │   ├── Footer.astro        # 页脚
│   │   ├── Hero.astro         # 首页Hero
│   │   ├── PersonCard.astro   # 人员卡片
│   │   ├── PublicationItem.astro # 论文条目
│   │   ├── NewsCard.astro     # 新闻卡片
│   │   └── ResearchCard.astro # 研究方向卡片
│   ├── layouts/        # 布局模板
│   │   └── Layout.astro
│   ├── content/        # 内容文件（Markdown）
│   │   ├── config.ts           # Content Collection 配置
│   │   ├── people/             # 团队成员
│   │   ├── news/               # 新闻动态
│   │   ├── research/           # 研究项目
│   │   └── publications/        # 论文数据
│   └── styles/         # 样式文件
│       └── global.css
├── public/             # 静态资源
│   └── images/         # 图片资源
├── astro.config.mjs   # Astro 配置
├── tailwind.config.mjs # Tailwind 配置
└── package.json
```

## 内容更新

### 添加新闻

在 `src/content/news/` 目录下创建新的 Markdown 文件：

```markdown
---
title: "新闻标题"
date: 2024-01-01
summary: "新闻摘要"
category: "publication"
---

新闻正文内容...
```

### 添加团队成员

在 `src/content/people/` 目录下创建新的 Markdown 文件。

### 更新论文列表

编辑 `src/content/publications/publications.json` 文件。

## 部署

仓库当前连接 `wu-lab-imm/wu-lab-website`。推送到 `main` 后，GitHub Actions 会先执行完整发布检查，再自动部署到：

https://wu-lab-imm.github.io/wu-lab-website/

内容管理后台不会部署到 GitHub Pages，也不要将后台的 `4323` 端口开放到公网。详细维护与发布流程见 [MAINTENANCE.md](./MAINTENANCE.md)。

## 浏览器兼容性

- Chrome/Edge (最新版本)
- Firefox (最新版本)
- Safari (最新版本)
- 移动端浏览器

## License

© 2026 Wu Lab. All rights reserved.

---

## 更新记录 (2026-03-01)

### Header 样式优化
- "Wu Lab" 改为 "Wu Lab · Structural Biology"
- 添加艺术字效果：浅蓝绿色外发光、内部渐变立体感
- 调整字体大小使页面更协调
- 修复 Header 在不同页面位置不固定的问题

### Research 页面优化
- 添加结构药理学研究配图 (Nature 文章 figure)
- 图片移动到 public/images/research/
- 实现卡片效果，类似 publications 页面
- 没有图片的研究项目也使用统一高度的卡片

### 卡片悬停效果
- Research 页面：上浮 + 阴影增强 + 图片缩放
- Publications 页面：上浮 + 阴影增强 + 标题颜色变化
- Join 页面：职位卡片、申请步骤卡片、实验室环境卡片

### 标点符号修复
- News 页面 summary 添加句号
- Home 页面 description 添加句号
- Research 页面描述添加句号
