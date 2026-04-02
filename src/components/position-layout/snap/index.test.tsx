/** @jest-environment jsdom */
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { prefixCls } from '../../../constants';
import { SmartGuides } from './index';

describe('SmartGuides', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
  });

  it('renders both guide lines for dual-axis guides', () => {
    act(() => {
      ReactDOM.render(
        <SmartGuides
          guides={[
            { type: 'vertical', position: 120 },
            { type: 'horizontal', position: 80 },
          ]}
        />,
        container
      );
    });

    const lines = container.querySelectorAll(`.${prefixCls}-guide-line`);
    const verticalLine = container.querySelector(
      `.${prefixCls}-guide-line[data-guide-type="vertical"]`
    ) as HTMLElement | null;
    const horizontalLine = container.querySelector(
      `.${prefixCls}-guide-line[data-guide-type="horizontal"]`
    ) as HTMLElement | null;

    expect(lines).toHaveLength(2);
    expect(verticalLine?.style.left).toBe('120px');
    expect(horizontalLine?.style.top).toBe('80px');
  });

  it('renders only one guide when a single-axis guide exists', () => {
    act(() => {
      ReactDOM.render(<SmartGuides guides={[{ type: 'vertical', position: 120 }]} />, container);
    });

    expect(container.querySelectorAll(`.${prefixCls}-guide-line`)).toHaveLength(1);
  });
});
