import { describe, expect, it } from 'vitest';
import { adjustByStep, clampInt, wheelDeltaToStep } from '../manual';

describe('manual domain', () => {
  describe('clampInt', () => {
    it('clamps value to range', () => {
      expect(clampInt(5, 0, 10)).toBe(5);
      expect(clampInt(-1, 0, 10)).toBe(0);
      expect(clampInt(15, 0, 10)).toBe(10);
    });

    it('truncates decimal values', () => {
      expect(clampInt(5.7, 0, 10)).toBe(5);
      expect(clampInt(5.2, 0, 10)).toBe(5);
      expect(clampInt(5.9, 0, 10)).toBe(5);
    });

    it('handles invalid inputs', () => {
      expect(clampInt(NaN, 0, 10)).toBe(0);
      expect(clampInt(Infinity, 0, 10)).toBe(10);
      expect(clampInt(-Infinity, 0, 10)).toBe(0);
    });
  });

  describe('wheelDeltaToStep', () => {
    it('converts positive deltaY to -1 (decrease)', () => {
      expect(wheelDeltaToStep(100)).toBe(-1);
      expect(wheelDeltaToStep(1)).toBe(-1);
    });

    it('converts negative deltaY to 1 (increase)', () => {
      expect(wheelDeltaToStep(-100)).toBe(1);
      expect(wheelDeltaToStep(-1)).toBe(1);
    });

    it('handles zero', () => {
      expect(wheelDeltaToStep(0)).toBe(1);
    });
  });

  describe('adjustByStep', () => {
    it('adjusts value by step', () => {
      expect(adjustByStep(5, 1, 0, 10)).toBe(6);
      expect(adjustByStep(5, -1, 0, 10)).toBe(4);
    });

    it('clamps to boundaries', () => {
      expect(adjustByStep(0, -1, 0, 10)).toBe(0);
      expect(adjustByStep(10, 1, 0, 10)).toBe(10);
    });

    it('truncates result', () => {
      expect(adjustByStep(5.7, 1, 0, 10)).toBe(6);
      expect(adjustByStep(5.2, -1, 0, 10)).toBe(4);
    });
  });
});






