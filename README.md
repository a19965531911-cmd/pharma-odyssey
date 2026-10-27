# ✦ Pharma Odyssey · 雾海失序

> 一座被覆盖的知识航图，一所藏在雾海里的学院。  
> **Pharma Odyssey** 是一款把药理学变成可探索世界的浏览器游戏：走路、调查、做实验、修复证据链，然后决定下一条航路。

[![Play on GitHub Pages](https://img.shields.io/badge/▶%20PLAY-Live%20Demo-e2c27a?style=for-the-badge&labelColor=173d45)](https://a19965531911-cmd.github.io/pharma-odyssey/)
[![Build](https://github.com/a19965531911-cmd/pharma-odyssey/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/a19965531911-cmd/pharma-odyssey/actions/workflows/deploy-pages.yml)
[![Tests](https://img.shields.io/badge/tests-29%20passing-78b892?style=for-the-badge&labelColor=173d45)](#开发者入口)

## 先上船

点击上面的 **PLAY**，或者打开 [在线试玩](https://a19965531911-cmd.github.io/pharma-odyssey/)。第一次进入请创建航图师；之后浏览器会自动保存进度。

| 你会做什么 | 怎么做 |
| --- | --- |
| 探索场景 | `WASD` / 方向键移动；点击地面自动寻路 |
| 调查线索 | 靠近标记后按 `E`，或点击场景标记 |
| 打开航图 | 顶部地图按钮 |
| 进入实验 | 收集证据后打开对应装置，切换药物并观察机制 |
| 保存进度 | 自动保存；设置中可导出/导入 JSON 存档 |

> **小提示**：不要只追着 XP 走。每一条航路都要求你先找到证据，再通过机制考核；错误答案会进入错题日志，方便回头复盘。

## 这不是一张静态海报

- **五个可探索区域**：雨夜码头、起源学院、药效机制塔、药动河谷、个体差异森林，最后面对总论守护者。
- **八课 + Boss**：量效、受体、安全指数、ADME、半衰期、耐受/耐药/依赖、相互作用与安慰剂。
- **真实可操作的教学模型**：在实验台切换变量，观察受体、酶、肌肉和血药浓度的变化，再用证据解释结论。
- **双语航图**：中文游玩，英文辅助；图鉴、来源、错题和存档都跟着你的旅程走。
- **后续世界已经埋下入口**：完成起源岛后可发现神经城、脉流群岛等远期航路。

## 开发者入口

```bash
git clone https://github.com/a19965531911-cmd/pharma-odyssey.git
cd pharma-odyssey
npm ci
npm run dev
```

然后打开 <http://127.0.0.1:5173/>。ES 模块、GLB 场景和音频都需要 HTTP 服务，**不要双击 `index.html`**。

常用命令：

```bash
npm run check      # lint + typecheck + 29 个单元/机制测试 + production build
npm run build      # 生成 dist/
npm run preview    # 预览 production build
npm run test:e2e   # 真实浏览器教学流程回归
```

GitHub Pages 由 `.github/workflows/deploy-pages.yml` 自动发布。构建时会注入仓库子路径，开发服务器仍保持根路径运行。

## 项目地图

| 目录 | 内容 |
| --- | --- |
| `src/engine/` | Three.js 世界、相机、导航和碰撞 |
| `src/learning/` | 课程、题目、双语复盘和学习状态 |
| `src/world02/` | 神经城模块：城市、实验和病例 |
| `src/world03/` | 脉流群岛模块：航线、区域机关和 Boss 逻辑 |
| `public/assets/` | GLB 场景、角色肖像、音频与课程资料 |
| `tests/` | 机制、存档、路径和跨世界回归测试 |

## 设计边界

这是一个原创的药理学学习体验，不是临床决策工具，也不替代教材、教师或医学建议。曲线是教学示意；题目为原创练习，不代表真实考试权重。欢迎提交关卡、机制解释、无障碍和性能方面的 issue。

## License

当前仓库用于课程原型与作品展示。代码、场景、美术和教学内容的授权范围仍在整理中；在明确授权前，请不要将素材拆分用于商业项目。

