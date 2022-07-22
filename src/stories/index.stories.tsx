import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CSSProperties } from 'styled-components';
import { Draggable, FlowLayout, Layout, Provider } from '..';
import { DEFAULT_GROUP } from '../constants';
import { LayoutItem } from '../types';
import { checkArray } from '../utils';

export default {
  title: 'rgl-dnd',
};

const mockLayouts = [
  {
    i: 'a3987f12300f452289c74e0d87893569',
    x: 0,
    y: 0,
    w: 6,
    h: 12,
    scope: '',
    selected: false,
    minH: 3,
    minW: 1,
    plachodler: true,
  },
  {
    i: 'a3987f12300f452289c74e0d87893561',
    x: 0,
    y: 0,
    w: 12,
    h: 24,
    scope: '',
    selected: false,
    minH: 3,
    minW: 1,
    isContainer: true,
    children: [
      {
        i: '12345678976543',
        parentId: 'a3987f12300f452289c74e0d87893561',
      },
      {
        i: '8765434567',
        parentId: 'a3987f12300f452289c74e0d87893561',
      },
    ],
  },
];

const mockFlowLayouts = [
  {
    i: (Math.random() * 1000000).toString(),
    nodeId: '111',
    type: 'flow-container',
    isContainer: true,
    parentId: 'ROOT',
    children: [
      {
        i: (Math.random() * 1000000).toString(),
        nodeId: '1112',
        type: 'com',
        parentId: '111',
      },
      {
        i: (Math.random() * 1000000).toString(),
        nodeId: '1112',
        type: 'com',
        parentId: '111',
      },
      {
        i: (Math.random() * 1000000).toString(),
        nodeId: '1113',
        type: 'flow-container',
        isContainer: true,
        parentId: '111',
        children: [
          {
            i: (Math.random() * 1000000).toString(),
            nodeId: '11133',
            type: 'com',
            parentId: '1113',
          },
        ],
      },
    ],
  },
];

let comKey = '11';

const containerStyle: CSSProperties = {
  float: 'left',
  width: '49%',
  border: '1px solid #000',
  height: 700,
  overflow: 'auto',
};

