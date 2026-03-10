import React, { createContext, useCallback, useContext, useState } from 'react';
import { DragItem } from '../types';

type LayoutItemPixelSize = {
  width: number;
  height: number;
};

export type LayoutRuntimeApi = {
  getDraggingItemPixelSize: (item: DragItem, itemType?: string) => LayoutItemPixelSize | null;
};

export type LayoutContextValue = {
  groups: string[];
  parentLayout: LayoutRuntimeApi | null;
};

export const layoutContext = createContext<LayoutContextValue>({
  groups: [],
  parentLayout: null,
});
const { Provider } = layoutContext;

export function useLayoutContext() {
  return useContext(layoutContext);
}

type LayoutStoreType = {
  setGroups: (data: string[]) => void;
};

export const layoutStore: LayoutStoreType = {
  setGroups: () => {},
};

const LayoutProvider: React.FC = (props) => {
  const { children } = props;
  const [groups, setGroups] = useState<string[]>([]);

  layoutStore.setGroups = useCallback((data: string[]) => {
    setGroups(data);
  }, []);

  return <Provider value={{ groups, parentLayout: null }}>{children}</Provider>;
};

export default LayoutProvider;
