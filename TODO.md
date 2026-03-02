# Wu Lab 网站重构 - 待办事项

## 当前状态
- Frontend-design skill 已安装
- 已分析参考图片 (ref/home-ref.png)：纯白背景、大字号粗体文字、左右分栏、右侧蛋白质结构图

## 待完成任务

### 1. 首页重构 (index.astro)
- ✅ 纯白背景
- ✅ 左右分栏布局
- ✅ 大字号字体
- ⏳ 优化蛋白质结构示意图 SVG
- ⏳ 添加页面加载动画

### 2. 其他页面统一风格
- [x] 研究方向页 (research.astro) - 已优化
- [x] 团队成员页 (people.astro) - 已统一
- [x] 发表论文页 (publications.astro) - 已重构
- [x] 新闻动态页 (news.astro) - 已统一
- [x] 加入我们页 (join.astro) - 已统一

### 3. 公共组件优化
- [ ] Header.astro - 简化导航
- [ ] Footer.astro - 简化底部
- [ ] 统一字体和颜色方案

### 4. 设计原则
- 纯白背景
- 大字号粗体无衬线字体
- 简洁的左右分栏布局
- 像素风格蛋白质结构图
- 充足的留白

---

## 已完成工作 (2024)

### Research 页面优化
- [x] 修复顶部白色背景配白色字体问题 -> 改为白色背景+深色字体
- [x] 移除"研究方法与技术"区块
- [x] 只保留两个研究卡片：神经系统疾病靶标研究、糖链解码
- [x] 精简描述为单段落
- [x] 调整卡片顺序（神经系统在上）
- [x] 修复 markdown 显示问题
- [x] 添加顶部 padding (pt-28) 避免被固定 Header 遮挡
- [x] 标题描述保持单行

### 页面顶部格式统一
- [x] 所有页面统一为白色背景 + 深色字体
- [x] pt-28 pb-20 padding
- [x] 中英文标题格式

### Publications 页面重构
- [x] 移除三个横向统计卡片
- [x] 移除年份筛选功能
- [x] 改为卡片形式显示论文
- [x] 标题和 Nature 期刊添加链接
- [x] 通讯作者添加信封图标
- [x] 卡片自适应宽度

## 文件位置
项目路径: /Users/liujiameng/Documents/CodeField/04_wulab_webpage/wu-lab-website
参考图片: /Users/liujiameng/Documents/CodeField/04_wulab_webpage/ref/home-ref.png
