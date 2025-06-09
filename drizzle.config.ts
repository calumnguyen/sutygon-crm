import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: 'ep-cool-surf-a677vf0z-pooler.us-west-2.aws.neon.tech',
    user: 'sutygoncrm-db_owner',
    password: 'npg_W2XqlD9hzToS',
    database: 'sutygoncrm-db',
    ssl: 'require',
  },
} satisfies Config; 