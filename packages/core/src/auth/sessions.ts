import { decodeCollectionToken, signCollectionToken } from './token.js';
import type { DyrectedConfig } from '../types/index.js';

export const AUTH_SESSIONS_COLLECTION = '__auth_sessions';

export interface AuthSessionRecord {
  id: string;
  userId: string;
  email: string;
  collection: string;
  authSource?: 'local' | 'external';
  providerId?: string;
  lastIp?: string;
  createdAt?: string;
  updatedAt?: string;
  lastSeenAt?: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
}

interface IssueAuthSessionArgs {
  config: DyrectedConfig;
  userId: string;
  email: string;
  collection: string;
  expiresIn?: string;
  authSource?: 'local' | 'external';
  providerId?: string;
  ip?: string;
}

export async function issueAuthSessionToken(
  args: IssueAuthSessionArgs,
): Promise<string> {
  const sessionId = createSessionId();
  const now = new Date().toISOString();
  const db = args.config.db;

  if (db) {
    await db.create({
      collection: AUTH_SESSIONS_COLLECTION,
      data: {
        id: sessionId,
        userId: args.userId,
        email: args.email,
        collection: args.collection,
        authSource: args.authSource ?? 'local',
        providerId: args.providerId,
        lastIp: args.ip,
        lastSeenAt: now,
        revokedAt: null,
        expiresAt: null,
      },
    });
  }

  const token = await signCollectionToken(
    {
      sub: args.userId,
      email: args.email,
      collection: args.collection,
      authSource: args.authSource,
      providerId: args.providerId,
      sid: sessionId,
    },
    args.expiresIn,
  );

  const payload = decodeCollectionToken(token);
  const expiresAt =
    payload?.exp != null
      ? new Date(payload.exp * 1000).toISOString()
      : null;

  if (db && expiresAt) {
    await db.update({
      collection: AUTH_SESSIONS_COLLECTION,
      id: sessionId,
      data: {
        expiresAt,
        lastSeenAt: now,
        lastIp: args.ip,
      },
    });
  }

  return token;
}

export async function getAuthSession(
  config: DyrectedConfig,
  sessionId: string,
): Promise<AuthSessionRecord | null> {
  const db = config.db;
  if (!db) return null;
  return (await db.findOne({
    collection: AUTH_SESSIONS_COLLECTION,
    id: sessionId,
  })) as AuthSessionRecord | null;
}

export function isAuthSessionActive(
  session: AuthSessionRecord | null | undefined,
): session is AuthSessionRecord {
  if (!session) return false;
  if (session.revokedAt) return false;
  if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
    return false;
  }
  return true;
}

export async function touchAuthSession(
  config: DyrectedConfig,
  sessionId: string,
  args: { ip?: string },
): Promise<void> {
  const db = config.db;
  if (!db) return;

  await db.update({
    collection: AUTH_SESSIONS_COLLECTION,
    id: sessionId,
    data: {
      lastSeenAt: new Date().toISOString(),
      ...(args.ip ? { lastIp: args.ip } : {}),
    },
  });
}

export async function revokeAuthSession(
  config: DyrectedConfig,
  sessionId: string,
): Promise<void> {
  const db = config.db;
  if (!db) return;

  await db.update({
    collection: AUTH_SESSIONS_COLLECTION,
    id: sessionId,
    data: {
      revokedAt: new Date().toISOString(),
    },
  });
}

export async function revokeAllAuthSessions(
  config: DyrectedConfig,
  args: {
    userId: string;
    collection: string;
  },
): Promise<number> {
  const db = config.db;
  if (!db) return 0;

  let page = 1;
  let revoked = 0;

  while (true) {
    const result = await db.find({
      collection: AUTH_SESSIONS_COLLECTION,
      where: {
        userId: { equals: args.userId },
        collection: { equals: args.collection },
      },
      page,
      limit: 100,
    });

    for (const session of result.docs as AuthSessionRecord[]) {
      if (session.revokedAt) continue;
      await revokeAuthSession(config, session.id);
      revoked += 1;
    }

    if (!result.hasNextPage) break;
    page += 1;
  }

  return revoked;
}

function createSessionId(): string {
  return globalThis.crypto?.randomUUID?.()
    ? globalThis.crypto.randomUUID()
    : `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
