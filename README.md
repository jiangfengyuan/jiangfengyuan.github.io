# Hayden — Projects, writing & everyday life

Hayden 的作品、产品介绍与写作空间。Astro 7 + TypeScript + 原生 CSS，生成静态 HTML，通过 GitHub Actions 发布到 GitHub Pages。

## 开发与验证

需要 Node.js 24 LTS 和 npm，依赖版本由 package-lock.json 锁定。

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
npm run test:e2e
```

本地端到端测试使用已安装的 Chrome。本机 macOS 运行 Playwright Firefox 时，自带 Firefox 可能因系统应用数据目录保护无法启动（`Could not find profile folder.`），需通过 `PLAYWRIGHT_FIREFOX_EXECUTABLE` 指定独立 Firefox 二进制，或在 Linux CI 中运行；Chromium 与 WebKit 测试不受影响。Linux CI 可先运行 `npx playwright install --with-deps chromium`，再以 `CI=1 npm run test:e2e` 验证。`ASTRO_TELEMETRY_DISABLED=1` 可关闭构建工具遥测。

## 页面和内容

- `/` 个人首页；`/projects/` 作品目录；`/about/` 个人资料与联系。
- `/flash/`、`/republica/`、`/dhgt/`：独立产品和社团页面。
- `/blog/` 写作列表；`/blog/<ID>/` 预渲染文章；`/updates/` 项目动态。
- `/blog-admin/` 文章导入工具：仅在本地 `npm run dev` 时可用；线上构建只输出说明页（noindex，不进入导航或 sitemap）。
- 英文站位于 `/en/` 下，路由与中文一一对应（如 `/en/about/`、`/en/blog/<ID>/`），并有独立的 `/en/rss.xml` 与 `/en/search-index.json`。
- `src/content/posts/*.md` 文章；`src/data/` 中的项目、动态和个人资料为 CMS 内容源。
- `src/components/` 与 `src/layouts/` 共享 UI；`src/styles/` 包含设计变量、基础、组件及页面样式；`src/scripts/` 按交互划分。

中文为默认语言（`/`），英文为独立静态页面（`/en/`）；语言由 URL 决定，语言切换按钮跳转到对应语言的同一页面，并保留 query 与 hash，禁用 JavaScript 时同样可用。页面输出 `hreflang` 与 canonical，sitemap 含语言互链。`site-theme` 保存主题偏好，首次跟随系统。主要内容与导航在禁用 JavaScript 时也能访问。页面间导航使用 View Transitions 淡入淡出，滚动进场动画仅在启用 JavaScript 且未开启减弱动态效果时生效。首页、作品页的大图经构建管线生成 AVIF/WebP 多尺寸。部分交互（如主题切换、复制邮箱成功）在支持 `navigator.vibrate` 的设备上提供短振动反馈，属于渐进增强；iOS 与鸿蒙等环境待真机验证，视觉与文本反馈始终保留。非中文浏览器首次访问时显示 English hint，可一键前往英文首页或关闭，不影响默认中文内容。

## Pages CMS

1. 登录 [Pages CMS](https://app.pagescms.org/)，用 GitHub 授权 `jiangfengyuan/jiangfengyuan.github.io` 仓库。
2. 选择 `main`，管理界面会读取仓库根目录 `.pages.yml`。
3. 编辑文章、项目动态、项目介绍或个人资料，图片上传至 `public/assets/uploads/`。
4. 草稿勾选时，文章不生成公开地址，也不进入列表、搜索、RSS 或 sitemap。公开仓库中的源文件仍然公开。
5. 取消草稿并保存，CMS 提交触发 GitHub Actions。只有构建成功后才部署；失败时线上保留上一版，在 Actions 查看诊断。

文章 ID 发布后保持不变；仅使用字母、数字、`-` 与 `_`。字段包含标题、日期（YYYY-MM-DD）、标签、摘要、原文语言、草稿、可选封面和封面替代文字。

英文译文是单独的文章文件：ID 为中文 ID 加 `-en`（如 `20260827-uzA9yg-en`），`language` 设为 `en`，`translationOf` 填中文原 ID。英文文章发布在 `/en/blog/<中文 ID>/`，与中文版互为语言切换目标。首次 GitHub 登录授权需要仓库所有者完成；无需把密钥放进官网。

## 公众号导入与 Markdown 写作

本地运行 `npm run dev` 后打开 `/blog-admin/`，粘贴公众号正文或 HTML 源码，或者切换到 Markdown。工具移除脚本、隐藏节点、事件属性与危险链接，保留表格、题注、列表和代码。

- 预览后导出完整 Markdown 文件，上传到 `src/content/posts/`。
- 或复制正文，粘贴到 Pages CMS 的 **Source** 模式，填写标题、日期、标签等元数据。
- 导入默认为草稿。外部公众号图片保留原引用，不自动下载；失效时阅读页显示提示。新文章建议使用 CMS 图片上传。

## 兼容与部署

`/*.html` 是迁移用的 noindex 双语跳转桩，保留旧扁平链接的查询参数与锚点，不是旧页面内容；`/blog?p=ID` 和 `/blog.html?p=ID` 跳转到对应文章。无脚本访问旧文章链接时仍可从文章目录选择 ID。

GitHub 仓库 **Settings → Pages → Build and deployment → Source** 使用 **GitHub Actions**。推送 `main` 后运行 `.github/workflows/pages.yml`，执行依赖安装、内容测试、类型检查和静态构建，再发布 `dist/`。PR 仅构建，不部署。

回滚基线：`2ca3906`（原生 HTML/CSS/JS 旧站）。重构后的回滚使用先前成功构建的 Astro 提交；需要回到旧站时，恢复该提交并将 Pages Source 改回 branch/main。

## 内容与图片依据

- Flash：Project-FLASH `b2249d7`（2026-10-04）。三端 Alpha、真机互传、签名和新版发布边界按公开文档表达。Android 截图来自本地开发验证，说明见 `public/assets/flash/README.md`。
- Cloud Republic：Cloud-Republica `685cb27`（2026-09-19），保留原始截图及 MIT 来源说明。
- DHGT 与七篇文章：旧站 `2ca3906` 内容迁移；原文、文章 ID、日期、标签、图片与题注保留。

迁移后，可用 `node scripts/migrate-articles.mjs /path/to/old/posts` 比较原文与生成 HTML 的文本、表格、图片引用和题注。
