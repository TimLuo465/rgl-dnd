import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';

const context = createContext(null);

const Provider = context.Provider;

export function useLayoutContext() {
  return useContext(context);
}

interface ProviderProps extends React.Attributes {
  children?: ReactNode;
}

type LayoutStoreType = {
  setGroups: React.Dispatch<React.SetStateAction<string[]>>;
};

export const layoutStore: LayoutStoreType = {
  setGroups: () => {},
};

export default function LayoutProvider(props: ProviderProps) {
  const { children } = props;
  const [groups, setGroups] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  layoutStore.setGroups = useCallback((groups: string[]) => {
    setGroups(groups);
  }, []);

  return <Provider value={{ groups }}>{children}</Provider>;
}
