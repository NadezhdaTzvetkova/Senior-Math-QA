import { hasOwn, isJsonObject } from '../../parsing/guards.js';
import { parseMinorUnits, multiplyMinorUnits } from '../../utils/decimal.js';
import { evaluation, type ValidationRule } from '../../validation/rule.js';

const RESULT_PATH = 'response.body.result';

function getResult(
  context: Parameters<ValidationRule['evaluate']>[0],
): Record<string, unknown> | undefined {
  return isJsonObject(context.result) ? context.result : undefined;
}

export const M001_WIN_LINE_FORMULA: ValidationRule = {
  id: 'M001_WIN_LINE_FORMULA',
  category: 'CALCULATION',
  specRef: 'candidate-spec: winLine multipliedAmount = amount * multiplier',
  evaluate: (context) => {
    const result = getResult(context);

    if (result === undefined) {
      return evaluation(context, M001_WIN_LINE_FORMULA, 'NOT_EVALUABLE', {
        path: RESULT_PATH,
        explanation: 'response.body.result is absent or malformed',
      });
    }

    if (!hasOwn(result, 'winLines')) {
      return evaluation(context, M001_WIN_LINE_FORMULA, 'NOT_APPLICABLE', {
        path: `${RESULT_PATH}.winLines`,
        explanation: 'winLines is optional and absent',
      });
    }

    if (!Array.isArray(result.winLines)) {
      return evaluation(context, M001_WIN_LINE_FORMULA, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.winLines`,
        actual: result.winLines,
        explanation: 'winLines must be an array before line calculations can be evaluated',
      });
    }

    if (result.winLines.length === 0) {
      return evaluation(context, M001_WIN_LINE_FORMULA, 'NOT_APPLICABLE', {
        path: `${RESULT_PATH}.winLines`,
        explanation: 'no winLine entries are present',
      });
    }

    for (const [index, entry] of result.winLines.entries()) {
      if (!isJsonObject(entry)) {
        return evaluation(context, M001_WIN_LINE_FORMULA, 'NOT_EVALUABLE', {
          path: `${RESULT_PATH}.winLines[${index}]`,
          actual: entry,
          explanation: 'winLine entry is malformed',
        });
      }

      const amount = parseMinorUnits(entry.amount);
      const multipliedAmount = parseMinorUnits(entry.multipliedAmount);
      const multiplier = entry.multiplier;

      if (
        amount === undefined ||
        multipliedAmount === undefined ||
        typeof multiplier !== 'number' ||
        !Number.isFinite(multiplier)
      ) {
        return evaluation(context, M001_WIN_LINE_FORMULA, 'NOT_EVALUABLE', {
          path: `${RESULT_PATH}.winLines[${index}]`,
          explanation:
            'amount, multipliedAmount, and numeric multiplier prerequisites must be valid',
        });
      }

      const expected = multiplyMinorUnits(amount, multiplier);

      if (expected === undefined) {
        return evaluation(context, M001_WIN_LINE_FORMULA, 'NOT_EVALUABLE', {
          path: `${RESULT_PATH}.winLines[${index}]`,
          explanation: 'exact integer multiplication could not be represented safely',
        });
      }

      if (multipliedAmount !== expected) {
        return evaluation(context, M001_WIN_LINE_FORMULA, 'FAIL', {
          path: `${RESULT_PATH}.winLines[${index}].multipliedAmount`,
          expected,
          actual: multipliedAmount,
          explanation: 'winLine multipliedAmount does not equal amount multiplied by multiplier',
        });
      }
    }

    return evaluation(context, M001_WIN_LINE_FORMULA, 'PASS');
  },
};

export const M002_CASH_SYMBOL_FORMULA: ValidationRule = {
  id: 'M002_CASH_SYMBOL_FORMULA',
  category: 'CALCULATION',
  specRef: 'candidate-spec: cashSymbols amount = multiplier * stake',
  evaluate: (context) => {
    const result = getResult(context);

    if (result === undefined) {
      return evaluation(context, M002_CASH_SYMBOL_FORMULA, 'NOT_EVALUABLE', {
        path: RESULT_PATH,
        explanation: 'response.body.result is absent or malformed',
      });
    }

    if (!hasOwn(result, 'cashSymbols')) {
      return evaluation(context, M002_CASH_SYMBOL_FORMULA, 'NOT_APPLICABLE', {
        path: `${RESULT_PATH}.cashSymbols`,
        explanation: 'cashSymbols is optional and absent',
      });
    }

    if (!Array.isArray(result.cashSymbols)) {
      return evaluation(context, M002_CASH_SYMBOL_FORMULA, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.cashSymbols`,
        actual: result.cashSymbols,
        explanation: 'cashSymbols must be an array before calculations can be evaluated',
      });
    }

    if (result.cashSymbols.length === 0) {
      return evaluation(context, M002_CASH_SYMBOL_FORMULA, 'NOT_APPLICABLE', {
        path: `${RESULT_PATH}.cashSymbols`,
        explanation: 'no cashSymbol entries are present',
      });
    }

    const stake = parseMinorUnits(result.stake);

    if (stake === undefined) {
      return evaluation(context, M002_CASH_SYMBOL_FORMULA, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.stake`,
        actual: result.stake,
        explanation:
          'stake must be a valid two-decimal string before cash-symbol math can be evaluated',
      });
    }

    for (const [index, entry] of result.cashSymbols.entries()) {
      if (!isJsonObject(entry)) {
        return evaluation(context, M002_CASH_SYMBOL_FORMULA, 'NOT_EVALUABLE', {
          path: `${RESULT_PATH}.cashSymbols[${index}]`,
          actual: entry,
          explanation: 'cashSymbol entry is malformed',
        });
      }

      const amount = parseMinorUnits(entry.amount);
      const multiplier = entry.multiplier;

      if (amount === undefined || typeof multiplier !== 'number' || !Number.isFinite(multiplier)) {
        return evaluation(context, M002_CASH_SYMBOL_FORMULA, 'NOT_EVALUABLE', {
          path: `${RESULT_PATH}.cashSymbols[${index}]`,
          explanation: 'cashSymbol amount and numeric multiplier prerequisites must be valid',
        });
      }

      const expected = multiplyMinorUnits(stake, multiplier);

      if (expected === undefined) {
        return evaluation(context, M002_CASH_SYMBOL_FORMULA, 'NOT_EVALUABLE', {
          path: `${RESULT_PATH}.cashSymbols[${index}]`,
          explanation: 'exact integer multiplication could not be represented safely',
        });
      }

      if (amount !== expected) {
        return evaluation(context, M002_CASH_SYMBOL_FORMULA, 'FAIL', {
          path: `${RESULT_PATH}.cashSymbols[${index}].amount`,
          expected,
          actual: amount,
          explanation: 'cashSymbol amount does not equal multiplier multiplied by stake',
        });
      }
    }

    return evaluation(context, M002_CASH_SYMBOL_FORMULA, 'PASS');
  },
};

export const CORE_CALCULATION_RULES: readonly ValidationRule[] = [
  M001_WIN_LINE_FORMULA,
  M002_CASH_SYMBOL_FORMULA,
];
