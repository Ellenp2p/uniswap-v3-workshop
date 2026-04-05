# Uniswap V3 Workshop — AI 辅助开发指南

> 本文档帮助 AI 助手快速理解项目结构和开发规范。

## 项目概览

这是一个 Uniswap V3 教学模拟器，包含两个部分：

1. **核心库** (`packages/core/src/`) — 纯 TypeScript 实现的 Uniswap V3 数学模型，精确复现链上行为
2. **前端** (`packages/frontend/`) — React 19 + Vite + Tailwind CSS v4 的交互式教学界面

## 快速理解项目

### 核心概念

```
Token0 ──────┐
             ├─── UniswapV3Pool ───→ 价格、流动性、手续费
Token1 ──────┘

关键操作:
  mint   → 在 [tickLower, tickUpper] 范围内添加流动性
  swap   → 按指定方向交换代币，价格随之变化
  burn   → 移除指定范围的流动性
  collect → 收取累计的手续费
```

### 关键文件

| 文件 | 作用 | AI 需要知道的 |
|------|------|---------------|
| `packages/core/src/pool/pool.ts` | 核心池类，实现所有 V3 逻辑 | 所有数学运算使用定点数，模拟 Solidity 行为 |
| `src/libraries/tickMath.ts` | Tick ↔ Price 转换 | `P = 1.0001^tick` |
| `src/libraries/sqrtPriceMath.ts` | 价格相关计算 | 使用 Q64.96 定点数 |
| `src/libraries/liquidityMath.ts` | 流动性计算 | `L = √(x × y)` |
| `src/libraries/swapMath.ts` | 交换计算 | 处理跨 Tick 交换 |
| `packages/frontend/src/store/poolStore.ts` | 全局状态管理 | Zustand store，多池子支持 |
| `packages/frontend/src/components/ActionPanel.tsx` | 操作表单 | 所有用户操作的入口 |

### 数据流

```
用户操作 (ActionPanel)
  → Zustand store (poolStore.ts)
    → UniswapV3Pool 方法
      → 更新 pool 状态
    → 记录到 history
  → UI 组件自动响应更新
```

## 开发规范

### TypeScript

- 严格模式，不允许 `any`
- 所有 bigint 字面量使用 `n` 后缀
- 错误处理使用 `try/catch` + 中文错误信息

### React 组件

- 使用函数组件 + hooks
- 不需要导入 React（jsx runtime 自动处理）
- 组件文件使用 PascalCase 命名
- 使用 Tailwind CSS v4 类名
- 所有用户可见文本使用中文

### 状态管理

- 使用 Zustand `create` 创建 store
- 使用 `useStore(selector)` 选择状态
- 使用 `useActivePool()` hook 获取当前活跃池子
- 避免在 selector 中创建新对象/数组（会导致无限渲染）

### 样式

- Tailwind CSS v4，使用 `@import "tailwindcss"`
- 自定义颜色在 `index.css` 的 `@theme` 块中定义
- 自定义 tooltip 使用 `.tooltip` 类 + `data-tip` 属性
- 信息图标使用 `.info-icon` 类

## 常见任务

### 添加新的池子操作

1. 在 `src/pool/pool.ts` 中实现方法
2. 在 `frontend/src/store/poolStore.ts` 中添加 action
3. 在 `frontend/src/components/ActionPanel.tsx` 中添加表单
4. 更新 `ActionRecord` 类型（如果需要新操作类型）

### 添加新的 UI 组件

1. 在 `frontend/src/components/` 创建 `.tsx` 文件
2. 使用 Tailwind CSS 类名
3. 在 `App.tsx` 中导入并使用
4. 如果需要 tooltip，使用 `className="tooltip" data-tip="..."`

### 修改池子状态

- 直接修改 `poolStore.ts` 中的 action 逻辑
- 确保更新 `PoolSnapshot` 类型（如果需要新字段）
- 更新 `createSnapshot()` 函数

## 测试

```bash
# 运行所有测试
bun test

# 运行特定测试
bun test tests/pool.test.ts
```

## 构建和部署

```bash
# 安装（根目录 workspace）
bun install

# 类型检查
cd packages/frontend && bun run typecheck

# 构建
cd packages/frontend && bun run build

# 输出到 packages/frontend/dist/
```

GitHub Actions 自动构建并部署到 GitHub Pages。

## 错误码对照表

| 错误码 | 含义 | 中文提示 |
|--------|------|----------|
| SPL | SqrtPriceLimit 越界 | 价格超出允许范围 |
| AS | AmountSpecified 为零 | 交换数量不能为零 |
| tick not found | Tick 未初始化 | 未找到对应的 Tick |
| tick order | Tick 顺序错误 | Tick 下限必须小于上限 |
| tick range | Tick 超出范围 | Tick 超出允许范围 |
| tick spacing | Tick 间距不匹配 | Tick 必须是间距的倍数 |
| position not found | 仓位不存在 | 未找到对应的仓位 |
