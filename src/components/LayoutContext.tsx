import React, { createContext, useCallback, useContext, useState } from 'react';

export const layoutContext = createContext(null);
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

  return <Provider value={{ groups }}>{children}</Provider>;
};

export default LayoutProvider;
