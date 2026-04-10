import { pool } from "./db";

export async function autoMigrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        avatar TEXT,
        google_id TEXT UNIQUE,
        apple_id TEXT UNIQUE,
        accepted_terms BOOLEAN NOT NULL DEFAULT false,
        terms_accepted_at TIMESTAMP,
        is_blocked BOOLEAN NOT NULL DEFAULT false,
        blocked_until TIMESTAMP,
        block_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER NOT NULL REFERENCES users(id),
        category TEXT NOT NULL DEFAULT 'general',
        likes INTEGER NOT NULL DEFAULT 0,
        views INTEGER NOT NULL DEFAULT 0,
        shares INTEGER NOT NULL DEFAULT 0,
        is_hidden BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        author_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        is_hidden BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS forum_topics (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        category_id TEXT NOT NULL,
        author_id INTEGER NOT NULL REFERENCES users(id),
        is_hidden BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS forum_replies (
        id SERIAL PRIMARY KEY,
        topic_id INTEGER NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
        author_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        is_hidden BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS qas (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT,
        author_id INTEGER REFERENCES users(id),
        author_name TEXT NOT NULL DEFAULT 'Anonim',
        is_answered BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        reporter_id INTEGER NOT NULL REFERENCES users(id),
        content_type TEXT NOT NULL,
        content_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        resolved_by INTEGER REFERENCES users(id),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        content_type TEXT NOT NULL,
        content_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(user_id, content_type, content_id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        content_type TEXT,
        content_id INTEGER,
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    const alterQueries = [
      { table: 'users', column: 'accepted_terms', sql: 'ALTER TABLE users ADD COLUMN accepted_terms BOOLEAN NOT NULL DEFAULT false' },
      { table: 'users', column: 'terms_accepted_at', sql: 'ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMP' },
      { table: 'users', column: 'is_blocked', sql: 'ALTER TABLE users ADD COLUMN is_blocked BOOLEAN NOT NULL DEFAULT false' },
      { table: 'users', column: 'blocked_until', sql: 'ALTER TABLE users ADD COLUMN blocked_until TIMESTAMP' },
      { table: 'users', column: 'block_reason', sql: 'ALTER TABLE users ADD COLUMN block_reason TEXT' },
      { table: 'posts', column: 'is_hidden', sql: 'ALTER TABLE posts ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT false' },
      { table: 'posts', column: 'views', sql: 'ALTER TABLE posts ADD COLUMN views INTEGER NOT NULL DEFAULT 0' },
      { table: 'posts', column: 'shares', sql: 'ALTER TABLE posts ADD COLUMN shares INTEGER NOT NULL DEFAULT 0' },
      { table: 'comments', column: 'is_hidden', sql: 'ALTER TABLE comments ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT false' },
      { table: 'forum_topics', column: 'is_hidden', sql: 'ALTER TABLE forum_topics ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT false' },
      { table: 'forum_replies', column: 'is_hidden', sql: 'ALTER TABLE forum_replies ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT false' },
      { table: 'qas', column: 'is_approved', sql: 'ALTER TABLE qas ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT false' },
    ];

    for (const q of alterQueries) {
      const colCheck = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [q.table, q.column]
      );
      if (colCheck.rows.length === 0) {
        await client.query(q.sql);
      }
    }

    try {
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS reactions_user_content_unique ON reactions (user_id, content_type, content_id)`);
    } catch (_) {}

    console.log("Database tables initialized successfully");
  } catch (err) {
    console.error("Auto-migration error:", err);
    throw err;
  } finally {
    client.release();
  }
}
