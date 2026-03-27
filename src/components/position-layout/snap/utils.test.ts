import { calculateSnapAndGuides } from './utils';

describe('position-layout snap calculation', () => {
  it('prefers edge guides over slightly closer center guides while dragging', () => {
    const { snappedRect, guides } = calculateSnapAndGuides(
      {
        x: 100,
        y: 100,
        width: 50,
        height: 60,
      },
      [
        {
          x: 103,
          y: 20,
          width: 20,
          height: 20,
        },
        {
          x: 116,
          y: 20,
          width: 20,
          height: 20,
        },
      ]
    );

    expect(snappedRect).toEqual({
      x: 103,
      y: 100,
      width: 50,
      height: 60,
    });
    expect(guides).toEqual([{ type: 'vertical', position: 103 }]);
  });

  it('still allows center snapping while dragging when edge candidates are absent', () => {
    const { snappedRect, guides } = calculateSnapAndGuides(
      {
        x: 100,
        y: 100,
        width: 50,
        height: 60,
      },
      [
        {
          x: 117,
          y: 20,
          width: 22,
          height: 20,
        },
      ]
    );

    expect(snappedRect).toEqual({
      x: 103,
      y: 100,
      width: 50,
      height: 60,
    });
    expect(guides).toEqual([{ type: 'vertical', position: 128 }]);
  });

  it('keeps drag snapping independent from resize handles', () => {
    const { snappedRect, guides } = calculateSnapAndGuides(
      {
        x: 100,
        y: 100,
        width: 50,
        height: 60,
      },
      [
        {
          x: 152,
          y: 20,
          width: 20,
          height: 20,
        },
      ]
    );

    expect(snappedRect).toEqual({
      x: 102,
      y: 100,
      width: 50,
      height: 60,
    });
    expect(guides).toEqual([{ type: 'vertical', position: 152 }]);
  });

  it('snaps east resize only by the moving right edge', () => {
    const { snappedRect, guides } = calculateSnapAndGuides(
      {
        x: 100,
        y: 100,
        width: 50,
        height: 60,
      },
      [
        {
          x: 103,
          y: 20,
          width: 20,
          height: 20,
        },
        {
          x: 142,
          y: 20,
          width: 20,
          height: 20,
        },
      ],
      {
        resizingHandle: 'e',
      }
    );

    expect(snappedRect).toEqual({
      x: 100,
      y: 100,
      width: 52,
      height: 60,
    });
    expect(guides).toEqual([{ type: 'vertical', position: 152 }]);
  });

  it('prefers edge guides over center guides while resizing', () => {
    const { snappedRect, guides } = calculateSnapAndGuides(
      {
        x: 100,
        y: 100,
        width: 50,
        height: 60,
      },
      [
        {
          x: 152,
          y: 20,
          width: 20,
          height: 20,
        },
        {
          x: 141,
          y: 20,
          width: 20,
          height: 20,
        },
      ],
      {
        resizingHandle: 'e',
      }
    );

    expect(snappedRect).toEqual({
      x: 100,
      y: 100,
      width: 52,
      height: 60,
    });
    expect(guides).toEqual([{ type: 'vertical', position: 152 }]);
  });

  it('uses a tighter threshold for center guides while resizing', () => {
    const { snappedRect, guides } = calculateSnapAndGuides(
      {
        x: 100,
        y: 100,
        width: 50,
        height: 60,
      },
      [
        {
          x: 134,
          y: 20,
          width: 24,
          height: 20,
        },
      ],
      {
        resizingHandle: 'e',
      }
    );

    expect(snappedRect).toEqual({
      x: 100,
      y: 100,
      width: 50,
      height: 60,
    });
    expect(guides).toEqual([]);
  });

  it('shows two guides when a diagonal resize snaps on both axes', () => {
    const { snappedRect, guides } = calculateSnapAndGuides(
      {
        x: 100,
        y: 100,
        width: 50,
        height: 60,
      },
      [
        {
          x: 142,
          y: 20,
          width: 20,
          height: 20,
        },
        {
          x: 20,
          y: 153,
          width: 20,
          height: 20,
        },
      ],
      {
        resizingHandle: 'se',
      }
    );

    expect(snappedRect).toEqual({
      x: 100,
      y: 100,
      width: 52,
      height: 63,
    });
    expect(guides).toEqual([
      { type: 'vertical', position: 152 },
      { type: 'horizontal', position: 163 },
    ]);
  });

  it('snaps west and north edges independently for north-west resize', () => {
    const { snappedRect, guides } = calculateSnapAndGuides(
      {
        x: 98,
        y: 98,
        width: 52,
        height: 62,
      },
      [
        {
          x: 99,
          y: 0,
          width: 10,
          height: 20,
        },
        {
          x: 0,
          y: 99,
          width: 20,
          height: 10,
        },
      ],
      {
        resizingHandle: 'nw',
      }
    );

    expect(snappedRect).toEqual({
      x: 99,
      y: 99,
      width: 51,
      height: 61,
    });
    expect(guides).toEqual([
      { type: 'vertical', position: 99 },
      { type: 'horizontal', position: 99 },
    ]);
  });
});
