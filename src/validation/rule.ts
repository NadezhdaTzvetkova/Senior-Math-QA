import type { ValidationContext } from './context.js';

export type RuleStatus = 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'NOT_EVALUABLE';

export type RuleCategory = 'CONTRACT' | 'TYPE_FORMAT' | 'CALCULATION' | 'CONSISTENCY' | 'BOUNDS';

export interface RuleEvidence {
  readonly path?: string;
  readonly expected?: unknown;
  readonly actual?: unknown;
  readonly explanation: string;
}

export interface RuleEvaluation {
  readonly fixtureName: string;
  readonly ruleId: string;
  readonly category: RuleCategory;
  readonly status: RuleStatus;
  readonly specRef: string;
  readonly evidence?: RuleEvidence;
}

export interface ValidationRule {
  readonly id: string;
  readonly category: RuleCategory;
  readonly specRef: string;
  readonly evaluate: (context: ValidationContext) => RuleEvaluation;
}

export function evaluation(
  context: ValidationContext,
  rule: Pick<ValidationRule, 'id' | 'category' | 'specRef'>,
  status: RuleStatus,
  evidence?: RuleEvidence,
): RuleEvaluation {
  return {
    fixtureName: context.fixtureName,
    ruleId: rule.id,
    category: rule.category,
    status,
    specRef: rule.specRef,
    ...(evidence === undefined ? {} : { evidence }),
  };
}
