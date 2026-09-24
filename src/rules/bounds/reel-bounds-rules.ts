import { hasOwn, isJsonObject } from '../../parsing/guards.js';
import { evaluation, type ValidationRule } from '../../validation/rule.js';

const RESULT_PATH = 'response.body.result';

function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function getResult(
  context: Parameters<ValidationRule['evaluate']>[0],
): Record<string, unknown> | undefined {
  return isJsonObject(context.result) ? context.result : undefined;
}

export const R001_REELS_BUFFER_ARRAY: ValidationRule = {
  id: 'R001_REELS_BUFFER_ARRAY',
  category: 'CONTRACT',
  specRef: 'candidate-spec: reelsBuffer must be an array',
  evaluate: (context) => {
    const result = getResult(context);

    if (result === undefined) {
      return evaluation(context, R001_REELS_BUFFER_ARRAY, 'NOT_EVALUABLE', {
        path: RESULT_PATH,
        explanation: 'response.body.result is absent or malformed',
      });
    }

    if (!hasOwn(result, 'reelsBuffer')) {
      return evaluation(context, R001_REELS_BUFFER_ARRAY, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.reelsBuffer`,
        explanation: 'reelsBuffer is absent; C011_REELS_BUFFER_PRESENT owns the primary defect',
      });
    }

    if (!Array.isArray(result.reelsBuffer)) {
      return evaluation(context, R001_REELS_BUFFER_ARRAY, 'FAIL', {
        path: `${RESULT_PATH}.reelsBuffer`,
        expected: 'array',
        actual: result.reelsBuffer,
        explanation: 'reelsBuffer must be an array',
      });
    }

    return evaluation(context, R001_REELS_BUFFER_ARRAY, 'PASS');
  },
};

export const R002_BASE_MODE_WIDTH: ValidationRule = {
  id: 'R002_BASE_MODE_WIDTH',
  category: 'BOUNDS',
  specRef: 'candidate-spec: expected visible width is 5 reels in base mode',
  evaluate: (context) => {
    const result = getResult(context);

    if (result === undefined) {
      return evaluation(context, R002_BASE_MODE_WIDTH, 'NOT_EVALUABLE', {
        path: RESULT_PATH,
        explanation: 'response.body.result is absent or malformed',
      });
    }

    if (context.spinState.isBaseMode === undefined) {
      return evaluation(context, R002_BASE_MODE_WIDTH, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.spinMode`,
        explanation: 'base-mode applicability cannot be derived from the current spinMode',
      });
    }

    if (!context.spinState.isBaseMode) {
      return evaluation(context, R002_BASE_MODE_WIDTH, 'NOT_APPLICABLE', {
        path: `${RESULT_PATH}.spinMode`,
        explanation: 'base-mode reel-width rule does not apply to this spin mode',
      });
    }

    if (!hasOwn(result, 'reelsBuffer')) {
      return evaluation(context, R002_BASE_MODE_WIDTH, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.reelsBuffer`,
        explanation: 'reelsBuffer is absent; contract validation owns the primary defect',
      });
    }

    if (!Array.isArray(result.reelsBuffer)) {
      return evaluation(context, R002_BASE_MODE_WIDTH, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.reelsBuffer`,
        actual: result.reelsBuffer,
        explanation: 'reelsBuffer must first pass array validation before width can be checked',
      });
    }

    if (result.reelsBuffer.length !== context.config.baseReelCount) {
      return evaluation(context, R002_BASE_MODE_WIDTH, 'FAIL', {
        path: `${RESULT_PATH}.reelsBuffer`,
        expected: context.config.baseReelCount,
        actual: result.reelsBuffer.length,
        explanation: 'base-mode reelsBuffer width does not match configured visible reel count',
      });
    }

    return evaluation(context, R002_BASE_MODE_WIDTH, 'PASS');
  },
};

export const B001_REEL_INDEX_BOUNDS: ValidationRule = {
  id: 'B001_REEL_INDEX_BOUNDS',
  category: 'BOUNDS',
  specRef: 'candidate-spec: reel/index coordinates must remain within the visible screen',
  evaluate: (context) =>
    evaluation(context, B001_REEL_INDEX_BOUNDS, 'NOT_EVALUABLE', {
      path: `${RESULT_PATH}.winLines`,
      explanation:
        'the supplied specification does not define a sufficiently authoritative index base or coordinate mapping to validate winLine.index without inventing semantics',
    }),
};

