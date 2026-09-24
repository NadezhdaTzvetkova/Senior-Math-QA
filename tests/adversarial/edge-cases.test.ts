import { describe, expect, it } from 'vitest';

import {
  B002_WIN_LINE_START_BOUNDS,
  B003_WIN_LINE_LENGTH_BOUNDS,
  R001_REELS_BUFFER_ARRAY,
  R002_BASE_MODE_WIDTH,
} from '../../src/rules/bounds/reel-bounds-rules.js';
import {
  M001_WIN_LINE_FORMULA,
  M002_CASH_SYMBOL_FORMULA,
} from '../../src/rules/calculations/core-calculation-rules.js';
import {
  M003_PLAIN_WIN_TOTAL,
  M004_PLAIN_MULTIPLIER_TOTAL,
  M005_COMPONENT_AGGREGATION,
  M006_NO_WIN_CONSISTENCY,
} from '../../src/rules/calculations/consistency-rules.js';
import {
  C001_RESULT_PRESENT,
  C003_WIN_LINES_PRESENT,
  C007_WM_TOTAL_PRESENT,
  C008_STAKE_PRESENT,
  E001_SPIN_MODE_ENUM,
} from '../../src/rules/contract/core-rules.js';
import {
  C013_OPTIONAL_ARRAY_TYPES,
  WL006_AMOUNT_PRESENT,
} from '../../src/rules/contract/extended-contract-rules.js';
import {
  F001_WIN_LINES_DECIMAL,
  T001_MULTIPLIER_NUMERIC,
  T002_MULTIPLIER_POSITIVE,
  T003_GAME_MODE_NUMERIC,
} from '../../src/rules/format/core-format-rules.js';
import {
  formatHumanReport,
  formatHumanSummary,
  summarizeFixture,
} from '../../src/reporting/findings.js';
import { multiplyMinorUnits, parseMinorUnits } from '../../src/utils/decimal.js';
import { buildValidationContext } from '../../src/validation/context.js';
import type { RuleEvaluation, ValidationRule } from '../../src/validation/rule.js';

function context(result: unknown) {
  return buildValidationContext('adversarial.json', {
    response: {
      body: {
        result,
      },
    },
  });
}

function status(rule: ValidationRule, result: unknown) {
  return rule.evaluate(context(result)).status;
}

const validResult = {
  win: {
    lines: '1.00',
    total: '1.00',
  },
  winsMultipliers: {
    lines: '1.00',
    total: '1.00',
  },
  stake: '2.00',
  multiplier: 1,
  spinMode: 'Normal',
  reelsBuffer: [[], [], [], [], []],
  winLines: [
    {
      index: 0,
      start: 0,
      length: 1,
      tile: 1,
      multiplier: 1,
      amount: '1.00',
      multipliedAmount: '1.00',
      tiles: [1],
    },
  ],
};

