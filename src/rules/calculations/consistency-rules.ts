import { hasOwn, isJsonObject } from '../../parsing/guards.js';
import { parseMinorUnits } from '../../utils/decimal.js';
import { evaluation, type ValidationRule } from '../../validation/rule.js';

const RESULT_PATH = 'response.body.result';

function getResult(
  context: Parameters<ValidationRule['evaluate']>[0],
): Record<string, unknown> | undefined {
  return isJsonObject(context.result) ? context.result : undefined;
}

function readMoney(object: Record<string, unknown>, key: string): number | undefined {
  return hasOwn(object, key) ? parseMinorUnits(object[key]) : undefined;
}

function hasSupportedAdditionalComponent(object: Record<string, unknown>): boolean | undefined {
  const supported = ['instantWin', 'freeSpins', 'respin'] as const;
  let found = false;

  for (const key of supported) {
    if (!hasOwn(object, key)) {
      continue;
    }

    const value = parseMinorUnits(object[key]);

    if (value === undefined) {
      return undefined;
    }

    if (value !== 0) {
      found = true;
    }
  }

  return found;
}

export const M003_PLAIN_WIN_TOTAL: ValidationRule = {
  id: 'M003_PLAIN_WIN_TOTAL',
  category: 'CONSISTENCY',
  specRef: 'candidate-spec: for plain line wins with no extras, win.total must equal win.lines',
  evaluate: (context) => {
    const result = getResult(context);

    if (result === undefined || !isJsonObject(result.win)) {
      return evaluation(context, M003_PLAIN_WIN_TOTAL, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.win`,
        explanation: 'win object is unavailable or malformed',
      });
    }

    if (context.spinState.winLines === 'ABSENT') {
      return evaluation(context, M003_PLAIN_WIN_TOTAL, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.winLines`,
        explanation: 'winLines is absent, so a plain line-win state cannot be established safely',
      });
    }

    if (context.spinState.winLines === 'MALFORMED') {
      return evaluation(context, M003_PLAIN_WIN_TOTAL, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.winLines`,
        explanation: 'winLines is malformed, so a plain line-win state cannot be established',
      });
    }

    if (context.spinState.winLines === 'PRESENT_EMPTY') {
      return evaluation(context, M003_PLAIN_WIN_TOTAL, 'NOT_APPLICABLE', {
        path: `${RESULT_PATH}.winLines`,
        explanation:
          'plain line-win total rule does not apply because there are no line-win entries',
      });
    }

    const hasExtras = hasSupportedAdditionalComponent(result.win);

    if (hasExtras === undefined) {
      return evaluation(context, M003_PLAIN_WIN_TOTAL, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.win`,
        explanation:
          'supported additional component is present but not in canonical monetary format',
      });
    }

    if (hasExtras) {
      return evaluation(context, M003_PLAIN_WIN_TOTAL, 'NOT_APPLICABLE', {
        path: `${RESULT_PATH}.win`,
        explanation:
          'plain line-only rule does not apply when supported additional components contribute',
      });
    }

    const lines = readMoney(result.win, 'lines');
    const total = readMoney(result.win, 'total');

    if (lines === undefined || total === undefined) {
      return evaluation(context, M003_PLAIN_WIN_TOTAL, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.win`,
        explanation:
          'win.lines and win.total must first pass required-field and monetary-format validation',
      });
    }

    if (lines !== total) {
      return evaluation(context, M003_PLAIN_WIN_TOTAL, 'FAIL', {
        path: `${RESULT_PATH}.win.total`,
        expected: lines,
        actual: total,
        explanation:
          'plain line-only win.total must equal win.lines when no supported extra component contributes',
      });
    }

    return evaluation(context, M003_PLAIN_WIN_TOTAL, 'PASS');
  },
};

export const M004_PLAIN_MULTIPLIER_TOTAL: ValidationRule = {
  id: 'M004_PLAIN_MULTIPLIER_TOTAL',
  category: 'CONSISTENCY',
  specRef:
    'candidate-spec: for plain line wins with no extras, winsMultipliers.total must equal winsMultipliers.lines',
  evaluate: (context) => {
    const result = getResult(context);

    if (
      result === undefined ||
      !isJsonObject(result.winsMultipliers) ||
      !isJsonObject(result.win)
    ) {
      return evaluation(context, M004_PLAIN_MULTIPLIER_TOTAL, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.winsMultipliers`,
        explanation:
          'winsMultipliers and win objects must be available before plain-total consistency can be evaluated',
      });
    }

    if (context.spinState.winLines === 'ABSENT') {
      return evaluation(context, M004_PLAIN_MULTIPLIER_TOTAL, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.winLines`,
        explanation: 'winLines is absent, so a plain line-win state cannot be established safely',
      });
    }

    if (context.spinState.winLines === 'MALFORMED') {
      return evaluation(context, M004_PLAIN_MULTIPLIER_TOTAL, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.winLines`,
        explanation: 'winLines is malformed, so a plain line-win state cannot be established',
      });
    }

    if (context.spinState.winLines === 'PRESENT_EMPTY') {
      return evaluation(context, M004_PLAIN_MULTIPLIER_TOTAL, 'NOT_APPLICABLE', {
        path: `${RESULT_PATH}.winLines`,
        explanation:
          'plain line-win multiplier-total rule does not apply because there are no line-win entries',
      });
    }

    const hasExtras = hasSupportedAdditionalComponent(result.win);

    if (hasExtras === undefined) {
      return evaluation(context, M004_PLAIN_MULTIPLIER_TOTAL, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.win`,
        explanation:
          'supported additional component is present but not in canonical monetary format',
      });
    }

    if (hasExtras) {
      return evaluation(context, M004_PLAIN_MULTIPLIER_TOTAL, 'NOT_APPLICABLE', {
        path: `${RESULT_PATH}.winsMultipliers`,
        explanation:
          'plain line-only rule does not apply when supported additional components contribute',
      });
    }

    const lines = readMoney(result.winsMultipliers, 'lines');
    const total = readMoney(result.winsMultipliers, 'total');

    if (lines === undefined || total === undefined) {
      return evaluation(context, M004_PLAIN_MULTIPLIER_TOTAL, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.winsMultipliers`,
        explanation:
          'winsMultipliers.lines and total must first pass required-field and format validation',
      });
    }

    if (lines !== total) {
      return evaluation(context, M004_PLAIN_MULTIPLIER_TOTAL, 'FAIL', {
        path: `${RESULT_PATH}.winsMultipliers.total`,
        expected: lines,
        actual: total,
        explanation: 'plain line-only winsMultipliers.total must equal winsMultipliers.lines',
      });
    }

    return evaluation(context, M004_PLAIN_MULTIPLIER_TOTAL, 'PASS');
  },
};

