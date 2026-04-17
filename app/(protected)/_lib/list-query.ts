export type SearchParamValue = string | string[] | undefined;
export type SearchParamsInput = Record<string, SearchParamValue>;

export function getSearchParamValue(value: SearchParamValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function parseIntegerParam(
  value: SearchParamValue,
  fallback: number,
  options?: { min?: number; allowed?: number[] },
): number {
  const rawValue = getSearchParamValue(value);
  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue)) {
    return fallback;
  }

  if (options?.min !== undefined && parsedValue < options.min) {
    return fallback;
  }

  if (options?.allowed && !options.allowed.includes(parsedValue)) {
    return fallback;
  }

  return parsedValue;
}

export function parseStringParam(value: SearchParamValue): string {
  return getSearchParamValue(value)?.trim() ?? "";
}
