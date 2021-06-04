import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CSSProperties } from 'styled-components';
import { Draggable, Layout, Provider } from '..';
import { DEFAULT_GROUP } from '../constants';
import { LayoutItem } from '../types';

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
  },
];
const containerStyle: CSSProperties = {
  float: 'left',
  width: '49%',
  border: '1px solid #000',
  height: 400,
  overflow: 'auto',
};

const Item: React.FC = () => {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>{count}</button>;
};
export const Default: React.FC = () => {
  const [layouts, setLayouts] = useState<LayoutItem[]>(mockLayouts);
  const [clsName, setClsName] = useState<string>('');
  const ref1 = useRef(null);
  const [layouts2, setLayouts2] = useState<LayoutItem[]>([
    { i: '3', x: 0, y: 0, w: 2, h: 20 },
    { i: '4', x: 2, y: 0, w: 2, h: 20 },
  ]);
  const [layouts3, setLayouts3] = useState<LayoutItem[]>([]);
  const droppingItem = {
    i: new Date().getTime().toString(),
    w: 1,
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
  const renderItem1 = useCallback((item) => {
    return (
      <div className="kkk">
        {item.i.substring(1, 5)}
        <button onClick={() => deleteItem1(item.i)}>delete</button>
      </div>
    );
  }, []);
  const onDrop1 = (_layouts, layoutItem, dragInfo, group) => {
    if (dragInfo.type !== group) {
      layouts.push(layoutItem);
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
          <div>
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
              renderItem={(item) => (
                <div>
                  {item.i.substring(1, 5)}
                  <button onClick={() => deleteItem2(item.i)}>delete</button>
                </div>
              )}
              onDrop={onDrop3}
              onLayoutChange={setLayouts3}
            />
          </div>
        );
      }
      console.log('render item');
      return (
        <div className="sa">
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

  return (
    <Provider>
      <Draggable onDragStart={console.log} onDragEnd={console.log}>
        <div>Box1</div>
      </Draggable>
      <Draggable>Box2</Draggable>
      <button onClick={() => setClsName(new Date().getTime().toString().substring(5))}>
        change clsName
      </button>
      <div style={{ marginBottom: 20 }}>
        <button onClick={onClick}>change Layout</button>
      </div>
      <div style={containerStyle}>
        <Layout
          style={{ minHeight: '100%' }}
          layouts={layouts}
          droppingItem={droppingItem}
          rowHeight={1}
          cols={12}
          ref={ref1}
          onDrop={onDrop1}
          renderItem={renderItem1}
          onDragOver={(l) => {
            delete l.minW;
          }}
          onLayoutChange={(layouts) => {
            console.log('change');
            setLayouts(layouts);
          }}
        />
      </div>
      <div style={containerStyle}>
        <Layout
          style={{ minHeight: '100%' }}
          droppingItem={droppingItem}
          layouts={layouts2}
          renderItem={renderItem2}
          getItemProps={() => ({ className: clsName })}
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
        />
      </div>
    </Provider>
  );
};
