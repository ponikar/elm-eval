import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../../.env') });

export const env = createEnv({
  server: {
    GEMINI_API_KEY: z.string().min(1).optional(),
    GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
    GEMINI_EMBEDDING_MODEL: z.string().default('gemini-embedding-001'),
    EMBEDDING_DIMENSIONS: z.coerce.number().int().min(128).max(3072).default(768),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  },
  runtimeEnv: {
    GEMINI_API_KEY: process.env['GEMINI_API_KEY'],
    GEMINI_MODEL: process.env['GEMINI_MODEL'],
    GEMINI_EMBEDDING_MODEL: process.env['GEMINI_EMBEDDING_MODEL'],
    EMBEDDING_DIMENSIONS: process.env['EMBEDDING_DIMENSIONS'],
    NODE_ENV: process.env['NODE_ENV'],
  },
});

export type Env = typeof env;
