import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildReportDocument,
  discoverFixtureNames,
  evaluateFixtures,
  runValidation,
} from '../src/run-validation.js';

const TEST_ROOT = join(process.cwd(), '.tmp-runner-tests');

afterEach(() => {
  rmSync(TEST_ROOT, { recursive: true, force: true });
});

describe('validation runner', () => {
  it('discovers JSON fixtures in deterministic numeric order', () => {
    const fixtures = join(TEST_ROOT, 'fixtures');
    mkdirSync(fixtures, { recursive: true });

    writeFileSync(join(fixtures, 'response_010.json'), '{}', 'utf8');
    writeFileSync(join(fixtures, 'response_002.json'), '{}', 'utf8');
    writeFileSync(join(fixtures, 'response_001.json'), '{}', 'utf8');
    writeFileSync(join(fixtures, 'README.txt'), 'ignored', 'utf8');

    expect(discoverFixtureNames(fixtures)).toEqual([
      'response_001.json',
      'response_002.json',
      'response_010.json',
    ]);
  });

  it('rejects an unexpected fixture count before producing reports', () => {
    const fixtures = join(TEST_ROOT, 'fixtures');
    mkdirSync(fixtures, { recursive: true });
    writeFileSync(join(fixtures, 'response_001.json'), '{}', 'utf8');

    expect(() =>
      runValidation({
        fixturesDirectory: fixtures,
        humanReportPath: join(TEST_ROOT, 'human.txt'),
        jsonReportPath: join(TEST_ROOT, 'report.json'),
        expectedFixtureCount: 30,
      }),
    ).toThrow('Expected 30 fixture JSON files, found 1');

    expect(existsSync(join(TEST_ROOT, 'human.txt'))).toBe(false);
    expect(existsSync(join(TEST_ROOT, 'report.json'))).toBe(false);
  });

  it('surfaces invalid JSON with the offending fixture name', () => {
    const fixtures = join(TEST_ROOT, 'fixtures');
    mkdirSync(fixtures, { recursive: true });
    writeFileSync(join(fixtures, 'response_001.json'), '{ broken', 'utf8');

    expect(() => evaluateFixtures(fixtures, ['response_001.json'])).toThrow(/response_001\.json/);
  });

  it('builds human and JSON reports from the same canonical summaries', () => {
    const fixtures = join(TEST_ROOT, 'fixtures');
    const humanPath = join(TEST_ROOT, 'reports', 'human', 'report.txt');
    const jsonPath = join(TEST_ROOT, 'reports', 'json', 'report.json');

    mkdirSync(fixtures, { recursive: true });

    writeFileSync(
      join(fixtures, 'response_001.json'),
      JSON.stringify({
        response: {
          body: {
            result: {
              win: { lines: '0.00' },
              winsMultipliers: {
                lines: '0.00',
                total: '0.00',
              },
              stake: '2.00',
              multiplier: 1,
              spinMode: 'Normal',
              reelsBuffer: [[], [], [], [], []],
              winLines: [],
            },
          },
        },
      }),
      'utf8',
    );

    const document = runValidation({
      fixturesDirectory: fixtures,
      humanReportPath: humanPath,
      jsonReportPath: jsonPath,
      expectedFixtureCount: 1,
    });

    const human = readFileSync(humanPath, 'utf8');
    const json = JSON.parse(readFileSync(jsonPath, 'utf8')) as {
      aggregate: { failed: number };
      fixtures: Array<{
        fixtureName: string;
        failures: Array<{ ruleId: string; actualState: string }>;
      }>;
    };

    expect(document.aggregate.failed).toBe(1);
    expect(json.aggregate.failed).toBe(document.aggregate.failed);
    expect(json.fixtures[0]?.fixtureName).toBe('response_001.json');
    expect(json.fixtures[0]?.failures[0]?.ruleId).toBe('C004_WIN_TOTAL_PRESENT');
    expect(json.fixtures[0]?.failures[0]?.actualState).toBe('MISSING');

    expect(human).toContain('C004_WIN_TOTAL_PRESENT');
    expect(human).toContain('Actual: <MISSING>');
  });

  it('evaluates the real 30-fixture set through the production runner model', () => {
    const fixturesDirectory = join(process.cwd(), 'fixtures');
    const names = discoverFixtureNames(fixturesDirectory);
    const summaries = evaluateFixtures(fixturesDirectory, names);
    const document = buildReportDocument(fixturesDirectory, summaries);

    expect(names).toHaveLength(30);
    expect(document.aggregate.fixtures).toBe(30);
    expect(document.fixtures).toHaveLength(30);
    expect(document.generatedFrom.ruleCount).toBeGreaterThan(0);
    expect(
      document.fixtures
        .find(({ fixtureName }) => fixtureName === 'response_002.json')
        ?.failures.map(({ ruleId }) => ruleId),
    ).toEqual(['M005_COMPONENT_AGGREGATION']);
  });
});
