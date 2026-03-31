import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'studytimer-secret-key-change-in-production';

// Initialize SQLite database
const db = new Database(path.join(__dirname, 'db', 'studytimer.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    preferences TEXT DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    parent_id TEXT,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    icon TEXT DEFAULT 'folder',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category_id TEXT,
    title TEXT DEFAULT 'Untitled Session',
    notes TEXT,
    duration INTEGER NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    timer_mode TEXT DEFAULT 'stopwatch',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_category_id ON sessions(category_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
  CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
`);

app.use(cors());
app.use(express.json());

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

// Optional auth - allows guest access but attaches user if token present
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

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    db.prepare('INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)').run(
      userId,
      email,
      hashedPassword,
      name || email.split('@')[0]
    );

    // Create default categories for new user
    const defaultCategories = [
      { name: 'Work', color: '#3b82f6', icon: 'briefcase' },
      { name: 'Study', color: '#8b5cf6', icon: 'book' },
      { name: 'Personal', color: '#10b981', icon: 'user' }
    ];

    for (const cat of defaultCategories) {
      db.prepare('INSERT INTO categories (id, user_id, name, color, icon) VALUES (?, ?, ?, ?, ?)').run(
        uuidv4(),
        userId,
        cat.name,
        cat.color,
        cat.icon
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

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
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

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, email, name, preferences, created_at FROM users WHERE id = ?').get(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user: { ...user, preferences: JSON.parse(user.preferences || '{}') } });
});

// Update preferences
app.put('/api/auth/preferences', authenticateToken, (req, res) => {
  const { preferences } = req.body;
  db.prepare('UPDATE users SET preferences = ? WHERE id = ?').run(
    JSON.stringify(preferences),
    req.user.userId
  );
  res.json({ success: true });
});

// ============ CATEGORIES ROUTES ============

// Get all categories for user
app.get('/api/categories', authenticateToken, (req, res) => {
  const categories = db.prepare(`
    SELECT c.*, 
           (SELECT COALESCE(SUM(duration), 0) FROM sessions WHERE category_id = c.id) as total_time,
           (SELECT COUNT(*) FROM sessions WHERE category_id = c.id) as session_count
    FROM categories c 
    WHERE c.user_id = ?
    ORDER BY c.created_at ASC
  `).all(req.user.userId);

  res.json({ categories });
});

// Create category
app.post('/api/categories', authenticateToken, (req, res) => {
  const { name, color, icon, parentId } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name required' });
  }

  const id = uuidv4();
  db.prepare('INSERT INTO categories (id, user_id, parent_id, name, color, icon) VALUES (?, ?, ?, ?, ?, ?)').run(
    id,
    req.user.userId,
    parentId || null,
    name,
    color || '#6366f1',
    icon || 'folder'
  );

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  res.json({ category });
});

// Update category
app.put('/api/categories/:id', authenticateToken, (req, res) => {
  const { name, color, icon, parentId } = req.body;
  const { id } = req.params;

  const category = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, req.user.userId);
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  db.prepare('UPDATE categories SET name = ?, color = ?, icon = ?, parent_id = ? WHERE id = ?').run(
    name || category.name,
    color || category.color,
    icon || category.icon,
    parentId !== undefined ? parentId : category.parent_id,
    id
  );

  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  res.json({ category: updated });
});

// Delete category
app.delete('/api/categories/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const category = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, req.user.userId);
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  // Move subcategories to parent or make them root
  db.prepare('UPDATE categories SET parent_id = ? WHERE parent_id = ?').run(category.parent_id, id);
  
  // Set sessions to uncategorized
  db.prepare('UPDATE sessions SET category_id = NULL WHERE category_id = ?').run(id);
  
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);

  res.json({ success: true });
});

// ============ SESSIONS ROUTES ============

// Get sessions with filters
app.get('/api/sessions', authenticateToken, (req, res) => {
  const { date, month, categoryId, limit, offset } = req.query;

  let query = 'SELECT s.*, c.name as category_name, c.color as category_color FROM sessions s LEFT JOIN categories c ON s.category_id = c.id WHERE s.user_id = ?';
  const params = [req.user.userId];

  if (date) {
    query += ' AND s.date = ?';
    params.push(date);
  }

  if (month) {
    query += ' AND s.date LIKE ?';
    params.push(`${month}%`);
  }

  if (categoryId) {
    query += ' AND s.category_id = ?';
    params.push(categoryId);
  }

  query += ' ORDER BY s.date DESC, s.created_at DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(parseInt(limit));
    if (offset) {
      query += ' OFFSET ?';
      params.push(parseInt(offset));
    }
  }

  const sessions = db.prepare(query).all(...params);
  res.json({ sessions });
});

// Create session
app.post('/api/sessions', authenticateToken, (req, res) => {
  const { title, notes, duration, date, categoryId, timerMode, startTime, endTime } = req.body;

  if (duration === undefined) {
    return res.status(400).json({ error: 'Duration required' });
  }

  const id = uuidv4();
  const sessionDate = date || new Date().toISOString().slice(0, 10);

  db.prepare(`
    INSERT INTO sessions (id, user_id, category_id, title, notes, duration, date, start_time, end_time, timer_mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.user.userId,
    categoryId || null,
    title || 'Untitled Session',
    notes || '',
    duration,
    sessionDate,
    startTime || null,
    endTime || null,
    timerMode || 'stopwatch'
  );

  const session = db.prepare('SELECT s.*, c.name as category_name, c.color as category_color FROM sessions s LEFT JOIN categories c ON s.category_id = c.id WHERE s.id = ?').get(id);
  res.json({ session });
});

// Update session
app.put('/api/sessions/:id', authenticateToken, (req, res) => {
  const { title, notes, duration, date, categoryId } = req.body;
  const { id } = req.params;

  const session = db.prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?').get(id, req.user.userId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  db.prepare(`
    UPDATE sessions SET title = ?, notes = ?, duration = ?, date = ?, category_id = ?
    WHERE id = ?
  `).run(
    title !== undefined ? title : session.title,
    notes !== undefined ? notes : session.notes,
    duration !== undefined ? duration : session.duration,
    date || session.date,
    categoryId !== undefined ? categoryId : session.category_id,
    id
  );

  const updated = db.prepare('SELECT s.*, c.name as category_name, c.color as category_color FROM sessions s LEFT JOIN categories c ON s.category_id = c.id WHERE s.id = ?').get(id);
  res.json({ session: updated });
});

// Delete session
app.delete('/api/sessions/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const session = db.prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?').get(id, req.user.userId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  res.json({ success: true });
});

// Bulk delete sessions
app.post('/api/sessions/bulk-delete', authenticateToken, (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: 'Session IDs array required' });
  }

  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM sessions WHERE id IN (${placeholders}) AND user_id = ?`).run(...ids, req.user.userId);

  res.json({ success: true, deleted: ids.length });
});

