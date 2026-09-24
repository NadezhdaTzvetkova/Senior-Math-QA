import { hasOwn, isJsonObject } from '../../parsing/guards.js';
import { evaluation, type ValidationRule } from '../../validation/rule.js';

const RESULT_PATH = 'response.body.result';
const MONEY_PATTERN = /^-?\d+\.\d{2}$/;

function getResult(
  context: Parameters<ValidationRule['evaluate']>[0],
): Record<string, unknown> | undefined {
  return isJsonObject(context.result) ? context.result : undefined;
}

function decimalFieldRule(
  id: string,
  parent: 'win' | 'winsMultipliers' | undefined,
  field: string,
  specRef: string,
): ValidationRule {
  const rule: ValidationRule = {
    id,
    category: 'TYPE_FORMAT',
    specRef,
    evaluate: (context) => {
      const result = getResult(context);

      if (result === undefined) {
        return evaluation(context, rule, 'NOT_EVALUABLE', {
          path: RESULT_PATH,
          explanation: 'response.body.result is absent or malformed',
        });
      }

      const container = parent === undefined ? result : result[parent];

      if (!isJsonObject(container)) {
        return evaluation(context, rule, 'NOT_EVALUABLE', {
          path: parent === undefined ? RESULT_PATH : `${RESULT_PATH}.${parent}`,
          explanation:
            parent === undefined
              ? 'result is not an object'
              : `${parent} is absent or malformed; contract rule owns the primary defect`,
        });
      }

      if (!hasOwn(container, field)) {
        return evaluation(context, rule, 'NOT_EVALUABLE', {
          path:
            parent === undefined ? `${RESULT_PATH}.${field}` : `${RESULT_PATH}.${parent}.${field}`,
          explanation: `${field} is absent; presence rule owns the primary defect`,
        });
      }

      const value = container[field];
      const path =
        parent === undefined ? `${RESULT_PATH}.${field}` : `${RESULT_PATH}.${parent}.${field}`;

      if (typeof value !== 'string' || !MONEY_PATTERN.test(value)) {
        return evaluation(context, rule, 'FAIL', {
          path,
          expected: 'decimal string with exactly 2 fractional digits',
          actual: value,
          explanation: `${path} must use exact two-decimal string format`,
        });
      }

      return evaluation(context, rule, 'PASS');
    },
  };

  return rule;
}

export const F001_WIN_LINES_DECIMAL = decimalFieldRule(
  'F001_WIN_LINES_DECIMAL',
  'win',
  'lines',
  'candidate-spec: win.lines monetary value is a decimal string with exactly 2 fractional digits',
);

export const F002_WIN_TOTAL_DECIMAL = decimalFieldRule(
  'F002_WIN_TOTAL_DECIMAL',
  'win',
  'total',
  'candidate-spec: win.total monetary value is a decimal string with exactly 2 fractional digits',
);

export const F003_WM_LINES_DECIMAL = decimalFieldRule(
  'F003_WM_LINES_DECIMAL',
  'winsMultipliers',
  'lines',
  'candidate-spec: winsMultipliers.lines is a decimal string with exactly 2 fractional digits',
);

export const F004_WM_TOTAL_DECIMAL = decimalFieldRule(
  'F004_WM_TOTAL_DECIMAL',
  'winsMultipliers',
  'total',
  'candidate-spec: winsMultipliers.total is a decimal string with exactly 2 fractional digits',
);

export const F005_STAKE_DECIMAL = decimalFieldRule(
  'F005_STAKE_DECIMAL',
  undefined,
  'stake',
  'candidate-spec: stake is a decimal string with exactly 2 fractional digits',
);

export const T001_MULTIPLIER_NUMERIC: ValidationRule = {
  id: 'T001_MULTIPLIER_NUMERIC',
  category: 'TYPE_FORMAT',
  specRef: 'candidate-spec: multiplier must be numeric',
  evaluate: (context) => {
    const result = getResult(context);

    if (result === undefined || !hasOwn(result, 'multiplier')) {
      return evaluation(context, T001_MULTIPLIER_NUMERIC, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.multiplier`,
        explanation:
          'multiplier is absent or result is malformed; contract rule owns the primary defect',
      });
    }

    const value = result.multiplier;

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return evaluation(context, T001_MULTIPLIER_NUMERIC, 'FAIL', {
        path: `${RESULT_PATH}.multiplier`,
        expected: 'finite number',
        actual: value,
        explanation: 'multiplier must be a finite numeric value',
      });
    }

    return evaluation(context, T001_MULTIPLIER_NUMERIC, 'PASS');
  },
};

export const T002_MULTIPLIER_POSITIVE: ValidationRule = {
  id: 'T002_MULTIPLIER_POSITIVE',
  category: 'TYPE_FORMAT',
  specRef: 'candidate-spec: multiplier must be positive',
  evaluate: (context) => {
    const result = getResult(context);

    if (result === undefined || !hasOwn(result, 'multiplier')) {
      return evaluation(context, T002_MULTIPLIER_POSITIVE, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.multiplier`,
        explanation: 'multiplier is unavailable',
      });
    }

    const value = result.multiplier;

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return evaluation(context, T002_MULTIPLIER_POSITIVE, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.multiplier`,
        actual: value,
        explanation: 'numeric prerequisite failed; T001_MULTIPLIER_NUMERIC owns the primary defect',
      });
    }

    if (value <= 0) {
      return evaluation(context, T002_MULTIPLIER_POSITIVE, 'FAIL', {
        path: `${RESULT_PATH}.multiplier`,
        expected: 'number > 0',
        actual: value,
        explanation: 'multiplier must be positive',
      });
    }

    return evaluation(context, T002_MULTIPLIER_POSITIVE, 'PASS');
  },
};

export const T003_GAME_MODE_NUMERIC: ValidationRule = {
  id: 'T003_GAME_MODE_NUMERIC',
  category: 'TYPE_FORMAT',
  specRef: 'candidate-spec: gameMode when present must be numeric',
  evaluate: (context) => {
    const result = getResult(context);

    if (result === undefined) {
      return evaluation(context, T003_GAME_MODE_NUMERIC, 'NOT_EVALUABLE', {
        path: RESULT_PATH,
        explanation: 'response.body.result is absent or malformed',
      });
    }

    if (!hasOwn(result, 'gameMode')) {
      return evaluation(context, T003_GAME_MODE_NUMERIC, 'NOT_APPLICABLE', {
        path: `${RESULT_PATH}.gameMode`,
        explanation: 'gameMode is optional and absent',
      });
    }

    const value = result.gameMode;

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return evaluation(context, T003_GAME_MODE_NUMERIC, 'FAIL', {
        path: `${RESULT_PATH}.gameMode`,
        expected: 'finite number when present',
        actual: value,
        explanation: 'gameMode must be numeric when present',
      });
    }

    return evaluation(context, T003_GAME_MODE_NUMERIC, 'PASS');
  },
};

export const FORMAT_AND_TYPE_RULES: readonly ValidationRule[] = [
  F001_WIN_LINES_DECIMAL,
  F002_WIN_TOTAL_DECIMAL,
  F003_WM_LINES_DECIMAL,
  F004_WM_TOTAL_DECIMAL,
  F005_STAKE_DECIMAL,
  T001_MULTIPLIER_NUMERIC,
  T002_MULTIPLIER_POSITIVE,
  T003_GAME_MODE_NUMERIC,
];