export const M005_COMPONENT_AGGREGATION: ValidationRule = {
  id: 'M005_COMPONENT_AGGREGATION',
  category: 'CALCULATION',
  specRef:
    'candidate-spec: totals must include supported extra components such as instantWin, freeSpins, respin',
  evaluate: (context) => {
    const result = getResult(context);

    if (
      result === undefined ||
      !isJsonObject(result.win) ||
      !isJsonObject(result.winsMultipliers)
    ) {
      return evaluation(context, M005_COMPONENT_AGGREGATION, 'NOT_EVALUABLE', {
        path: RESULT_PATH,
        explanation:
          'win and winsMultipliers objects are required before aggregation can be evaluated',
      });
    }

    const winLines = readMoney(result.win, 'lines');
    const winTotal = readMoney(result.win, 'total');
    const wmLines = readMoney(result.winsMultipliers, 'lines');
    const wmTotal = readMoney(result.winsMultipliers, 'total');

    if (
      winLines === undefined ||
      winTotal === undefined ||
      wmLines === undefined ||
      wmTotal === undefined
    ) {
      return evaluation(context, M005_COMPONENT_AGGREGATION, 'NOT_EVALUABLE', {
        path: RESULT_PATH,
        explanation:
          'base monetary totals must be present and valid before component aggregation can be evaluated',
      });
    }

    const componentKeys = ['instantWin', 'freeSpins', 'respin'] as const;
    let winExtras = 0;
    let wmExtras = 0;
    let found = false;

    for (const key of componentKeys) {
      const winHas = hasOwn(result.win, key);
      const wmHas = hasOwn(result.winsMultipliers, key);

      if (!winHas && !wmHas) {
        continue;
      }

      found = true;

      const winValue = winHas ? parseMinorUnits(result.win[key]) : 0;
      const wmValue = wmHas ? parseMinorUnits(result.winsMultipliers[key]) : 0;

      if (winValue === undefined || wmValue === undefined) {
        return evaluation(context, M005_COMPONENT_AGGREGATION, 'NOT_EVALUABLE', {
          path: RESULT_PATH,
          explanation:
            'supported component values must use canonical monetary strings before aggregation can be checked',
        });
      }

      winExtras += winValue;
      wmExtras += wmValue;
    }

    if (!found) {
      return evaluation(context, M005_COMPONENT_AGGREGATION, 'NOT_APPLICABLE', {
        path: RESULT_PATH,
        explanation: 'no supported additional monetary components are present',
      });
    }

    const expectedWinTotal = winLines + winExtras;
    const expectedWmTotal = wmLines + wmExtras;

    if (winTotal !== expectedWinTotal || wmTotal !== expectedWmTotal) {
      return evaluation(context, M005_COMPONENT_AGGREGATION, 'FAIL', {
        path: RESULT_PATH,
        expected: {
          winTotal: expectedWinTotal,
          winsMultipliersTotal: expectedWmTotal,
        },
        actual: {
          winTotal,
          winsMultipliersTotal: wmTotal,
        },
        explanation:
          'reported totals do not equal lines plus supported named component contributions',
      });
    }

    return evaluation(context, M005_COMPONENT_AGGREGATION, 'PASS');
  },
};

