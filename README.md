# Uniswap V3 Workshop

> 交互式 Uniswap V3 教学模拟器 — 可视化学习集中流动性做市商机制

[![CI](https://github.com/ellenp2p/uniswap-v3-workshop/actions/workflows/ci.yml/badge.svg)](https://github.com/ellenp2p/uniswap-v3-workshop/actions/workflows/ci.yml)
[![Deploy](https://github.com/ellenp2p/uniswap-v3-workshop/actions/workflows/deploy.yml/badge.svg)](https://github.com/ellenp2p/uniswap-v3-workshop/actions/workflows/deploy.yml)

**在线演示**: https://ellenp2p.github.io/uniswap-v3-workshop/

---

## 功能特性

- 🏊 **多池子管理** — 创建多个不同费率层级的资金池，随时切换对比
- 👥 **多账户模拟** — Alice (LP)、Bob (Trader)、Charlie (Trader) 三种角色
- 📊 **实时可视化** — Tick 映射、流动性分布图、存储状态树
- 🔄 **操作回放** — 完整的操作历史记录，支持前进/后退到任意步骤
- 📱 **响应式设计** — 可拖拽侧边栏，自适应屏幕尺寸
- 🌐 **纯前端** — 无需后端，直接在浏览器中运行

## 快速开始

### 在线使用

直接访问 [在线演示](https://ellenp2p.github.io/uniswap-v3-workshop/) 即可使用，无需安装。

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/ellenp2p/uniswap-v3-workshop.git
cd uniswap-v3-workshop

# 安装依赖（根目录 + 前端）
bun install

# 启动开发服务器
bun run --cwd frontend dev
```

浏览器打开 `http://localhost:5173` 即可访问。

## 项目结构

```
uniswap-v3-workshop/
├── src/                      # 核心库 — Uniswap V3 数学模型
│   ├── pool/pool.ts          # UniswapV3Pool 主类
│   ├── libraries/            # 核心算法库
│   │   ├── sqrtPriceMath.ts  # 价格计算
│   │   ├── tickMath.ts       # Tick 计算
│   │   ├── liquidityMath.ts  # 流动性计算
│   │   ├── swapMath.ts       # 交换计算
│   │   ├── tickBitmap.ts     # Tick 位图
│   │   ├── position.ts       # 仓位管理
│   │   ├── fullMath.ts       # 全精度运算
│   │   ├── bitMath.ts        # 位运算
│   │   ├── unsafeMath.ts     # 不安全运算
│   │   └── oracle.ts         # 预言机
│   ├── constants.ts          # 常量定义
│   ├── types.ts              # 类型定义
│   └── index.ts              # 导出入口
│
├── frontend/                 # 前端应用
│   ├── src/
│   │   ├── store/poolStore.ts    # Zustand 状态管理
│   │   ├── components/           # React 组件
│   │   │   ├── PoolList.tsx      # 池子列表
│   │   │   ├── ActionPanel.tsx   # 操作面板
│   │   │   ├── PoolState.tsx     # 池子状态
│   │   │   ├── AccountBalances.tsx # 账户余额
│   │   │   ├── TickMap.tsx       # Tick 映射
│   │   │   ├── LiquidityChart.tsx # 流动性图表
│   │   │   ├── StorageViewer.tsx # 存储查看器
│   │   │   ├── StepNavigation.tsx # 步骤导航
│   │   │   └── DiffHighlight.tsx # 差异对比
│   │   ├── utils/formatters.ts   # 格式化工具
│   │   ├── App.tsx               # 主应用
│   │   ├── main.tsx              # 入口
│   │   └── index.css             # 样式
│   ├── vite.config.ts
│   └── package.json
│
├── tests/                    # 单元测试
├── scripts/                  # 脚本工具
├── cli/                      # 命令行工具
├── .github/workflows/        # CI/CD
├── README.md
└── AGENTS.md                 # AI 辅助开发指南
```

## 使用指南

### 1. 创建资金池

点击左侧面板 **"+ 新建"** 按钮：

| 参数 | 说明 | 推荐值 |
|------|------|--------|
| 池子名称 | 自定义名称 | ETH/USDC |
| 费率层级 | 手续费比例 | 0.3%（主流交易对） |
| 初始 Tick | 初始价格对应的 Tick | 0（1:1 价格） |
| 默认流动性 | 自动添加的流动性 | 1000 |

创建后会自动添加超宽范围流动性，可立即进行交换操作。

### 2. 添加流动性

选择 **添加** 标签，设置 Tick 范围和数量：

- Tick 下限/上限必须是 Tick 间距的倍数（0.3% 费率 = 60 的倍数）
- 范围越窄，资本效率越高，但被无常损失影响的风险越大

### 3. 交换代币

选择 **交换** 标签，设置方向和数量：

- Token0 → Token1：卖出 Token0，价格下降
- Token1 → Token0：卖出 Token1，价格上升
- 大额交换会穿越多个 Tick，产生更大滑点

### 4. 移除流动性 & 收取手续费

- **移除**：从仓位中移除流动性，按比例返还代币
- **收取**：领取仓位累计的手续费收入

### 5. 操作回放

底部操作历史支持：
- 点击任意步骤回退到该状态
- 上一步/下一步按钮逐步浏览
- "查看当前步骤差异" 对比操作前后的变化

## 技术栈

| 层级 | 技术 |
|------|------|
| 包管理器 | Bun |
| 核心库 | TypeScript (ESM) |
| 前端框架 | React 19 |
| 构建工具 | Vite 7 |
| 状态管理 | Zustand 5 |
| 样式 | Tailwind CSS v4 |
| 图表 | Recharts 3 |
| 测试 | Bun test |

## 核心库使用

```typescript
import {
  UniswapV3Pool,
  FeeTier,
  TICK_SPACING,
  getSqrtRatioAtTick,
  getTickAtSqrtRatio,
} from './src/index.js';

// 创建池子
const sqrtPriceX96 = getSqrtRatioAtTick(0); // tick 0
const pool = new UniswapV3Pool(FeeTier.LOW, TICK_SPACING[FeeTier.LOW], sqrtPriceX96);

// 添加流动性
pool.mint({
  owner: '0x...',
  tickLower: -60,
  tickUpper: 60,
  amount: 100n * 10n ** 18n,
});

// 交换
const result = pool.swap({
  recipient: '0x...',
  zeroForOne: true,
  amountSpecified: 10n * 10n ** 18n,
  sqrtPriceLimitX96: 0n,
});
```

## 开发

```bash
# 运行测试
bun test

# 类型检查
cd frontend && bun run typecheck

# 构建前端
cd frontend && bun run build

# 预览构建结果
cd frontend && bun run preview
```

## 许可证

MIT
