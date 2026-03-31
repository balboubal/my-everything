import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'me-secret-key-change-in-production';

// Initialize PostgreSQL connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper: run a query and return rows
const query = async (text, params) => {
  const result = await pool.query(text, params);
  return result.rows;
};

// Helper: run a query and return first row
const queryOne = async (text, params) => {
  const result = await pool.query(text, params);
  return result.rows[0] || null;
};

// Create tables on startup
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      preferences TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT 'folder',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      title TEXT DEFAULT 'Untitled Session',
      notes TEXT,
      duration INTEGER NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      timer_mode TEXT DEFAULT 'stopwatch',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_category_id ON sessions(category_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
    CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
  `);
  console.log('Database tables initialized');
};

app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
}

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Optional auth
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }
  next();
};

// ============ AUTH ROUTES ============

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const existingUser = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await pool.query(
      'INSERT INTO users (id, email, password, name) VALUES ($1, $2, $3, $4)',
      [userId, email, hashedPassword, name || email.split('@')[0]]
    );

    const defaultCategories = [
      { name: 'Work', color: '#3b82f6', icon: 'briefcase' },
      { name: 'Study', color: '#8b5cf6', icon: 'book' },
      { name: 'Personal', color: '#10b981', icon: 'user' }
    ];

    for (const cat of defaultCategories) {
      await pool.query(
        'INSERT INTO categories (id, user_id, name, color, icon) VALUES ($1, $2, $3, $4, $5)',
        [uuidv4(), userId, cat.name, cat.color, cat.icon]
      );
    }

    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: userId, email, name: name || email.split('@')[0] }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await queryOne('SELECT * FROM users WHERE email = $1', [email]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  const user = await queryOne(
    'SELECT id, email, name, preferences, created_at FROM users WHERE id = $1',
    [req.user.userId]
  );
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user: { ...user, preferences: JSON.parse(user.preferences || '{}') } });
});

app.put('/api/auth/preferences', authenticateToken, async (req, res) => {
  const { preferences } = req.body;
  await pool.query('UPDATE users SET preferences = $1 WHERE id = $2', [
    JSON.stringify(preferences),
    req.user.userId
  ]);
  res.json({ success: true });
});

// ============ CATEGORIES ROUTES ============

app.get('/api/categories', authenticateToken, async (req, res) => {
  const categories = await query(`
    SELECT c.*, 
           COALESCE((SELECT SUM(duration) FROM sessions WHERE category_id = c.id), 0) as total_time,
           COALESCE((SELECT COUNT(*) FROM sessions WHERE category_id = c.id), 0) as session_count
    FROM categories c 
    WHERE c.user_id = $1
    ORDER BY c.created_at ASC
  `, [req.user.userId]);

  res.json({ categories });
});

app.post('/api/categories', authenticateToken, async (req, res) => {
  const { name, color, icon, parentId } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name required' });
  }

  const id = uuidv4();
  await pool.query(
    'INSERT INTO categories (id, user_id, parent_id, name, color, icon) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, req.user.userId, parentId || null, name, color || '#6366f1', icon || 'folder']
  );

  const category = await queryOne('SELECT * FROM categories WHERE id = $1', [id]);
  res.json({ category });
});

app.put('/api/categories/:id', authenticateToken, async (req, res) => {
  const { name, color, icon, parentId } = req.body;
  const { id } = req.params;

  const category = await queryOne(
    'SELECT * FROM categories WHERE id = $1 AND user_id = $2',
    [id, req.user.userId]
  );
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  await pool.query(
    'UPDATE categories SET name = $1, color = $2, icon = $3, parent_id = $4 WHERE id = $5',
    [
      name || category.name,
      color || category.color,
      icon || category.icon,
      parentId !== undefined ? parentId : category.parent_id,
      id
    ]
  );

  const updated = await queryOne('SELECT * FROM categories WHERE id = $1', [id]);
  res.json({ category: updated });
});

app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  const category = await queryOne(
    'SELECT * FROM categories WHERE id = $1 AND user_id = $2',
    [id, req.user.userId]
  );
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  await pool.query('UPDATE categories SET parent_id = $1 WHERE parent_id = $2', [category.parent_id, id]);
  await pool.query('UPDATE sessions SET category_id = NULL WHERE category_id = $1', [id]);
  await pool.query('DELETE FROM categories WHERE id = $1', [id]);

  res.json({ success: true });
});

// ============ SESSIONS ROUTES ============

app.get('/api/sessions', authenticateToken, async (req, res) => {
  const { date, month, categoryId, limit, offset } = req.query;

  let queryText = 'SELECT s.*, c.name as category_name, c.color as category_color FROM sessions s LEFT JOIN categories c ON s.category_id = c.id WHERE s.user_id = $1';
  const params = [req.user.userId];
  let paramIndex = 2;

  if (date) {
    queryText += ` AND s.date = $${paramIndex++}`;
    params.push(date);
  }

  if (month) {
    queryText += ` AND s.date LIKE $${paramIndex++}`;
    params.push(`${month}%`);
  }

  if (categoryId) {
    queryText += ` AND s.category_id = $${paramIndex++}`;
    params.push(categoryId);
  }

  queryText += ' ORDER BY s.date DESC, s.created_at DESC';

  if (limit) {
    queryText += ` LIMIT $${paramIndex++}`;
    params.push(parseInt(limit));
    if (offset) {
      queryText += ` OFFSET $${paramIndex++}`;
      params.push(parseInt(offset));
    }
  }

  const sessions = await query(queryText, params);
  res.json({ sessions });
});

app.post('/api/sessions', authenticateToken, async (req, res) => {
  const { title, notes, duration, date, categoryId, timerMode, startTime, endTime } = req.body;

  if (duration === undefined) {
    return res.status(400).json({ error: 'Duration required' });
  }

  const id = uuidv4();
  const sessionDate = date || new Date().toISOString().slice(0, 10);

  await pool.query(`
    INSERT INTO sessions (id, user_id, category_id, title, notes, duration, date, start_time, end_time, timer_mode)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    id, req.user.userId, categoryId || null, title || 'Untitled Session',
    notes || '', duration, sessionDate, startTime || null, endTime || null, timerMode || 'stopwatch'
  ]);

  const session = await queryOne(
    'SELECT s.*, c.name as category_name, c.color as category_color FROM sessions s LEFT JOIN categories c ON s.category_id = c.id WHERE s.id = $1',
    [id]
  );
  res.json({ session });
});

