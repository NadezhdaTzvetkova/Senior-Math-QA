import { describe, expect, it } from 'vitest';

import {
  C001_RESULT_PRESENT,
  C003_WIN_LINES_PRESENT,
  C004_WIN_TOTAL_PRESENT,
  C006_WM_LINES_PRESENT,
  C012_WIN_LINES_ARRAY,
  CONTRACT_AND_ENUM_RULES,
  E001_SPIN_MODE_ENUM,
} from '../../../src/rules/contract/core-rules.js';
import { buildValidationContext } from '../../../src/validation/context.js';
import { ValidationEngine } from '../../../src/validation/engine.js';

function context(result: unknown) {
  return buildValidationContext('fixture.json', {
    response: {
      body: {
        result,
      },
    },
  });
}

describe('core contract rules', () => {
  it('fails C001 when result is missing', () => {
    const ctx = buildValidationContext('fixture.json', {
      response: { body: {} },
    });

    expect(C001_RESULT_PRESENT.evaluate(ctx).status).toBe('FAIL');
  });

  it('fails missing win.total', () => {
    const result = {
      win: { lines: '0.00' },
      winsMultipliers: { lines: '0.00', total: '0.00' },
      stake: '2.00',
      multiplier: 1,
      spinMode: 'Normal',
      reelsBuffer: [],
    };

    expect(C004_WIN_TOTAL_PRESENT.evaluate(context(result)).status).toBe('FAIL');
  });

  it('fails missing win.lines', () => {
    const result = {
      win: { total: '0.00' },
      winsMultipliers: { lines: '0.00', total: '0.00' },
      stake: '2.00',
      multiplier: 1,
      spinMode: 'Normal',
      reelsBuffer: [],
    };

    expect(C003_WIN_LINES_PRESENT.evaluate(context(result)).status).toBe('FAIL');
  });

  it('fails missing winsMultipliers.lines', () => {
    const result = {
      win: { lines: '0.00', total: '0.00' },
      winsMultipliers: { total: '0.00' },
      stake: '2.00',
      multiplier: 1,
      spinMode: 'Normal',
      reelsBuffer: [],
    };

    expect(C006_WM_LINES_PRESENT.evaluate(context(result)).status).toBe('FAIL');
  });

  it('treats absent optional winLines as not applicable', () => {
    const result = {
      win: { lines: '0.00', total: '0.00' },
      winsMultipliers: { lines: '0.00', total: '0.00' },
      stake: '2.00',
      multiplier: 1,
      spinMode: 'Normal',
      reelsBuffer: [],
    };

    expect(C012_WIN_LINES_ARRAY.evaluate(context(result)).status).toBe('NOT_APPLICABLE');
  });

  it('fails malformed winLines', () => {
    const result = {
      win: { lines: '0.00', total: '0.00' },
      winsMultipliers: { lines: '0.00', total: '0.00' },
      stake: '2.00',
      multiplier: 1,
      winLines: { malformed: true },
      spinMode: 'Normal',
      reelsBuffer: [],
    };

    expect(C012_WIN_LINES_ARRAY.evaluate(context(result)).status).toBe('FAIL');
  });

  it('fails an unsupported spinMode', () => {
    const result = {
      win: { lines: '0.00', total: '0.00' },
      winsMultipliers: { lines: '0.00', total: '0.00' },
      stake: '2.00',
      multiplier: 1,
      winLines: [],
      spinMode: 'InvalidSpinMode',
      reelsBuffer: [],
    };

    const resultEvaluation = E001_SPIN_MODE_ENUM.evaluate(context(result));

    expect(resultEvaluation.status).toBe('FAIL');
    expect(resultEvaluation.evidence?.actual).toBe('InvalidSpinMode');
  });

  it('passes the complete core contract', () => {
    const result = {
      win: { lines: '0.00', total: '0.00' },
      winsMultipliers: { lines: '0.00', total: '0.00' },
      stake: '2.00',
      multiplier: 1,
      winLines: [],
      spinMode: 'Normal',
      reelsBuffer: [],
    };

    const evaluations = new ValidationEngine(CONTRACT_AND_ENUM_RULES).evaluate(context(result));

    expect(evaluations.filter((item) => item.status === 'FAIL')).toEqual([]);
  });
});