const Item: React.FC = () => {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>{count}</button>;
};
export const Default: React.FC = () => {
  const [layouts, setLayouts] = useState<LayoutItem[]>(mockLayouts);
  const [flowLayouts, setFlowLayouts] = useState<any>(mockFlowLayouts);
  const [isResetLayout, setIsResetLayout] = useState<boolean>(false);
  const [clsName, setClsName] = useState<string>('');
  const ref1 = useRef(null);
  const [layouts2, setLayouts2] = useState<LayoutItem[]>([
    { i: '3', x: 0, y: 0, w: 2, h: 20 },
    { i: '4', x: 2, y: 0, w: 2, h: 20 },
  ]);
  const [layouts3, setLayouts3] = useState<LayoutItem[]>([]);
  const mockFlowDroppingItem = {
    i: (Math.random() * 1000000).toString(),
    nodeId: 'sdaf',
  };

  const droppingItem = {
    i: (Math.random() * 1000000).toString() + new Date().getTime(),
    w: 2,
    h: 10,
    minW: 12,
  };
  const deleteItem1 = (i) => {
    const index = layouts.findIndex((l) => l.i === i);

    layouts.splice(index, 1);
    setLayouts(layouts);
  };
  const deleteItem2 = (i) => {
    const index = layouts2.findIndex((l) => l.i === i);

    layouts2.splice(index, 1);
    setLayouts2(layouts2.slice());
  };

  const renderFlowLayoutItem = (item) => {
    return (
      <div
        data-grid={item}
        data-flow={item}
        key={item.i}
        style={{ border: '1px solid #ddd', height: '60px' }}
      >
        {item.i.substring(1, 5)}
        <a href="">{item.i.substring(1, 5)}</a>
        {renderFlowLayout(item.children)}
      </div>
    );
  };

  const EmptyContainer = () => {
    return <div style={{ height: '60px', border: '1px dashed #ccc' }}>请拖入组件</div>;
  };

  const onMouseEnter = () => {
    setIsResetLayout(true);
  };
  const onMouseLeave = () => {
    setIsResetLayout(false);
  };

  const onFlowLayoutHover = () => {
    if (isResetLayout) return;
    setIsResetLayout(true);
  };

  const renderFlowLayout = (data) => {
    if (!checkArray(data)) return;
    return data.map((item) => {
      if (item.isContainer) {
        return (
          <div data-flow={item}>
            <FlowLayout
              layouts={layouts}
              // layouts={flowLayouts}
              layoutItem={item}
              droppingItem={droppingItem}
              onDrop={onFlowLayoutDrop}
              empty={!Array.isArray(item.children) || !item.children.length}
            >
              {renderFlowLayout(item.children)}
            </FlowLayout>
          </div>
        );
      }
      return renderFlowLayoutItem(item);
    });
  };
  const renderItem1 = useCallback(
    (item) => {
      if (item.isContainer) {
        return (
          <div data-grid={item}>
            <FlowLayout
              layouts={layouts}
              // layouts={flowLayouts}
              layoutItem={item}
              droppingItem={droppingItem}
              empty={!Array.isArray(item.children) || !item.children.length}
              onDrop={onFlowLayoutDrop}
              onHover={onFlowLayoutHover}
              // key={comKey}
            >
              {renderFlowLayout(item.children)}
            </FlowLayout>
          </div>
        );
      }
      return (
        <div className="kkk" data-grid={item} key={item.i}>
          {item.i.substring(1, 5)}
          <button onClick={() => deleteItem1(item.i)}>delete</button>
        </div>
      );
    },
    [layouts]
  );
  const onDrop1 = (_layouts, layoutItem, dragInfo, group) => {
    // console.log('gridDrop', _layouts, layoutItem, dragInfo, group);
    if (dragInfo.type !== group) {
      layouts.push(layoutItem);
      if (layoutItem?.parentId) {
        const index = layouts.findIndex((item) => item.i === layoutItem?.parentId);
        if (index > -1) {
          layouts[index].children = layouts[index].children.filter(
            (child) => child.i !== layoutItem.i
          );
        }
      }
      setLayouts(layouts.slice());
    }
  };
  const onDrop2 = (_layouts, layoutItem, dragInfo, group) => {
    if (dragInfo.type !== group) {
      layouts2.push(layoutItem);
      setLayouts2(layouts2.slice());
    }
  };
  const onDrop3 = (_layouts, layoutItem, dragInfo, group) => {
    if (dragInfo.type !== group) {
      layouts3.push({
        ...layoutItem,
        w: 12,
      });
      setLayouts3(layouts3.slice());
    }
  };
  const renderItem2 = useCallback(
    (item) => {
      if (item.i === '3') {
        return (
          <div data-grid={item}>
            <Layout
              nested={true}
              rowHeight={1}
              group={`${DEFAULT_GROUP}__${item.i}`}
              layouts={layouts3}
              margin={[0, 0]}
              onDragOver={(l) => {
                l.minW = 12;
              }}
              containerPadding={[0, 0]}
              style={{ minHeight: '100%' }}
              droppable={layouts3.length < 1}
              droppingItem={{ ...droppingItem, w: 12, h: 5 }}
              onDrop={onDrop3}
              onLayoutChange={setLayouts3}
            />
          </div>
        );
      }
      // console.log('render item');
      return (
        <div
          className={clsName}
          data-grid={item}
          onClick={() => setClsName(new Date().getTime().toString().substring(5))}
        >
          {item.i}-{clsName}
          <Item />
        </div>
      );
    },
    [clsName]
  );
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

  const onFlowLayoutDrop = (layouts: any, layoutItem: any) => {
    // console.log(layouts, layoutItem, 'flwo-drop');
    const newLayouts = layouts.filter((item) => item.i !== layoutItem.i);
    // console.log(newLayouts, '============');
    setLayouts(newLayouts);
    // comKey = Math.random().toString();
    // setFlowLayouts(layouts);
  };

  return (
    <Provider>
      <Draggable onDragStart={console.log} onDragEnd={console.log}>
        <div>Box1</div>
      </Draggable>
      <Draggable>Box2</Draggable>
      <Draggable>Box3</Draggable>
      <div style={{ marginBottom: 20 }}>
        <button onClick={onClick}>change Layout</button>
      </div>
      <div style={containerStyle} id="grid-layout">
        <Layout
          style={{ minHeight: '100%' }}
          layouts={layouts}
          droppingItem={droppingItem}
          rowHeight={1}
          cols={12}
          ref={ref1}
          onDrop={onDrop1}
          onDragOver={(l) => {
            delete l.minW;
          }}
          onLayoutChange={(layouts) => {
            // console.log('onLayoutChange', layouts);
            setLayouts(layouts);
          }}
        >
          {layouts.map((item) => renderItem1(item))}
        </Layout>
      </div>
      {/* <div style={containerStyle}>
        <Layout
          style={{ minHeight: '100%' }}
          droppingItem={droppingItem}
          layouts={layouts2}
          rowHeight={1}
          cols={6}
          margin={[10, 5]}
          onDrop={onDrop2}
          onDragOver={(l) => {
            delete l.minW;
          }}
          onLayoutChange={(layouts) => {
            console.log('change2: ', layouts);
            setLayouts2(layouts);
          }}
        >
          {layouts2.map((item) => renderItem2(item))}
        </Layout>
      </div> */}
      <div style={containerStyle} id="aaa">
        {renderFlowLayout(flowLayouts)}
      </div>
    </Provider>
  );
};
