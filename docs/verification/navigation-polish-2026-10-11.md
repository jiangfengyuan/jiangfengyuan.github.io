# 标题展开导览与动画细化 · 2026-10-11

## 交互与实现

- `Header.astro` 保留现有导览内容，删除独立小箭头；标题变为带 aria-expanded / aria-controls 的按钮。桌面实际指针移动后约 90ms 展开，也可点击；手机整行点击展开。再次点击当前栏目保持展开。
- Enter、Space、方向下键进入导览；手机返回、关闭、遮罩及 Escape 保留，焦点返回对应入口。品牌返回首页，栏目页面通过面板内主要链接访问。没有 JavaScript 时原标题链接可直接访问。
- `navigation.ts` 用同一个测量高度的面板承载手机主菜单和各子菜单。栏目切换与返回先让旧内容 140ms 淡出，新内容随后 360ms 淡入、移动约 6px；三列延迟 0 / 40 / 80ms。旧内容立即 inert，不接受点击或焦点。
- 每次选择取消前一次动画，读取当前透明度与位移后继续；CSS 高度过渡由当前视觉高度衔接到新高度。减少动态效果时即时切换。保留 WebKit 链接激活、路由清理与静止鼠标保护。
- `navigation.css`：展开 440ms、收起 360ms，平滑减速曲线；遮罩 320ms，胶囊圆角 380ms。手机主菜单限制可用高度并内部滚动，标题下划线固定 24px，避免整行按钮造成下划线拉伸。
- 未增加动画库，未修改文章日期、CMS 或发布逻辑；工作区其他改动保留。

## 验证

- 内容测试：5 项通过。
- 构建：52 文件类型检查 0 错误、0 警告、0 提示；19 页面完成。
- Chrome、WebKit、Firefox 的导航 18 项及既有页面/空间回归 31 项，共 49 项通过。覆盖无箭头、标题展开不跳转、悬停后点击保持展开、方向下键/Enter/Space、焦点返回、连续切换、动画中关闭、遮罩关闭、链接跳转和路由清理。
- 覆盖双语、明暗主题、320px 与 689px、200% 文字、320px 短屏主菜单与子菜单滚动、无脚本、减少动态效果；展开菜单 axe 检查通过。最终下划线修正后另复查三浏览器放大文字与展开菜单场景。
- 自动化断言检查展开/收起时长、列入场时长与延迟、旧内容 inert 和最终高度。录像记录桌面悬停/切换、双语/主题、手机进入/返回与动画中关闭；高度和透明度分时采样见 JSON。
- 以上为本机浏览器模拟，未进行真机验收；未提交、推送或上线。

## 视觉与动画记录

- [桌面收起](navigation-polish-2026-10-11/desktop-closed.png)
- [桌面浅色](navigation-polish-2026-10-11/desktop-light.png)
- [桌面深色](navigation-polish-2026-10-11/desktop-dark.png)
- [桌面英文](navigation-polish-2026-10-11/desktop-english.png)
- [689px 手机主菜单](navigation-polish-2026-10-11/mobile-689-main.png)
- [689px 手机子菜单](navigation-polish-2026-10-11/mobile-689-submenu.png)
- [320px 手机深色子菜单](navigation-polish-2026-10-11/mobile-320-dark.png)
- [交互动画录像](navigation-polish-2026-10-11/interaction.webm)
- [高度与透明度采样](navigation-polish-2026-10-11/animation-samples.json)

复测：

```sh
npm test
npm run build
PLAYWRIGHT_BROWSERS_PATH=/tmp/hayden-oct10-browsers \
PLAYWRIGHT_FIREFOX_EXECUTABLE=/tmp/hayden-oct10-firefox \
npx playwright test tests/e2e/navigation.spec.ts tests/e2e/site.spec.ts tests/e2e/spatial.spec.ts
```

本地预览：`http://127.0.0.1:4330/blog/`。
