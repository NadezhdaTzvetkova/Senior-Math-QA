import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { M002_CASH_SYMBOL_FORMULA } from '../../src/rules/calculations/core-calculation-rules.js';
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

describe('extended property-based mathematical invariants', () => {
  it('M002 accepts exact generated cash-symbol multiplication', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000 }),
        (stakeCents, multiplier) => {
          const evaluation = M002_CASH_SYMBOL_FORMULA.evaluate(
            context({
              stake: money(stakeCents),
              cashSymbols: [
                {
                  multiplier,
                  amount: money(stakeCents * multiplier),
                },
              ],
            }),
          );

          expect(evaluation.status).toBe('PASS');
        },
      ),
      { numRuns: 250, seed: 20260927 },
    );
  });

  it('M002 detects a one-cent mutation across generated valid calculations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000 }),
        (stakeCents, multiplier) => {
          const expectedCents = stakeCents * multiplier;
          const evaluation = M002_CASH_SYMBOL_FORMULA.evaluate(
            context({
              stake: money(stakeCents),
              cashSymbols: [
                {
                  multiplier,
                  amount: money(expectedCents + 1),
                },
              ],
            }),
          );

          expect(evaluation.status).toBe('FAIL');
        },
      ),
      { numRuns: 250, seed: 20260928 },
    );
  });

  it('M002 is metamorphically stable when stake and dependent amount are scaled together', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 20 }),
        (stakeCents, multiplier, scale) => {
          const scaledStake = stakeCents * scale;
          const evaluation = M002_CASH_SYMBOL_FORMULA.evaluate(
            context({
              stake: money(scaledStake),
              cashSymbols: [
                {
                  multiplier,
                  amount: money(scaledStake * multiplier),
                },
              ],
            }),
          );

          expect(evaluation.status).toBe('PASS');
        },
      ),
      { numRuns: 200, seed: 20260929 },
    );
  });

  it('M005 accepts exact generated supported-component aggregation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 1, max: 10_000_000 }),
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 1, max: 10_000_000 }),
        (lineCents, instantCents, multiplierLineCents, multiplierInstantCents) => {
          const evaluation = M005_COMPONENT_AGGREGATION.evaluate(
            context({
              win: {
                lines: money(lineCents),
                instantWin: money(instantCents),
                total: money(lineCents + instantCents),
              },
              winsMultipliers: {
                lines: money(multiplierLineCents),
                instantWin: money(multiplierInstantCents),
                total: money(multiplierLineCents + multiplierInstantCents),
              },
            }),
          );

          expect(evaluation.status).toBe('PASS');
        },
      ),
      { numRuns: 250, seed: 20260930 },
    );
  });

  it('M005 detects a one-cent total mutation across generated component aggregates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 1, max: 10_000_000 }),
        (lineCents, instantCents) => {
          const evaluation = M005_COMPONENT_AGGREGATION.evaluate(
            context({
              win: {
                lines: money(lineCents),
                instantWin: money(instantCents),
                total: money(lineCents + instantCents + 1),
              },
              winsMultipliers: {
                lines: '0.00',
                instantWin: '1.00',
                total: '1.00',
              },
            }),
          );

          expect(evaluation.status).toBe('FAIL');
        },
      ),
      { numRuns: 250, seed: 20261001 },
    );
  });

  it('M005 is metamorphically stable when all supported components are scaled together', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 20 }),
        (lineCents, instantCents, scale) => {
          const scaledLines = lineCents * scale;
          const scaledInstant = instantCents * scale;
          const evaluation = M005_COMPONENT_AGGREGATION.evaluate(
            context({
              win: {
                lines: money(scaledLines),
                instantWin: money(scaledInstant),
                total: money(scaledLines + scaledInstant),
              },
              winsMultipliers: {
                lines: '0.00',
                instantWin: '1.00',
                total: '1.00',
              },
            }),
          );

          expect(evaluation.status).toBe('PASS');
        },
      ),
      { numRuns: 200, seed: 20261002 },
    );
  });
});
