import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

let pool = null;

if (supabaseUrl && supabaseUrl.trim() !== '') {
  pool = new pg.Pool({
    connectionString: supabaseUrl.trim(),
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });
} else {
  console.warn('SUPABASE_DB_URL is not set. Database requests will require SUPABASE_DB_URL.');
}

function convertSql(sql) {
  let index = 1;
  let pgSql = sql.replace(/\?/g, () => `$${index++}`);

  // Replace SQLite ON CONFLICT DO UPDATE SET value=excluded.value with Postgres EXCLUDED.value
  pgSql = pgSql.replace(/excluded\.value/gi, 'EXCLUDED.value');

  // Automatically append RETURNING * for PostgreSQL INSERT queries
  if (/^\s*INSERT\s+/i.test(pgSql) && !/RETURNING/i.test(pgSql)) {
    pgSql += ' RETURNING *';
  }

  return pgSql;
}

const db = {
  isPg: true,
  prepare(sql) {
    const pgSql = convertSql(sql);
    return {
      async get(...params) {
        if (!pool) throw new Error('Database pool not initialized. SUPABASE_DB_URL is missing in environment variables.');
        const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const res = await pool.query(pgSql, flat);
        return res.rows[0];
      },
      async all(...params) {
        if (!pool) throw new Error('Database pool not initialized. SUPABASE_DB_URL is missing in environment variables.');
        const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const res = await pool.query(pgSql, flat);
        return res.rows;
      },
      async run(...params) {
        if (!pool) throw new Error('Database pool not initialized. SUPABASE_DB_URL is missing in environment variables.');
        const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const res = await pool.query(pgSql, flat);
        const firstRow = res.rows && res.rows[0] ? res.rows[0] : null;
        const lastId = firstRow ? (firstRow.id || firstRow.key) : null;
        return {
          lastInsertRowid: lastId,
          changes: res.rowCount
        };
      }
    };
  },
  transaction(fn) {
    return async (...args) => {
      if (!pool) throw new Error('Database pool not initialized. SUPABASE_DB_URL is missing in environment variables.');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const res = await fn(...args);
        await client.query('COMMIT');
        return res;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    };
  },
  pragma(stmt) {
    // No-op for Postgres
  }
};

export async function initDatabase() {
  console.log('PostgreSQL database ready.');
}

export default db;
