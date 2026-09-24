import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { M005_COMPONENT_AGGREGATION } from '../../src/rules/calculations/consistency-rules.js';
import { multiplyMinorUnits } from '../../src/utils/decimal.js';
import { buildValidationContext } from '../../src/validation/context.js';
import {
  oracleMoneyFromMinor,
  oracleMultiplyMinor,
  oracleSumMinor,
} from '../helpers/math-oracle.js';

function context(result: unknown) {
  return buildValidationContext('generated.json', {
    response: {
      body: {
        result,
      },
    },
  });
}

describe('independent mathematical test oracle', () => {
  it('cross-checks production integer multiplication against a BigInt oracle', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        fc.integer({ min: -10_000, max: 10_000 }),
        (amount, multiplier) => {
          const oracle = oracleMultiplyMinor(BigInt(amount), BigInt(multiplier));

          if (
            oracle > BigInt(Number.MAX_SAFE_INTEGER) ||
            oracle < BigInt(Number.MIN_SAFE_INTEGER)
          ) {
            expect(multiplyMinorUnits(amount, multiplier)).toBeUndefined();
          } else {
            expect(multiplyMinorUnits(amount, multiplier)).toBe(Number(oracle));
          }
        },
      ),
      { numRuns: 500, seed: 20261015 },
    );
  });

  it('cross-checks supported-component aggregation against an independent BigInt sum', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 0, max: 10_000_000 }),
        (lines, instantWin, freeSpins, respin) => {
          const total = oracleSumMinor([
            BigInt(lines),
            BigInt(instantWin),
            BigInt(freeSpins),
            BigInt(respin),
          ]);

          const evaluation = M005_COMPONENT_AGGREGATION.evaluate(
            context({
              win: {
                lines: oracleMoneyFromMinor(BigInt(lines)),
                instantWin: oracleMoneyFromMinor(BigInt(instantWin)),
                freeSpins: oracleMoneyFromMinor(BigInt(freeSpins)),
                respin: oracleMoneyFromMinor(BigInt(respin)),
                total: oracleMoneyFromMinor(total),
              },
              winsMultipliers: {
                lines: '0.00',
                instantWin: '0.00',
                freeSpins: '0.00',
                respin: '0.00',
                total: '0.00',
              },
            }),
          );

          expect(evaluation.status).toBe('PASS');
        },
      ),
      { numRuns: 300, seed: 20261016 },
    );
  });

  it('the independent money formatter preserves exact minor units across generated values', () => {
    fc.assert(
      fc.property(fc.integer({ min: -100_000_000, max: 100_000_000 }), (minor) => {
        const text = oracleMoneyFromMinor(BigInt(minor));
        const sign = minor < 0 ? '-' : '';
        const absolute = Math.abs(minor);
        const expected = `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;

        expect(text).toBe(expected);
      }),
      { numRuns: 300, seed: 20261017 },
    );
  });
});
