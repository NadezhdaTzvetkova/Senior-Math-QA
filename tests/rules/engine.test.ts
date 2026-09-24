import { describe, expect, it } from 'vitest';

import { buildValidationContext } from '../../src/validation/context.js';
import { ValidationEngine } from '../../src/validation/engine.js';
import { evaluation, type ValidationRule } from '../../src/validation/rule.js';

describe('validation rule contract', () => {
  it('creates a deterministic PASS evaluation', () => {
    const context = buildValidationContext('fixture.json', {
      response: {
        body: {
          result: {
            spinMode: 'Normal',
          },
        },
      },
    });

    const rule = {
      id: 'TEST_PASS',
      category: 'CONTRACT',
      specRef: 'test-spec',
    } as const;

    expect(evaluation(context, rule, 'PASS')).toEqual({
      fixtureName: 'fixture.json',
      ruleId: 'TEST_PASS',
      category: 'CONTRACT',
      status: 'PASS',
      specRef: 'test-spec',
    });
  });

  it('preserves structured failure evidence', () => {
    const context = buildValidationContext('fixture.json', {
      response: {
        body: {
          result: {
            multiplier: '1',
          },
        },
      },
    });

    const rule = {
      id: 'T001_MULTIPLIER_NUMERIC',
      category: 'TYPE_FORMAT',
      specRef: 'candidate-spec: multiplier number',
    } as const;

    expect(
      evaluation(context, rule, 'FAIL', {
        path: 'response.body.result.multiplier',
        expected: 'finite number',
        actual: '1',
        explanation: 'multiplier must be numeric',
      }),
    ).toEqual({
      fixtureName: 'fixture.json',
      ruleId: 'T001_MULTIPLIER_NUMERIC',
      category: 'TYPE_FORMAT',
      status: 'FAIL',
      specRef: 'candidate-spec: multiplier number',
      evidence: {
        path: 'response.body.result.multiplier',
        expected: 'finite number',
        actual: '1',
        explanation: 'multiplier must be numeric',
      },
    });
  });
});

describe('ValidationEngine', () => {
  it('evaluates every rule in registry order', () => {
    const context = buildValidationContext('fixture.json', {
      response: {
        body: {
          result: {
            spinMode: 'Normal',
          },
        },
      },
    });

    const firstRule: ValidationRule = {
      id: 'R1',
      category: 'CONTRACT',
      specRef: 'spec-1',
      evaluate: (ctx) => evaluation(ctx, firstRule, 'PASS'),
    };

    const secondRule: ValidationRule = {
      id: 'R2',
      category: 'TYPE_FORMAT',
      specRef: 'spec-2',
      evaluate: (ctx) =>
        evaluation(ctx, secondRule, 'NOT_APPLICABLE', {
          explanation: 'optional field absent',
        }),
    };

    const engine = new ValidationEngine([firstRule, secondRule]);

    expect(engine.evaluate(context)).toEqual([
      {
        fixtureName: 'fixture.json',
        ruleId: 'R1',
        category: 'CONTRACT',
        status: 'PASS',
        specRef: 'spec-1',
      },
      {
        fixtureName: 'fixture.json',
        ruleId: 'R2',
        category: 'TYPE_FORMAT',
        status: 'NOT_APPLICABLE',
        specRef: 'spec-2',
        evidence: {
          explanation: 'optional field absent',
        },
      },
    ]);
  });
});
