import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * 返回稳定引用的事件函数，同时始终读取最新 handler。
 * 适用于低频触发但希望避免依赖扩散/重复创建回调的场景。
 */
export function useEvent<T extends (...args: any[]) => any>(handler: T): T {
  const handlerRef = useRef<T>(handler);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  return useCallback(((...args: any[]) => handlerRef.current(...args)) as T, []);
}
