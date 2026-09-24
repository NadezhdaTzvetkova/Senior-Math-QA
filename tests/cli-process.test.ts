import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

import { afterEach, describe, expect, it } from 'vitest';

const repositoryRoot = resolve('.');
const tsxCli = resolve(repositoryRoot, 'node_modules/tsx/dist/cli.mjs');
const cliEntry = resolve(repositoryRoot, 'src/cli.ts');
const createdRoots: string[] = [];

function workspace(...fixtureNames: readonly string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'senior-math-qa-cli-'));
  createdRoots.push(root);
  const fixtures = join(root, 'fixtures');
  mkdirSync(fixtures, { recursive: true });

  for (const fixtureName of fixtureNames) {
    copyFileSync(resolve(repositoryRoot, 'fixtures', fixtureName), join(fixtures, fixtureName));
  }

  return root;
}

function run(root: string, ...args: readonly string[]) {
  return spawnSync(process.execPath, [tsxCli, cliEntry, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

afterEach(() => {
  while (createdRoots.length > 0) {
    const root = createdRoots.pop();
    if (root !== undefined) {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

describe('CLI process contract', () => {
  it('analysis mode exits zero even when the selected fixture has confirmed findings', () => {
    const root = workspace('response_001.json');
    const result = run(root, '--fixture', 'response_001.json', '--format', 'json');

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Validation completed successfully.');
    expect(result.stdout).toContain('Fixtures: 1');
    expect(result.stdout).toContain('Mode: analysis');
    expect(result.stdout).toMatch(/Confirmed findings: [1-9]\d*/);
  });

  it('gate mode exits zero for a clean selected fixture', () => {
    const root = workspace('response_008.json');
    const result = run(root, '--fixture', 'response_008.json', '--format', 'json', '--gate');

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Confirmed findings: 0');
    expect(result.stdout).toContain('Mode: gate');
  });

  it('gate mode exits one when confirmed findings exist', () => {
    const root = workspace('response_001.json');
    const result = run(root, '--fixture', 'response_001.json', '--format', 'json', '--gate');

    expect(result.status).toBe(1);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Mode: gate');
    expect(result.stdout).toMatch(/Confirmed findings: [1-9]\d*/);
  });

  it('invalid CLI arguments exit two and report the failure on stderr', () => {
    const root = workspace('response_008.json');
    const result = run(root, '--format', 'unsupported');

    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Validation execution failed:');
    expect(result.stderr).toContain('Unsupported format');
  });

  it('--help exits zero, writes usage to stdout, and does not write stderr', () => {
    const root = workspace();
    const result = run(root, '--help');

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Senior Math QA validator');
    expect(result.stdout).toContain('Usage: npm run validate -- [options]');
    expect(result.stdout).toContain('--gate');
  });

  it('a missing requested fixture exits two as an execution error', () => {
    const root = workspace('response_008.json');
    const result = run(root, '--fixture', 'missing.json');

    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Fixture not found: missing.json');
  });
});
