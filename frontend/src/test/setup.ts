import '@testing-library/jest-dom/vitest';

import { vi } from 'vitest';

// jsdomにはResizeObserverがないため、UI統合テストで落ちないようにする
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// @ts-expect-error: test env polyfill
globalThis.ResizeObserver = ResizeObserverMock;

// Chart.js / react-chartjs-2 が canvas を使うため、最低限の getContext をスタブする
// これにより「統合状態の検証（色/DOM）」に集中できる
// @ts-expect-error: test env polyfill
HTMLCanvasElement.prototype.getContext = vi.fn(function (this: HTMLCanvasElement) {
  return {
    canvas: this,
    // chart.js が参照しうる最低限のAPI
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clip: vi.fn(),
  };
});


