import { hasOwn, isJsonObject } from '../parsing/guards.js';
import { parseMinorUnits } from '../utils/decimal.js';

export const SPIN_MODES = ['Normal', 'FreeSpins', 'WinSpins', 'WildSpins', 'Respin'] as const;

export type SpinMode = (typeof SPIN_MODES)[number];

export type PresenceState = 'ABSENT' | 'PRESENT_EMPTY' | 'PRESENT_WITH_VALUES' | 'MALFORMED';

export type SpinModeState =
  | { readonly status: 'VALID'; readonly value: SpinMode }
  | { readonly status: 'ABSENT' }
  | { readonly status: 'MALFORMED'; readonly raw: unknown };

export interface SpinState {
  readonly spinMode: SpinModeState;
  readonly isBaseMode: boolean | undefined;
  readonly winLines: PresenceState;
  readonly cashSymbols: PresenceState;
  readonly freeSpins: PresenceState;
  readonly respin: PresenceState;
  readonly hasLineWins: boolean | undefined;
  readonly hasCashSymbols: boolean | undefined;
  readonly hasFreeSpins: boolean | undefined;
  readonly hasRespin: boolean | undefined;
  readonly hasAdditionalWinComponents: boolean | undefined;
}

type MonetaryComponentState = 'ABSENT' | 'ZERO' | 'NON_ZERO' | 'MALFORMED';

function deriveArrayPresence(result: Record<string, unknown>, key: string): PresenceState {
  if (!hasOwn(result, key)) {
    return 'ABSENT';
  }

  const value = result[key];

  if (!Array.isArray(value)) {
    return 'MALFORMED';
  }

  return value.length === 0 ? 'PRESENT_EMPTY' : 'PRESENT_WITH_VALUES';
}

function deriveMonetaryComponent(
  value: Record<string, unknown>,
  key: string,
): MonetaryComponentState {
  if (!hasOwn(value, key)) {
    return 'ABSENT';
  }

  const minorUnits = parseMinorUnits(value[key]);

  if (minorUnits === undefined) {
    return 'MALFORMED';
  }

  return minorUnits === 0 ? 'ZERO' : 'NON_ZERO';
}

function presenceToOptionalBoolean(
  state: PresenceState,
  absentMeansFalse: boolean,
): boolean | undefined {
  switch (state) {
    case 'ABSENT':
      return absentMeansFalse ? false : undefined;
    case 'PRESENT_EMPTY':
      return false;
    case 'PRESENT_WITH_VALUES':
      return true;
    case 'MALFORMED':
      return undefined;
  }
}

export function isSpinMode(value: unknown): value is SpinMode {
  return typeof value === 'string' && SPIN_MODES.some((candidate) => candidate === value);
}

export function deriveSpinMode(result: unknown): SpinModeState {
  if (!isJsonObject(result) || !hasOwn(result, 'spinMode')) {
    return { status: 'ABSENT' };
  }

  const value = result.spinMode;

  if (!isSpinMode(value)) {
    return { status: 'MALFORMED', raw: value };
  }

  return { status: 'VALID', value };
}

export function deriveSpinState(result: unknown): SpinState {
  if (!isJsonObject(result)) {
    return {
      spinMode: { status: 'ABSENT' },
      isBaseMode: undefined,
      winLines: 'ABSENT',
      cashSymbols: 'ABSENT',
      freeSpins: 'ABSENT',
      respin: 'ABSENT',
      hasLineWins: undefined,
      hasCashSymbols: undefined,
      hasFreeSpins: undefined,
      hasRespin: undefined,
      hasAdditionalWinComponents: undefined,
    };
  }

  const spinMode = deriveSpinMode(result);
  const winLines = deriveArrayPresence(result, 'winLines');
  const cashSymbols = deriveArrayPresence(result, 'cashSymbols');
  const freeSpins = deriveArrayPresence(result, 'freeSpins');
  const respin = deriveArrayPresence(result, 'respin');

  const hasLineWins = presenceToOptionalBoolean(winLines, false);
  const hasCashSymbols = presenceToOptionalBoolean(cashSymbols, true);
  const hasFreeSpins = presenceToOptionalBoolean(freeSpins, true);
  const hasRespin = presenceToOptionalBoolean(respin, true);

  const arrayComponentStates = [cashSymbols, freeSpins, respin] as const;
  const hasMalformedArrayComponent = arrayComponentStates.some((state) => state === 'MALFORMED');
  const hasPopulatedArrayComponent = arrayComponentStates.some(
    (state) => state === 'PRESENT_WITH_VALUES',
  );

  const win = result.win;

  let monetaryComponentStates: readonly MonetaryComponentState[] | undefined;

  if (isJsonObject(win)) {
    monetaryComponentStates = [
      deriveMonetaryComponent(win, 'instantWin'),
      deriveMonetaryComponent(win, 'freeSpins'),
      deriveMonetaryComponent(win, 'respin'),
    ];
  }

  const hasMalformedMonetaryComponent =
    monetaryComponentStates?.some((state) => state === 'MALFORMED') ?? false;

  const hasNonZeroMonetaryComponent =
    monetaryComponentStates?.some((state) => state === 'NON_ZERO') ?? false;

  const hasAdditionalWinComponents =
    hasMalformedArrayComponent ||
    hasMalformedMonetaryComponent ||
    monetaryComponentStates === undefined
      ? undefined
      : hasPopulatedArrayComponent || hasNonZeroMonetaryComponent;

  return {
    spinMode,
    isBaseMode: spinMode.status === 'VALID' ? spinMode.value === 'Normal' : undefined,
    winLines,
    cashSymbols,
    freeSpins,
    respin,
    hasLineWins,
    hasCashSymbols,
    hasFreeSpins,
    hasRespin,
    hasAdditionalWinComponents,
  };
}
