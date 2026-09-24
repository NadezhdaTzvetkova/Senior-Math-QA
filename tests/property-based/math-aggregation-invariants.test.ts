import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { M005_COMPONENT_AGGREGATION } from '../../src/rules/calculations/consistency-rules.js';
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

describe('aggregation invariants and corruption sensitivity', () => {
  it('is invariant to the ordering of supported component fields', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5_000_000 }),
        fc.integer({ min: 1, max: 5_000_000 }),
        (lines, instantWin) => {
          const total = lines + instantWin;

          const a = M005_COMPONENT_AGGREGATION.evaluate(
            context({
              win: { lines: money(lines), instantWin: money(instantWin), total: money(total) },
              winsMultipliers: { lines: '0.00', instantWin: '1.00', total: '1.00' },
            }),
          );

          const b = M005_COMPONENT_AGGREGATION.evaluate(
            context({
              win: { instantWin: money(instantWin), total: money(total), lines: money(lines) },
              winsMultipliers: { instantWin: '1.00', total: '1.00', lines: '0.00' },
            }),
          );

          expect(a.status).toBe('PASS');
          expect(b.status).toBe('PASS');
        },
      ),
      { numRuns: 250, seed: 20261003 },
    );
  });

  it('adding a zero-valued supported component does not change a valid total', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000_000 }), (lines) => {
        const evaluation = M005_COMPONENT_AGGREGATION.evaluate(
          context({
            win: { lines: money(lines), instantWin: '0.00', total: money(lines) },
            winsMultipliers: { lines: '1.00', instantWin: '0.00', total: '1.00' },
          }),
        );

        expect(evaluation.status).toBe('PASS');
      }),
      { numRuns: 200, seed: 20261004 },
    );
  });

  it('detects an omitted supported contribution from the declared total', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5_000_000 }),
        fc.integer({ min: 1, max: 5_000_000 }),
        (lines, instantWin) => {
          const evaluation = M005_COMPONENT_AGGREGATION.evaluate(
            context({
              win: { lines: money(lines), instantWin: money(instantWin), total: money(lines) },
              winsMultipliers: { lines: '0.00', instantWin: '1.00', total: '1.00' },
            }),
          );

          expect(evaluation.status).toBe('FAIL');
        },
      ),
      { numRuns: 250, seed: 20261005 },
    );
  });

  it('detects a duplicated supported contribution in the declared total', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5_000_000 }),
        fc.integer({ min: 1, max: 5_000_000 }),
        (lines, instantWin) => {
          const duplicatedTotal = lines + instantWin + instantWin;

          const evaluation = M005_COMPONENT_AGGREGATION.evaluate(
            context({
              win: {
                lines: money(lines),
                instantWin: money(instantWin),
                total: money(duplicatedTotal),
              },
              winsMultipliers: { lines: '0.00', instantWin: '1.00', total: '1.00' },
            }),
          );

          expect(evaluation.status).toBe('FAIL');
        },
      ),
      { numRuns: 250, seed: 20261006 },
    );
  });
});
