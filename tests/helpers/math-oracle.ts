export function oracleMoneyFromMinor(minor: bigint): string {
  const negative = minor < 0n;
  const absolute = negative ? -minor : minor;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

export function oracleMultiplyMinor(amountMinor: bigint, multiplier: bigint): bigint {
  return amountMinor * multiplier;
}

export function oracleSumMinor(values: readonly bigint[]): bigint {
  return values.reduce((sum, value) => sum + value, 0n);
}
