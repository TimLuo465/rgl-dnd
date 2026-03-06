import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_FLOW_LAYOUT,
  DEFAULT_GROUP,
  DEFAULT_POSITION_LAYOUT,
  Draggable,
  FlowLayout,
  Layout,
  Provider,
} from '..';
import PositionLayout from '../components/position-layout/Layout';
import { LayoutItem } from '../types';
import { checkArray, cloneLayouts, UUID } from '../utils';
import './index.less';

export default {
  title: 'rgl-dnd',
};

const mockLayouts = [
  {
    i: 'a3987f12300f452289c74e0d87893569',
    x: 0,
    y: 0,
    w: 3,
    h: 10,
    selected: false,
  },
  {
    i: 'a3987f12300f452289c74e0d87893369',
    x: 0,
    y: 10,
    w: 11,
    h: 10,
    flow: true,
    isCanvas: true,
    selected: false,
    children: [],
  },
  {
    i: 'a3987f12300f452289c74e0d87893367',
    x: 0,
    y: 20,
    w: 3,
    h: 10,
    selected: false,
  },
  {
    i: 'a3987f12300f452289c74e0d87893360',
    x: 0,
    y: 30,
    w: 11,
    h: 20,
    position: true,
    isCanvas: true,
    selected: false,
    children: ['a3987f12300f452289c74e0c87893367', 'a3987f12300f452289c74e0b87893365'],
  },
  {
    i: 'a3987f12300f452289c74e0c87893367',
    pId: 'a3987f12300f452289c74e0d87893360',
    x: 0,
    y: 0,
    w: 300,
    h: 150,
    selected: false,
  },
  {
    i: 'a3987f12300f452289c74e0b87893365',
    pId: 'a3987f12300f452289c74e0d87893360',
    x: 300,
    y: 0,
    w: 400,
    h: 120,
    selected: false,
  },
];

