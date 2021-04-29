import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export default class Provider extends React.PureComponent {
  render() {
    const { children } = this.props;

    return <DndProvider backend={HTML5Backend}>{children}</DndProvider>;
  }
}