export const B002_WIN_LINE_START_BOUNDS: ValidationRule = {
  id: 'B002_WIN_LINE_START_BOUNDS',
  category: 'BOUNDS',
  specRef: 'candidate-spec: winLine start must remain within visible reel boundaries',
  evaluate: (context) => {
    const result = getResult(context);

    if (result === undefined) {
      return evaluation(context, B002_WIN_LINE_START_BOUNDS, 'NOT_EVALUABLE', {
        path: RESULT_PATH,
        explanation: 'response.body.result is absent or malformed',
      });
    }

    if (context.spinState.isBaseMode !== true) {
      return evaluation(
        context,
        B002_WIN_LINE_START_BOUNDS,
        context.spinState.isBaseMode === false ? 'NOT_APPLICABLE' : 'NOT_EVALUABLE',
        {
          path: `${RESULT_PATH}.spinMode`,
          explanation:
            context.spinState.isBaseMode === false
              ? 'base-mode visible-width bounds do not apply'
              : 'base-mode applicability cannot be established',
        },
      );
    }

    if (!Array.isArray(result.winLines)) {
      return evaluation(context, B002_WIN_LINE_START_BOUNDS, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.winLines`,
        explanation: 'winLines must be a valid array before start bounds can be evaluated',
      });
    }

    if (result.winLines.length === 0) {
      return evaluation(context, B002_WIN_LINE_START_BOUNDS, 'NOT_APPLICABLE', {
        path: `${RESULT_PATH}.winLines`,
        explanation: 'no winLine entries are present',
      });
    }

    for (const [index, entry] of result.winLines.entries()) {
      if (!isJsonObject(entry) || !hasOwn(entry, 'start')) {
        return evaluation(context, B002_WIN_LINE_START_BOUNDS, 'NOT_EVALUABLE', {
          path: `${RESULT_PATH}.winLines[${index}].start`,
          explanation: 'winLine.start must first pass structural validation',
        });
      }

      const start = entry.start;

      if (!isSafeInteger(start)) {
        return evaluation(context, B002_WIN_LINE_START_BOUNDS, 'NOT_EVALUABLE', {
          path: `${RESULT_PATH}.winLines[${index}].start`,
          actual: start,
          explanation: 'winLine.start must be an integer before bounds checking',
        });
      }

      if (start < 0 || start >= context.config.baseReelCount) {
        return evaluation(context, B002_WIN_LINE_START_BOUNDS, 'FAIL', {
          path: `${RESULT_PATH}.winLines[${index}].start`,
          expected: `integer from 0 to ${context.config.baseReelCount - 1}`,
          actual: start,
          explanation: 'winLine.start is outside visible base-mode reel bounds',
        });
      }
    }

    return evaluation(context, B002_WIN_LINE_START_BOUNDS, 'PASS');
  },
};

export const B003_WIN_LINE_LENGTH_BOUNDS: ValidationRule = {
  id: 'B003_WIN_LINE_LENGTH_BOUNDS',
  category: 'BOUNDS',
  specRef:
    'candidate-spec: winLine start/length segment must remain within visible reel boundaries',
  evaluate: (context) => {
    const result = getResult(context);

    if (result === undefined) {
      return evaluation(context, B003_WIN_LINE_LENGTH_BOUNDS, 'NOT_EVALUABLE', {
        path: RESULT_PATH,
        explanation: 'response.body.result is absent or malformed',
      });
    }

    if (context.spinState.isBaseMode !== true) {
      return evaluation(
        context,
        B003_WIN_LINE_LENGTH_BOUNDS,
        context.spinState.isBaseMode === false ? 'NOT_APPLICABLE' : 'NOT_EVALUABLE',
        {
          path: `${RESULT_PATH}.spinMode`,
          explanation:
            context.spinState.isBaseMode === false
              ? 'base-mode visible-width bounds do not apply'
              : 'base-mode applicability cannot be established',
        },
      );
    }

    if (!Array.isArray(result.winLines)) {
      return evaluation(context, B003_WIN_LINE_LENGTH_BOUNDS, 'NOT_EVALUABLE', {
        path: `${RESULT_PATH}.winLines`,
        explanation: 'winLines must be a valid array before length bounds can be evaluated',
      });
    }

    if (result.winLines.length === 0) {
      return evaluation(context, B003_WIN_LINE_LENGTH_BOUNDS, 'NOT_APPLICABLE', {
        path: `${RESULT_PATH}.winLines`,
        explanation: 'no winLine entries are present',
      });
    }

    for (const [index, entry] of result.winLines.entries()) {
      if (!isJsonObject(entry) || !hasOwn(entry, 'start') || !hasOwn(entry, 'length')) {
        return evaluation(context, B003_WIN_LINE_LENGTH_BOUNDS, 'NOT_EVALUABLE', {
          path: `${RESULT_PATH}.winLines[${index}]`,
          explanation: 'winLine.start and winLine.length must first pass structural validation',
        });
      }

      const start = entry.start;
      const length = entry.length;

      if (!isSafeInteger(start) || !isSafeInteger(length)) {
        return evaluation(context, B003_WIN_LINE_LENGTH_BOUNDS, 'NOT_EVALUABLE', {
          path: `${RESULT_PATH}.winLines[${index}]`,
          explanation: 'winLine.start and winLine.length must be integers before bounds checking',
        });
      }

      const numericStart = start;
      const numericLength = length;

      if (
        numericLength <= 0 ||
        numericStart < 0 ||
        numericStart + numericLength > context.config.baseReelCount
      ) {
        return evaluation(context, B003_WIN_LINE_LENGTH_BOUNDS, 'FAIL', {
          path: `${RESULT_PATH}.winLines[${index}].length`,
          expected: `positive segment with start + length <= ${context.config.baseReelCount}`,
          actual: {
            start: numericStart,
            length: numericLength,
          },
          explanation: 'winLine segment extends outside visible base-mode reel bounds',
        });
      }
    }

    return evaluation(context, B003_WIN_LINE_LENGTH_BOUNDS, 'PASS');
  },
};

export const B004_SYMBOL_KNOWN_SET: ValidationRule = {
  id: 'B004_SYMBOL_KNOWN_SET',
  category: 'BOUNDS',
  specRef:
    'candidate-spec: symbols must belong to the known symbol set when configuration context is supplied',
  evaluate: (context) =>
    evaluation(context, B004_SYMBOL_KNOWN_SET, 'NOT_EVALUABLE', {
      path: `${RESULT_PATH}.reelsBuffer`,
      explanation:
        'no authoritative symbol-set configuration was supplied, so symbol membership cannot be validated safely',
    }),
};

export const REEL_AND_BOUNDS_RULES: readonly ValidationRule[] = [
  R001_REELS_BUFFER_ARRAY,
  R002_BASE_MODE_WIDTH,
  B001_REEL_INDEX_BOUNDS,
  B002_WIN_LINE_START_BOUNDS,
  B003_WIN_LINE_LENGTH_BOUNDS,
  B004_SYMBOL_KNOWN_SET,
];
