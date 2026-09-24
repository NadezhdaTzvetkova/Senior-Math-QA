import { hasOwn, isJsonObject } from '../../parsing/guards.js';
import { evaluation, type RuleEvaluation, type ValidationRule } from '../../validation/rule.js';

const RESULT_PATH = 'response.body.result';

type ResultAccess =
  | { readonly ok: true; readonly value: Record<string, unknown> }
  | { readonly ok: false; readonly evaluation: RuleEvaluation };

function getResultObject(
  context: Parameters<ValidationRule['evaluate']>[0],
  rule: ValidationRule,
): ResultAccess {
  if (!context.resultLookup.found) {
    return {
      ok: false,
      evaluation: evaluation(context, rule, 'NOT_EVALUABLE', {
        path: RESULT_PATH,
        expected: 'result object present',
        actual: undefined,
        explanation: 'response.body.result is absent',
      }),
    };
  }

  if (!isJsonObject(context.result)) {
    return {
      ok: false,
      evaluation: evaluation(context, rule, 'NOT_EVALUABLE', {
        path: RESULT_PATH,
        expected: 'JSON object',
        actual: context.result,
        explanation: 'response.body.result is not an object',
      }),
    };
  }

  return {
    ok: true,
    value: context.result,
  };
}

function requiredFieldRule(id: string, field: string, specRef: string): ValidationRule {
  const rule: ValidationRule = {
    id,
    category: 'CONTRACT',
    specRef,
    evaluate: (context) => {
      const access = getResultObject(context, rule);

      if (!access.ok) {
        return access.evaluation;
      }

      if (!hasOwn(access.value, field)) {
        return evaluation(context, rule, 'FAIL', {
          path: `${RESULT_PATH}.${field}`,
          expected: 'required field present',
          actual: undefined,
          explanation: `${field} is required by the contract`,
        });
      }

      return evaluation(context, rule, 'PASS');
    },
  };

  return rule;
}

function requiredObjectFieldRule(id: string, field: string, specRef: string): ValidationRule {
  const rule: ValidationRule = {
    id,
    category: 'CONTRACT',
    specRef,
    evaluate: (context) => {
      const access = getResultObject(context, rule);

      if (!access.ok) {
        return access.evaluation;
      }

      if (!hasOwn(access.value, field)) {
        return evaluation(context, rule, 'FAIL', {
          path: `${RESULT_PATH}.${field}`,
          expected: 'required object present',
          actual: undefined,
          explanation: `${field} object is required by the contract`,
        });
      }

      const value = access.value[field];

      if (!isJsonObject(value)) {
        return evaluation(context, rule, 'FAIL', {
          path: `${RESULT_PATH}.${field}`,
          expected: 'JSON object',
          actual: value,
          explanation: `${field} must be an object`,
        });
      }

      return evaluation(context, rule, 'PASS');
    },
  };

  return rule;
}

export const C001_RESULT_PRESENT: ValidationRule = {
  id: 'C001_RESULT_PRESENT',
  category: 'CONTRACT',
  specRef: 'candidate-spec: primary target response.body.result',
  evaluate: (context) => {
    if (!context.resultLookup.found) {
      return evaluation(context, C001_RESULT_PRESENT, 'FAIL', {
        path: RESULT_PATH,
        expected: 'present',
        actual: undefined,
        explanation: 'response.body.result is missing',
      });
    }

    if (!isJsonObject(context.result)) {
      return evaluation(context, C001_RESULT_PRESENT, 'FAIL', {
        path: RESULT_PATH,
        expected: 'JSON object',
        actual: context.result,
        explanation: 'response.body.result must be an object',
      });
    }

    return evaluation(context, C001_RESULT_PRESENT, 'PASS');
  },
};

export const C002_WIN_PRESENT = requiredObjectFieldRule(
  'C002_WIN_PRESENT',
  'win',
  'candidate-spec: core required field win object',
);

