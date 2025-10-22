import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CSSProperties } from 'styled-components';
import { Draggable, FlowLayout, Layout, Provider } from '..';
import { LayoutItem } from '../types';
import { checkArray, getNewLayouts, UUID } from '../utils';

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
];

const containerStyle: CSSProperties = {
  float: 'left',
  width: '100%',
  border: '1px solid #000',
  height: 500,
  overflow: 'auto',
};

export const Default: React.FC = () => {
  const [layouts, setLayouts] = useState<LayoutItem[]>(mockLayouts);
  const [isResetLayout, setIsResetLayout] = useState<boolean>(false);
  const [isDropContainer, setIsDropContainer] = useState<boolean>(false);
  const ref1 = useRef(null);
  const [layouts2, setLayouts2] = useState<LayoutItem[]>([
    { i: '3', x: 0, y: 0, w: 2, h: 20 },
    { i: '4', x: 2, y: 0, w: 2, h: 20 },
  ]);

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
      if (item.isCanvas) {
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

  type BoxProps = {
    [key: string]: any;
  };

  const Box: React.FC<BoxProps> = (props) => {
    const { item, drag } = props;

    useEffect(() => {
      const el = document.querySelector(`div[data-id=${item}]`);
      drag?.(el);
    }, []);

    return (
      <div data-id={item} style={{ border: '1px solid #ddd', height: '80px' }}>
        <div>
          3232323
          <div>
            12121
            <div>{item.substring(1, 5)}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderFlowLayoutItem = (item) => {
    return <Box item={item} data-flow={{ i: item }} key={item}></Box>;
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

  const onFlowLayoutHover = () => {
    if (isResetLayout) return;
    setIsResetLayout(true);
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

  const renderItem1 = useCallback(
    (item) => {
      if (item.isCanvas) {
        return (
          <div data-grid={item} key={item.i} data-i={item.i}>
            <FlowLayout
              layoutItem={item}
              empty={<EmptyContainer />}
              onDrop={onFlowLayoutDrop}
              onHover={onFlowLayoutHover}
              onLayoutChange={onLayoutChange}
            >
              {renderFlowLayout(item.children)}
            </FlowLayout>
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

  const onFlowLayoutDrop = (layoutItem: any, draggingItem: any) => {
    // 如果组件是从网格布局中拖入到流式容器内，那么原有网格布局中的组件，应该删除
    const tempLayouts = layouts.filter((item) => item.i !== draggingItem.i);
    // 根据layoutItem，获取最新的layouts
    const newLayouts = getNewLayouts(tempLayouts, layoutItem);

    setLayouts(newLayouts);
  };

  const onDrop1 = (_layouts, layoutItem, dragInfo, group) => {
    if (dragInfo.type !== group) {
      setLayouts(_layouts.slice());
    }
  };

  const onClick = () => {
    setLayouts2(
      layouts2.map((l) => {
        l.x += 1;
        l.y += 1;
        return l;
      })
    );
  };

  useEffect(() => {
    ref1.current.resize();
  }, []);

  const onDragStartBox = () => {
    setIsDropContainer(false);
  };

  const onDragStartCon = () => {
    setIsDropContainer(true);
  };
  return (
    <Provider>
      <Draggable data={{ i: UUID() }} onDragStart={onDragStartBox}>
        组件1
      </Draggable>
      <Draggable data={{ i: UUID() }} onDragStart={onDragStartBox}>
        组件2
      </Draggable>
      <Draggable data={{ i: UUID() }} onDragStart={onDragStartCon}>
        容器
      </Draggable>
      <div style={{ marginBottom: 20 }}>
        <button onClick={onClick}>change Layout</button>
      </div>
      <div style={containerStyle} id="grid-layout">
        <Layout
          style={{ minHeight: '100%' }}
          layouts={layouts}
          droppingItem={isDropContainer ? droppingContainer : droppingItem}
          rowHeight={1}
          cols={12}
          ref={ref1}
          margin={[10, 10]}
          containerPadding={[0, 0]}
          onDrop={onDrop1}
          onDragOver={(l) => {
            delete l.minW;
          }}
          onLayoutChange={(layouts) => {
            setLayouts(layouts);
          }}
        >
          {layouts.map((item) => renderItem1(item))}
        </Layout>
      </div>
    </Provider>
  );
};
