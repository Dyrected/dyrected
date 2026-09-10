import pino from 'pino';

export const aiLogger = pino({
  name: 'dyrected-ai',
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export interface AILogContext {
  requestId?: string;
  projectId?: string;
  userId?: string;
  threadId?: string;
  actionId?: string;
}

export function createAILogger(ctx: AILogContext) {
  return aiLogger.child(ctx);
}
