# 悬浮胶囊导航与分栏导览验收 · 2026-10-11

## 实现

- 保留悬浮胶囊与现有配色，将导航主体压至桌面约 60px、手机约 56px；当前页改为细下划线。展开时胶囊连接同宽导览面板。
- 五个栏目均支持正文链接直接跳转、独立箭头展开、方向下键进入；桌面实际移动指针后延迟约 90ms 打开，离开延迟约 160ms 关闭。
- 面板高度约 320ms 过渡，栏目文字依次淡入轻移；背景遮罩淡入并应用 6px 模糊。遮罩置于共享导航快照元素外，避免背景采样被截断。
- 手机主菜单与子菜单按内容高度展开，超出可用高度时内部滚动；提供返回主菜单、关闭、Escape 和焦点循环。
- 写作菜单复用站点 publishedPosts()，展示最近三篇非草稿文章，与文章列表排序一致；文章原文不翻译，其余导览中英文同步。
- 处理快速栏目切换时的焦点转移、WebKit 点击期间短暂失焦和链接在点击处理过程中变为 inert 的兼容问题。路由替换不因静止鼠标自动展开；路由切换与初始化销毁时清理定时器及待执行焦点更新。
- 无脚本时隐藏子菜单控件并保留主要导航链接；支持减少动态效果、减少透明度及强制颜色模式。未修改文章日期、CMS、正文或发布流程。

## 验证

- npm test：5 项内容测试通过。
- npm run build：52 文件类型检查，0 错误、0 警告、0 提示；19 个页面静态构建完成。
- 最终导航测试：4 个场景 × Chrome、WebKit、Firefox，12 项全部通过。覆盖悬停进入面板、快速切换、已聚焦面板切换栏目、方向下键、Escape、跳转、手机返回、焦点循环、尺寸切换、短屏滚动、减少动态效果、200% 文字、明暗主题下展开菜单的 axe 检查及 1024px 触屏操作。
- 页面与空间回归：31 项既有测试通过，含全站双语与明暗布局、320–3440px、物理屏幕分段模拟、200% 文字、无脚本、图片弹层、导入导出与路由偏好保留。导航修复后另组合复查 21 项导航/语言/邮箱复制/减少动态效果场景通过，最后补充焦点切换用例后重跑上述 12 项导航测试通过。
- 浏览器均为本地主机模拟，未进行手机或折叠屏真机测试；不将结果作为线上性能指标。项目原有其他未提交变更保留，未提交、推送或发布。

复测：

```sh
npm test
npm run build
npx playwright test tests/e2e/navigation.spec.ts
```

本机 WebKit/Firefox 使用既有运行时：

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/hayden-oct10-browsers \
PLAYWRIGHT_FIREFOX_EXECUTABLE=/tmp/hayden-oct10-firefox \
npx playwright test tests/e2e/navigation.spec.ts
```

## 视觉记录

已查看以下最终截图：

- [桌面收起状态](navigation-2026-10-11/desktop-closed.png)
- [桌面深色展开](navigation-2026-10-11/desktop-dark.png)
- [桌面浅色写作导览](navigation-2026-10-11/desktop-light.png)
- [桌面英文导览](navigation-2026-10-11/desktop-english.png)
- [手机主菜单](navigation-2026-10-11/mobile-menu.png)
- [手机浅色子菜单](navigation-2026-10-11/mobile-submenu.png)
- [手机深色子菜单](navigation-2026-10-11/mobile-dark.png)
