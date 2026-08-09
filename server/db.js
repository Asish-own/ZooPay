import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

let isPg = false;
let pool = null;
let sqliteDb = null;

if (supabaseUrl && supabaseUrl.trim() !== '') {
  isPg = true;
  console.log('Connecting to Supabase PostgreSQL Database...');
  pool = new pg.Pool({
    connectionString: supabaseUrl,
    ssl: { rejectUnauthorized: false }
  });
} else {
  console.log('Using local SQLite Database (zoopay.db)...');
  const Database = (await import('better-sqlite3')).default;
  const dbPath = path.join(__dirname, 'zoopay.db');
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('foreign_keys = ON');
  sqliteDb.pragma('journal_mode = WAL');
}

function convertSql(sql) {
  if (!isPg) return sql;
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
  isPg,
  prepare(sql) {
    if (!isPg) {
      return sqliteDb.prepare(sql);
    }
    const pgSql = convertSql(sql);
    return {
      async get(...params) {
        const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const res = await pool.query(pgSql, flat);
        return res.rows[0];
      },
      async all(...params) {
        const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const res = await pool.query(pgSql, flat);
        return res.rows;
      },
      async run(...params) {
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
    if (!isPg) {
      return sqliteDb.transaction(fn);
    }
    return async (...args) => {
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
    if (!isPg && sqliteDb) {
      sqliteDb.pragma(stmt);
    }
  }
};

export async function initDatabase() {
  if (!isPg && sqliteDb) {
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mobile TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        referral_code TEXT UNIQUE NOT NULL,
        referred_by_id INTEGER,
        bank_holder_name TEXT,
        bank_account_number TEXT,
        bank_ifsc TEXT,
        bank_name TEXT,
        bank_upi_id TEXT,
        status TEXT DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  console.log('Database initialized successfully.');
}

export default db;
