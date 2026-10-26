# NEON SNAKE · 霓虹贪吃蛇

一个使用 **React + TypeScript + Canvas** 编写的纯前端贪吃蛇小游戏。无需后端，打开即玩，最高分会保存在当前浏览器中。

## 玩法

- 使用 `WASD` 或方向键控制转向
- 吃掉粉色能量果，每颗 **+10 分**
- 每吃 5 颗能量果，游戏速度提升一级
- 棋盘边界是环绕的：从一边穿出，会从另一边出现
- 咬到自己的身体，本局结束
- `Space` 暂停 / 继续，`R` 重新开局

手机端可以直接在棋盘上滑动，也可以使用页面中的方向键。

## 功能

- 三种速度档位：悠闲 / 标准 / 狂飙
- Canvas 高帧率渲染、平滑移动、食物脉冲与粒子反馈
- 本地最高分持久化、音效开关持久化
- 键盘、触屏滑动、虚拟方向键三种操作方式
- 完整响应式布局，支持桌面与移动端
- 支持 `prefers-reduced-motion` 减弱动效
- 全量 TypeScript 类型覆盖，严格模式编译

## 本地运行

需要 Node.js 18+。

```bash
npm install
npm run dev
```

打开终端中 Vite 输出的本地地址即可游玩。

类型检查：

```bash
npm run typecheck
```

构建生产版本（会自动执行类型检查）：

```bash
npm run build
npm run preview
```

构建产物位于 `dist/`，可以直接部署到任意静态站点托管服务。

运行核心逻辑测试：

```bash
npm test
```

## 项目结构

```text
src/
├── App.tsx                  # 页面布局与键盘交互
├── main.tsx                 # React 入口
├── styles.css               # 视觉样式与响应式布局
├── vite-env.d.ts            # Vite 类型声明
├── components/
│   └── GameBoard.tsx        # Canvas 渲染与棋盘浮层
└── game/
    ├── constants.ts         # 棋盘、方向、难度常量与类型
    ├── engine.ts            # 纯函数游戏核心逻辑
    ├── useSnakeGame.ts      # 游戏循环、状态与输入调度
    ├── sound.ts             # Web Audio 合成音效
    └── storage.ts           # localStorage 持久化
tests/
└── engine.test.ts           # 移动、碰撞、进食与生成逻辑测试
```
