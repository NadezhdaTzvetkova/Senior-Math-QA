import { describe, expect, it } from 'vitest';

import {
  M003_PLAIN_WIN_TOTAL,
  M004_PLAIN_MULTIPLIER_TOTAL,
  M005_COMPONENT_AGGREGATION,
  M006_NO_WIN_CONSISTENCY,
} from '../../../src/rules/calculations/consistency-rules.js';
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

describe('plain total consistency', () => {
  it('passes plain win totals equal to line totals', () => {
    const ctx = context({
      spinMode: 'Normal',
      win: { lines: '1.40', total: '1.40' },
      winsMultipliers: { lines: '0.70', total: '0.70' },
      winLines: [{}],
    });

    expect(M003_PLAIN_WIN_TOTAL.evaluate(ctx).status).toBe('PASS');
    expect(M004_PLAIN_MULTIPLIER_TOTAL.evaluate(ctx).status).toBe('PASS');
  });

  it('fails mismatching plain total', () => {
    const ctx = context({
      spinMode: 'Normal',
      win: { lines: '1.40', total: '1.41' },
      winsMultipliers: { lines: '0.70', total: '0.70' },
      winLines: [{}],
    });

    expect(M003_PLAIN_WIN_TOTAL.evaluate(ctx).status).toBe('FAIL');
  });

  it('does not apply plain-total rule when supported extras contribute', () => {
    const ctx = context({
      spinMode: 'Normal',
      win: { lines: '1.40', total: '5.40', instantWin: '4.00' },
      winsMultipliers: { lines: '0.70', total: '2.70', instantWin: '2.00' },
      winLines: [{}],
    });

    expect(M003_PLAIN_WIN_TOTAL.evaluate(ctx).status).toBe('NOT_APPLICABLE');
    expect(M004_PLAIN_MULTIPLIER_TOTAL.evaluate(ctx).status).toBe('NOT_APPLICABLE');
  });
  it('does not apply plain line-win totals to empty winLines with unexplained totals', () => {
    const ctx = context({
      spinMode: 'Normal',
      winLines: [],
      win: { lines: '0.00', total: '1.00' },
      winsMultipliers: { lines: '0.00', total: '0.00' },
    });

    expect(M003_PLAIN_WIN_TOTAL.evaluate(ctx).status).toBe('NOT_APPLICABLE');
    expect(M004_PLAIN_MULTIPLIER_TOTAL.evaluate(ctx).status).toBe('NOT_APPLICABLE');
  });

  it('does not infer plain line wins when winLines is absent', () => {
    const ctx = context({
      spinMode: 'Normal',
      win: { lines: '0.00', total: '1.00' },
      winsMultipliers: { lines: '0.00', total: '0.00' },
    });

    expect(M003_PLAIN_WIN_TOTAL.evaluate(ctx).status).toBe('NOT_EVALUABLE');
    expect(M004_PLAIN_MULTIPLIER_TOTAL.evaluate(ctx).status).toBe('NOT_EVALUABLE');
  });
});

describe('M005_COMPONENT_AGGREGATION', () => {
  it('passes supported named component aggregation', () => {
    const ctx = context({
      win: { lines: '1.40', instantWin: '4.00', total: '5.40' },
      winsMultipliers: { lines: '0.70', instantWin: '2.00', total: '2.70' },
    });

    expect(M005_COMPONENT_AGGREGATION.evaluate(ctx).status).toBe('PASS');
  });

  it('fails a one-cent aggregation defect', () => {
    const ctx = context({
      win: { lines: '1.40', instantWin: '4.00', total: '5.41' },
      winsMultipliers: { lines: '0.70', instantWin: '2.00', total: '2.70' },
    });

    expect(M005_COMPONENT_AGGREGATION.evaluate(ctx).status).toBe('FAIL');
  });

  it('does not recursively infer unsupported monetary fields', () => {
    const ctx = context({
      win: { lines: '0.00', mysteryAmount: '1.00', total: '1.00' },
      winsMultipliers: { lines: '0.00', total: '0.00' },
    });

    expect(M005_COMPONENT_AGGREGATION.evaluate(ctx).status).toBe('NOT_APPLICABLE');
  });
});

describe('M006_NO_WIN_CONSISTENCY', () => {
  it('does not infer no-win even when empty winLines accompanies zero totals', () => {
    const ctx = context({
      spinMode: 'Normal',
      winLines: [],
      win: { lines: '0.00', total: '0.00' },
      winsMultipliers: { lines: '0.00', total: '0.00' },
    });

    expect(M006_NO_WIN_CONSISTENCY.evaluate(ctx).status).toBe('NOT_EVALUABLE');
  });

  it('does not infer no-win from empty winLines with an unexplained non-zero total', () => {
    const ctx = context({
      spinMode: 'Normal',
      winLines: [],
      win: { lines: '0.00', total: '1.00' },
      winsMultipliers: { lines: '0.00', total: '0.00' },
    });

    expect(M006_NO_WIN_CONSISTENCY.evaluate(ctx).status).toBe('NOT_EVALUABLE');
  });

  it('does not infer no-win from absent winLines', () => {
    const ctx = context({
      spinMode: 'Normal',
      win: { lines: '0.00', total: '1.00' },
      winsMultipliers: { lines: '0.00', total: '0.00' },
    });

    expect(M006_NO_WIN_CONSISTENCY.evaluate(ctx).status).toBe('NOT_EVALUABLE');
  });

  it('does not apply no-win rule when line wins are present', () => {
    const ctx = context({
      spinMode: 'Normal',
      winLines: [{}],
      win: { lines: '1.00', total: '1.00' },
      winsMultipliers: { lines: '1.00', total: '1.00' },
    });

    expect(M006_NO_WIN_CONSISTENCY.evaluate(ctx).status).toBe('NOT_APPLICABLE');
  });
});
