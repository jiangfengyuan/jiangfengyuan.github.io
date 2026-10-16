# 导航更新发布准备 · 2026-10-11

- 发布基线：远端 main `8cc8528a06698416c321cefae8deb2631316b566`。
- 仅包含导航结构、状态和样式、初始化接入、无脚本回退、相应浏览器测试与验收资料。保留最新新加坡排位赛文章及上传图片，未改动日期、CMS 或其他页面实现。
- 在独立发布目录验证：5 项内容测试通过；52 文件类型检查 0 错误/警告/提示，20 页面构建完成；Chrome/WebKit/Firefox 导航与 Chrome 页面回归共 22 项通过。
- 页面回归测试改为读取当前文章数量，避免后续发表新文章使固定数量断言失效。
- 发布目标：GitHub main，现有 Build and deploy website 工作流自动部署 GitHub Pages。
- 本文件记录发布准备；实际部署提交、工作流结果与线上验收记录写入工作区 CHANGELOG 及本地 online-check.json。

## 正式上线结果

- 发布提交：`ad42ac32229348cbbb5ffb43d96d9843fea9f8b7`，已推送 main。
- GitHub Actions：<https://github.com/jiangfengyuan/jiangfengyuan.github.io/actions/runs/38122062974>，最终 completed / success，构建和 GitHub Pages 部署成功。
- 正式网站：<https://jiangfengyuan.github.io/blog/>。浏览器验收通过桌面标题展开/Escape、作品页面跳转、320px 手机子菜单/返回/关闭；最近文章显示新加坡排位赛文章。路由动画完成后采样无页面脚本错误。
- 验收证据：[online-check.json](navigation-polish-2026-10-11/online-check.json)。本地工作区其他改动保留；本地预览现为保留最新文章的发布版本。