export const Default: React.FC = () => {
  const [layouts, _setLayouts] = useState<LayoutItem[]>(mockLayouts);
  const [isDropContainer, setIsDropContainer] = useState<boolean>(false);
  const defaultLayoutMap = useMemo(() => {
    return mockLayouts.reduce((prev, cur) => {
      prev[cur.i] = cur;
      return prev;
    }, {});
  }, []);
  const layoutMap = useRef(defaultLayoutMap);

  const setLayouts = (layouts: LayoutItem[]) => {
    layoutMap.current = layouts.reduce((prev, cur) => {
      prev[cur.i] = cur;
      return prev;
    }, layoutMap.current);
    _setLayouts(layouts);
  };

  const getLayoutItem = (i: string) => {
    return layoutMap.current[i];
  };

  const sanitizeLayoutItem = (item: LayoutItem, clearParent = false): LayoutItem => {
    const nextItem = { ...item };
    delete nextItem.extra;
    if (clearParent) {
      delete nextItem.pId;
    }
    return nextItem;
  };

  const upsertLayoutItem = (targetLayouts: LayoutItem[], item: LayoutItem) => {
    const index = targetLayouts.findIndex((l) => l.i === item.i);
    if (index > -1) {
      targetLayouts[index] = item;
    } else {
      targetLayouts.push(item);
    }
    layoutMap.current[item.i] = item;
    return index;
  };

  const removeChildFromParent = (
    targetLayouts: LayoutItem[],
    parentId: string | undefined,
    childId: string
  ) => {
    if (!parentId) return;

    const pIndex = targetLayouts.findIndex((l) => l.i === parentId);
    if (pIndex < 0) return;

    const parent = targetLayouts[pIndex];
    const nextParent = {
      ...parent,
      children: (parent.children || []).filter((id) => id !== childId),
    };

    targetLayouts[pIndex] = nextParent;
    layoutMap.current[parentId] = nextParent;
  };

  const droppingItem = {
    i: UUID(),
    w: 3,
    h: 10,
    x: 0,
    y: 0,
  };

  const droppingContainer = {
    i: UUID(),
    x: 0,
    y: 0,
    w: 12,
    h: 8,
    isCanvas: true,
    autoHeight: true,
    children: [],
  };

  const renderFlowLayout = (data) => {
    if (!checkArray(data)) return;
    return data.map((item) => {
      if (item.flow) {
        return (
          <div data-flow={item} key={item.i}>
            <FlowLayout
              layouts={layouts}
              layoutItem={item}
              onDrop={onFlowLayoutDrop}
              empty={EmptyContainer}
            >
              {renderFlowLayout(item.children)}
            </FlowLayout>
          </div>
        );
      }
      return renderFlowLayoutItem(item);
    });
  };

  const onResizeStop = (data: LayoutItem) => {
    const curr = getLayoutItem(data.i);

    if (curr) {
      layoutMap.current[data.i] = data;
      setLayouts([...layouts]);
    }
  };

  const renderPositionLayout = (data) => {
    if (!checkArray(data)) return;
    return data.map((item) => {
      if (item.position) {
        return (
          <div data-position={item} key={item.i}>
            <PositionLayout
              layoutItem={item}
              onDrop={onPositionLayoutDrop}
              empty={EmptyContainer}
              onResizeStop={onResizeStop}
            >
              {renderPositionLayout(item.children)}
            </PositionLayout>
          </div>
        );
      }
      return renderPositionLayoutItem(item);
    });
  };

  type BoxProps = {
    [key: string]: any;
  };

  const Box: React.FC<BoxProps> = (props) => {
    const { item, drag } = props;
    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (boxRef.current) {
        drag?.(boxRef.current);
      }
    }, [drag, item.i]);

    return (
      <div
        ref={boxRef}
        data-id={item.i}
        style={{ border: '1px solid #ddd', height: '100%', minHeight: '80px' }}
      >
        <div>子组件：</div>
        <div>{item.i.substring(1, 5)}</div>
      </div>
    );
  };

  const renderFlowLayoutItem = (item) => {
    return <Box item={item} data-flow={item} key={item.i}></Box>;
  };

  const renderPositionLayoutItem = (item) => {
    return <Box item={item} data-position={item} key={item.i}></Box>;
  };

  const EmptyContainer: React.FC = () => {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '90px',
          color: '#a7b1bd',
          height: '100%',
        }}
      >
        请拖入组件
      </div>
    );
  };

  const onLayoutChange = useCallback(
    (newLayoutItem: any) => {
      const newLayouts = layouts.map((item: any) => {
        if (item.i === newLayoutItem.i) {
          item.h = newLayoutItem.h;
          return item;
        }
        return item;
      });
      setLayouts(newLayouts);
    },
    [layouts]
  );

  const syncTopLevelLayouts = useCallback(
    (_layouts: LayoutItem[]) => {
      const newLayouts = cloneLayouts(layouts);

      _layouts.forEach((layout) => {
        const current = newLayouts.find((l) => l.i === layout.i);
        const merged = sanitizeLayoutItem(
          {
            ...(current || layout),
            ...layout,
            children: current?.children ?? layout.children,
          },
          true
        );
        upsertLayoutItem(newLayouts, merged);
      });

      setLayouts(newLayouts);
    },
    [layouts]
  );

  const renderItem = useCallback(
    (item) => {
      if (item.flow) {
        return (
          <div data-grid={item} key={item.i} data-i={item.i}>
            <FlowLayout
              layoutItem={item}
              empty={<EmptyContainer />}
              onDrop={onFlowLayoutDrop}
              onLayoutChange={onLayoutChange}
            >
              {renderFlowLayout(item.children.map((i) => getLayoutItem(i)))}
            </FlowLayout>
          </div>
        );
      }
      if (item.position) {
        return (
          <div data-grid={item} data-id={item.i} key={item.i}>
            <PositionLayout
              layoutItem={item}
              empty={<EmptyContainer />}
              onDrop={onPositionLayoutDrop}
              onResizeStop={onResizeStop}
            >
              {renderPositionLayout(item.children.map((i) => getLayoutItem(i)))}
            </PositionLayout>
          </div>
        );
      }
      return (
        <div data-grid={item} data-id={item.i} key={item.i}>
          {item.i.substring(1, 5)}
        </div>
      );
    },
    [layouts]
  );

  const onPositionLayoutDrop = (
    layoutItem: LayoutItem,
    draggingItem: LayoutItem,
    _itemType: string
  ) => {
    const newLayouts = cloneLayouts(layouts);
    const currDraggingItem = newLayouts.find((l) => l.i === draggingItem.i);
    const sourceParentId = currDraggingItem?.pId || draggingItem.pId;
    const nextDraggingItem = sanitizeLayoutItem({
      ...(currDraggingItem || draggingItem),
      ...draggingItem,
      pId: layoutItem.i,
    });

    upsertLayoutItem(newLayouts, nextDraggingItem);

    if (sourceParentId && sourceParentId !== layoutItem.i) {
      removeChildFromParent(newLayouts, sourceParentId, draggingItem.i);
    }

    const index = newLayouts.findIndex((l) => l.i === layoutItem.i);
    if (index > -1) {
      const targetParent = newLayouts[index] || layoutItem;
      const children = targetParent.children || [];
      const hasDraggingItem = children.includes(draggingItem.i);

      newLayouts[index] = {
        ...targetParent,
        children: hasDraggingItem ? children : [...children, draggingItem.i],
      };
      layoutMap.current[layoutItem.i] = newLayouts[index];
    }

    layoutMap.current[draggingItem.i] = nextDraggingItem;
    setLayouts(newLayouts);
  };

  const onFlowLayoutDrop = (layoutItem: any, draggingItem: any, itemType: string) => {
    const newLayouts = cloneLayouts(layouts);
    const isGridSource = itemType.indexOf(DEFAULT_GROUP) === 0;
    const isPositionSource = itemType.indexOf(DEFAULT_POSITION_LAYOUT) === 0;

    if (isGridSource || isPositionSource) {
      const item = newLayouts.find((l) => l.i === draggingItem.i);
      const pIndex = newLayouts.findIndex((l) => l.i === layoutItem.i);
      const parentId = item?.pId || draggingItem.pId;

      if (item) {
        const nextItem = sanitizeLayoutItem(
          {
            ...item,
            ...draggingItem,
            pId: layoutItem.i,
          },
          false
        );
        upsertLayoutItem(newLayouts, nextItem);
      }

      if (isPositionSource && parentId) {
        removeChildFromParent(newLayouts, parentId, draggingItem.i);
      }

      if (pIndex > -1) {
        newLayouts[pIndex] = layoutItem;
        layoutMap.current[layoutItem.i] = layoutItem;
      }
    }

    setLayouts(newLayouts);
  };

  const onLayoutDrop = (_layouts, droppedItem: LayoutItem, dragInfo: { type: string }) => {
    const isPositionSource = dragInfo?.type.indexOf(DEFAULT_POSITION_LAYOUT) === 0;
    const isFlowSource = dragInfo?.type.indexOf(DEFAULT_FLOW_LAYOUT) === 0;

    if (isPositionSource || isFlowSource) {
      const newLayouts = cloneLayouts(layouts);
      const dragIndex = newLayouts.findIndex((l) => l.i === droppedItem.i);
      const parentId = newLayouts[dragIndex]?.pId || droppedItem.pId;

      // Sync all top-level grid items with the final drop result to avoid post-drop reflow mismatch.
      _layouts.forEach((layout) => {
        const current = newLayouts.find((l) => l.i === layout.i);
        const merged = sanitizeLayoutItem(
          {
            ...(current || layout),
            ...layout,
            children: current?.children ?? layout.children,
          },
          true
        );
        upsertLayoutItem(newLayouts, merged);
      });

      removeChildFromParent(newLayouts, parentId, droppedItem.i);

      const currentDroppedItem = newLayouts.find((l) => l.i === droppedItem.i);
      const mergedDroppedItem = sanitizeLayoutItem(
        {
          ...(currentDroppedItem || droppedItem),
          ...droppedItem,
        },
        true
      );
      upsertLayoutItem(newLayouts, mergedDroppedItem);

      setLayouts(newLayouts);
      return;
    }

    syncTopLevelLayouts(_layouts.slice());
  };

  const onDragStartBox = () => {
    setIsDropContainer(false);
  };

  const onDragStartCon = () => {
    setIsDropContainer(true);
  };
  return (
    <Provider>
      <div className="drag-coms">
        <Draggable data={{ i: UUID() }} onDragStart={onDragStartBox}>
          组件1
        </Draggable>
        <Draggable data={{ i: UUID(), flow: true, isCanvas: true }} onDragStart={onDragStartCon}>
          流式布局容器
        </Draggable>
        <Draggable
          data={{ i: UUID(), position: true, isCanvas: true }}
          onDragStart={onDragStartCon}
        >
          绝对定位容器
        </Draggable>
      </div>
      <div id="grid-layout">
        <Layout
          style={{ minHeight: '100%' }}
          droppingItem={isDropContainer ? droppingContainer : droppingItem}
          layouts={layouts.filter((item) => !item.pId)}
          rowHeight={1}
          cols={12}
          margin={[10, 10]}
          containerPadding={[0, 0]}
          onDrop={onLayoutDrop}
          onLayoutChange={syncTopLevelLayouts}
        >
          {layouts.filter((item) => !item.pId).map((item) => renderItem(item))}
        </Layout>
      </div>
    </Provider>
  );
};
