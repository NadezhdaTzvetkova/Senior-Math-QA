import { hasOwn, isJsonObject } from '../../parsing/guards.js';
import { evaluation, type ValidationRule } from '../../validation/rule.js';

const RESULT_PATH = 'response.body.result';

function getResult(
  context: Parameters<ValidationRule['evaluate']>[0],
): Record<string, unknown> | undefined {
  return isJsonObject(context.result) ? context.result : undefined;
}

export const C013_OPTIONAL_ARRAY_TYPES: ValidationRule = {
  id: 'C013_OPTIONAL_ARRAY_TYPES',
  category: 'CONTRACT',
  specRef:
    'candidate-spec: optional collections cashSymbols, collectors, collectorsBuffer, scatters and features must be arrays when present',
  evaluate: (context) => {
    const result = getResult(context);

    if (result === undefined) {
      return evaluation(context, C013_OPTIONAL_ARRAY_TYPES, 'NOT_EVALUABLE', {
        path: RESULT_PATH,
        explanation: 'response.body.result is absent or malformed',
      });
    }

    const fields = [
      'cashSymbols',
      'collectors',
      'collectorsBuffer',
      'scatters',
      'features',
    ] as const;

    let found = false;

    for (const field of fields) {
      if (!hasOwn(result, field)) {
        continue;
      }

      found = true;

      if (!Array.isArray(result[field])) {
        return evaluation(context, C013_OPTIONAL_ARRAY_TYPES, 'FAIL', {
          path: `${RESULT_PATH}.${field}`,
          expected: 'array when present',
          actual: result[field],
          explanation: `${field} must be an array when present`,
        });
      }
    }

    if (!found) {
      return evaluation(context, C013_OPTIONAL_ARRAY_TYPES, 'NOT_APPLICABLE', {
        path: RESULT_PATH,
        explanation: 'none of the covered optional array fields are present',
      });
    }

    return evaluation(context, C013_OPTIONAL_ARRAY_TYPES, 'PASS');
  },
};

function winLineRequiredFieldRule(id: string, field: string, specRef: string): ValidationRule {
  const rule: ValidationRule = {
    id,
    category: 'CONTRACT',
    specRef,
    evaluate: (context) => {
      const result = getResult(context);

      if (result === undefined) {
        return evaluation(context, rule, 'NOT_EVALUABLE', {
          path: RESULT_PATH,
          explanation: 'response.body.result is absent or malformed',
        });
      }

      if (!hasOwn(result, 'winLines')) {
        return evaluation(context, rule, 'NOT_APPLICABLE', {
          path: `${RESULT_PATH}.winLines`,
          explanation: 'winLines is optional and absent',
        });
      }

      if (!Array.isArray(result.winLines)) {
        return evaluation(context, rule, 'NOT_EVALUABLE', {
          path: `${RESULT_PATH}.winLines`,
          actual: result.winLines,
          explanation: 'winLines must be an array before winLine entry fields can be validated',
        });
      }

      if (result.winLines.length === 0) {
        return evaluation(context, rule, 'NOT_APPLICABLE', {
          path: `${RESULT_PATH}.winLines`,
          explanation: 'no winLine entries are present',
        });
      }

      for (const [index, entry] of result.winLines.entries()) {
        if (!isJsonObject(entry)) {
          return evaluation(context, rule, 'NOT_EVALUABLE', {
            path: `${RESULT_PATH}.winLines[${index}]`,
            actual: entry,
            explanation: 'winLine entry is malformed',
          });
        }

        if (!hasOwn(entry, field)) {
          return evaluation(context, rule, 'FAIL', {
            path: `${RESULT_PATH}.winLines[${index}].${field}`,
            expected: 'required field present',
            actual: undefined,
            explanation: `winLine.${field} is required`,
          });
        }
      }

      return evaluation(context, rule, 'PASS');
    },
  };

  return rule;
}

export const WL001_INDEX_PRESENT = winLineRequiredFieldRule(
  'WL001_INDEX_PRESENT',
  'index',
  'candidate-spec: each winLine includes index',
);

export const WL002_START_PRESENT = winLineRequiredFieldRule(
  'WL002_START_PRESENT',
  'start',
  'candidate-spec: each winLine includes start',
);

export const WL003_LENGTH_PRESENT = winLineRequiredFieldRule(
  'WL003_LENGTH_PRESENT',
  'length',
  'candidate-spec: each winLine includes length',
);

export const WL004_TILE_PRESENT = winLineRequiredFieldRule(
  'WL004_TILE_PRESENT',
  'tile',
  'candidate-spec: each winLine includes tile',
);

export const WL005_MULTIPLIER_PRESENT = winLineRequiredFieldRule(
  'WL005_MULTIPLIER_PRESENT',
  'multiplier',
  'candidate-spec: each winLine includes multiplier',
);

export const WL006_AMOUNT_PRESENT = winLineRequiredFieldRule(
  'WL006_AMOUNT_PRESENT',
  'amount',
  'candidate-spec: each winLine includes amount',
);

export const WL007_MULTIPLIED_AMOUNT_PRESENT = winLineRequiredFieldRule(
  'WL007_MULTIPLIED_AMOUNT_PRESENT',
  'multipliedAmount',
  'candidate-spec: each winLine includes multipliedAmount',
);

export const WL008_TILES_PRESENT = winLineRequiredFieldRule(
  'WL008_TILES_PRESENT',
  'tiles',
  'candidate-spec: each winLine includes tiles',
);

export const EXTENDED_CONTRACT_RULES: readonly ValidationRule[] = [
  C013_OPTIONAL_ARRAY_TYPES,
  WL001_INDEX_PRESENT,
  WL002_START_PRESENT,
  WL003_LENGTH_PRESENT,
  WL004_TILE_PRESENT,
  WL005_MULTIPLIER_PRESENT,
  WL006_AMOUNT_PRESENT,
  WL007_MULTIPLIED_AMOUNT_PRESENT,
  WL008_TILES_PRESENT,
];
