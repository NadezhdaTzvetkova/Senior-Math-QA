import { describe, expect, it } from 'vitest';

import { multiplyMinorUnits, parseMinorUnits } from '../../../src/utils/decimal.js';
import {
  M001_WIN_LINE_FORMULA,
  M002_CASH_SYMBOL_FORMULA,
} from '../../../src/rules/calculations/core-calculation-rules.js';
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

describe('decimal utilities', () => {
  it('parses canonical decimal strings into minor units', () => {
    expect(parseMinorUnits('0.00')).toBe(0);
    expect(parseMinorUnits('1.40')).toBe(140);
    expect(parseMinorUnits('42.00')).toBe(4200);
  });

  it('rejects malformed decimal strings', () => {
    expect(parseMinorUnits('1.4')).toBeUndefined();
    expect(parseMinorUnits('1')).toBeUndefined();
    expect(parseMinorUnits(1)).toBeUndefined();
  });

  it('multiplies safely using integer minor units', () => {
    expect(multiplyMinorUnits(140, 2)).toBe(280);
  });
});

describe('M001_WIN_LINE_FORMULA', () => {
  it('passes coherent line-win multiplication', () => {
    const result = M001_WIN_LINE_FORMULA.evaluate(
      context({
        winLines: [
          {
            amount: '0.20',
            multiplier: 2,
            multipliedAmount: '0.40',
          },
        ],
      }),
    );

    expect(result.status).toBe('PASS');
  });

  it('fails incoherent multipliedAmount', () => {
    const result = M001_WIN_LINE_FORMULA.evaluate(
      context({
        winLines: [
          {
            amount: '0.20',
            multiplier: 2,
            multipliedAmount: '0.41',
          },
        ],
      }),
    );

    expect(result.status).toBe('FAIL');
  });

  it('does not evaluate malformed winLines', () => {
    expect(M001_WIN_LINE_FORMULA.evaluate(context({ winLines: { malformed: true } })).status).toBe(
      'NOT_EVALUABLE',
    );
  });
});

describe('M002_CASH_SYMBOL_FORMULA', () => {
  it('passes coherent cash-symbol multiplication', () => {
    const result = M002_CASH_SYMBOL_FORMULA.evaluate(
      context({
        stake: '2.00',
        cashSymbols: [
          {
            multiplier: 2,
            amount: '4.00',
          },
        ],
      }),
    );

    expect(result.status).toBe('PASS');
  });

  it('fails incoherent cash-symbol amount', () => {
    const result = M002_CASH_SYMBOL_FORMULA.evaluate(
      context({
        stake: '2.00',
        cashSymbols: [
          {
            multiplier: 2,
            amount: '4.01',
          },
        ],
      }),
    );

    expect(result.status).toBe('FAIL');
  });

  it('does not evaluate when stake format is invalid', () => {
    expect(
      M002_CASH_SYMBOL_FORMULA.evaluate(
        context({
          stake: 2,
          cashSymbols: [
            {
              multiplier: 2,
              amount: '4.00',
            },
          ],
        }),
      ).status,
    ).toBe('NOT_EVALUABLE');
  });
});
