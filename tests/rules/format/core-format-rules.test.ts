import { describe, expect, it } from 'vitest';

import {
  F001_WIN_LINES_DECIMAL,
  F002_WIN_TOTAL_DECIMAL,
  F005_STAKE_DECIMAL,
  T001_MULTIPLIER_NUMERIC,
  T002_MULTIPLIER_POSITIVE,
  T003_GAME_MODE_NUMERIC,
} from '../../../src/rules/format/core-format-rules.js';
import { buildValidationContext } from '../../../src/validation/context.js';

function context(result: unknown) {
  return buildValidationContext('fixture.json', {
    response: {
      body: {
        result,
      },
    },
  });
}

describe('money format rules', () => {
  it('accepts canonical two-decimal money strings', () => {
    const ctx = context({
      win: { lines: '0.40', total: '0.40' },
      stake: '2.00',
    });

    expect(F001_WIN_LINES_DECIMAL.evaluate(ctx).status).toBe('PASS');
    expect(F002_WIN_TOTAL_DECIMAL.evaluate(ctx).status).toBe('PASS');
    expect(F005_STAKE_DECIMAL.evaluate(ctx).status).toBe('PASS');
  });

  it('rejects win.lines without two fractional digits', () => {
    const result = F001_WIN_LINES_DECIMAL.evaluate(context({ win: { lines: '0.4' } }));

    expect(result.status).toBe('FAIL');
    expect(result.evidence?.actual).toBe('0.4');
  });

  it('rejects win.total without two fractional digits', () => {
    expect(F002_WIN_TOTAL_DECIMAL.evaluate(context({ win: { total: '0' } })).status).toBe('FAIL');
  });

  it('rejects numeric stake instead of silently coercing it', () => {
    const result = F005_STAKE_DECIMAL.evaluate(context({ stake: 2 }));

    expect(result.status).toBe('FAIL');
    expect(result.evidence?.actual).toBe(2);
  });

  it('does not duplicate a missing-field contract defect', () => {
    expect(F002_WIN_TOTAL_DECIMAL.evaluate(context({ win: {} })).status).toBe('NOT_EVALUABLE');
  });
});

describe('numeric type rules', () => {
  it('accepts a finite numeric multiplier', () => {
    expect(T001_MULTIPLIER_NUMERIC.evaluate(context({ multiplier: 1 })).status).toBe('PASS');
  });

  it('rejects a string multiplier', () => {
    const result = T001_MULTIPLIER_NUMERIC.evaluate(context({ multiplier: '1' }));

    expect(result.status).toBe('FAIL');
    expect(result.evidence?.actual).toBe('1');
  });

  it('requires a positive multiplier only after numeric validation', () => {
    expect(T002_MULTIPLIER_POSITIVE.evaluate(context({ multiplier: 0 })).status).toBe('FAIL');

    expect(T002_MULTIPLIER_POSITIVE.evaluate(context({ multiplier: '1' })).status).toBe(
      'NOT_EVALUABLE',
    );
  });

  it('accepts numeric gameMode and rejects string gameMode', () => {
    expect(T003_GAME_MODE_NUMERIC.evaluate(context({ gameMode: 0 })).status).toBe('PASS');

    expect(T003_GAME_MODE_NUMERIC.evaluate(context({ gameMode: '0' })).status).toBe('FAIL');
  });

  it('marks absent optional gameMode as not applicable', () => {
    expect(T003_GAME_MODE_NUMERIC.evaluate(context({})).status).toBe('NOT_APPLICABLE');
  });
});
