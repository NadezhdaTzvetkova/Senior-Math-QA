import type { RuleEvaluation, ValidationRule } from './rule.js';
import type { ValidationContext } from './context.js';

export class ValidationEngine {
  public constructor(private readonly rules: readonly ValidationRule[]) {}

  public evaluate(context: ValidationContext): readonly RuleEvaluation[] {
    return this.rules.map((rule) => rule.evaluate(context));
  }
}