app.put('/api/sessions/:id', authenticateToken, async (req, res) => {
  const { title, notes, duration, date, categoryId } = req.body;
  const { id } = req.params;

  const session = await queryOne(
    'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
    [id, req.user.userId]
  );
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  await pool.query(`
    UPDATE sessions SET title = $1, notes = $2, duration = $3, date = $4, category_id = $5
    WHERE id = $6
  `, [
    title !== undefined ? title : session.title,
    notes !== undefined ? notes : session.notes,
    duration !== undefined ? duration : session.duration,
    date || session.date,
    categoryId !== undefined ? categoryId : session.category_id,
    id
  ]);

  const updated = await queryOne(
    'SELECT s.*, c.name as category_name, c.color as category_color FROM sessions s LEFT JOIN categories c ON s.category_id = c.id WHERE s.id = $1',
    [id]
  );
  res.json({ session: updated });
});

app.delete('/api/sessions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  const session = await queryOne(
    'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
    [id, req.user.userId]
  );
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
  res.json({ success: true });
});

app.post('/api/sessions/bulk-delete', authenticateToken, async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: 'Session IDs array required' });
  }

  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  await pool.query(
    `DELETE FROM sessions WHERE id IN (${placeholders}) AND user_id = $${ids.length + 1}`,
    [...ids, req.user.userId]
  );

  res.json({ success: true, deleted: ids.length });
});

// ============ ANALYTICS ROUTES ============