export const C003_WIN_LINES_PRESENT: ValidationRule = {
  id: 'C003_WIN_LINES_PRESENT',
  category: 'CONTRACT',
  specRef: 'candidate-spec: win must contain lines and total',
  evaluate: (context) => {
    const access = getResultObject(context, C003_WIN_LINES_PRESENT);

    if (!access.ok) {
      return access.evaluation;
    }

    const win = access.value.win;

    if (!isJsonObject(win)) {
      return evaluation(context, C003_WIN_LINES_PRESENT, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.win`,
        expected: 'win object',
        actual: win,
        explanation: 'win.lines cannot be evaluated because win is absent or malformed',
      });
    }

    if (!hasOwn(win, 'lines')) {
      return evaluation(context, C003_WIN_LINES_PRESENT, 'FAIL', {
        path: `${RESULT_PATH}.win.lines`,
        expected: 'required field present',
        actual: undefined,
        explanation: 'win.lines is required',
      });
    }

    return evaluation(context, C003_WIN_LINES_PRESENT, 'PASS');
  },
};

export const C004_WIN_TOTAL_PRESENT: ValidationRule = {
  id: 'C004_WIN_TOTAL_PRESENT',
  category: 'CONTRACT',
  specRef: 'candidate-spec: win must contain lines and total',
  evaluate: (context) => {
    const access = getResultObject(context, C004_WIN_TOTAL_PRESENT);

    if (!access.ok) {
      return access.evaluation;
    }

    const win = access.value.win;

    if (!isJsonObject(win)) {
      return evaluation(context, C004_WIN_TOTAL_PRESENT, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.win`,
        expected: 'win object',
        actual: win,
        explanation: 'win.total cannot be evaluated because win is absent or malformed',
      });
    }

    if (!hasOwn(win, 'total')) {
      return evaluation(context, C004_WIN_TOTAL_PRESENT, 'FAIL', {
        path: `${RESULT_PATH}.win.total`,
        expected: 'required field present',
        actual: undefined,
        explanation: 'win.total is required',
      });
    }

    return evaluation(context, C004_WIN_TOTAL_PRESENT, 'PASS');
  },
};

export const C005_WINS_MULTIPLIERS_PRESENT = requiredObjectFieldRule(
  'C005_WINS_MULTIPLIERS_PRESENT',
  'winsMultipliers',
  'candidate-spec: core required field winsMultipliers object',
);

export const C006_WM_LINES_PRESENT: ValidationRule = {
  id: 'C006_WM_LINES_PRESENT',
  category: 'CONTRACT',
  specRef: 'candidate-spec: winsMultipliers must contain lines and total',
  evaluate: (context) => {
    const access = getResultObject(context, C006_WM_LINES_PRESENT);

    if (!access.ok) {
      return access.evaluation;
    }

    const value = access.value.winsMultipliers;

    if (!isJsonObject(value)) {
      return evaluation(context, C006_WM_LINES_PRESENT, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.winsMultipliers`,
        expected: 'winsMultipliers object',
        actual: value,
        explanation:
          'winsMultipliers.lines cannot be evaluated because winsMultipliers is absent or malformed',
      });
    }

    if (!hasOwn(value, 'lines')) {
      return evaluation(context, C006_WM_LINES_PRESENT, 'FAIL', {
        path: `${RESULT_PATH}.winsMultipliers.lines`,
        expected: 'required field present',
        actual: undefined,
        explanation: 'winsMultipliers.lines is required',
      });
    }

    return evaluation(context, C006_WM_LINES_PRESENT, 'PASS');
  },
};

export const C007_WM_TOTAL_PRESENT: ValidationRule = {
  id: 'C007_WM_TOTAL_PRESENT',
  category: 'CONTRACT',
  specRef: 'candidate-spec: winsMultipliers must contain lines and total',
  evaluate: (context) => {
    const access = getResultObject(context, C007_WM_TOTAL_PRESENT);

    if (!access.ok) {
      return access.evaluation;
    }

    const value = access.value.winsMultipliers;

    if (!isJsonObject(value)) {
      return evaluation(context, C007_WM_TOTAL_PRESENT, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.winsMultipliers`,
        expected: 'winsMultipliers object',
        actual: value,
        explanation:
          'winsMultipliers.total cannot be evaluated because winsMultipliers is absent or malformed',
      });
    }

    if (!hasOwn(value, 'total')) {
      return evaluation(context, C007_WM_TOTAL_PRESENT, 'FAIL', {
        path: `${RESULT_PATH}.winsMultipliers.total`,
        expected: 'required field present',
        actual: undefined,
        explanation: 'winsMultipliers.total is required',
      });
    }

    return evaluation(context, C007_WM_TOTAL_PRESENT, 'PASS');
  },
};

