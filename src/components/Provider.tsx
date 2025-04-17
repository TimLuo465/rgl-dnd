import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import LayoutProvider from './LayoutContext';

interface ProviderProps extends React.Attributes {
  children: React.ReactNode;
}
export default function Provider(props: ProviderProps) {
  const { children } = props;

  return (
    <DndProvider backend={HTML5Backend}>
      <LayoutProvider>{children}</LayoutProvider>
    </DndProvider>
  );
}
