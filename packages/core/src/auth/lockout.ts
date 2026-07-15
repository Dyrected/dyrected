import type { CollectionConfig } from "../types/index.js";

export const DEFAULT_MAX_LOGIN_ATTEMPTS = 5;
export const DEFAULT_LOCK_TIME_MS = 10 * 60 * 1000;

export type ResolvedAuthLockoutConfig = {
  enabled: boolean;
  maxLoginAttempts: number;
  lockTime: number;
};

export function resolveAuthLockoutConfig(
  collection: CollectionConfig,
): ResolvedAuthLockoutConfig {
  const auth = collection.auth;

  if (!auth) {
    return {
      enabled: false,
      maxLoginAttempts: DEFAULT_MAX_LOGIN_ATTEMPTS,
      lockTime: DEFAULT_LOCK_TIME_MS,
    };
  }

  if (auth === true) {
    return {
      enabled: true,
      maxLoginAttempts: DEFAULT_MAX_LOGIN_ATTEMPTS,
      lockTime: DEFAULT_LOCK_TIME_MS,
    };
  }

  const maxLoginAttempts =
    typeof auth.maxLoginAttempts === "number"
      ? auth.maxLoginAttempts
      : DEFAULT_MAX_LOGIN_ATTEMPTS;
  const lockTime =
    typeof auth.lockTime === "number" && auth.lockTime > 0
      ? auth.lockTime
      : DEFAULT_LOCK_TIME_MS;

  return {
    enabled: maxLoginAttempts > 0,
    maxLoginAttempts,
    lockTime,
  };
}

export function getLockedUntilMs(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}
