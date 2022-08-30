import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CSSProperties } from 'styled-components';
import { Draggable, FlowLayout, Layout, Provider } from '..';
import { DEFAULT_GROUP } from '../constants';
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

const mockFlowLayouts = [
  {
    i: '1111111111111111',
    nodeId: '111',
    type: 'flow-container',
    isContainer: true,
    parentId: 'ROOT',
  },
];

const containerStyle: CSSProperties = {
  float: 'left',
  width: '100%',
  border: '1px solid #000',
  height: 500,
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
    h: 8.545454545454545,
    // h: 23.454545454545453,
    isContainer: true,
    autoHeight: true,
    children: [],
  };

  // const deleteItem1 = (i) => {
  //   const index = layouts.findIndex((l) => l.i === i);

  //   layouts.splice(index, 1);
  //   setLayouts(layouts);
  // };
  // const deleteItem2 = (i) => {
  //   const index = layouts2.findIndex((l) => l.i === i);

  //   layouts2.splice(index, 1);
  //   setLayouts2(layouts2.slice());
  // };

  const renderFlowLayout = (data) => {
    if (!checkArray(data)) return;
    return data.map((item, index) => {
      if (item === '123456') {
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
      return renderFlowLayoutItem(item, index);
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
        {item.substring(1, 5)}
        {/* {renderFlowLayout(item.children)} */}
      </div>
    );
  };

  const renderFlowLayoutItem = (item, index) => {
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
    return <Box item={item} data-flow={{ i: item }} key={item}></Box>;
  };

  const EmptyContainer: React.FC = () => {
    return (
      <div
        style={{
          height: '90px',
          lineHeight: '90px',
          textAlign: 'center',
          color: '#a7b1bd',
          border: '1px dashed red',
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

  // const renderFlowLayout1 = (data) => {
  //   if (!checkArray(data)) return;
  //   return data.map((item, index) => {
  //     if (item.isContainer) {
  //       return (
  //         <div data-flow={item}>
  //           <FlowLayout
  //             layouts={flowLayouts}
  //             layoutItem={item}
  //             droppingItem={mockFlowDroppingItem}
  //             onDrop={onFlowLayoutDrop1}
  //             EmptyContainer={EmptyContainer}
  //           >
  //             {renderFlowLayout1(item.children)}
  //           </FlowLayout>
  //         </div>
  //       );
  //     }
  //     return renderFlowLayoutItem(item, index);
  //   });
  // };

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
      if (item.isContainer) {
        return (
          <div data-grid={item} key={item.i} data-id={item.i}>
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
          {/* <button onClick={() => deleteItem1(item.i)}>delete</button> */}
        </div>
      );
    },
    [layouts]
  );

  const filterLayouts = (layouts, layoutItem) => {
    if (!layouts || !Array.isArray(layouts)) return;
    const cloneData = JSON.parse(JSON.stringify(layouts));
    for (let index = 0; index < cloneData.length; index++) {
      const item = cloneData[index];
      if (item.isContainer) {
        item.children = item.children.filter((i) => i !== layoutItem.i);
      }
      // if (item.i === layoutItem.parentId) {
      //   item.children = item.children.filter((child) => child.i !== layoutItem.i);
      // } else if (checkArray(item.children)) {
      //   item.children = filterLayouts(item.children, layoutItem);
      // }
    }

    return cloneData;
  };

  const onFlowLayoutDrop = (layoutItem: any, draggingItem: any) => {
    // 如果组件是从网格布局中拖入到流式容器内，那么原有网格布局中的组件，应该删除
    const tempLayouts = layouts.filter((item) => item.i !== draggingItem.i);
    // 根据layoutItem，获取最新的layouts
    const newLayouts = getNewLayouts(tempLayouts, layoutItem);

    setLayouts(newLayouts);
  };

  const onDrop1 = (_layouts, layoutItem, dragInfo, group) => {
    if (dragInfo.type !== group) {
      let newLayouts = _layouts;
      newLayouts = filterLayouts(newLayouts, layoutItem);

      newLayouts.push(layoutItem);

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
              nested
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

  const onDragStartBox = () => {
    setIsDropContainer(false);
  };

  const onDragStartCon = () => {
    setIsDropContainer(true);
  };
  return (
    <Provider>
      <Draggable onDragStart={onDragStartBox}>组件1</Draggable>
      <Draggable onDragStart={onDragStartBox}>组件2</Draggable>
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
