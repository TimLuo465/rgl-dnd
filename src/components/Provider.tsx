import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import LayoutProvider from './LayoutContext';

export default class Provider extends React.PureComponent {
  render() {
    const { children } = this.props;

    return (
      <DndProvider
        backend={HTML5Backend}
        options={{ rootElement: document.querySelector('#grid-designer-wrapper') }}
      >
        <LayoutProvider>{children}</LayoutProvider>
      </DndProvider>
    );
  }
}
