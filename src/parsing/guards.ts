export type JsonObject = Record<string, unknown>;

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasOwn(value: JsonObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export interface PathLookup {
  readonly found: boolean;
  readonly value: unknown;
}

export function readPath(root: unknown, path: readonly string[]): PathLookup {
  let current: unknown = root;

  for (const segment of path) {
    if (!isJsonObject(current) || !hasOwn(current, segment)) {
      return { found: false, value: undefined };
    }

    current = current[segment];
  }

  return { found: true, value: current };
}
