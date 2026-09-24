export function parseMinorUnits(value: unknown): number | undefined {
  if (typeof value !== 'string' || !/^-?\d+\.\d{2}$/.test(value)) {
    return undefined;
  }

  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction] = unsigned.split('.');

  if (whole === undefined || fraction === undefined) {
    return undefined;
  }

  const units = Number(whole) * 100 + Number(fraction);

  if (!Number.isSafeInteger(units)) {
    return undefined;
  }

  return negative ? -units : units;
}

export function multiplyMinorUnits(amountMinor: number, multiplier: number): number | undefined {
  if (
    !Number.isSafeInteger(amountMinor) ||
    typeof multiplier !== 'number' ||
    !Number.isFinite(multiplier)
  ) {
    return undefined;
  }

  const value = amountMinor * multiplier;

  if (!Number.isSafeInteger(value)) {
    return undefined;
  }

  return value === 0 ? 0 : value;
}
