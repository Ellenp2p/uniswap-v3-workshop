# Uniswap V3 Lab — 前端

> React 19 + Vite + Tailwind CSS v4 实现的 Uniswap V3 教学模拟器前端

## 技术栈

| 技术 | 版本 |
|------|------|
| React | 19 |
| Vite | 7 |
| Tailwind CSS | 4 |
| Zustand | 5 |
| Recharts | 3 |
| TypeScript | 5.9 |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查
npm run typecheck

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 项目结构

```
src/
├── store/
│   └── poolStore.ts      # Zustand 状态管理（多池子 + 账户）
├── components/
│   ├── PoolList.tsx      # 池子列表（创建/切换/删除）
│   ├── ActionPanel.tsx   # 操作面板（mint/swap/burn/collect）
│   ├── PoolState.tsx     # 池子状态展示
│   ├── AccountBalances.tsx # 账户余额表
│   ├── TickMap.tsx       # Tick 映射可视化
│   ├── LiquidityChart.tsx # 流动性分布图
│   ├── StorageViewer.tsx # 合约存储查看器
│   ├── StepNavigation.tsx # 操作历史导航
│   └── DiffHighlight.tsx # 差异对比组件
├── utils/
│   └── formatters.ts     # 格式化工具函数
├── App.tsx               # 主应用（布局 + 侧边栏拖拽）
├── main.tsx              # 入口
└── index.css             # Tailwind + 自定义样式
```

## 状态管理

### useStore

全局 Zustand store，管理：
- `pools`: 所有池子状态
- `poolMeta`: 池子元数据（名称、费率等）
- `activePoolId`: 当前选中的池子
- `accounts`: 所有账户余额
- `activeAccountId`: 当前操作账户

### useActivePool()

Hook，返回当前活跃池子的数据：
```typescript
const { pool, meta, history, currentStep, poolCount } = useActivePool();
```

### 操作

| Action | 参数 | 说明 |
|--------|------|------|
| `createPool` | name, feeTier, initialTick, defaultLiquidity | 创建新池子 |
| `switchPool` | id | 切换当前池子 |
| `deletePool` | id | 删除池子 |
| `mint` | tickLower, tickUpper, amount | 添加流动性 |
| `swap` | zeroForOne, amount | 交换代币 |
| `burn` | tickLower, tickUpper, amount | 移除流动性 |
| `collect` | tickLower, tickUpper | 收取手续费 |
| `goToStep` | step | 回退/前进到指定步骤 |
| `setActiveAccount` | id | 切换当前账户 |

## 样式规范

- Tailwind CSS v4，使用 `@import "tailwindcss"`
- 自定义主题色在 `@theme` 块中定义
- Tooltip: `className="tooltip" data-tip="提示内容"`
- 信息图标: `className="info-icon"`

## 构建和部署

```bash
# 开发
npm run dev

# 类型检查
npm run typecheck

# 生产构建（base path 自动适配 GitHub Pages）
npm run build
```

构建输出到 `dist/` 目录。
