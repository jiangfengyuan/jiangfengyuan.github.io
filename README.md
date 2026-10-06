# jiangfengyuan.github.io

> Hayden 的个人主页 — 原生 HTML/CSS/JS 构建，零框架、零构建步骤，GitHub Pages 直接部署。

**在线访问**：https://jiangfengyuan.github.io

## 页面

| 页面 | 说明 |
| --- | --- |
| `index.html` | 主页：Hero（打字机效果）、关于我（数据滚动动画 + 代码窗口）、作品展示、技能栈、联系方式 |
| `flash.html` | [Flash 一闪](https://github.com/jiangfengyuan/Project-FLASH) 产品页：本地优先的灵感 / 日志 / 情绪记录应用（Android · macOS · HarmonyOS），含三端 Alpha 状态与发布记录入口 |
| `republica.html` | Cloud Republic 云端共和国：卡牌策略、玩法介绍、离线存档与在线试玩入口 |
| `updates.html` | 项目动态：仓库核对日期、提交来源与实现 / 发布边界 |
| `dhgt.html` | DHGT 页面 |
| `blog.html` | 个人博客：文章列表（搜索 / 标签筛选）+ 阅读页，数据来自 `posts.js` |
| `blog-admin.html` | 站长投稿工具：粘贴公众号文章或 Markdown 写作，生成 `posts.js` 代码片段（`noindex`，不公开链接） |

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

投稿工具（`blog-admin.html`）支持两种模式，可随时切换：

- **公众号粘贴**（默认）：把公众号编辑器里的正文全选复制后粘贴进去，粘贴即自动净化（`content.js` 语义白名单：剥离公众号冗余样式与隐藏节点、修复 `data-src` 懒加载图片、`h1` 降为 `h2`），标题自动提取，实时显示字数/图片数；
- **Markdown 写作**：直接在编辑器里写 Markdown（支持标题、表格、代码块、引用、列表、图片等），正文保存为 `.md` 原文，阅读页由 `content.js` 现场渲染。

发布步骤：

1. 打开 `blog-admin.html`（本地或线上均可），粘贴或编写正文；
2. 点击「生成并下载」：浏览器会下载正文文件 `<id>.html` 或 `<id>.md`，把它放进仓库的 `posts/` 文件夹；
3. 把输出区累计的元数据行粘贴到 `posts.js` 中 `BLOG_POSTS` 数组里（可连续转载多篇后一次性粘贴）；
4. 提交并推送，文章即上线（列表页 `blog.html`，阅读页 `blog.html?p=文章id`）；
5. 新文章记得同步补进 `sitemap.xml`。

博客结构：`posts.js` 只存元数据（id/标题/日期/标签/摘要/文件路径，支持 `draft: true` 草稿），正文是 `posts/` 下的独立 HTML 片段或 Markdown 文件，阅读页按需 fetch 加载，统一经 `content.js` 白名单净化后渲染。

阅读页特性：阅读进度条、文章目录（h2/h3 自动生成，滚动高亮当前小节）、上一篇/下一篇导航、预计阅读时长、图片点击放大（灯箱）、外链新窗口打开、代码块语法高亮（highlight.js，跟随站点明暗主题）。

## SEO

- `sitemap.xml` 收录全部页面与文章地址，`robots.txt` 指向它并屏蔽投稿工具；
- 打开文章时 `blog.js` 动态改写 `description` / Open Graph / canonical，并注入 `BlogPosting` JSON-LD 结构化数据。

## 部署

推送到 `main` 分支即自动部署（GitHub Pages）。

---

Designed & Built by Hayden ♥ with love and Kimi


## 官网分享信息、可访问性与项目动态

- 页面分享卡片图位于 `assets/social/`（1200 × 630），网站图标提供 SVG、PNG 与 Apple Touch Icon；主页、Flash、DHGT、博客和项目动态均使用分享预览图。
- `updates.html` 是双语项目动态页：首页和 Flash / DHGT 页面链接到最新记录。条目以 `update-card` 为模板，按日期倒序维护；更新 `time` 日期、唯一锚点和 `data-zh` / `data-en` 文案。Sitemap 收录 `/updates`。
- Flash 与 DHGT 首批条目是基于既有产品页面整理的概览，不代表版本发布或新活动；正式版本详情请链接到项目发布记录。
- 手机菜单支持焦点管理、Tab 循环与 Escape；`prefers-reduced-motion` 控制粒子、弹幕和文字/计数动效。


## 内容依据（2026-10-06 核对）

| 仓库 | 参考提交 | 依据 |
| --- | --- | --- |
| [Project-FLASH](https://github.com/jiangfengyuan/Project-FLASH) | `b2249d7` · 2026-10-04 | README、ROADMAP、harmonyos/README 与设备品质 / 互传验收文档；三端原生工程仍为 Alpha，历史 APK 不代表当前主分支 |
| [Cloud-Republica](https://github.com/jiangfengyuan/Cloud-Republica) | `685cb27` · 2026-09-19 | README、package.json 与 TypeScript 游戏内容；66 卡、20 事件、9 节点科技树、双语 / 主题 / 离线与本地存档 |
| [个人网站](https://github.com/jiangfengyuan/jiangfengyuan.github.io) | `9651849` · 2026-10-06 | 已有博客搜索、目录、阅读进度、图片放大、代码高亮与本轮之前上线的分享 / 键盘 / 动效支持 |

本轮同步中英双语的首页作品、Flash 产品页、Cloud Republic 产品页和动态页。Flash 的未推送本地开发不作为已上线功能；HarmonyOS 真机 / 签名、跨端互传及新版分发边界以仓库文档为准。Cloud Republic 截图来源与许可证见 `assets/republica/README.md`。
