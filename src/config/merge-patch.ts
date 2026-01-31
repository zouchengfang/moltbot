type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Path prefixes that Control UI must not modify (model-critical + security-critical). */
export const CONTROL_UI_READONLY_PREFIXES = [
  "gateway.controlUi.allowInsecureAuth",
  "gateway.controlUi.dangerouslyDisableDeviceAuth",
  "gateway.auth",
  "auth",
  "agents.defaults.model",
  "agents.defaults.models",
  "agents.defaults.imageModel",
  "models",
] as const;

function isPathProtected(path: string, prefixes: readonly string[]): boolean {
  if (prefixes.some((p) => path === p || path.startsWith(`${p}.`))) return true;
  // agents.list[].model, agents.list[].models, agents.list[].imageModel
  return /^agents\.list\.\d+\.(model|models|imageModel)(\.|$)/.test(path);
}

/**
 * Returns a copy of obj with protected paths removed. Used when Control UI
 * sends config: we strip these paths so the merge keeps existing values.
 */
export function stripProtectedPaths(
  obj: unknown,
  prefixes: readonly string[] = CONTROL_UI_READONLY_PREFIXES,
  currentPath = "",
): unknown {
  if (!isPlainObject(obj)) return obj;
  const result: PlainObject = {};
  for (const [key, path] of Object.entries(obj)) {
    const fullPath = currentPath ? `${currentPath}.${key}` : key;
    if (isPathProtected(fullPath, prefixes)) continue;
    result[key] = stripProtectedPaths(path, prefixes, fullPath);
  }
  return result;
}

export function applyMergePatch(base: unknown, patch: unknown): unknown {
  if (!isPlainObject(patch)) {
    return patch;
  }

  const result: PlainObject = isPlainObject(base) ? { ...base } : {};

  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
      continue;
    }
    if (isPlainObject(value)) {
      const baseValue = result[key];
      result[key] = applyMergePatch(isPlainObject(baseValue) ? baseValue : {}, value);
      continue;
    }
    result[key] = value;
  }

  return result;
}
