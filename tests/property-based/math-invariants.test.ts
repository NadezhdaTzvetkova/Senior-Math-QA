import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ALL_RULES } from '../../src/rules/registry.js';
import { buildValidationContext, type GameValidationConfig } from '../../src/validation/context.js';
import { ValidationEngine } from '../../src/validation/engine.js';
import type { RuleEvaluation, RuleStatus } from '../../src/validation/rule.js';

const engine = new ValidationEngine(ALL_RULES);

interface FixtureOptions {
  readonly multipliedCents?: number;
  readonly winTotal?: string;
  readonly omitWinTotal?: boolean;
  readonly baseReelCount?: number;
  readonly start?: number;
  readonly length?: number;
}

function money(cents: number): string {
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');
  return `${cents < 0 ? '-' : ''}${whole}.${fraction}`;
}

function fixture(amountCents: number, multiplier: number, options: FixtureOptions = {}): unknown {
  const multipliedCents = options.multipliedCents ?? amountCents * multiplier;
  const multipliedAmount = money(multipliedCents);
  const baseReelCount = options.baseReelCount ?? 5;
  const start = options.start ?? 0;
  const length = options.length ?? 1;
  const win = {
    lines: multipliedAmount,
    ...(options.omitWinTotal === true ? {} : { total: options.winTotal ?? multipliedAmount }),
  };

  return {
    response: {
      body: {
        result: {
          win,
          winsMultipliers: { lines: multipliedAmount, total: multipliedAmount },
          stake: '1.00',
          multiplier: 1,
          spinMode: 'Normal',
          reelsBuffer: Array.from({ length: baseReelCount }, () => []),
          winLines: [
            {
              index: 0,
              start,
              length,
              tile: 1,
              multiplier,
              amount: money(amountCents),
              multipliedAmount,
              tiles: [1],
            },
          ],
        },
      },
    },
  };
}

function evaluations(raw: unknown, config?: GameValidationConfig): readonly RuleEvaluation[] {
  return engine.evaluate(
    config === undefined
      ? buildValidationContext('generated.json', raw)
      : buildValidationContext('generated.json', raw, config),
  );
}

function status(items: readonly RuleEvaluation[], ruleId: string): RuleStatus {
  const item = items.find((evaluation) => evaluation.ruleId === ruleId);

  if (item === undefined) {
    throw new Error(`Rule ${ruleId} was not evaluated`);
  }

  return item.status;
}

describe('property-based mathematical invariants', () => {
  it('accepts exact line-win multiplication across generated monetary values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 1, max: 100 }),
        (amountCents, multiplier) => {
          const result = evaluations(fixture(amountCents, multiplier));
          expect(status(result, 'M001_WIN_LINE_FORMULA')).toBe('PASS');
        },
      ),
      { numRuns: 250, seed: 20260924 },
    );
  });

  it('detects a one-cent line-win mutation across generated valid calculations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 1, max: 100 }),
        (amountCents, multiplier) => {
          const result = evaluations(
            fixture(amountCents, multiplier, {
              multipliedCents: amountCents * multiplier + 1,
            }),
          );
          expect(status(result, 'M001_WIN_LINE_FORMULA')).toBe('FAIL');
        },
      ),
      { numRuns: 250, seed: 20260925 },
    );
  });

  it('accepts generated win-line segments contained within configured reel bounds', () => {
    const segment = fc
      .integer({ min: 1, max: 12 })
      .chain((baseReelCount) =>
        fc
          .integer({ min: 0, max: baseReelCount - 1 })
          .chain((start) =>
            fc
              .integer({ min: 1, max: baseReelCount - start })
              .map((length) => ({ baseReelCount, start, length })),
          ),
      );

    fc.assert(
      fc.property(segment, ({ baseReelCount, start, length }) => {
        const result = evaluations(fixture(100, 1, { baseReelCount, start, length }), {
          baseReelCount,
        });

        expect(status(result, 'R002_BASE_MODE_WIDTH')).toBe('PASS');
        expect(status(result, 'B002_WIN_LINE_START_BOUNDS')).toBe('PASS');
        expect(status(result, 'B003_WIN_LINE_LENGTH_BOUNDS')).toBe('PASS');
      }),
      { numRuns: 200, seed: 20260926 },
    );
  });
});

describe('controlled mutation and defect localization', () => {
  it('keeps a missing win.total as the primary contract defect', () => {
    const result = evaluations(fixture(100, 1, { omitWinTotal: true }));

    expect(status(result, 'C004_WIN_TOTAL_PRESENT')).toBe('FAIL');
    expect(status(result, 'F002_WIN_TOTAL_DECIMAL')).toBe('NOT_EVALUABLE');
  });

  it('distinguishes malformed money format from missing contract data', () => {
    const result = evaluations(fixture(100, 1, { winTotal: '1' }));

    expect(status(result, 'C004_WIN_TOTAL_PRESENT')).toBe('PASS');
    expect(status(result, 'F002_WIN_TOTAL_DECIMAL')).toBe('FAIL');
  });

  it('localizes mathematical corruption without fabricating a structural defect', () => {
    const result = evaluations(fixture(250, 4, { multipliedCents: 1001 }));

    expect(status(result, 'C012_WIN_LINES_ARRAY')).toBe('PASS');
    expect(status(result, 'M001_WIN_LINE_FORMULA')).toBe('FAIL');
  });
});
