import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import { afterEach, describe, expect, it } from 'vitest';

import { loadGameValidationConfig, runCli } from '../src/cli-core.js';

const temporaryRoots: string[] = [];

function createTemporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'senior-math-qa-cli-'));
  temporaryRoots.push(root);
  mkdirSync(join(root, 'fixtures'), { recursive: true });
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('CLI integration', () => {
  it('runs a filtered analysis and writes only the requested JSON report', () => {
    const root = createTemporaryRoot();
    copyFileSync(
      join(process.cwd(), 'fixtures', 'response_008.json'),
      join(root, 'fixtures', 'response_008.json'),
    );

    const document = runCli(
      {
        fixture: 'response_008.json',
        category: 'CALCULATION',
        format: 'json',
        gate: false,
        help: false,
      },
      root,
    );

    expect(document.aggregate.fixtures).toBe(1);
    expect(document.generatedFrom.ruleCount).toBe(3);
    expect(document.aggregate.failed).toBe(0);
    expect(existsSync(join(root, 'reports', 'json', 'validation-report.json'))).toBe(true);
    expect(existsSync(join(root, 'reports', 'human', 'validation-report.txt'))).toBe(false);
  });

  it('loads a valid external game configuration from disk', () => {
    const root = createTemporaryRoot();
    const configPath = join(root, 'game-config.json');
    writeFileSync(
      configPath,
      JSON.stringify({ baseReelCount: 5, knownSymbols: [1, 2, 3] }),
      'utf8',
    );

    expect(loadGameValidationConfig(root, 'game-config.json')).toEqual({
      baseReelCount: 5,
      knownSymbols: [1, 2, 3],
    });
  });

  it('propagates external symbol configuration through CLI context into B004', () => {
    const root = createTemporaryRoot();
    const fixtureName = 'configured-symbol.json';
    const configName = 'game-config.json';

    writeFileSync(
      join(root, 'fixtures', fixtureName),
      JSON.stringify({
        response: {
          body: {
            result: {
              spinMode: 'Normal',
              reelsBuffer: [[1], [1], [99], [1], [1]],
            },
          },
        },
      }),
      'utf8',
    );

    writeFileSync(
      join(root, configName),
      JSON.stringify({ baseReelCount: 5, knownSymbols: [1] }),
      'utf8',
    );

    const document = runCli(
      {
        fixture: fixtureName,
        category: 'BOUNDS',
        configPath: configName,
        format: 'json',
        gate: false,
        help: false,
      },
      root,
    );

    expect(document.generatedFrom.ruleCount).toBe(5);
    expect(document.aggregate.failed).toBe(1);
    expect(document.aggregate.failuresByRuleId).toEqual({
      B004_SYMBOL_KNOWN_SET: 1,
    });

    const failures = document.fixtures[0]?.failures ?? [];
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      fixtureName,
      ruleId: 'B004_SYMBOL_KNOWN_SET',
      category: 'BOUNDS',
      path: 'response.body.result.reelsBuffer[2][0]',
      expected: [1],
      actual: 99,
      explanation: 'symbol is not present in the configured authoritative symbol set',
    });
  });

  it('rejects a requested fixture that does not exist', () => {
    const root = createTemporaryRoot();

    expect(() =>
      runCli(
        {
          fixture: 'missing.json',
          format: 'both',
          gate: false,
          help: false,
        },
        root,
      ),
    ).toThrow('Fixture not found: missing.json');
  });
});
