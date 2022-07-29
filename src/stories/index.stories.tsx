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
    w: 3,
    h: 10,
    // scope: '',
    selected: false,
    // minH: 3,
    // minW: 1,
    // plachodler: true,
  },
  // {
  //   i: 'a3987f12300f452289c74e0d87893561',
  //   x: 0,
  //   y: 0,
  //   w: 12,
  //   h: 24,
  //   scope: '',
  //   selected: false,
  //   minH: 3,
  //   minW: 1,
  //   isContainer: true,
  //   children: [
  //     {
  //       i: '12345678976543',
  //       parentId: 'a3987f12300f452289c74e0d87893561',
  //     },
  //     {
  //       i: '8765434567',
  //       parentId: 'a3987f12300f452289c74e0d87893561',
  //     },
  //   ],
  // },
];

const mockFlowLayouts = [
  {
    i: '1111111111111111',
    nodeId: '111',
    type: 'flow-container',
    isContainer: true,
    parentId: 'ROOT',
    children: [
      {
        i: '398767893432',
        nodeId: '1112',
        type: 'com',
        parentId: '1111111111111111',
      },
      {
        i: '987654345678',
        nodeId: '11122',
        type: 'com',
        parentId: '1111111111111111',
      },
      {
        i: '222222222222222',
        nodeId: '1113',
        type: 'flow-container',
        isContainer: true,
        parentId: '1111111111111111',
        children: [
          {
            i: '1234567899',
            nodeId: '11133',
            type: 'com',
            parentId: '222222222222222',
          },
        ],
      },
    ],
  },
];

let comKey = '11';

