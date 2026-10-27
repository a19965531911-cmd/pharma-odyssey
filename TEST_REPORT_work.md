# v0.3 QA 记录

日期：2026-10-20（Asia/Shanghai）

## 已执行

- `node --check world.js`：通过。
- `node --check game.js`：通过。
- `python -m http.server 4173`：通过，浏览器可加载运行时资源。
- Edge in-app browser 首屏：通过，显示角色创建。
- 角色创建：通过，昵称和外观写入同一存档 key。
- 雨夜码头：通过，看到 Lumi、警告牌、返航小艇；WASD/点击移动提示可见。
- Lumi 对话：通过，自动切入起源学院大厅。
- 学院大厅：通过，显示 Blender `hall_A_3d.png` 背景、NPC 与登记簿/双环仪/档案柜热点。
- 探索层控制台：未发现影响功能的 error 日志。
- `node tests\offline.cjs`：通过，self-contained 入口、双语教学和旧版脚本无异常。
- `node tests\smoke.cjs`：通过，旧版入口和双语脚本无异常。

## 未完成或未在本环境完全验证

- 未逐题自动完成八课全部七阶段和 Boss 八题；原有 v0.2 测试脚本与教学引擎仍保留，需继续跑完整回归。
- 旧版 `storage-mobile.cjs` 仍按“地图按钮首次可见”假设操作，在新探索壳默认入口下超时；这属于测试脚本尚未迁移到新入口，已保留为待修复测试项。
- Blender 源文件没有改写为实时 WebGL 几何；运行时使用同机位烘焙层，透明前景已接入但复杂遮挡仍需更多机位截图确认。
- 未生成 Windows 独立 exe；交付使用本地 HTTP 启动脚本，避免 `file://` 限制。

## 2026-10-21 增量验证

- `npm run lint`：通过。
- `npm run build`：通过；Vite 产物生成成功。
- `npm test`：通过，19/19。
- `npm run typecheck`：通过。
- 复现大厅过曝问题并修正：大厅使用场景级曝光、材质亮度、纹理抑制和画布对比度校正；其他场景保持原显示设置。
- 浏览器实测：角色创建、雨夜码头、Lumi 对话、学院大厅加载和 NPC/热点标签均可见。

当前仍未宣称完整通关；八课逐题、Boss 全流程和最终 Windows 打包仍需单独回归确认。