describe('adversarial boundary and prerequisite cases', () => {
  it('rejects decimal values that cannot be represented safely in minor units', () => {
    expect(parseMinorUnits('999999999999999999999999.99')).toBeUndefined();
  });

  it('rejects unsafe, non-finite and non-integral exact multiplication', () => {
    expect(multiplyMinorUnits(Number.MAX_SAFE_INTEGER + 1, 1)).toBeUndefined();
    expect(multiplyMinorUnits(100, Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(multiplyMinorUnits(1, 1.5)).toBeUndefined();
  });

  it('preserves exact negative monetary parsing without coercion', () => {
    expect(parseMinorUnits('-1.25')).toBe(-125);
  });

  it('makes arithmetic rules NOT_EVALUABLE when result is unavailable', () => {
    const missing = buildValidationContext('missing.json', {
      response: { body: {} },
    });

    expect(M001_WIN_LINE_FORMULA.evaluate(missing).status).toBe('NOT_EVALUABLE');
    expect(M002_CASH_SYMBOL_FORMULA.evaluate(missing).status).toBe('NOT_EVALUABLE');
  });

  it('does not calculate through malformed winLine entries', () => {
    expect(
      status(M001_WIN_LINE_FORMULA, {
        ...validResult,
        winLines: ['malformed'],
      }),
    ).toBe('NOT_EVALUABLE');
  });

  it('does not calculate through non-finite line multipliers', () => {
    expect(
      status(M001_WIN_LINE_FORMULA, {
        ...validResult,
        winLines: [
          {
            ...validResult.winLines[0],
            multiplier: Number.POSITIVE_INFINITY,
          },
        ],
      }),
    ).toBe('NOT_EVALUABLE');
  });

  it('does not invent rounding when exact minor-unit multiplication is fractional', () => {
    expect(
      status(M001_WIN_LINE_FORMULA, {
        ...validResult,
        winLines: [
          {
            ...validResult.winLines[0],
            amount: '0.01',
            multiplier: 1.5,
            multipliedAmount: '0.02',
          },
        ],
      }),
    ).toBe('NOT_EVALUABLE');
  });

  it('checks every line and catches corruption in a later entry', () => {
    expect(
      status(M001_WIN_LINE_FORMULA, {
        ...validResult,
        winLines: [
          validResult.winLines[0],
          {
            ...validResult.winLines[0],
            index: 1,
            multipliedAmount: '9.99',
          },
        ],
      }),
    ).toBe('FAIL');
  });

  it('does not calculate malformed cash-symbol collections or entries', () => {
    expect(
      status(M002_CASH_SYMBOL_FORMULA, {
        ...validResult,
        cashSymbols: {},
      }),
    ).toBe('NOT_EVALUABLE');

    expect(
      status(M002_CASH_SYMBOL_FORMULA, {
        ...validResult,
        cashSymbols: ['malformed'],
      }),
    ).toBe('NOT_EVALUABLE');
  });

  it('rejects unsafe cash-symbol arithmetic instead of rounding or overflowing', () => {
    expect(
      status(M002_CASH_SYMBOL_FORMULA, {
        ...validResult,
        stake: '0.01',
        cashSymbols: [
          {
            amount: '0.02',
            multiplier: 1.5,
          },
        ],
      }),
    ).toBe('NOT_EVALUABLE');
  });

  it('handles missing and malformed reel prerequisites conservatively', () => {
    const missingResult = buildValidationContext('missing.json', {
      response: { body: {} },
    });

    expect(R001_REELS_BUFFER_ARRAY.evaluate(missingResult).status).toBe('NOT_EVALUABLE');

    expect(
      status(R001_REELS_BUFFER_ARRAY, {
        ...validResult,
        reelsBuffer: undefined,
      }),
    ).toBe('FAIL');

    const noReels = { ...validResult };
    delete (noReels as Partial<typeof validResult>).reelsBuffer;

    expect(status(R002_BASE_MODE_WIDTH, noReels)).toBe('NOT_EVALUABLE');

    expect(
      status(R002_BASE_MODE_WIDTH, {
        ...validResult,
        reelsBuffer: 'five reels',
      }),
    ).toBe('NOT_EVALUABLE');
  });

  it('handles empty, missing and malformed start bounds without false failures', () => {
    expect(
      status(B002_WIN_LINE_START_BOUNDS, {
        ...validResult,
        winLines: [],
      }),
    ).toBe('NOT_APPLICABLE');

    expect(
      status(B002_WIN_LINE_START_BOUNDS, {
        ...validResult,
        winLines: [{}],
      }),
    ).toBe('NOT_EVALUABLE');

    expect(
      status(B002_WIN_LINE_START_BOUNDS, {
        ...validResult,
        winLines: [{ start: 1.5 }],
      }),
    ).toBe('NOT_EVALUABLE');
  });

  it('rejects zero-length and negative-start line segments', () => {
    expect(
      status(B003_WIN_LINE_LENGTH_BOUNDS, {
        ...validResult,
        winLines: [{ start: 0, length: 0 }],
      }),
    ).toBe('FAIL');

    expect(
      status(B003_WIN_LINE_LENGTH_BOUNDS, {
        ...validResult,
        winLines: [{ start: -1, length: 1 }],
      }),
    ).toBe('FAIL');
  });

  it('does not evaluate length bounds when required structure or integer types are absent', () => {
    expect(
      status(B003_WIN_LINE_LENGTH_BOUNDS, {
        ...validResult,
        winLines: [{}],
      }),
    ).toBe('NOT_EVALUABLE');

    expect(
      status(B003_WIN_LINE_LENGTH_BOUNDS, {
        ...validResult,
        winLines: [{ start: 0, length: 1.2 }],
      }),
    ).toBe('NOT_EVALUABLE');
  });

  it('rejects zero and negative multipliers while preserving numeric-prerequisite ownership', () => {
    expect(
      status(T002_MULTIPLIER_POSITIVE, {
        ...validResult,
        multiplier: 0,
      }),
    ).toBe('FAIL');

    expect(
      status(T002_MULTIPLIER_POSITIVE, {
        ...validResult,
        multiplier: -1,
      }),
    ).toBe('FAIL');

    expect(
      status(T002_MULTIPLIER_POSITIVE, {
        ...validResult,
        multiplier: Number.NaN,
      }),
    ).toBe('NOT_EVALUABLE');

    expect(
      status(T001_MULTIPLIER_NUMERIC, {
        ...validResult,
        multiplier: Number.NaN,
      }),
    ).toBe('FAIL');
  });

  it('treats missing optional gameMode differently from malformed gameMode', () => {
    expect(status(T003_GAME_MODE_NUMERIC, validResult)).toBe('NOT_APPLICABLE');

    expect(
      status(T003_GAME_MODE_NUMERIC, {
        ...validResult,
        gameMode: Number.POSITIVE_INFINITY,
      }),
    ).toBe('FAIL');
  });

  it('does not duplicate contract defects in downstream format rules', () => {
    expect(
      status(F001_WIN_LINES_DECIMAL, {
        ...validResult,
        win: {
          total: '1.00',
        },
      }),
    ).toBe('NOT_EVALUABLE');

    expect(
      status(C003_WIN_LINES_PRESENT, {
        ...validResult,
        win: {
          total: '1.00',
        },
      }),
    ).toBe('FAIL');
  });

  it('fails malformed optional arrays and malformed later winLine entries', () => {
    expect(
      status(C013_OPTIONAL_ARRAY_TYPES, {
        ...validResult,
        collectors: {},
      }),
    ).toBe('FAIL');

    expect(
      status(WL006_AMOUNT_PRESENT, {
        ...validResult,
        winLines: [validResult.winLines[0], 'malformed'],
      }),
    ).toBe('NOT_EVALUABLE');
  });

  it('covers malformed result contract and enum prerequisite branches', () => {
    expect(status(C001_RESULT_PRESENT, 'bad-result')).toBe('FAIL');
    expect(status(C008_STAKE_PRESENT, 'bad-result')).toBe('NOT_EVALUABLE');
    expect(status(C007_WM_TOTAL_PRESENT, 'bad-result')).toBe('NOT_EVALUABLE');

    const withoutSpinMode = { ...validResult };
    delete (withoutSpinMode as Partial<typeof validResult>).spinMode;

    expect(status(E001_SPIN_MODE_ENUM, withoutSpinMode)).toBe('NOT_EVALUABLE');
  });

  it('keeps consistency rules conservative when prerequisites are malformed', () => {
    expect(
      status(M003_PLAIN_WIN_TOTAL, {
        ...validResult,
        win: {
          ...validResult.win,
          instantWin: 'bad',
        },
      }),
    ).toBe('NOT_EVALUABLE');

    expect(
      status(M004_PLAIN_MULTIPLIER_TOTAL, {
        ...validResult,
        winsMultipliers: {
          lines: 'bad',
          total: '1.00',
        },
      }),
    ).toBe('NOT_EVALUABLE');

    expect(
      status(M005_COMPONENT_AGGREGATION, {
        ...validResult,
        win: {
          ...validResult.win,
          instantWin: 'bad',
        },
      }),
    ).toBe('NOT_EVALUABLE');

    expect(
      status(M006_NO_WIN_CONSISTENCY, {
        ...validResult,
        winLines: [],
        win: {
          ...validResult.win,
          instantWin: 'bad',
        },
      }),
    ).toBe('NOT_EVALUABLE');
  });
});

describe('reporting adversarial cases', () => {
  it('renders a zero-failure fixture explicitly', () => {
    const summary = summarizeFixture('clean.json', []);

    expect(formatHumanSummary(summary)).toContain('No confirmed validation failures.');
  });

  it('renders empty aggregate failure maps explicitly', () => {
    const text = formatHumanReport([summarizeFixture('clean.json', [])]);

    expect(text).toContain('Failures by category: none');
    expect(text).toContain('Failures by rule: none');
  });

  it('uses fallback explanation when failed evidence does not provide one', () => {
    const evaluations: readonly RuleEvaluation[] = [
      {
        fixtureName: 'fallback.json',
        ruleId: 'X001',
        category: 'CONTRACT',
        status: 'FAIL',
        specRef: 'synthetic',
      },
    ];

    expect(formatHumanSummary(summarizeFixture('fallback.json', evaluations))).toContain(
      'Validation rule failed without additional evidence',
    );
  });
});
