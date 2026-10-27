# 神经城修改记录

日期：2026-10-22

入口修复：学院大厅的药效塔航路目标从书架碰撞体内 `[-6.5, 0, -4]` 移至开放通道 `[-4.6, 0, -4]`。新增 `tests/pd-entry-e2e.cjs`，从原卡住角落实测点击入口并进入 `pd`；记录与截图在 `reports/pd-entry/`。修复已同步到 4174 服务的生产快照；旧快照入口保存在 `index.before-pd-entry-fix.html`。

## 新增

- `src/world02/data.js`：00–08 九区及双线门槛、结构化药理操作和题目。
- `src/world02/simulation.js`：受体作用、反射性心率趋势、升压翻转、选择性阻断、AChE 与机械肌肉。
- `src/world02/city.js`：海面、九个立体地标、独立道路桥梁、平台高差、街景、粒子、酶轮、眼部/腺体/胃肠/心脏装置、机械臂、钟塔仪表、镜廊和急救监护。
- `src/world02/controller.js`：近距交互、地图追踪、任务与图鉴、可重试问题、两病例、Boss 九题三阶段、剧情结局和残缺航图标记。
- `src/world02/nerve.css`、`departure.css`：桌面和窄屏样式。
- `tests/world02.test.mjs`：药理趋势、存档与动线路径检查。
- `tests/world02-e2e.cjs`：真实 Edge / Playwright 逐区测试与截图。
- `WORLD02_README.md`、`WORLD02_TEST_REPORT.md`、本文件。

## 修改

- `src/main.js`：起源岛结局航路、第二岛载入与原有 UI 入口分流；补全原本空白的 Lucide 工具图标；提供 `PharmaWorld` 诊断入口，与既有 `PharmaStore` / `PharmaLearning` 一致。
- `src/engine/world.ts`：程序化场景载入、相机跟随/缩放、地形高度和实时模型状态；修复高速寻路越过拐点。
- `src/engine/navigation.js`：实体城市可通行范围检查及内凹道路边缘的寻路余量。
- `src/story/story.js`：神经城进入权限。
- `src/persistence/store.js`：新增第二岛数据导入结构校验，保留原存档版本与迁移策略。
- `src/vite-env.d.ts`：补充 Vite 类型声明，兼容同工作区引擎开发使用的 `ImportMeta.env`。
- `dist/`：由生产构建生成。
- `backup/world02-verified-build-20261022/`：最后通过13项浏览器流程的固定构建，供隔离热更新后复验。

## 保留

原有学习课件数据、第一岛场景 GLB、角色、音频、旧版 HTML、历史存档字段。未安装收费服务、未替换渲染引擎、未清理用户文件。
