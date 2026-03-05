import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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

    useEffect(() => {
      const el = document.querySelector(`div[data-id=${item.i}]`);
      drag?.(el);
    }, []);

    return (
      <div data-id={item} style={{ border: '1px solid #ddd', height: '100%', minHeight: '80px' }}>
        <div>子组件：</div>
        <div>{item.i.substring(1, 5)}</div>
      </div>
    );
  };

  const renderFlowLayoutItem = (item) => {
    return <Box item={item} data-flow={item} key={item}></Box>;
  };

  const renderPositionLayoutItem = (item) => {
    return <Box item={item} data-position={item} key={item}></Box>;
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
    itemType: string
  ) => {
    const newLayouts = cloneLayouts(layouts);

    if (itemType.indexOf(DEFAULT_POSITION_LAYOUT) !== 0) {
      draggingItem.pId = layoutItem.i;

      if (itemType.indexOf(DEFAULT_GROUP) === 0) {
        const dragIndex = newLayouts.findIndex((l) => l.i === draggingItem.i);

        newLayouts.splice(dragIndex, 1);
      }

      const index = newLayouts.findIndex((l) => l.i === layoutItem.i);

      if (index > -1) {
        newLayouts[index] = {
          ...layoutItem,
          children: [...layoutItem.children, draggingItem.i],
        };
        layoutMap.current[layoutItem.i] = newLayouts[index];
      }
    }
    layoutMap.current[draggingItem.i] = draggingItem;
    setLayouts(newLayouts);
  };

  const onFlowLayoutDrop = (layoutItem: any, draggingItem: any, itemType: string) => {
    const newLayouts = cloneLayouts(layouts);

    if (itemType.indexOf(DEFAULT_GROUP) === 0) {
      const item = newLayouts.find((l) => l.i === draggingItem.i);
      const pIndex = newLayouts.findIndex((l) => l.i === layoutItem.i);

      if (item) {
        item.pId = layoutItem.i;
        Object.assign(item, draggingItem);
      }

      if (pIndex > -1) {
        newLayouts[pIndex] = layoutItem;
      }
    }

    setLayouts(newLayouts);
  };

  const onLayoutDrop = (_layouts) => {
    setLayouts(_layouts.slice());
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
          onLayoutChange={setLayouts}
        >
          {layouts.filter((item) => !item.pId).map((item) => renderItem(item))}
        </Layout>
      </div>
    </Provider>
  );
};