const containerStyle: CSSProperties = {
  float: 'left',
  width: '100%',
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
  const [isDropContainer, setIsDropContainer] = useState<boolean>(false);
  const ref1 = useRef(null);
  const [layouts2, setLayouts2] = useState<LayoutItem[]>([
    { i: '3', x: 0, y: 0, w: 2, h: 20 },
    { i: '4', x: 2, y: 0, w: 2, h: 20 },
  ]);
  const [layouts3, setLayouts3] = useState<LayoutItem[]>([]);
  const mockFlowDroppingItem = {
    i: (Math.random() * 1000000).toString(),
  };

  const droppingItem = {
    i: (Math.random() * 1000000).toString(),
    w: 3,
    h: 10,
  };

  const droppingContainer = {
    i: (Math.random() * 1000000).toString(),
    x: 0,
    y: 0,
    w: 12,
    h: 8.545454545454545,
    // h: 23.454545454545453,
    isContainer: true,
    autoHeight: true,
    children: [],
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

  const renderFlowLayoutItem = (item, index) => {
    // return (
    //   <img
    //     src="https://img0.baidu.com/it/u=1734642970,311190705&fm=253&fmt=auto&app=138&f=JPEG?w=889&h=500"
    //     style={{
    //       width: '100px',
    //       height: '100px',
    //       objectFit: 'cover',
    //       verticalAlign: 'middle',
    //     }}
    //     alt={item.i}
    //     data-id={item.i}
    //     data-flow={item}
    //     key={item.i}
    //   />
    // );
    // if (index % 2 === 0) {
    //   return (
    //     <img
    //       src="https://img0.baidu.com/it/u=1734642970,311190705&fm=253&fmt=auto&app=138&f=JPEG?w=889&h=500"
    //       alt=""
    //       style={{
    //         width: '100px',
    //         height: '100px',
    //         objectFit: 'cover',
    //         verticalAlign: 'middle',
    //       }}
    //       data-flow={item}
    //       key={item.i}
    //       data-id={item.i}
    //     />
    //   );
    // }
    return (
      <div
        data-flow={item}
        key={item.i}
        data-id={item.i}
        style={{ border: '1px solid #ddd', height: '80px' }}
      >
        {item.i.substring(1, 5)}
        {renderFlowLayout(item.children)}
      </div>
    );
  };

  const EmptyContainer = () => {
    return (
      <div
        style={{
          height: '80px',
          lineHeight: '80px',
          textAlign: 'center',
          // border: '1px dashed red',
        }}
      >
        请拖入组件
      </div>
    );
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

  const renderFlowLayout1 = (data) => {
    if (!checkArray(data)) return;
    return data.map((item, index) => {
      if (item.isContainer) {
        return (
          <div data-flow={item}>
            <FlowLayout
              layouts={flowLayouts}
              layoutItem={item}
              droppingItem={mockFlowDroppingItem}
              onDrop={onFlowLayoutDrop1}
              EmptyContainer={EmptyContainer}
            >
              {renderFlowLayout1(item.children)}
            </FlowLayout>
          </div>
        );
      }
      return renderFlowLayoutItem(item, index);
    });
  };

  const renderFlowLayout = (data) => {
    if (!checkArray(data)) return;
    return data.map((item, index) => {
      if (item.isContainer) {
        return (
          <div data-flow={item} key={item.i}>
            <FlowLayout
              layouts={layouts}
              layoutItem={item}
              droppingItem={isDropContainer ? droppingContainer : droppingItem}
              onDrop={onFlowLayoutDrop}
              EmptyContainer={EmptyContainer}
            >
              {renderFlowLayout(item.children)}
            </FlowLayout>
          </div>
        );
      }
      return renderFlowLayoutItem(item, index);
    });
  };
  const renderItem1 = useCallback(
    (item) => {
      if (item.isContainer) {
        return (
          <div data-grid={item} key={item.i} data-id={item.i}>
            <FlowLayout
              layouts={layouts}
              layoutItem={item}
              droppingItem={isDropContainer ? droppingContainer : droppingItem}
              empty={!checkArray(item.children)}
              EmptyContainer={EmptyContainer}
              onDrop={onFlowLayoutDrop}
              onHover={onFlowLayoutHover}
            >
              {renderFlowLayout(item.children)}
            </FlowLayout>
          </div>
        );
      }
      return (
        <div data-grid={item} data-id={item.i} key={item.i}>
          {item.i.substring(1, 5)}
          {/* <button onClick={() => deleteItem1(item.i)}>delete</button> */}
        </div>
      );
    },
    [layouts, isDropContainer]
  );

  const filterLayouts = (layouts, layoutItem) => {
    if (!layouts || !Array.isArray(layouts)) return;
    const cloneData = JSON.parse(JSON.stringify(layouts));
    for (let index = 0; index < cloneData.length; index++) {
      const item = cloneData[index];
      if (item.i === layoutItem.parentId) {
        item.children = item.children.filter((child) => child.i !== layoutItem.i);
      } else if (checkArray(item.children)) {
        item.children = filterLayouts(item.children, layoutItem);
      }
    }

    return cloneData;
  };

  const onDrop1 = (_layouts, layoutItem, dragInfo, group) => {
    if (dragInfo.type !== group) {
      let newLayouts = layouts;
      if (layoutItem?.parentId) {
        newLayouts = filterLayouts(layouts, layoutItem);
        delete layoutItem.parentId;
      }
      newLayouts.push(layoutItem);
      console.log(newLayouts, 'newLayoutsnewLayouts');
      setLayouts(newLayouts.slice());
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

  const onFlowLayoutDrop1 = (layouts: any, layoutItem: any) => {
    setFlowLayouts(layouts);
  };

  const onFlowLayoutDrop = (layouts: any, layoutItem: any) => {
    const newLayouts = layouts.filter((item) => item.i !== layoutItem.i);
    setLayouts(newLayouts);
  };

  const onDragStartBox = (item) => {
    setIsDropContainer(false);
  };

  const onDragStartCon = (item) => {
    setIsDropContainer(true);
  };
  return (
    <Provider>
      <Draggable onDragStart={onDragStartBox}>Box1</Draggable>
      <Draggable onDragStart={onDragStartBox}>Box2</Draggable>
      <Draggable onDragStart={onDragStartCon}>容器</Draggable>
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
          onDrop={onDrop1}
          onDragStart={onDragStartBox}
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
      {/* <div style={containerStyle} id="aaa">
        {renderFlowLayout1(flowLayouts)}
      </div> */}
    </Provider>
  );
};
