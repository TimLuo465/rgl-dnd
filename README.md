# rgl-dnd

一个基于 `react-dnd` 的拖拽布局组件库，支持三种容器：

- `Layout`：网格容器（GridLayout）
- `FlowLayout`：流式容器（FlowLayout）
- `PositionLayout`：绝对定位容器（PositionLayout）

## 安装

```bash
npm i rgl-dnd
# or
yarn add rgl-dnd
```

## 快速上手

### 1. 用 `Provider` 包裹画布

库内部依赖 `react-dnd`，必须在最外层使用 `Provider`：

```tsx
import React from 'react';
import { Provider } from 'rgl-dnd';

export default function App() {
  return <Provider>{/* 你的设计器内容 */}</Provider>;
}
```

### 2. 最小可运行的 GridLayout 示例

```tsx
import React, { useMemo, useState } from 'react';
import { Layout, LayoutItem, Provider } from 'rgl-dnd';

const initialLayouts: LayoutItem[] = [
  { i: 'a', x: 0, y: 0, w: 4, h: 6 },
  { i: 'b', x: 4, y: 0, w: 4, h: 6 },
];

export default function Demo() {
  const [layouts, setLayouts] = useState<LayoutItem[]>(initialLayouts);
  const topLayouts = useMemo(() => layouts.filter((item) => !item.pId), [layouts]);

  return (
    <Provider>
      <Layout
        layouts={topLayouts}
        cols={12}
        rowHeight={10}
        margin={[10, 10]}
        containerPadding={[0, 0]}
        onLayoutChange={(next) => {
          setLayouts((prev) =>
            prev.map((item) => next.find((n) => n.i === item.i) || item)
          );
        }}
      >
        {topLayouts.map((item) => (
          <div key={item.i} data-grid={item}>
            {item.i}
          </div>
        ))}
      </Layout>
    </Provider>
  );
}
```

## 组件文档

### GridLayout（`Layout`）

`Layout` 负责网格计算、碰撞、紧凑(compact)、拖拽放置、缩放。

### 使用约束

- 子节点必须是原生 `div`，并且提供 `data-grid={layoutItem}`。
- `layoutItem.i` 必须唯一。
- `layouts` 由外部状态维护，建议把 `onLayoutChange` 作为单一数据入口。

### 常用 Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `layouts` | `LayoutItem[]` | `[]` | 当前网格数据（受控）。 |
| `cols` | `number` | `12` | 列数。 |
| `rowHeight` | `number` | `150` | 每行像素高度。 |
| `margin` | `[number, number]` | `[10, 10]` | item 间距 `[x, y]`。 |
| `containerPadding` | `number[]` | `[10]` | 容器内边距。 |
| `droppable` | `boolean` | `true` | 是否允许接收拖拽。 |
| `droppingItem` | `DroppingItem` | `{ i: '__dropping-elem__', w: 1, h: 1 }` | 外部新拖入组件的默认尺寸。 |
| `compactType` | `'horizontal' \| 'vertical'` | `'vertical'` | 紧凑方向。 |
| `preventCollision` | `boolean` | `false` | 是否禁止碰撞覆盖。 |
| `resizeHandles` | `ResizeHandle[]` | `['se', 'w', 'e', 'n', 's']` | 缩放控制点。 |
| `allowOutBoundedDrop` | `boolean` | `true` | 拖出设计区后是否仍允许 drop。 |
| `enableSnapLine` | `boolean` | `true` | 是否启用缩放吸附线。 |
| `onLayoutChange` | `(layouts, isUserAction, isLayoutChange?) => void` | - | 布局变化回调。 |
| `onDrop` | `(layouts, droppedItem, dragInfo, group) => void` | - | drop 完成回调。 |

### 事件说明

- `onLayoutChange`：
  - `isUserAction=true`：用户拖拽/缩放触发。
  - `isLayoutChange=true`：通常表示布局自动修正（例如 `autoHeight` 导致高度变化）。
