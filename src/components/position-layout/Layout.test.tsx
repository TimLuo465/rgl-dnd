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
  initialSelectedItemId?: string;
  selectedItemId?: string;
  onSelect?: (item: LayoutItem | null) => void;
  onZIndexChange?: (items: LayoutItem[]) => void;
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
  const {
    initialSelectedItemId = '',
    selectedItemId: controlledSelectedItemId,
    onSelect,
    onZIndexChange,
  } = props;
  const [selectedItemId, setSelectedItemId] = React.useState<string>(initialSelectedItemId);

  React.useEffect(() => {
    if (controlledSelectedItemId === undefined) return;

    setSelectedItemId(controlledSelectedItemId);
  }, [controlledSelectedItemId]);

  const parent = createLayouts()[0];
  const children = createLayouts().slice(1);

  const handleSelect = React.useCallback(
    (item: LayoutItem | null) => {
      setSelectedItemId(item?.i || '');
      onSelect?.(item);
    },
    [onSelect]
  );

  return (
    <PositionLayout
      ref={ref}
      layoutItem={parent}
      empty={null}
      selectedItemId={selectedItemId}
      onSelect={handleSelect}
      onZIndexChange={onZIndexChange}
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

  return Array.from(item.querySelectorAll('[class*="pl-resizable-handle-"]')) as HTMLElement[];
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

  it('renders resize handles only for the controlled selected item', () => {
    act(() => {
      ReactDOM.render(<TestHarness initialSelectedItemId={childAId} />, container);
    });

    expect(getItemElement(childAId)?.getAttribute('data-selected')).toBe('true');
    expect(getItemElement(childBId)?.getAttribute('data-selected')).toBe('false');
    expect(getHandleElements(childAId)).toHaveLength(8);
    expect(getHandleElements(childBId)).toHaveLength(0);
  });

  it('calls onSelect and updates the controlled selected item on left-button press', () => {
    const onSelect = jest.fn();

    act(() => {
      ReactDOM.render(<TestHarness onSelect={onSelect} />, container);
    });

    const secondContent = document.querySelector(
      `[data-testid="content-${childBId}"]`
    ) as HTMLElement;

    act(() => {
      secondContent.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1 }));
    });

    expect(onSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({ i: childBId, pId: parentId })
    );
    expect(getItemElement(childAId)?.getAttribute('data-selected')).toBe('false');
    expect(getItemElement(childBId)?.getAttribute('data-selected')).toBe('true');
    expect(getHandleElements(childAId)).toHaveLength(0);
    expect(getHandleElements(childBId)).toHaveLength(8);
  });

  it('ignores non-primary mouse presses for selection', () => {
    const onSelect = jest.fn();

    act(() => {
      ReactDOM.render(<TestHarness onSelect={onSelect} />, container);
    });

    const secondContent = document.querySelector(
      `[data-testid="content-${childBId}"]`
    ) as HTMLElement;

    act(() => {
      secondContent.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 0 }));
    });

    expect(onSelect).not.toHaveBeenCalled();
    expect(getHandleElements(childAId)).toHaveLength(0);
    expect(getHandleElements(childBId)).toHaveLength(0);
  });

  it('exposes z-index actions through ref and forwards changed items', () => {
    const ref = React.createRef<PositionLayoutRef>();
    const onZIndexChange = jest.fn();

    act(() => {
      ReactDOM.render(<TestHarness ref={ref} onZIndexChange={onZIndexChange} />, container);
    });

    act(() => {
      ref.current?.bringForward(childAId);
    });

    expect(onZIndexChange).toHaveBeenCalledWith([
      expect.objectContaining({ i: childBId, zIndex: 1 }),
      expect.objectContaining({ i: childAId, zIndex: 2 }),
    ]);
  });
});
