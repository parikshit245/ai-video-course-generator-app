import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// 1. Create the SQL client using the neon function
const sql = neon(process.env.DATABASE_URL!);

// 2. Pass that client to drizzle
export const db = drizzle(sql);