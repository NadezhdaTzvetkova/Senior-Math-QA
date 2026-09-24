import { describe, expect, it } from 'vitest';

import { multiplyMinorUnits, parseMinorUnits } from '../../src/utils/decimal.js';

describe('systematic monetary arithmetic boundaries', () => {
  it('parses zero and the smallest positive and negative minor units exactly', () => {
    expect(parseMinorUnits('0.00')).toBe(0);
    expect(parseMinorUnits('0.01')).toBe(1);
    expect(parseMinorUnits('-0.01')).toBe(-1);
  });

  it('accepts the exact positive and negative safe-integer money boundaries', () => {
    expect(parseMinorUnits('90071992547409.91')).toBe(Number.MAX_SAFE_INTEGER);
    expect(parseMinorUnits('-90071992547409.91')).toBe(-Number.MAX_SAFE_INTEGER);
  });

  it('rejects the first cent outside the safe-integer money boundary', () => {
    expect(parseMinorUnits('90071992547409.92')).toBeUndefined();
    expect(parseMinorUnits('-90071992547409.92')).toBeUndefined();
  });

  it('accepts multiplication exactly at the safe-integer result boundary', () => {
    expect(multiplyMinorUnits(Number.MAX_SAFE_INTEGER, 1)).toBe(Number.MAX_SAFE_INTEGER);
    expect(multiplyMinorUnits(3_002_399_751_580_330, 3)).toBe(9_007_199_254_740_990);
  });

  it('rejects multiplication when the exact result exceeds the safe-integer boundary', () => {
    expect(multiplyMinorUnits(Number.MAX_SAFE_INTEGER, 2)).toBeUndefined();
    expect(multiplyMinorUnits(4_503_599_627_370_496, 2)).toBeUndefined();
  });

  it('canonicalizes signed zero from multiplication to ordinary zero', () => {
    const result = multiplyMinorUnits(0, -1);
    expect(result).toBe(0);
    expect(Object.is(result, -0)).toBe(false);
  });

  it('accepts fractional multipliers only when the result is an exact minor-unit integer', () => {
    expect(multiplyMinorUnits(2, 0.5)).toBe(1);
    expect(multiplyMinorUnits(1, 0.5)).toBeUndefined();
    expect(multiplyMinorUnits(3, 1.5)).toBeUndefined();
    expect(multiplyMinorUnits(4, 1.5)).toBe(6);
  });
});
