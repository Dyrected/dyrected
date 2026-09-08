import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeDocForAI,
  maskEmail,
  maskPhone,
  maskTextPII,
  NON_NEGOTIABLE_CREDENTIAL_FIELDS,
} from '../utils/ai-pii.js';
import { createDyrectedAITools } from '../services/ai-tools.js';
import type { DyrectedConfig, CollectionConfig } from '../types/index.js';

describe('AI PII Redaction & De-identification Pipeline', () => {
  describe('Unit Masking Functions', () => {
    it('masks email correctly with mask strategy', () => {
      expect(maskEmail('john.doe@company.com')).toBe('j***@company.com');
      expect(maskEmail('a@b.com')).toBe('***@b.com');
      expect(maskEmail('')).toBe('');
    });

    it('masks email with token strategy', () => {
      expect(maskEmail('john.doe@company.com', 'token')).toBe('[REDACTED_EMAIL]');
    });

    it('masks phone number correctly', () => {
      expect(maskPhone('+1 (555) 234-5678')).toBe('***-***-5678');
      expect(maskPhone('123')).toBe('***-***-****');
      expect(maskPhone('+1 (555) 234-5678', 'token')).toBe('[REDACTED_PHONE]');
    });

    it('scrubs unstructured text with multiple PII patterns', () => {
      const text = 'Contact john@acme.com or call 555-123-4567 from IP 192.168.1.1. Card: 4111 1111 1111 1234';
      const scrubbed = maskTextPII(text, {
        enabled: true,
        strategy: 'token',
        patterns: ['email', 'phone', 'ipv4', 'credit_card'],
      });

      expect(scrubbed).toContain('[REDACTED_EMAIL]');
      expect(scrubbed).toContain('[REDACTED_PHONE]');
      expect(scrubbed).toContain('[REDACTED_IP]');
      expect(scrubbed).toContain('[REDACTED_CREDIT_CARD]');
      expect(scrubbed).not.toContain('john@acme.com');
      expect(scrubbed).not.toContain('192.168.1.1');
    });

    it('applies custom scrubber function if provided', () => {
      const text = 'Internal ticket for EMP-98765';
      const scrubbed = maskTextPII(text, {
        enabled: true,
        customScrubber: (str) => str.replace(/EMP-\d{5}/g, '[EMPLOYEE_ID]'),
      });
      expect(scrubbed).toBe('Internal ticket for [EMPLOYEE_ID]');
    });
  });

  describe('sanitizeDocForAI Engine', () => {
    const rawCustomerDoc = {
      id: 'cust_101',
      fullName: 'Alice Johnson',
      email: 'alice.johnson@example.com',
      phone: '+1 555-987-6543',
      password: 'argon2_hashed_secret',
      salt: 'random_salt',
      hash: 'secret_hash',
      apiKey: 'sk_live_123456789',
      resetPasswordToken: 'tok_abc',
      billingAddress: '123 Main St, Springfield',
      ssn: '000-12-3456',
      notes: 'Customer called from 10.0.0.1 requesting a password reset',
    };

    it('non-negotiably deletes credentials under all circumstances', () => {
      const sanitized = sanitizeDocForAI({
        doc: rawCustomerDoc,
      });

      for (const cred of NON_NEGOTIABLE_CREDENTIAL_FIELDS) {
        expect(sanitized[cred]).toBeUndefined();
      }
    });

    it('masks email and phone by default (opt-out model) without configuration', () => {
      const collectionConfig: CollectionConfig = {
        slug: 'customers',
        fields: [
          { name: 'email', type: 'email' },
          { name: 'phone', type: 'text' },
          { name: 'fullName', type: 'text' },
        ],
      } as any;

      const sanitized = sanitizeDocForAI({
        doc: rawCustomerDoc,
        collectionConfig,
      });

      expect(sanitized.email).toBe('a***@example.com');
      expect(sanitized.phone).toBe('***-***-6543');
      expect(sanitized.fullName).toBe('Alice Johnson');
    });

    it('preserves raw email when field specifies ai.allowRaw: true', () => {
      const collectionConfig: CollectionConfig = {
        slug: 'customers',
        fields: [
          { name: 'email', type: 'email', ai: { allowRaw: true } },
          { name: 'phone', type: 'text' },
        ],
      } as any;

      const sanitized = sanitizeDocForAI({
        doc: rawCustomerDoc,
        collectionConfig,
      });

      expect(sanitized.email).toBe('alice.johnson@example.com'); // Preserved!
      expect(sanitized.phone).toBe('***-***-6543'); // Still masked
    });

    it('completely removes fields configured with ai.exclude: true', () => {
      const collectionConfig: CollectionConfig = {
        slug: 'customers',
        fields: [
          { name: 'billingAddress', type: 'text', ai: { exclude: true } },
          { name: 'ssn', type: 'text', ai: { exclude: true } },
          { name: 'fullName', type: 'text' },
        ],
      } as any;

      const sanitized = sanitizeDocForAI({
        doc: rawCustomerDoc,
        collectionConfig,
      });

      expect(sanitized.billingAddress).toBeUndefined();
      expect(sanitized.ssn).toBeUndefined();
      expect(sanitized.fullName).toBe('Alice Johnson');
    });

    it('strips collection-level excludeFields and masks redactFields', () => {
      const collectionConfig: CollectionConfig = {
        slug: 'customers',
        ai: {
          excludeFields: ['billingAddress', 'ssn'],
          redactFields: ['notes'],
        },
        fields: [{ name: 'fullName', type: 'text' }],
      } as any;

      const sanitized = sanitizeDocForAI({
        doc: rawCustomerDoc,
        collectionConfig,
      });

      expect(sanitized.billingAddress).toBeUndefined();
      expect(sanitized.ssn).toBeUndefined();
      expect(sanitized.notes).toBe('[REDACTED]');
    });

    it('executes custom collection-level sanitizeDoc hook', () => {
      const collectionConfig: CollectionConfig = {
        slug: 'customers',
        ai: {
          sanitizeDoc: (doc: Record<string, any>) => ({
            ...doc,
            fullName: 'Pseudonymized User #' + doc.id,
          }),
        },
        fields: [{ name: 'fullName', type: 'text' }],
      } as any;

      const sanitized = sanitizeDocForAI({
        doc: rawCustomerDoc,
        collectionConfig,
      });

      expect(sanitized.fullName).toBe('Pseudonymized User #cust_101');
    });

    it('scrubs unstructured text in document fields when global config.ai.pii is enabled', () => {
      const collectionConfig: CollectionConfig = {
        slug: 'customers',
        fields: [{ name: 'notes', type: 'text' }],
      } as any;

      const sanitized = sanitizeDocForAI({
        doc: rawCustomerDoc,
        collectionConfig,
        globalAIConfig: {
          pii: {
            enabled: true,
            patterns: ['ipv4'],
          },
        },
      });

      expect(sanitized.notes).toContain('[REDACTED_IP]');
      expect(sanitized.notes).not.toContain('10.0.0.1');
    });
  });

  describe('Integration with AI Inspection Tools', () => {
    class MockPIIDB {
      async find() {
        return {
          docs: [
            {
              id: 'u1',
              fullName: 'Bob Smith',
              email: 'bob@example.com',
              phone: '555-456-7890',
              password: 'secret_hash_password',
            },
          ],
          total: 1,
        };
      }
      async findOne() {
        return {
          id: 'u1',
          fullName: 'Bob Smith',
          email: 'bob@example.com',
          phone: '555-456-7890',
          password: 'secret_hash_password',
        };
      }
    }

    it('queryCollection returns sanitized docs with passwords deleted and emails masked', async () => {
      const config: DyrectedConfig = {
        collections: [
          {
            slug: 'users',
            fields: [
              { name: 'fullName', type: 'text' },
              { name: 'email', type: 'email' },
              { name: 'phone', type: 'text' },
            ],
          },
        ],
      } as any;

      const tools = createDyrectedAITools({
        db: new MockPIIDB() as any,
        config,
        projectId: 'default',
      });

      const res: any = await tools.queryCollection.execute(
        { collection: 'users' },
        { toolCallId: 't1', messages: [] }
      );

      expect(res.docs.length).toBe(1);
      const doc = res.docs[0];
      expect(doc.password).toBeUndefined();
      expect(doc.email).toBe('b***@example.com');
      expect(doc.phone).toBe('***-***-7890');
      expect(doc.fullName).toBe('Bob Smith');
    });

    it('getDocument returns sanitized doc with passwords deleted and emails masked', async () => {
      const config: DyrectedConfig = {
        collections: [
          {
            slug: 'users',
            fields: [
              { name: 'fullName', type: 'text' },
              { name: 'email', type: 'email' },
            ],
          },
        ],
      } as any;

      const tools = createDyrectedAITools({
        db: new MockPIIDB() as any,
        config,
        projectId: 'default',
      });

      const res: any = await tools.getDocument.execute(
        { collection: 'users', id: 'u1' },
        { toolCallId: 't2', messages: [] }
      );

      expect(res.doc).toBeDefined();
      expect(res.doc.password).toBeUndefined();
      expect(res.doc.email).toBe('b***@example.com');
    });
  });
});