- `onDrop`：
  - `dragInfo.type` 可用于判断来源（普通组件、FlowLayout、PositionLayout、其他 Grid group）。

### FlowLayout（`FlowLayout`）

`FlowLayout` 是线性插入容器（按顺序 before/after），适合「列表」「纵向表单区域」等场景。

### 使用约束

- 容器 item 需要维护 `children: string[]`（仅存子项 id）。
- 子节点需提供 `data-flow={layoutItem}`。
- `empty` 必传（为空态渲染）。

### 示例

```tsx
import { FlowLayout } from 'rgl-dnd';

<div data-grid={containerItem}>
  <FlowLayout
    layoutItem={containerItem}
    empty={<div style={{ minHeight: 80 }}>请拖入组件</div>}
    onDrop={(nextContainer, draggingItem, itemType) => {
      // 1) 更新容器 children 顺序（nextContainer.children）
      // 2) 同步 draggingItem 到全局 layouts
      // 3) 如果来源是其他容器，记得从旧父容器 children 中删除
    }}
  >
    {containerChildren.map((child) => (
      <div key={child.i} data-flow={child}>
        {child.i}
      </div>
    ))}
  </FlowLayout>
</div>;
```

### 常用 Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `layoutItem` | `LayoutItem` | - | 当前流式容器 item。 |
| `empty` | `ReactNode` | - | 容器为空时展示内容（必传）。 |
| `droppable` | `boolean` | `true` | 是否允许放置。 |
| `canDrop` | `boolean` | `true` | 业务级控制，`false` 时仅显示拒绝状态。 |
| `itemDraggable` | `boolean` | `true` | 容器内子项是否可拖拽。 |
| `allowOutBoundedDrop` | `boolean` | `true` | 拖拽结束时容错接收。 |
| `classNameStr` | `string` | `''` | 容器 className。 |
| `onDrop` | `(layoutItem, item, itemType) => void` | - | 放置成功/失败回调（失败时 `layoutItem` 为 `null`）。 |
| `onHover` | `(item, itemType) => void` | - | hover 回调。 |
| `onDragEnd` | `(item, didDrop, itemType, isMoveOut) => void` | - | 拖拽结束回调。 |

### PositionLayout（`PositionLayout`）

`PositionLayout` 是绝对定位容器，支持自由拖动、8 向缩放、吸附线对齐，以及 zIndex 层级管理。

### 使用约束

- 容器 item 同样需要维护 `children: string[]`。
- 子节点需提供 `data-position={layoutItem}`。
- 子节点建议维护 `zIndex`（正整数，最小值为 `1`）。
- 组件内部会渲染占位元素到 `document.body`，用于拖拽预览与吸附。

### 示例

```tsx
import React, { useRef, useState } from 'react';
import { LayoutItem, PositionLayout, PositionLayoutRef } from 'rgl-dnd';

function Demo() {
  const [layouts, setLayouts] = useState<LayoutItem[]>([]);
  const [activeId] = useState<string>('');
  const positionLayoutRef = useRef<PositionLayoutRef | null>(null);
  const positionContainer = {} as LayoutItem;
  const positionChildren: LayoutItem[] = [];

  const mergeChangedItems = (changedItems: LayoutItem[]) => {
    if (!changedItems.length) return;

    const changedMap = changedItems.reduce((map, item) => {
      map[item.i] = item;
      return map;
    }, {} as Record<string, LayoutItem>);

    setLayouts((prev) =>
      prev.map((item) => {
        const changed = changedMap[item.i];
        return changed ? { ...item, ...changed } : item;
      })
    );
  };

  return (
    <div data-grid={positionContainer}>
      <PositionLayout
        ref={positionLayoutRef}
        layoutItem={positionContainer}
        empty={<div style={{ minHeight: 80 }}>请拖入组件</div>}
        onDrop={(targetContainer, draggingItem, itemType) => {
          // 1) 将 draggingItem 的 x/y/w/h/zIndex 写回全局状态
          // 2) 将 draggingItem 归属到 targetContainer.children
          // 3) 若来自其他容器，移除旧父容器中的 child id
          // 4) 新拖入元素默认位于当前容器顶层（max zIndex + 1）
        }}
        onResizeStop={(item) => {
          // 将缩放后的 x/y/w/h 持久化
        }}
        onZIndexChange={(changedItems) => {
          // changedItems 是本次层级操作后所有受影响元素（批量）
          mergeChangedItems(changedItems);
        }}
      >
        {positionChildren.map((child) => (
          <div key={child.i} data-position={child}>
            {child.i}
          </div>
        ))}
      </PositionLayout>

      <button onClick={() => positionLayoutRef.current?.bringForward(activeId)}>上移一层</button>
      <button onClick={() => positionLayoutRef.current?.sendBackward(activeId)}>下移一层</button>
      <button onClick={() => positionLayoutRef.current?.bringToFront(activeId)}>置于顶层</button>
      <button onClick={() => positionLayoutRef.current?.sendToBack(activeId)}>置于底层</button>
    </div>
  );
}
```

