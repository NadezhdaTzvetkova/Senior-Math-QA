import { describe, expect, it } from 'vitest';

import {
  C002_WIN_PRESENT,
  C003_WIN_LINES_PRESENT,
  C005_WINS_MULTIPLIERS_PRESENT,
  C006_WM_LINES_PRESENT,
} from '../../../src/rules/contract/core-rules.js';
import { buildValidationContext } from '../../../src/validation/context.js';

describe('core contract regression cases', () => {
  it('returns NOT_EVALUABLE downstream when result is missing', () => {
    const ctx = buildValidationContext('fixture.json', {
      response: { body: {} },
    });

    expect(C003_WIN_LINES_PRESENT.evaluate(ctx).status).toBe('NOT_EVALUABLE');
    expect(C006_WM_LINES_PRESENT.evaluate(ctx).status).toBe('NOT_EVALUABLE');
  });

  it('returns NOT_EVALUABLE downstream when result is malformed', () => {
    const ctx = buildValidationContext('fixture.json', {
      response: {
        body: {
          result: 'malformed',
        },
      },
    });

    expect(C003_WIN_LINES_PRESENT.evaluate(ctx).status).toBe('NOT_EVALUABLE');
    expect(C006_WM_LINES_PRESENT.evaluate(ctx).status).toBe('NOT_EVALUABLE');
  });

  it('fails C002 when win exists but is not an object', () => {
    const ctx = buildValidationContext('fixture.json', {
      response: {
        body: {
          result: {
            win: [],
          },
        },
      },
    });

    expect(C002_WIN_PRESENT.evaluate(ctx).status).toBe('FAIL');
    expect(C003_WIN_LINES_PRESENT.evaluate(ctx).status).toBe('NOT_EVALUABLE');
  });

  it('fails C005 when winsMultipliers exists but is not an object', () => {
    const ctx = buildValidationContext('fixture.json', {
      response: {
        body: {
          result: {
            winsMultipliers: [],
          },
        },
      },
    });

    expect(C005_WINS_MULTIPLIERS_PRESENT.evaluate(ctx).status).toBe('FAIL');
    expect(C006_WM_LINES_PRESENT.evaluate(ctx).status).toBe('NOT_EVALUABLE');
  });
});
