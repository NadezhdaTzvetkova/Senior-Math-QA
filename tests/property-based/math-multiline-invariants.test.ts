import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { M001_WIN_LINE_FORMULA } from '../../src/rules/calculations/core-calculation-rules.js';
import {
  M003_PLAIN_WIN_TOTAL,
  M004_PLAIN_MULTIPLIER_TOTAL,
} from '../../src/rules/calculations/consistency-rules.js';
import { buildValidationContext } from '../../src/validation/context.js';

function money(cents: number): string {
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');
  return `${cents < 0 ? '-' : ''}${whole}.${fraction}`;
}

function context(result: unknown) {
  return buildValidationContext('generated.json', {
    response: {
      body: {
        result,
      },
    },
  });
}

function line(index: number, amountCents: number, multiplier: number) {
  return {
    index,
    start: 0,
    length: 1,
    tile: 1,
    multiplier,
    amount: money(amountCents),
    multipliedAmount: money(amountCents * multiplier),
    tiles: [1],
  };
}

describe('multi-line mathematical invariants', () => {
  it('M001 is invariant to permutation of independently valid win lines', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 100 }),
        (a, am, b, bm) => {
          const first = line(0, a, am);
          const second = line(1, b, bm);

          expect(
            M001_WIN_LINE_FORMULA.evaluate(context({ winLines: [first, second] })).status,
          ).toBe('PASS');
          expect(
            M001_WIN_LINE_FORMULA.evaluate(context({ winLines: [second, first] })).status,
          ).toBe('PASS');
        },
      ),
      { numRuns: 250, seed: 20261007 },
    );
  });

  it('M001 detects corruption in a later generated line and localizes it to that entry', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 100 }),
        (a, am, b, bm) => {
          const first = line(0, a, am);
          const second = {
            ...line(1, b, bm),
            multipliedAmount: money(b * bm + 1),
          };

          const evaluation = M001_WIN_LINE_FORMULA.evaluate(context({ winLines: [first, second] }));

          expect(evaluation.status).toBe('FAIL');
          expect(evaluation.evidence?.path).toBe(
            'response.body.result.winLines[1].multipliedAmount',
          );
        },
      ),
      { numRuns: 250, seed: 20261008 },
    );
  });

  it('plain-total conservation remains valid regardless of win-line ordering', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 50 }),
        (a, am, b, bm) => {
          const first = line(0, a, am);
          const second = line(1, b, bm);
          const lineTotal = a * am + b * bm;

          for (const winLines of [
            [first, second],
            [second, first],
          ]) {
            const ctx = context({
              spinMode: 'Normal',
              winLines,
              win: { lines: money(lineTotal), total: money(lineTotal) },
              winsMultipliers: { lines: '1.00', total: '1.00' },
            });

            expect(M001_WIN_LINE_FORMULA.evaluate(ctx).status).toBe('PASS');
            expect(M003_PLAIN_WIN_TOTAL.evaluate(ctx).status).toBe('PASS');
            expect(M004_PLAIN_MULTIPLIER_TOTAL.evaluate(ctx).status).toBe('PASS');
          }
        },
      ),
      { numRuns: 200, seed: 20261009 },
    );
  });

  it('a one-cent plain-total mutation is isolated to M003 while valid line math remains intact', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 50 }),
        (a, am, b, bm) => {
          const winLines = [line(0, a, am), line(1, b, bm)];
          const lineTotal = a * am + b * bm;
          const ctx = context({
            spinMode: 'Normal',
            winLines,
            win: { lines: money(lineTotal), total: money(lineTotal + 1) },
            winsMultipliers: { lines: '1.00', total: '1.00' },
          });

          expect(M001_WIN_LINE_FORMULA.evaluate(ctx).status).toBe('PASS');
          expect(M003_PLAIN_WIN_TOTAL.evaluate(ctx).status).toBe('FAIL');
          expect(M004_PLAIN_MULTIPLIER_TOTAL.evaluate(ctx).status).toBe('PASS');
        },
      ),
      { numRuns: 250, seed: 20261010 },
    );
  });
});