### 常用 Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `layoutItem` | `LayoutItem` | - | 当前绝对定位容器 item。 |
| `empty` | `ReactNode` | - | 空态内容。 |
| `droppable` | `boolean` | `true` | 是否允许放置。 |
| `canDrop` | `boolean` | `true` | 业务级控制。 |
| `className` | `string` | `''` | 容器 className。 |
| `onDrop` | `(layoutItem, item, itemType) => void` | - | drop 回调（失败时 `layoutItem` 为 `null`）。 |
| `onResizeStop` | `(item) => void` | - | 子项缩放结束回调。 |
| `onZIndexChange` | `(changedItems: LayoutItem[]) => void` | - | 层级变化回调，返回本次受影响的全部元素（已归一化）。 |

### Ref 方法（层级操作）

`PositionLayout` 通过 ref 暴露层级方法：

| 方法 | 参数 | 说明 |
| --- | --- | --- |
| `bringForward` | `(itemId: string)` | 上移一层（与上方相邻层交换）。 |
| `sendBackward` | `(itemId: string)` | 下移一层（与下方相邻层交换）。 |
| `bringToFront` | `(itemId: string)` | 置于顶层。 |
| `sendToBack` | `(itemId: string)` | 置于底层。 |

层级动作规则补充：

- 每次操作后，容器内子项 `zIndex` 会归一化为连续区间 `1..N`。
- 不会出现重复层级值。
- 已在顶层/底层时继续执行对应动作，不会产生变更。

## 数据结构建议

推荐维护一份扁平 `layouts: LayoutItem[]`：

- 顶层 Grid 容器：`!item.pId`
- Flow/Position 容器：通过 `children: string[]` 关联子项
- 子项：通过 `pId`（自定义字段）记录父容器 id，便于跨容器迁移
- PositionLayout 子项：额外维护 `zIndex`，用于层级控制

这样可以统一处理：

- 顶层网格排序（`onLayoutChange`）
- 容器内顺序变更（`FlowLayout.onDrop`）
- 绝对定位坐标与层级更新（`PositionLayout.onDrop / onResizeStop / onZIndexChange`）

## 类型定义

完整类型请查看：

- `src/types/index.ts`

## Build 后自动同步产物

执行 `npm run build` 后，会自动执行 `scripts/postbuild-sync.js`。  
你只需要修改根目录的 `build-sync.config.json` 即可控制行为：

```json
{
  "enabled": false,
  "sourceDir": "dist",
  "targetDir": "",
  "cleanTargetBeforeCopy": true
}
```

- `enabled`: 是否启用自动同步。
- `sourceDir`: 构建产物目录，默认 `dist`。
- `targetDir`: 目标目录（支持绝对路径或相对项目根目录）。
- `cleanTargetBeforeCopy`: 复制前是否清空目标目录。

当 `enabled=true` 时，build 成功后会把 `sourceDir` 的内容复制到 `targetDir`，并按 `cleanTargetBeforeCopy` 配置决定是否先清空旧文件。