// ============ ANALYTICS ROUTES ============

app.get('/api/analytics/summary', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const todayStats = db.prepare(`
    SELECT COALESCE(SUM(duration), 0) as total_time, COUNT(*) as session_count
    FROM sessions WHERE user_id = ? AND date = ?
  `).get(userId, today);

  const weekStats = db.prepare(`
    SELECT COALESCE(SUM(duration), 0) as total_time, COUNT(*) as session_count
    FROM sessions WHERE user_id = ? AND date >= ?
  `).get(userId, weekAgo);

  const monthStats = db.prepare(`
    SELECT COALESCE(SUM(duration), 0) as total_time, COUNT(*) as session_count
    FROM sessions WHERE user_id = ? AND date >= ?
  `).get(userId, monthAgo);

  const allTimeStats = db.prepare(`
    SELECT COALESCE(SUM(duration), 0) as total_time, COUNT(*) as session_count
    FROM sessions WHERE user_id = ?
  `).get(userId);

  // Get streak
  const sessions = db.prepare(`
    SELECT DISTINCT date FROM sessions WHERE user_id = ? ORDER BY date DESC
  `).all(userId);

  let streak = 0;
  let currentDate = new Date(today);
  for (const session of sessions) {
    const sessionDate = new Date(session.date);
    const diffDays = Math.floor((currentDate - sessionDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) {
      streak++;
      currentDate = sessionDate;
    } else {
      break;
    }
  }

  // Category breakdown
  const categoryBreakdown = db.prepare(`
    SELECT c.id, c.name, c.color, COALESCE(SUM(s.duration), 0) as total_time, COUNT(s.id) as session_count
    FROM categories c
    LEFT JOIN sessions s ON c.id = s.category_id
    WHERE c.user_id = ?
    GROUP BY c.id
    ORDER BY total_time DESC
  `).all(userId);

  // Daily data for last 30 days
  const dailyData = db.prepare(`
    SELECT date, SUM(duration) as total_time, COUNT(*) as session_count
    FROM sessions
    WHERE user_id = ? AND date >= ?
    GROUP BY date
    ORDER BY date ASC
  `).all(userId, monthAgo);

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

// Heatmap data for the year
app.get('/api/analytics/heatmap', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const data = db.prepare(`
    SELECT date, SUM(duration) as total_time, COUNT(*) as session_count
    FROM sessions
    WHERE user_id = ? AND date >= ?
    GROUP BY date
    ORDER BY date ASC
  `).all(userId, yearAgo);

  res.json({ heatmap: data });
});

// ============ EXPORT/IMPORT ROUTES ============

app.get('/api/export', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  const categories = db.prepare('SELECT * FROM categories WHERE user_id = ?').all(userId);
  const sessions = db.prepare('SELECT * FROM sessions WHERE user_id = ?').all(userId);
  const user = db.prepare('SELECT preferences FROM users WHERE id = ?').get(userId);

  res.json({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    categories,
    sessions,
    preferences: JSON.parse(user.preferences || '{}')
  });
});

