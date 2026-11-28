export const ALLOWED_RETURN_TARGETS = [
  '/(tabs)/home',
  '/(tabs)/catalog',
  '/(tabs)/diagnosis',
  '/(tabs)/history',
  '/(tabs)/account',
  '/diagnosis/result',
  '/home',
] as const;

export type AllowedReturnTarget = (typeof ALLOWED_RETURN_TARGETS)[number];

const DEFAULT_RETURN_TARGET: AllowedReturnTarget = '/home';

/** Validates an incoming return target against the mobile route whitelist. */
export function resolveReturnTarget(raw?: string | string[] | null): AllowedReturnTarget {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (typeof candidate !== 'string') return DEFAULT_RETURN_TARGET;
  const trimmed = candidate.trim();
  if ((ALLOWED_RETURN_TARGETS as readonly string[]).includes(trimmed)) {
    return trimmed as AllowedReturnTarget;
  }
  return DEFAULT_RETURN_TARGET;
}