app.get('/api/analytics/summary', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const todayStats = await queryOne(
    'SELECT COALESCE(SUM(duration), 0) as total_time, COUNT(*) as session_count FROM sessions WHERE user_id = $1 AND date = $2',
    [userId, today]
  );

  const weekStats = await queryOne(
    'SELECT COALESCE(SUM(duration), 0) as total_time, COUNT(*) as session_count FROM sessions WHERE user_id = $1 AND date >= $2',
    [userId, weekAgo]
  );

  const monthStats = await queryOne(
    'SELECT COALESCE(SUM(duration), 0) as total_time, COUNT(*) as session_count FROM sessions WHERE user_id = $1 AND date >= $2',
    [userId, monthAgo]
  );

  const allTimeStats = await queryOne(
    'SELECT COALESCE(SUM(duration), 0) as total_time, COUNT(*) as session_count FROM sessions WHERE user_id = $1',
    [userId]
  );

  const sessionDates = await query(
    'SELECT DISTINCT date FROM sessions WHERE user_id = $1 ORDER BY date DESC',
    [userId]
  );

  let streak = 0;
  let currentDate = new Date(today);
  for (const row of sessionDates) {
    const sessionDate = new Date(row.date);
    const diffDays = Math.floor((currentDate - sessionDate) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) {
      streak++;
      currentDate = sessionDate;
    } else {
      break;
    }
  }

  const categoryBreakdown = await query(`
    SELECT c.id, c.name, c.color, COALESCE(SUM(s.duration), 0) as total_time, COUNT(s.id) as session_count
    FROM categories c
    LEFT JOIN sessions s ON c.id = s.category_id
    WHERE c.user_id = $1
    GROUP BY c.id, c.name, c.color
    ORDER BY total_time DESC
  `, [userId]);

  const dailyData = await query(`
    SELECT date, SUM(duration) as total_time, COUNT(*) as session_count
    FROM sessions WHERE user_id = $1 AND date >= $2
    GROUP BY date ORDER BY date ASC
  `, [userId, monthAgo]);

  res.json({
    today: todayStats,
    week: weekStats,
    month: monthStats,
    allTime: allTimeStats,
    streak,
    categoryBreakdown,
    dailyData
  });
});

app.get('/api/analytics/heatmap', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const data = await query(`
    SELECT date, SUM(duration) as total_time, COUNT(*) as session_count
    FROM sessions WHERE user_id = $1 AND date >= $2
    GROUP BY date ORDER BY date ASC
  `, [userId, yearAgo]);

  res.json({ heatmap: data });
});

// ============ EXPORT/IMPORT ROUTES ============

app.get('/api/export', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  const categories = await query('SELECT * FROM categories WHERE user_id = $1', [userId]);
  const sessions = await query('SELECT * FROM sessions WHERE user_id = $1', [userId]);
  const user = await queryOne('SELECT preferences FROM users WHERE id = $1', [userId]);

  res.json({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    categories,
    sessions,
    preferences: JSON.parse(user.preferences || '{}')
  });
});

app.post('/api/import', authenticateToken, async (req, res) => {
  const { categories, sessions, preferences } = req.body;
  const userId = req.user.userId;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (categories && Array.isArray(categories)) {
      for (const cat of categories) {
        const existing = await client.query('SELECT id FROM categories WHERE id = $1 AND user_id = $2', [cat.id, userId]);
        if (existing.rows.length > 0) {
          await client.query(
            'UPDATE categories SET name = $1, color = $2, icon = $3, parent_id = $4 WHERE id = $5',
            [cat.name, cat.color, cat.icon, cat.parent_id, cat.id]
          );
        } else {
          await client.query(
            'INSERT INTO categories (id, user_id, parent_id, name, color, icon) VALUES ($1, $2, $3, $4, $5, $6)',
            [cat.id, userId, cat.parent_id, cat.name, cat.color, cat.icon]
          );
        }
      }
    }

    if (sessions && Array.isArray(sessions)) {
      for (const session of sessions) {
        const existing = await client.query('SELECT id FROM sessions WHERE id = $1 AND user_id = $2', [session.id, userId]);
        if (existing.rows.length > 0) {
          await client.query(
            'UPDATE sessions SET title = $1, notes = $2, duration = $3, date = $4, category_id = $5 WHERE id = $6',
            [session.title, session.notes, session.duration, session.date, session.category_id, session.id]
          );
        } else {
          await client.query(
            'INSERT INTO sessions (id, user_id, category_id, title, notes, duration, date, timer_mode) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [session.id, userId, session.category_id, session.title, session.notes, session.duration, session.date, session.timer_mode || 'stopwatch']
          );
        }
      }
    }

    if (preferences) {
      await client.query('UPDATE users SET preferences = $1 WHERE id = $2', [JSON.stringify(preferences), userId]);
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Import error:', error);
    res.status(500).json({ error: 'Import failed' });
  } finally {
    client.release();
  }
});

// Clear all data
app.delete('/api/data/clear', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM categories WHERE user_id = $1', [userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Clear data error:', error);
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all: serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

// Start server
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`My Everything server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
