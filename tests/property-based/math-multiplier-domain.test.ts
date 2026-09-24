import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { M001_WIN_LINE_FORMULA } from '../../src/rules/calculations/core-calculation-rules.js';
import { multiplyMinorUnits } from '../../src/utils/decimal.js';
import { buildValidationContext } from '../../src/validation/context.js';

function money(cents: number): string {
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');
  return `${cents < 0 ? '-' : ''}${whole}.${fraction}`;
}

function context(amountCents: number, multiplier: number, multipliedCents: number) {
  return buildValidationContext('generated.json', {
    response: {
      body: {
        result: {
          winLines: [
            {
              amount: money(amountCents),
              multiplier,
              multipliedAmount: money(multipliedCents),
            },
          ],
        },
      },
    },
  });
}

describe('multiplier-domain mathematical behavior', () => {
  it('accepts generated positive integer multipliers when the exact result is safe', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000 }),
        (amountCents, multiplier) => {
          const expected = amountCents * multiplier;
          expect(multiplyMinorUnits(amountCents, multiplier)).toBe(expected);
          expect(
            M001_WIN_LINE_FORMULA.evaluate(context(amountCents, multiplier, expected)).status,
          ).toBe('PASS');
        },
      ),
      { numRuns: 250, seed: 20261011 },
    );
  });

  it('accepts fractional multipliers only when they produce an exact minor-unit integer', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500_000 }),
        fc.integer({ min: 1, max: 20 }),
        (base, numerator) => {
          const amountCents = base * 2;
          const multiplier = numerator / 2;
          const expected = base * numerator;

          expect(multiplyMinorUnits(amountCents, multiplier)).toBe(expected);
          expect(
            M001_WIN_LINE_FORMULA.evaluate(context(amountCents, multiplier, expected)).status,
          ).toBe('PASS');
        },
      ),
      { numRuns: 200, seed: 20261012 },
    );
  });

  it('rejects generated fractional-minor-unit results instead of rounding', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500_000 }),
        fc.integer({ min: 0, max: 20 }),
        (base, whole) => {
          const amountCents = base * 2 + 1;
          const multiplier = whole + 0.5;

          expect(multiplyMinorUnits(amountCents, multiplier)).toBeUndefined();
          const roundedCandidate = Math.round(amountCents * multiplier);
          expect(
            M001_WIN_LINE_FORMULA.evaluate(context(amountCents, multiplier, roundedCandidate))
              .status,
          ).toBe('NOT_EVALUABLE');
        },
      ),
      { numRuns: 200, seed: 20261013 },
    );
  });

  it('rejects non-finite multipliers at the arithmetic boundary', () => {
    for (const multiplier of [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN]) {
      expect(multiplyMinorUnits(100, multiplier)).toBeUndefined();
    }
  });

  it('rejects generated multiplication overflow beyond the safe-integer boundary', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 1_000 }), (multiplier) => {
        const amountCents = Math.floor(Number.MAX_SAFE_INTEGER / multiplier) + 1;
        expect(Number.isSafeInteger(amountCents)).toBe(true);
        expect(multiplyMinorUnits(amountCents, multiplier)).toBeUndefined();
      }),
      { numRuns: 200, seed: 20261014 },
    );
  });
});
