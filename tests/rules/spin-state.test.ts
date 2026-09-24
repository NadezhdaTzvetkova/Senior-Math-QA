import { describe, expect, it } from 'vitest';

import { deriveSpinMode, deriveSpinState, isSpinMode } from '../../src/domain/spin-state.js';

describe('spin-state', () => {
  describe('isSpinMode', () => {
    it('accepts every supported spin mode', () => {
      expect(isSpinMode('Normal')).toBe(true);
      expect(isSpinMode('FreeSpins')).toBe(true);
      expect(isSpinMode('WinSpins')).toBe(true);
      expect(isSpinMode('WildSpins')).toBe(true);
      expect(isSpinMode('Respin')).toBe(true);
    });

    it('rejects unsupported and non-string values', () => {
      expect(isSpinMode('InvalidSpinMode')).toBe(false);
      expect(isSpinMode(0)).toBe(false);
      expect(isSpinMode(undefined)).toBe(false);
    });
  });

  describe('deriveSpinMode', () => {
    it('returns VALID for an allowed mode', () => {
      expect(deriveSpinMode({ spinMode: 'Normal' })).toEqual({
        status: 'VALID',
        value: 'Normal',
      });
    });

    it('preserves an invalid raw value as malformed evidence', () => {
      expect(deriveSpinMode({ spinMode: 'InvalidSpinMode' })).toEqual({
        status: 'MALFORMED',
        raw: 'InvalidSpinMode',
      });
    });

    it('distinguishes an absent mode', () => {
      expect(deriveSpinMode({})).toEqual({ status: 'ABSENT' });
    });
  });

  describe('deriveSpinState', () => {
    it('derives Normal as base mode', () => {
      const state = deriveSpinState({
        spinMode: 'Normal',
        win: {},
        winLines: [],
        cashSymbols: [],
      });

      expect(state.isBaseMode).toBe(true);
      expect(state.winLines).toBe('PRESENT_EMPTY');
      expect(state.cashSymbols).toBe('PRESENT_EMPTY');
      expect(state.hasLineWins).toBe(false);
      expect(state.hasCashSymbols).toBe(false);
    });

    it('does not classify an invalid spinMode as base or non-base', () => {
      const state = deriveSpinState({
        spinMode: 'InvalidSpinMode',
        win: {},
        winLines: [],
      });

      expect(state.spinMode.status).toBe('MALFORMED');
      expect(state.isBaseMode).toBeUndefined();
    });

    it('keeps malformed winLines distinct from absence', () => {
      const malformed = deriveSpinState({
        spinMode: 'Normal',
        win: {},
        winLines: { malformed: true },
      });

      const absent = deriveSpinState({
        spinMode: 'Normal',
        win: {},
      });

      expect(malformed.winLines).toBe('MALFORMED');
      expect(malformed.hasLineWins).toBeUndefined();

      expect(absent.winLines).toBe('ABSENT');
      expect(absent.hasLineWins).toBeUndefined();
    });

    it('detects populated supported additional component arrays', () => {
      const state = deriveSpinState({
        spinMode: 'Normal',
        win: {},
        freeSpins: [{}],
      });

      expect(state.freeSpins).toBe('PRESENT_WITH_VALUES');
      expect(state.hasFreeSpins).toBe(true);
      expect(state.hasAdditionalWinComponents).toBe(true);
    });

    it('detects non-zero win.instantWin as an additional component', () => {
      const state = deriveSpinState({
        spinMode: 'Normal',
        win: {
          instantWin: '4.00',
        },
      });

      expect(state.hasAdditionalWinComponents).toBe(true);
    });

    it('detects non-zero monetary freeSpins and respin values inside win', () => {
      const freeSpinsState = deriveSpinState({
        spinMode: 'Normal',
        win: {
          freeSpins: '42.00',
        },
      });

      const respinState = deriveSpinState({
        spinMode: 'Normal',
        win: {
          respin: '3.00',
        },
      });

      expect(freeSpinsState.hasAdditionalWinComponents).toBe(true);
      expect(respinState.hasAdditionalWinComponents).toBe(true);
    });

    it('does not count zero-valued supported monetary components as contributing', () => {
      const state = deriveSpinState({
        spinMode: 'Normal',
        win: {
          instantWin: '0.00',
          freeSpins: '0.00',
          respin: '0.00',
        },
      });

      expect(state.hasAdditionalWinComponents).toBe(false);
    });

    it('preserves malformed supported monetary component state as unknown', () => {
      const state = deriveSpinState({
        spinMode: 'Normal',
        win: {
          instantWin: 4,
        },
      });

      expect(state.hasAdditionalWinComponents).toBeUndefined();
    });

    it('does not treat absent optional component arrays as malformed', () => {
      const state = deriveSpinState({
        spinMode: 'Normal',
        win: {},
        winLines: [],
      });

      expect(state.cashSymbols).toBe('ABSENT');
      expect(state.hasCashSymbols).toBe(false);
      expect(state.freeSpins).toBe('ABSENT');
      expect(state.hasFreeSpins).toBe(false);
      expect(state.respin).toBe('ABSENT');
      expect(state.hasRespin).toBe(false);
      expect(state.hasAdditionalWinComponents).toBe(false);
    });

    it('does not silently turn malformed component state into absence', () => {
      const state = deriveSpinState({
        spinMode: 'Normal',
        win: {},
        cashSymbols: { malformed: true },
      });

      expect(state.cashSymbols).toBe('MALFORMED');
      expect(state.hasCashSymbols).toBeUndefined();
      expect(state.hasAdditionalWinComponents).toBeUndefined();
    });

    it('keeps additional-component state unknown when required win object is unavailable', () => {
      const state = deriveSpinState({
        spinMode: 'Normal',
        winLines: [],
      });

      expect(state.hasAdditionalWinComponents).toBeUndefined();
    });
  });
});