export const C008_STAKE_PRESENT = requiredFieldRule(
  'C008_STAKE_PRESENT',
  'stake',
  'candidate-spec: core required field stake',
);

export const C009_MULTIPLIER_PRESENT = requiredFieldRule(
  'C009_MULTIPLIER_PRESENT',
  'multiplier',
  'candidate-spec: core required field multiplier',
);

export const C010_SPIN_MODE_PRESENT = requiredFieldRule(
  'C010_SPIN_MODE_PRESENT',
  'spinMode',
  'candidate-spec: core required field spinMode',
);

export const C011_REELS_BUFFER_PRESENT = requiredFieldRule(
  'C011_REELS_BUFFER_PRESENT',
  'reelsBuffer',
  'candidate-spec: core required field reelsBuffer',
);

export const C012_WIN_LINES_ARRAY: ValidationRule = {
  id: 'C012_WIN_LINES_ARRAY',
  category: 'CONTRACT',
  specRef: 'candidate-spec: winLines when present must be an array',
  evaluate: (context) => {
    const access = getResultObject(context, C012_WIN_LINES_ARRAY);

    if (!access.ok) {
      return access.evaluation;
    }

    if (!hasOwn(access.value, 'winLines')) {
      return evaluation(context, C012_WIN_LINES_ARRAY, 'NOT_APPLICABLE', {
        path: `${RESULT_PATH}.winLines`,
        explanation: 'winLines is optional and absent',
      });
    }

    const value = access.value.winLines;

    if (!Array.isArray(value)) {
      return evaluation(context, C012_WIN_LINES_ARRAY, 'FAIL', {
        path: `${RESULT_PATH}.winLines`,
        expected: 'array when present',
        actual: value,
        explanation: 'winLines must be an array when present',
      });
    }

    return evaluation(context, C012_WIN_LINES_ARRAY, 'PASS');
  },
};

export const E001_SPIN_MODE_ENUM: ValidationRule = {
  id: 'E001_SPIN_MODE_ENUM',
  category: 'TYPE_FORMAT',
  specRef: 'candidate-spec: spinMode enum Normal, FreeSpins, WinSpins, WildSpins, Respin',
  evaluate: (context) => {
    if (context.spinState.spinMode.status === 'ABSENT') {
      return evaluation(context, E001_SPIN_MODE_ENUM, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.spinMode`,
        explanation: 'spinMode is absent; presence rule owns the primary defect',
      });
    }

    if (context.spinState.spinMode.status === 'MALFORMED') {
      return evaluation(context, E001_SPIN_MODE_ENUM, 'FAIL', {
        path: `${RESULT_PATH}.spinMode`,
        expected: 'Normal | FreeSpins | WinSpins | WildSpins | Respin',
        actual: context.spinState.spinMode.raw,
        explanation: 'spinMode is outside the supported enum',
      });
    }

    return evaluation(context, E001_SPIN_MODE_ENUM, 'PASS');
  },
};

export const CONTRACT_AND_ENUM_RULES: readonly ValidationRule[] = [
  C001_RESULT_PRESENT,
  C002_WIN_PRESENT,
  C003_WIN_LINES_PRESENT,
  C004_WIN_TOTAL_PRESENT,
  C005_WINS_MULTIPLIERS_PRESENT,
  C006_WM_LINES_PRESENT,
  C007_WM_TOTAL_PRESENT,
  C008_STAKE_PRESENT,
  C009_MULTIPLIER_PRESENT,
  C010_SPIN_MODE_PRESENT,
  C011_REELS_BUFFER_PRESENT,
  C012_WIN_LINES_ARRAY,
  E001_SPIN_MODE_ENUM,
];
