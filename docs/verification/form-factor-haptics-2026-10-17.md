# T8 — 设备/能力验证矩阵（2026-10-17）

方法：能力检测 + 渐进增强，不使用 UA 写死。`window.viewport.segments` 物理缝隙检测（JS）为主路径，`horizontal/vertical-viewport-segments` 媒体查询 + `env(viewport-segment-*)` 为纯 CSS fallback；振动走 `navigator.vibrate?.()` 能力检测。

## 已模拟测试（Chromium，tests/e2e/form-factor.spec.ts + spatial.spec.ts）

| 场景 | 覆盖 | 结果 |
| --- | --- | --- |
| 320–430px 竖屏/长屏 | 320×568、360×800、390×844、430×932 | ✅ 无横向溢出，触控目标 ≥44px |
| 1:1 / 3:4 / 4:3 | 720×720、768×1024、600×840、1024×768 | ✅ |
| 16:10 | 1280×800、1440×900、1600×1000 | ✅ |
| 21:9 / 更宽 | 2560×1080、3440×1440 | ✅ 容器 ≤1440px 居中，卡片 ≤500px 不拉宽 |
| 横屏低高度 | 844×390（max-height:500 landscape） | ✅ 导航/hero padding 收缩，Lightbox 关闭键在 visual viewport 内 |
| 双屏竖缝（Galaxy Z Fold 类） | segments [400|gap24|400] | ✅ 限制在最大 lane，不跨折痕 |
| 双屏横缝 | segments 上下两段 | ✅ |
| 三段式屏幕（MateXT 类） | 3 segments 带 gap | ✅ |
| 无缝展开回退 | 相邻无 gap 的 segments / 单 segment | ✅ 不启用 lane 限制 |
| 虚拟键盘压缩 visual viewport | visualViewport.height=360 | ✅ Lightbox 关闭键可达 |
| 振动：主题切换 / 复制邮箱成功 | mock navigator.vibrate | ✅ 仅动作后调用（10ms 单击 / [12,40,12] 双脉冲） |
| 振动：页面加载 / 滚动 / hover | mock 计数 | ✅ 不调用 |
| 振动：API 不存在 | vibrate=undefined | ✅ 静默回退，无报错，视觉/文本反馈完整 |
| 振动：prefers-reduced-motion | emulateMedia reduce | ✅ 不振动，文本反馈仍在 |
| 文字 200% 放大 | 320/768/1440 宽 | ✅ 无横向溢出 |

## 待真机实测（未验证，不宣称已支持）

| 平台 | 能力 | 状态 |
| --- | --- | --- |
| iPhone / iOS Safari | 无 Web 振动 API；未使用非标准 switch hack | 待实测（预期：静默无振动，视觉反馈兜底） |
| Android Chrome | `navigator.vibrate` | 待实测 |
| 鸿蒙 HarmonyOS 浏览器 | `navigator.vibrate` 能力检测 | 待实测 |
| Samsung Galaxy Z Fold（双屏横/竖缝） | viewport.segments / CSS 媒体查询 | 待实测 |
| Huawei MateX / MateXT（外折/三折） | viewport.segments | 待实测 |
| iPhone Duo（Surface Duo 类双屏） | viewport.segments + env(viewport-segment-*) | 待实测 |
| WebKit / Firefox 全量回归 | — | 待 T9/CI 跑对应 project |
