import { deriveSpinState, type SpinState } from '../domain/spin-state.js';
import { readPath, type PathLookup } from '../parsing/guards.js';

export interface GameValidationConfig {
  readonly baseReelCount: number;
}

export interface ValidationContext {
  readonly fixtureName: string;
  readonly raw: unknown;
  readonly resultLookup: PathLookup;
  readonly result: unknown;
  readonly spinState: SpinState;
  readonly config: GameValidationConfig;
}

export const DEFAULT_GAME_VALIDATION_CONFIG = {
  baseReelCount: 5,
} as const satisfies GameValidationConfig;

export function buildValidationContext(
  fixtureName: string,
  raw: unknown,
  config: GameValidationConfig = DEFAULT_GAME_VALIDATION_CONFIG,
): ValidationContext {
  const resultLookup = readPath(raw, ['response', 'body', 'result']);
  const result = resultLookup.value;

  return {
    fixtureName,
    raw,
    resultLookup,
    result,
    spinState: deriveSpinState(result),
    config,
  };
}
