# jiangfengyuan.github.io

> Hayden 的个人主页 — 原生 HTML/CSS/JS 构建，零框架、零构建步骤，GitHub Pages 直接部署。

**在线访问**：https://jiangfengyuan.github.io

## 页面

| 页面 | 说明 |
| --- | --- |
| `index.html` | 主页：Hero（打字机效果）、关于我（数据滚动动画 + 代码窗口）、作品展示、技能栈、联系方式 |
| `flash.html` | [Flash 一闪](https://github.com/jiangfengyuan/Project-FLASH) 产品页：本地优先的灵感 / 日志 / 情绪记录应用（Android · macOS），含弹幕舞台与下载入口 |
| `dhgt.html` | DHGT 页面 |
| `blog.html` | 个人博客：文章列表（搜索 / 标签筛选）+ 阅读页，数据来自 `posts.js` |
| `blog-admin.html` | 站长投稿工具：粘贴公众号文章内容，生成 `posts.js` 代码片段（`noindex`，不公开链接） |

## 特性

- **中英双语**：`data-en` / `data-zh` 属性驱动，一键切换，偏好存入 `localStorage`
- **明暗双主题**：CSS 变量体系（`--accent` 系列 token），切换全局过渡
- **粒子背景**：Canvas 粒子网络，支持 DPR 适配，页面不可见时自动暂停
- **滚动动画**：IntersectionObserver 驱动的分组 stagger 淡入 + 数字滚动
- **可访问性**：`prefers-reduced-motion` 降级、焦点可见性、aria 标注
- **响应式**：900px / 600px 双断点，移动端全屏菜单

## 技术栈

原生 HTML5 / CSS3 / JavaScript（ES6+），无框架、无构建工具。字体：Inter + JetBrains Mono（Google Fonts）。

## 本地预览

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000
```

## 发布博客文章

1. 打开 `blog-admin.html`（本地或线上均可），把公众号编辑器里的正文全选复制后粘贴进去（标题自动提取，实时显示字数/图片数）；
2. 点击「生成并下载」：浏览器会下载正文文件 `<id>.html`，把它放进仓库的 `posts/` 文件夹；
3. 把输出区累计的元数据行粘贴到 `posts.js` 中 `BLOG_POSTS` 数组里（可连续转载多篇后一次性粘贴）；
4. 提交并推送，文章即上线（列表页 `blog.html`，阅读页 `blog.html?p=文章id`）。

博客结构：`posts.js` 只存元数据（id/标题/日期/标签/摘要/文件路径，支持 `draft: true` 草稿），正文是 `posts/` 下的独立 HTML 片段，阅读页按需 fetch 加载。

## 部署

推送到 `main` 分支即自动部署（GitHub Pages）。

---

Designed & Built by Hayden ♥ with love and Kimi
