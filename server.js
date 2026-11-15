const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data.db');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure public directory exists
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// Initialize SQLite database
const db = new DatabaseSync(DB_FILE);

// Set pragmas
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_color TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    owner_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS project_members (
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, user_id),
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS columns (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    column_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium',
    due_date TEXT,
    assignee_id TEXT,
    creator_id TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(column_id) REFERENCES columns(id) ON DELETE CASCADE,
    FOREIGN KEY(assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(creator_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    task_id TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Password helper
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'collab_salt_2026').digest('hex');
}

// Seed Demo Data if empty
function seedDemoData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return;

  console.log('Seeding initial demo users and collaborative project...');

  const users = [
    { id: 'user_1', name: 'Ashu', email: 'ashu@example.com', pass: 'demo123', color: '#6366f1' },
    { id: 'user_2', name: 'AshuSir', email: 'ashusir@example.com', pass: 'demo123', color: '#ec4899' },
    { id: 'user_3', name: 'Mohan', email: 'mohan@example.com', pass: 'demo123', color: '#10b981' },
    { id: 'user_4', name: 'Sohan', email: 'sohan@example.com', pass: 'demo123', color: '#f59e0b' }
  ];

  const insertUser = db.prepare('INSERT INTO users (id, name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)');
  for (const u of users) {
    insertUser.run(u.id, u.name, u.email, hashPassword(u.pass), u.color);
  }

  // Demo Project 1
  const p1 = {
    id: 'proj_1',
    title: 'Project Nexus: Mobile App Launch',
    description: 'Next-generation collaborative mobile app redesign and release roadmap.',
    color: '#4f46e5',
    owner: 'user_1'
  };
  db.prepare('INSERT INTO projects (id, title, description, color, owner_id) VALUES (?, ?, ?, ?, ?)').run(
    p1.id, p1.title, p1.description, p1.color, p1.owner
  );

  // Add members
  const addMember = db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)');
  addMember.run(p1.id, 'user_1', 'owner');
  addMember.run(p1.id, 'user_2', 'member');
  addMember.run(p1.id, 'user_3', 'member');
  addMember.run(p1.id, 'user_4', 'member');

  // Columns
  const cols = [
    { id: 'col_1', title: '📋 Backlog', pos: 0 },
    { id: 'col_2', title: '⏳ In Progress', pos: 1 },
    { id: 'col_3', title: '👀 Code Review', pos: 2 },
    { id: 'col_4', title: '✅ Done & Tested', pos: 3 }
  ];
  const addCol = db.prepare('INSERT INTO columns (id, project_id, title, position) VALUES (?, ?, ?, ?)');
  for (const c of cols) {
    addCol.run(c.id, p1.id, c.title, c.pos);
  }

  // Tasks
  const tasks = [
    {
      id: 'task_1', col: 'col_1', title: 'User authentication & OAuth integration',
      desc: 'Implement secure login, session tokens, and OAuth 2.0 with Google and GitHub.',
      priority: 'high', due: '2026-11-20', assignee: 'user_2', creator: 'user_1', pos: 0
    },
    {
      id: 'task_2', col: 'col_2', title: 'Real-time WebSocket notification hub',
      desc: 'Connect frontend to WebSocket broker to broadcast instant card status and comment events.',
      priority: 'urgent', due: '2026-11-18', assignee: 'user_1', creator: 'user_1', pos: 0
    },
    {
      id: 'task_3', col: 'col_2', title: 'Drag-and-drop Kanban interaction',
      desc: 'Ensure seamless card movement across columns with optimistic UI updates.',
      priority: 'medium', due: '2026-11-22', assignee: 'user_3', creator: 'user_2', pos: 1
    },
    {
      id: 'task_4', col: 'col_3', title: 'Mobile responsive layout styling',
      desc: 'Audit tablet and smartphone breakpoints, test touch gestures.',
      priority: 'low', due: '2026-11-25', assignee: 'user_4', creator: 'user_3', pos: 0
    },
    {
      id: 'task_5', col: 'col_4', title: 'Initial database schema & ER modeling',
      desc: 'Configured SQLite with foreign keys, indexes, and write-ahead logging.',
      priority: 'high', due: '2026-11-14', assignee: 'user_1', creator: 'user_1', pos: 0
    }
  ];

  const addTask = db.prepare(`
    INSERT INTO tasks (id, project_id, column_id, title, description, priority, due_date, assignee_id, creator_id, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const t of tasks) {
    addTask.run(t.id, p1.id, t.col, t.title, t.desc, t.priority, t.due, t.assignee, t.creator, t.pos);
  }

  // Comments
  const comments = [
    { id: 'com_1', task: 'task_2', user: 'user_2', text: 'WebSocket connection handshake is working smoothly now!' },
    { id: 'com_2', task: 'task_2', user: 'user_1', text: 'Great! Adding toast notifications for task updates next.' },
    { id: 'com_3', task: 'task_1', user: 'user_3', text: 'Auth endpoints are passing security checks.' }
  ];
  const addCom = db.prepare('INSERT INTO comments (id, task_id, user_id, content) VALUES (?, ?, ?, ?)');
  for (const c of comments) {
    addCom.run(c.id, c.task, c.user, c.text);
  }

  // Initial Notifications
  const addNotif = db.prepare('INSERT INTO notifications (id, user_id, title, message, task_id) VALUES (?, ?, ?, ?, ?)');
  addNotif.run('notif_1', 'user_1', 'New Comment', 'Priya commented on: Real-time WebSocket notification hub', 'task_2');
  addNotif.run('notif_2', 'user_2', 'Task Assigned', 'Alex assigned you to: User authentication & OAuth integration', 'task_1');

  console.log('Seeding completed successfully.');
}

seedDemoData();

// Simple JWT / Auth Token helper
const JWT_SECRET = 'collab_super_secret_jwt_key_2026';
function createToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_color: user.avatar_color,
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000)
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch (e) {
    return null;
  }
}

// WebSocket Connected Clients Registry
const wsClients = new Set();

function broadcast(event, data, excludeWs = null) {
  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  for (const client of wsClients) {
    if (client !== excludeWs && client.socket && !client.socket.destroyed) {
      sendWsFrame(client.socket, payload);
    }
  }
}

function sendToUser(userId, event, data) {
  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  for (const client of wsClients) {
    if (client.userId === userId && client.socket && !client.socket.destroyed) {
      sendWsFrame(client.socket, payload);
    }
  }
}

// RFC 6455 Frame builder
function sendWsFrame(socket, message) {
  try {
    const payloadBuffer = Buffer.from(message, 'utf8');
    const length = payloadBuffer.length;
    let header;

    if (length < 126) {
      header = Buffer.alloc(2);
      header[0] = 0x81; // FIN + text opcode
      header[1] = length;
    } else if (length < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }

    socket.write(Buffer.concat([header, payloadBuffer]));
  } catch (err) {
    console.error('Error sending WS frame:', err.message);
  }
}

// Helper to parse JSON body
function parseJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Payload Too Large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON format'));
      }
    });
  });
}

// Send JSON Response helper
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

// Auth Middleware Helper
function authenticate(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return verifyToken(token);
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  try {
    // API Routes
    if (pathname.startsWith('/api/')) {
      // 1. Auth: Register
      if (pathname === '/api/auth/register' && req.method === 'POST') {
        const body = await parseJson(req);
        const { name, email, password } = body;
        if (!name || !email || !password) {
          return sendJson(res, 400, { error: 'Name, email, and password are required' });
        }

        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
        if (existing) {
          return sendJson(res, 400, { error: 'Email already registered' });
        }

        const id = 'user_' + crypto.randomBytes(6).toString('hex');
        const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6'];
        const avatar_color = colors[Math.floor(Math.random() * colors.length)];

        db.prepare('INSERT INTO users (id, name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)').run(
          id, name.trim(), email.toLowerCase().trim(), hashPassword(password), avatar_color
        );

        const user = { id, name: name.trim(), email: email.toLowerCase().trim(), avatar_color };
        const token = createToken(user);
        return sendJson(res, 201, { user, token });
      }

      // 2. Auth: Login
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const body = await parseJson(req);
        const { email, password } = body;
        if (!email || !password) {
          return sendJson(res, 400, { error: 'Email and password required' });
        }

        const user = db.prepare('SELECT id, name, email, password_hash, avatar_color FROM users WHERE email = ?').get(email.toLowerCase().trim());
        if (!user || user.password_hash !== hashPassword(password)) {
          return sendJson(res, 401, { error: 'Invalid email or password' });
        }

        const token = createToken(user);
        return sendJson(res, 200, {
          user: { id: user.id, name: user.name, email: user.email, avatar_color: user.avatar_color },
          token
        });
      }

      // 3. Auth: Current User
      if (pathname === '/api/auth/me' && req.method === 'GET') {
        const auth = authenticate(req);
        if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });
        const user = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE id = ?').get(auth.id);
        if (!user) return sendJson(res, 404, { error: 'User not found' });
        return sendJson(res, 200, { user });
      }

      // 4. Users list (for assignment)
      if (pathname === '/api/users' && req.method === 'GET') {
        const auth = authenticate(req);
        if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });
        const users = db.prepare('SELECT id, name, email, avatar_color FROM users ORDER BY name ASC').all();
        return sendJson(res, 200, { users });
      }

      // 5. Projects: List projects user belongs to
      if (pathname === '/api/projects' && req.method === 'GET') {
        const auth = authenticate(req);
        if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });

        const projects = db.prepare(`
          SELECT p.*, pm.role as user_role,
            (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
            (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count
          FROM projects p
          JOIN project_members pm ON p.id = pm.project_id
          WHERE pm.user_id = ?
          ORDER BY p.created_at DESC
        `).all(auth.id);

        return sendJson(res, 200, { projects });
      }

      // 6. Projects: Create new project
      if (pathname === '/api/projects' && req.method === 'POST') {
        const auth = authenticate(req);
        if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });

        const body = await parseJson(req);
        const { title, description, color } = body;
        if (!title) return sendJson(res, 400, { error: 'Project title is required' });

        const projId = 'proj_' + crypto.randomBytes(6).toString('hex');
        const projColor = color || '#3b82f6';

        db.prepare('INSERT INTO projects (id, title, description, color, owner_id) VALUES (?, ?, ?, ?, ?)').run(
          projId, title.trim(), description || '', projColor, auth.id
        );

        // Add creator as owner member
        db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(
          projId, auth.id, 'owner'
        );

        // Create default columns
        const defaultCols = [
          { id: 'col_' + crypto.randomBytes(5).toString('hex'), title: 'To Do', pos: 0 },
          { id: 'col_' + crypto.randomBytes(5).toString('hex'), title: 'In Progress', pos: 1 },
          { id: 'col_' + crypto.randomBytes(5).toString('hex'), title: 'Review', pos: 2 },
          { id: 'col_' + crypto.randomBytes(5).toString('hex'), title: 'Done', pos: 3 }
        ];

        const insertCol = db.prepare('INSERT INTO columns (id, project_id, title, position) VALUES (?, ?, ?, ?)');
        for (const col of defaultCols) {
          insertCol.run(col.id, projId, col.title, col.pos);
        }

        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projId);
        broadcast('project_created', { project, creatorId: auth.id });

        return sendJson(res, 201, { project });
      }

      // 7. Project Details: Columns, Tasks, Members
      const projectDetailMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
      if (projectDetailMatch && req.method === 'GET') {
        const auth = authenticate(req);
        if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });

        const projId = projectDetailMatch[1];
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projId);
        if (!project) return sendJson(res, 404, { error: 'Project not found' });

        const members = db.prepare(`
          SELECT u.id, u.name, u.email, u.avatar_color, pm.role, pm.joined_at
          FROM project_members pm
          JOIN users u ON pm.user_id = u.id
          WHERE pm.project_id = ?
        `).all(projId);

        const columns = db.prepare('SELECT * FROM columns WHERE project_id = ? ORDER BY position ASC').all(projId);

        const tasks = db.prepare(`
          SELECT t.*, 
                 u_assign.name as assignee_name, u_assign.avatar_color as assignee_color,
                 u_creat.name as creator_name,
                 (SELECT COUNT(*) FROM comments WHERE task_id = t.id) as comment_count
          FROM tasks t
          LEFT JOIN users u_assign ON t.assignee_id = u_assign.id
          JOIN users u_creat ON t.creator_id = u_creat.id
          WHERE t.project_id = ?
          ORDER BY t.position ASC, t.created_at ASC
        `).all(projId);

        return sendJson(res, 200, { project, members, columns, tasks });
      }

      // 8. Add Project Member
      const addMemberMatch = pathname.match(/^\/api\/projects\/([^/]+)\/members$/);
      if (addMemberMatch && req.method === 'POST') {
        const auth = authenticate(req);
        if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });

        const projId = addMemberMatch[1];
        const body = await parseJson(req);
        const { user_id, role } = body;
        if (!user_id) return sendJson(res, 400, { error: 'User ID required' });

        try {
          db.prepare('INSERT OR REPLACE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(
            projId, user_id, role || 'member'
          );
          const member = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE id = ?').get(user_id);
          
          broadcast('member_added', { projectId: projId, member, role: role || 'member' });
          sendToUser(user_id, 'notification', {
            title: 'Added to Project',
            message: `You were added to project`,
            projectId: projId
          });

          return sendJson(res, 200, { success: true, member });
        } catch (err) {
          return sendJson(res, 400, { error: err.message });
        }
      }

      // 9. Create Column
      const addColMatch = pathname.match(/^\/api\/projects\/([^/]+)\/columns$/);
      if (addColMatch && req.method === 'POST') {
        const auth = authenticate(req);
        if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });

        const projId = addColMatch[1];
        const body = await parseJson(req);
        const { title } = body;
        if (!title) return sendJson(res, 400, { error: 'Column title is required' });

        const maxPosRow = db.prepare('SELECT MAX(position) as max_pos FROM columns WHERE project_id = ?').get(projId);
        const pos = (maxPosRow && maxPosRow.max_pos !== null) ? maxPosRow.max_pos + 1 : 0;
        const colId = 'col_' + crypto.randomBytes(5).toString('hex');

        db.prepare('INSERT INTO columns (id, project_id, title, position) VALUES (?, ?, ?, ?)').run(
          colId, projId, title.trim(), pos
        );

        const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(colId);
        broadcast('column_created', { projectId: projId, column });
        return sendJson(res, 201, { column });
      }

      // 10. Create Task
      const addTaskMatch = pathname.match(/^\/api\/projects\/([^/]+)\/tasks$/);
      if (addTaskMatch && req.method === 'POST') {
        const auth = authenticate(req);
        if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });

        const projId = addTaskMatch[1];
        const body = await parseJson(req);
        const { title, description, column_id, priority, due_date, assignee_id } = body;
        if (!title || !column_id) return sendJson(res, 400, { error: 'Title and column are required' });

        const taskId = 'task_' + crypto.randomBytes(6).toString('hex');
        const maxPosRow = db.prepare('SELECT MAX(position) as max_pos FROM tasks WHERE column_id = ?').get(column_id);
        const pos = (maxPosRow && maxPosRow.max_pos !== null) ? maxPosRow.max_pos + 1 : 0;

        db.prepare(`
          INSERT INTO tasks (id, project_id, column_id, title, description, priority, due_date, assignee_id, creator_id, position)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          taskId, projId, column_id, title.trim(), description || '',
          priority || 'medium', due_date || null, assignee_id || null, auth.id, pos
        );

        const createdTask = db.prepare(`
          SELECT t.*, 
                 u_assign.name as assignee_name, u_assign.avatar_color as assignee_color,
                 u_creat.name as creator_name,
                 0 as comment_count
          FROM tasks t
          LEFT JOIN users u_assign ON t.assignee_id = u_assign.id
          JOIN users u_creat ON t.creator_id = u_creat.id
          WHERE t.id = ?
        `).get(taskId);

        // If assigned, create notification
        if (assignee_id && assignee_id !== auth.id) {
          const notifId = 'notif_' + crypto.randomBytes(6).toString('hex');
          db.prepare('INSERT INTO notifications (id, user_id, title, message, task_id) VALUES (?, ?, ?, ?, ?)').run(
            notifId, assignee_id, 'New Task Assigned', `${auth.name} assigned you to "${title}"`, taskId
          );
          sendToUser(assignee_id, 'notification', {
            id: notifId,
            title: 'New Task Assigned',
            message: `${auth.name} assigned you to "${title}"`,
            task_id: taskId
          });
        }

        broadcast('task_created', { projectId: projId, task: createdTask });
        return sendJson(res, 201, { task: createdTask });
      }

      // 11. Update Task (Move column, reassign, update priority/title/desc)
      const taskUpdateMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
      if (taskUpdateMatch && req.method === 'PUT') {
        const auth = authenticate(req);
        if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });

        const taskId = taskUpdateMatch[1];
        const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
        if (!existing) return sendJson(res, 404, { error: 'Task not found' });

        const body = await parseJson(req);
        const {
          title = existing.title,
          description = existing.description,
          column_id = existing.column_id,
          priority = existing.priority,
          due_date = existing.due_date,
          assignee_id = existing.assignee_id,
          position = existing.position
        } = body;

        db.prepare(`
          UPDATE tasks
          SET title = ?, description = ?, column_id = ?, priority = ?, due_date = ?, assignee_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(title, description, column_id, priority, due_date, assignee_id, position, taskId);

        const updatedTask = db.prepare(`
          SELECT t.*, 
                 u_assign.name as assignee_name, u_assign.avatar_color as assignee_color,
                 u_creat.name as creator_name,
                 (SELECT COUNT(*) FROM comments WHERE task_id = t.id) as comment_count
          FROM tasks t
          LEFT JOIN users u_assign ON t.assignee_id = u_assign.id
          JOIN users u_creat ON t.creator_id = u_creat.id
          WHERE t.id = ?
        `).get(taskId);

        // Check if assignee changed
        if (assignee_id && assignee_id !== existing.assignee_id && assignee_id !== auth.id) {
          const notifId = 'notif_' + crypto.randomBytes(6).toString('hex');
          db.prepare('INSERT INTO notifications (id, user_id, title, message, task_id) VALUES (?, ?, ?, ?, ?)').run(
            notifId, assignee_id, 'Task Assigned', `${auth.name} assigned you to "${title}"`, taskId
          );
          sendToUser(assignee_id, 'notification', {
            id: notifId,
            title: 'Task Assigned',
            message: `${auth.name} assigned you to "${title}"`,
            task_id: taskId
          });
        }

        broadcast('task_updated', { projectId: updatedTask.project_id, task: updatedTask });
        return sendJson(res, 200, { task: updatedTask });
      }

      // 12. Delete Task
      if (taskUpdateMatch && req.method === 'DELETE') {
        const auth = authenticate(req);
        if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });

        const taskId = taskUpdateMatch[1];
        const existing = db.prepare('SELECT id, project_id FROM tasks WHERE id = ?').get(taskId);
        if (!existing) return sendJson(res, 404, { error: 'Task not found' });

        db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
        broadcast('task_deleted', { projectId: existing.project_id, taskId });
        return sendJson(res, 200, { success: true, taskId });
      }

      // 13. Comments for a Task
      const taskCommentsMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/comments$/);
      if (taskCommentsMatch && req.method === 'GET') {
        const auth = authenticate(req);
        if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });

        const taskId = taskCommentsMatch[1];
        const comments = db.prepare(`
          SELECT c.*, u.name as user_name, u.avatar_color
          FROM comments c
          JOIN users u ON c.user_id = u.id
          WHERE c.task_id = ?
          ORDER BY c.created_at ASC
        `).all(taskId);

        return sendJson(res, 200, { comments });
      }

      // 14. Add Comment to Task
      if (taskCommentsMatch && req.method === 'POST') {
        const auth = authenticate(req);
        if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });

        const taskId = taskCommentsMatch[1];
        const body = await parseJson(req);
        const { content } = body;
        if (!content || !content.trim()) return sendJson(res, 400, { error: 'Comment content cannot be empty' });

        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
        if (!task) return sendJson(res, 404, { error: 'Task not found' });

        const commentId = 'com_' + crypto.randomBytes(6).toString('hex');
        db.prepare('INSERT INTO comments (id, task_id, user_id, content) VALUES (?, ?, ?, ?)').run(
          commentId, taskId, auth.id, content.trim()
        );

        const newComment = db.prepare(`
          SELECT c.*, u.name as user_name, u.avatar_color
          FROM comments c
          JOIN users u ON c.user_id = u.id
          WHERE c.id = ?
        `).get(commentId);

        // Notify assignee if not current commenter
        if (task.assignee_id && task.assignee_id !== auth.id) {
          const notifId = 'notif_' + crypto.randomBytes(6).toString('hex');
          db.prepare('INSERT INTO notifications (id, user_id, title, message, task_id) VALUES (?, ?, ?, ?, ?)').run(
            notifId, task.assignee_id, 'New Comment', `${auth.name} commented on "${task.title}"`, taskId
          );
          sendToUser(task.assignee_id, 'notification', {
            id: notifId,
            title: 'New Comment',
            message: `${auth.name} commented on "${task.title}"`,
            task_id: taskId
          });
        }

        // Broadcast comment to board viewers
        broadcast('comment_added', { projectId: task.project_id, taskId, comment: newComment });
        return sendJson(res, 201, { comment: newComment });
      }

      // 15. User Notifications
      if (pathname === '/api/notifications' && req.method === 'GET') {
        const auth = authenticate(req);
        if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });

        const notifs = db.prepare(`
          SELECT * FROM notifications
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 30
        `).all(auth.id);

        return sendJson(res, 200, { notifications: notifs });
      }

      // 16. Mark Notifications Read
      if (pathname === '/api/notifications/read' && req.method === 'POST') {
        const auth = authenticate(req);
        if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });

        db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(auth.id);
        return sendJson(res, 200, { success: true });
      }

      // Unmatched API route
      return sendJson(res, 404, { error: 'Endpoint Not Found' });
    }

    // Static Files (Single Page App)
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    console.error('Server Request Error:', err);
    sendJson(res, 500, { error: 'Internal Server Error: ' + err.message });
  }
});

// Native RFC 6455 WebSocket Upgrade handler
server.on('upgrade', (req, socket, head) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  if (parsedUrl.pathname !== '/ws') {
    socket.destroy();
    return;
  }

  const secWsKey = req.headers['sec-websocket-key'];
  if (!secWsKey) {
    socket.destroy();
    return;
  }

  // Calculate Accept Header
  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  const acceptKey = crypto.createHash('sha1').update(secWsKey + GUID).digest('base64');

  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
    '\r\n'
  ];

  socket.write(responseHeaders.join('\r\n'));

  const client = { socket, userId: null };
  wsClients.add(client);

  // Parse incoming frames
  let buffer = Buffer.alloc(0);

  socket.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 2) {
      const firstByte = buffer[0];
      const secondByte = buffer[1];
      const opcode = firstByte & 0x0f;
      const isMasked = (secondByte & 0x80) !== 0;
      let payloadLen = secondByte & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (buffer.length < 4) break;
        payloadLen = buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (buffer.length < 10) break;
        payloadLen = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      const maskKeyLen = isMasked ? 4 : 0;
      if (buffer.length < offset + maskKeyLen + payloadLen) {
        break; // Wait for full frame
      }

      let payload = buffer.subarray(offset + maskKeyLen, offset + maskKeyLen + payloadLen);
      if (isMasked) {
        const maskKey = buffer.subarray(offset, offset + 4);
        const unmasked = Buffer.alloc(payloadLen);
        for (let i = 0; i < payloadLen; i++) {
          unmasked[i] = payload[i] ^ maskKey[i % 4];
        }
        payload = unmasked;
      }

      buffer = buffer.subarray(offset + maskKeyLen + payloadLen);

      // Handle Opcode
      if (opcode === 0x8) {
        // Close frame
        socket.end();
        break;
      } else if (opcode === 0x9) {
        // Ping -> respond Pong
        const pong = Buffer.alloc(2);
        pong[0] = 0x8a;
        pong[1] = 0x00;
        socket.write(pong);
      } else if (opcode === 0x1) {
        // Text Frame
        try {
          const msg = JSON.parse(payload.toString('utf8'));
          if (msg.type === 'auth') {
            const user = verifyToken(msg.token);
            if (user) {
              client.userId = user.id;
              sendWsFrame(socket, JSON.stringify({ event: 'auth_success', user: { id: user.id, name: user.name } }));
            }
          }
        } catch (e) {
          // ignore malformed ws messages
        }
      }
    }
  });

  socket.on('close', () => {
    wsClients.delete(client);
  });

  socket.on('error', () => {
    wsClients.delete(client);
  });
});

// Start listening
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Collaborative Project Management Server running on http://localhost:${PORT}`);
});
