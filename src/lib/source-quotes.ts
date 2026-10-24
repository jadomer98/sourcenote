import { z } from 'zod';
export const sourceQuotesSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    properties: { evidence_id: { type: 'string' }, text: { type: 'string' } },
    required: ['evidence_id', 'text'],
  },
};
// Optional when reading historic entries or deterministic fixtures; new provider schemas require it.
export const sourceQuotesParsed = z
  .array(z.object({ evidence_id: z.string(), text: z.string().min(12).max(350) }).strict())
  .max(12)
  .optional();
