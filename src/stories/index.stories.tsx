import React, { useEffect, useRef, useState } from 'react';
import { Draggable, Layout, Provider } from '..';
import { LayoutItem } from '../types';

export default {
  title: 'rgl-dnd',
};

const mockLayouts = [
  {
    i: 'a3987f12300f452289c74e0d87893569',
    x: 0,
    y: 23,
    w: 8,
    h: 13,
    scope: '',
    selected: false,
    minH: 3,
    minW: 1,
  },
  {
    i: 'c61078035e3c4edb8991303f45e8d1e9',
    x: 0,
    y: 8,
    w: 2,
    h: 15,
    scope: '',
    selected: false,
    minH: 3,
    minW: 1,
  },
  {
    i: '7b1aa0a29a7041639e4f31ff803a3b8b',
    x: 6,
    y: 8,
    w: 2,
    h: 15,
    selected: false,
    minH: 3,
    minW: 1,
  },
  {
    i: '57630a5ffe7e433cb37bc138e2a19798',
    x: 8,
    y: 8,
    w: 2,
    h: 15,
    selected: false,
    hidden: false,
    minH: 3,
    minW: 1,
  },
  {
    i: '30fe636e79e949b9b8f11a9ad1f87e0e',
    x: 4,
    y: 8,
    w: 2,
    h: 15,
    selected: false,
    hidden: true,
    minH: 3,
    minW: 1,
  },
  {
    i: 'd1afc311b97f4b9a8082438d5c67f924',
    x: 2,
    y: 8,
    w: 2,
    h: 15,
    selected: false,
    minH: 3,
    minW: 1,
  },
  {
    i: 'c03a2ee7c2c54db1a9f4ed2cd08a68a0',
    x: 10,
    y: 8,
    w: 2,
    h: 15,
    selected: false,
    hidden: false,
    minH: 3,
    minW: 1,
  },
  {
    i: '9548e19626ba47b89d5b6c0c766e4924',
    x: 8,
    y: 23,
    w: 4,
    h: 32,
    scope: '',
    selected: false,
    minH: 3,
    minW: 1,
  },
  {
    i: 'bdc18c59083045c091aab7e21371b55f',
    x: 0,
    y: 69,
    w: 9,
    h: 19,
    selected: false,
    minH: 3,
    minW: 1,
  },
  {
    i: 'cca55280a3844d59b2f9b001aab25618',
    x: 0,
    y: 36,
    w: 6,
    h: 18,
    selected: false,
    hidden: false,
    scope: '',
    minH: 3,
    minW: 1,
  },
  {
    i: '7090ca71161149b9a0de6afd17f82bbf',
    x: 0,
    y: 54,
    w: 4,
    h: 15,
    selected: false,
    minH: 3,
    minW: 1,
  },
  {
    i: '1639b3dab77f4f0e8aab797d736bac4e',
    x: 0,
    y: 0,
    w: 12,
    h: 8,
    selected: false,
    minH: 3,
    minW: 1,
  },
];

export const Default: React.FC = () => {
  const [layouts, setLayouts] = useState<LayoutItem[]>(mockLayouts);
  const ref1 = useRef(null);
  const [layouts2, setLayouts2] = useState<LayoutItem[]>([
    { i: '3', x: 0, y: 0, w: 1, h: 20 },
    { i: '4', x: 1, y: 1, w: 1, h: 20 },
  ]);
  const [layouts3, setLayouts3] = useState<LayoutItem[]>([]);
  const droppingItem = {
    i: new Date().getTime().toString(),
    w: 1,
    h: 10,
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
  const renderItem1 = (item) => {
    return (
      <div>
        {item.i.substring(1, 5)}
        <button onClick={() => deleteItem1(item.i)}>delete</button>
      </div>
    );
  };
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
      layouts3.push(layoutItem);
      setLayouts3(layouts3.slice());
    }
  };
  const renderItem2 = (item) => {
    if (item.i === '3') {
      return (
        <div>
          <Layout
            nested={true}
            rowHeight={1}
            layouts={layouts3}
            style={{ minHeight: '100%' }}
            droppable={layouts3.length < 1}
            droppingItem={{ ...droppingItem, w: 12, h: 5 }}
            renderItem={(item) => <div>{item.i}</div>}
            onDrop={onDrop3}
            onLayoutChange={setLayouts3}
          />
        </div>
      );
    }

    return (
      <div>
        {item.i.substring(1, 5)}
        <button onClick={() => deleteItem2(item.i)}>delete</button>
      </div>
    );
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
  console.log(droppingItem);
  return (
    <Provider>
      <Draggable
        data={{ i: new Date().getTime().toString() }}
        onDragStart={console.log}
        onDragEnd={console.log}
      >
        <div>Box1</div>
      </Draggable>
      <Draggable data={{ i: new Date().getTime().toString() }}>Box2</Draggable>
      <div style={{ marginBottom: 20 }}>
        <button onClick={onClick}>change Layout</button>
      </div>
      <div
        style={{
          float: 'left',
          width: '49%',
          border: '1px solid #000',
          height: 200,
          overflow: 'auto',
        }}
      >
        <Layout
          layouts={layouts}
          droppingItem={droppingItem}
          rowHeight={1}
          cols={12}
          ref={ref1}
          onDrop={onDrop1}
          renderItem={renderItem1}
          onLayoutChange={(layouts) => {
            console.log('change');
            setLayouts(layouts);
          }}
        />
      </div>
      <div
        style={{
          float: 'left',
          width: '49%',
          border: '1px solid #000',
          height: 200,
          overflow: 'auto',
        }}
      >
        <Layout
          style={{ border: '1px solid #000' }}
          droppingItem={droppingItem}
          layouts={layouts2}
          renderItem={renderItem2}
          rowHeight={1}
          cols={12}
          onDrop={onDrop2}
          onLayoutChange={(layouts) => {
            console.log('change2: ', layouts);
            setLayouts2(layouts);
          }}
        />
      </div>
    </Provider>
  );
};
