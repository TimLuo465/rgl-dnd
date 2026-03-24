/** @jest-environment jsdom */
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import PositionLayout from './Layout';
import { LayoutItem, PositionLayoutRef } from '../../types';

jest.mock('../Draggable', () => {
  return function MockDraggable(props: any) {
    return props.children || null;
  };
});

jest.mock('../Droppable', () => {
  return function MockDroppable(props: any) {
    return props.children || null;
  };
});

type HarnessProps = {
  onSelectedItemChange?: (item: LayoutItem | null) => void;
  onItemPosChange?: (item: LayoutItem) => void;
};

const parentId = 'parent-layout';
const childAId = 'position-item-a';
const childBId = 'position-item-b';

const createLayouts = (): LayoutItem[] => [
  {
    i: parentId,
    x: 0,
    y: 0,
    w: 400,
    h: 300,
    position: true,
    children: [childAId, childBId],
  },
  {
    i: childAId,
    pId: parentId,
    x: 10,
    y: 12,
    w: 120,
    h: 80,
    zIndex: 1,
  },
  {
    i: childBId,
    pId: parentId,
    x: 180,
    y: 24,
    w: 100,
    h: 70,
    zIndex: 2,
  },
];

const TestHarness = React.forwardRef<PositionLayoutRef, HarnessProps>((props, ref) => {
  const { onSelectedItemChange, onItemPosChange } = props;
  const [layouts, setLayouts] = React.useState<LayoutItem[]>(createLayouts);

  const handleItemPosChange = React.useCallback(
    (item: LayoutItem) => {
      setLayouts((prevLayouts) =>
        prevLayouts.map((layout) => {
          if (layout.i !== item.i) {
            return layout;
          }

          return {
            ...layout,
            ...item,
          };
        })
      );
      onItemPosChange?.(item);
    },
    [onItemPosChange]
  );

  const parent = layouts[0];
  const children = layouts.slice(1);

  return (
    <PositionLayout
      ref={ref}
      layoutItem={parent}
      empty={null}
      onItemPosChange={handleItemPosChange}
      onSelectedItemChange={onSelectedItemChange}
    >
      {children.map((item) => (
        <div data-position={item} data-testid={`content-${item.i}`} key={item.i}>
          {item.i}
        </div>
      ))}
    </PositionLayout>
  );
});

TestHarness.displayName = 'TestHarness';

const getItemElement = (itemId: string) => {
  return document.querySelector(`[data-position-layout-item-id="${itemId}"]`) as HTMLElement | null;
};

const getHandleElements = (itemId: string) => {
  const item = getItemElement(itemId);

  if (!item) return [];

  return Array.from(
    item.querySelectorAll('[data-position-layout-handle]')
  ) as HTMLElement[];
};

const setLayoutSize = (layout: HTMLElement, width: number, height: number) => {
  Object.defineProperty(layout, 'offsetWidth', {
    configurable: true,
    value: width,
  });
  Object.defineProperty(layout, 'offsetHeight', {
    configurable: true,
    value: height,
  });
};

describe('PositionLayout selection', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
    jest.clearAllMocks();
  });

  it('supports imperative selection through ref', () => {
    const ref = React.createRef<PositionLayoutRef>();
    const onSelectedItemChange = jest.fn();

    act(() => {
      ReactDOM.render(
        <TestHarness ref={ref} onSelectedItemChange={onSelectedItemChange} />,
        container
      );
    });

    expect(getHandleElements(childAId)).toHaveLength(0);

    act(() => {
      ref.current?.selectItem(childAId);
    });

    expect(getItemElement(childAId)?.getAttribute('data-selected')).toBe('true');
    expect(getHandleElements(childAId)).toHaveLength(8);
    expect(onSelectedItemChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ i: childAId, pId: parentId })
    );
  });

  it('keeps the current selection when clearSelection is called', () => {
    const ref = React.createRef<PositionLayoutRef>();

    act(() => {
      ReactDOM.render(<TestHarness ref={ref} />, container);
    });

    act(() => {
      ref.current?.selectItem(childAId);
    });

    act(() => {
      ref.current?.clearSelection();
    });

    expect(getItemElement(childAId)?.getAttribute('data-selected')).toBe('true');
    expect(getHandleElements(childAId)).toHaveLength(8);
  });

  it('selects the pressed item and only exposes resize handles for the active item', () => {
    act(() => {
      ReactDOM.render(<TestHarness />, container);
    });

    const secondContent = document.querySelector(
      `[data-testid="content-${childBId}"]`
    ) as HTMLElement;

    act(() => {
      secondContent.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1 }));
    });

    expect(getItemElement(childAId)?.getAttribute('data-selected')).toBe('false');
    expect(getItemElement(childBId)?.getAttribute('data-selected')).toBe('true');
    expect(getHandleElements(childAId)).toHaveLength(0);
    expect(getHandleElements(childBId)).toHaveLength(8);
  });

  it('nudges the selected item with arrow keys and clamps movement to layout bounds', () => {
    const onItemPosChange = jest.fn();
    const ref = React.createRef<PositionLayoutRef>();

    act(() => {
      ReactDOM.render(<TestHarness ref={ref} onItemPosChange={onItemPosChange} />, container);
    });

    const layout = container.querySelector('.rgl-dnd-position-layout') as HTMLElement;
    setLayoutSize(layout, 400, 300);

    act(() => {
      ref.current?.selectItem(childAId);
    });

    act(() => {
      layout.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });

    expect(onItemPosChange).toHaveBeenCalledWith(
      expect.objectContaining({
        i: childAId,
        x: 11,
        y: 12,
      })
    );
    expect(getItemElement(childAId)?.style.transform).toContain('translate(11px, 12px)');

    act(() => {
      ref.current?.selectItem(childBId);
    });

    for (let index = 0; index < 300; index += 1) {
      act(() => {
        layout.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      });
    }

    expect(getItemElement(childBId)?.style.transform).toContain('translate(300px, 24px)');
  });
});
