import React, { useState } from 'react';
import { Draggable, Layout, Provider } from '..';
import { DEFAULT_GROUP } from '../constants';
import { LayoutItem } from '../types';

export default {
  title: 'rgl-dnd',
};

export const Default: React.FC = () => {
  const [layouts, setLayouts] = useState<LayoutItem[]>([
    { i: '1', x: 0, y: 0, w: 1, h: 20, static: true },
    { i: '2', x: 1, y: 1, w: 1, h: 20, static: false },
  ]);
  const [layouts2, setLayouts2] = useState<LayoutItem[]>([
    { i: '3', x: 0, y: 0, w: 1, h: 20 },
    { i: '4', x: 1, y: 1, w: 1, h: 20 },
  ]);
  const droppingItem = {
    i: new Date().getTime().toString(),
    w: 1,
    h: 1,
  };
  const renderItem = (item) => {
    return <div>{item.i}</div>;
  };
  const onDrop = (_layouts, layoutItem, fromGroup) => {
    _layouts.push(layoutItem);
    setLayouts(_layouts);
  };
  const onDrop2 = (_layouts, layoutItem) => {
    _layouts.push(layoutItem);
    setLayouts2(_layouts);
  };

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
      <Layout
        group="group1"
        accept={['group1', 'group2', DEFAULT_GROUP]}
        style={{ border: '1px solid #000' }}
        layouts={layouts}
        droppingItem={droppingItem}
        rowHeight={1}
        cols={12}
        renderItem={renderItem}
        onDrop={onDrop}
        onLayoutChange={(layouts) => {
          console.log('change');
          setLayouts(layouts);
        }}
      />
      <Layout
        group="group2"
        accept={['group1', 'group2', DEFAULT_GROUP]}
        style={{ border: '1px solid #000' }}
        droppingItem={droppingItem}
        layouts={layouts2}
        renderItem={renderItem}
        rowHeight={1}
        cols={12}
        onDrop={onDrop2}
        onLayoutChange={setLayouts2}
      />
    </Provider>
  );
};