app.post('/api/import', authenticateToken, (req, res) => {
  const { categories, sessions, preferences } = req.body;
  const userId = req.user.userId;

  const transaction = db.transaction(() => {
    // Import categories
    if (categories && Array.isArray(categories)) {
      for (const cat of categories) {
        const existing = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(cat.id, userId);
        if (existing) {
          db.prepare('UPDATE categories SET name = ?, color = ?, icon = ?, parent_id = ? WHERE id = ?').run(
            cat.name, cat.color, cat.icon, cat.parent_id, cat.id
          );
        } else {
          db.prepare('INSERT INTO categories (id, user_id, parent_id, name, color, icon) VALUES (?, ?, ?, ?, ?, ?)').run(
            cat.id, userId, cat.parent_id, cat.name, cat.color, cat.icon
          );
        }
      }
    }

    // Import sessions
    if (sessions && Array.isArray(sessions)) {
      for (const session of sessions) {
        const existing = db.prepare('SELECT id FROM sessions WHERE id = ? AND user_id = ?').get(session.id, userId);
        if (existing) {
          db.prepare('UPDATE sessions SET title = ?, notes = ?, duration = ?, date = ?, category_id = ? WHERE id = ?').run(
            session.title, session.notes, session.duration, session.date, session.category_id, session.id
          );
        } else {
          db.prepare('INSERT INTO sessions (id, user_id, category_id, title, notes, duration, date, timer_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
            session.id, userId, session.category_id, session.title, session.notes, session.duration, session.date, session.timer_mode || 'stopwatch'
          );
        }
      }
    }

    // Import preferences
    if (preferences) {
      db.prepare('UPDATE users SET preferences = ? WHERE id = ?').run(JSON.stringify(preferences), userId);
    }
  });

  try {
    transaction();
    res.json({ success: true });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Import failed' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