export const M006_NO_WIN_CONSISTENCY: ValidationRule = {
  id: 'M006_NO_WIN_CONSISTENCY',
  category: 'CONSISTENCY',
  specRef:
    'candidate-spec: when no win occurred, win.lines, win.total, winsMultipliers.lines and winsMultipliers.total must all be 0.00',
  evaluate: (context) => {
    const result = getResult(context);

    if (
      result === undefined ||
      !isJsonObject(result.win) ||
      !isJsonObject(result.winsMultipliers)
    ) {
      return evaluation(context, M006_NO_WIN_CONSISTENCY, 'NOT_EVALUABLE', {
        path: RESULT_PATH,
        explanation:
          'win and winsMultipliers objects are required before no-win consistency can be evaluated',
      });
    }

    if (context.spinState.winLines === 'ABSENT') {
      return evaluation(context, M006_NO_WIN_CONSISTENCY, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.winLines`,
        explanation:
          'winLines is absent; the specification does not define absence alone as proof of a no-win state',
      });
    }

    if (context.spinState.winLines === 'MALFORMED') {
      return evaluation(context, M006_NO_WIN_CONSISTENCY, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.winLines`,
        explanation: 'winLines is malformed; no-win state cannot be established safely',
      });
    }

    if (context.spinState.winLines === 'PRESENT_WITH_VALUES') {
      return evaluation(context, M006_NO_WIN_CONSISTENCY, 'NOT_APPLICABLE', {
        path: `${RESULT_PATH}.winLines`,
        explanation: 'line wins are present, so no-win rule does not apply',
      });
    }

    const extraState = context.spinState.hasAdditionalWinComponents;

    if (extraState === undefined) {
      return evaluation(context, M006_NO_WIN_CONSISTENCY, 'NOT_EVALUABLE', {
        path: RESULT_PATH,
        explanation:
          'additional-component state is malformed or ambiguous, so no-win cannot be proven',
      });
    }

    if (extraState) {
      return evaluation(context, M006_NO_WIN_CONSISTENCY, 'NOT_APPLICABLE', {
        path: RESULT_PATH,
        explanation: 'a supported additional component is present, so no-win rule does not apply',
      });
    }

    return evaluation(context, M006_NO_WIN_CONSISTENCY, 'NOT_EVALUABLE', {
      path: RESULT_PATH,
      explanation:
        'empty winLines and absence of known additional components do not independently prove a no-win gameplay state under the supplied specification',
    });
  },
};

export const CONSISTENCY_AND_AGGREGATION_RULES: readonly ValidationRule[] = [
  M003_PLAIN_WIN_TOTAL,
  M004_PLAIN_MULTIPLIER_TOTAL,
  M005_COMPONENT_AGGREGATION,
  M006_NO_WIN_CONSISTENCY,
];
