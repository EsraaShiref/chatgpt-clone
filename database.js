// database.js - SQLite Database Management

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Database path
const dbDir = path.join(__dirname, 'database');
const dbPath = path.join(dbDir, 'chat.db');

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
let db;

const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
        try {
            db = new Database(dbPath);
            db.pragma('journal_mode = WAL');

            // Create tables if they don't exist
            createTables();

            console.log('✅ Database connection established at:', dbPath);
            resolve();
        } catch (error) {
            console.error('❌ Database error:', error);
            reject(error);
        }
    });
};

const createTables = () => {
    // Sessions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL DEFAULT 'New Chat',
            model_used TEXT DEFAULT 'gpt-4o-mini',
            system_prompt TEXT DEFAULT 'You are a helpful assistant.',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME
        );
    `);

    // Messages table
    db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            session_id INTEGER NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
            content TEXT NOT NULL,
            tokens_used INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );
    `);

    // Files table (for future file upload feature)
    db.exec(`
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            session_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            file_type TEXT,
            file_size INTEGER,
            file_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );
    `);

    // Create indexes for better performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
        CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    `);

    console.log('✅ Database tables created/verified');
};

// ============ SESSION FUNCTIONS ============

const createSession = (title, model = 'gpt-4o-mini') => {
    const uuid = uuidv4();
    const stmt = db.prepare(`
        INSERT INTO sessions (uuid, title, model_used)
        VALUES (?, ?, ?)
    `);

    const result = stmt.run(uuid, title, model);

    return {
        id: result.lastInsertRowid,
        uuid: uuid,
        title: title,
        model_used: model,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
};

const getSession = (id) => {
    const stmt = db.prepare(`
        SELECT * FROM sessions WHERE id = ? AND deleted_at IS NULL
    `);
    return stmt.get(id);
};

const getAllSessions = () => {
    const stmt = db.prepare(`
        SELECT * FROM sessions 
        WHERE deleted_at IS NULL 
        ORDER BY updated_at DESC
    `);
    return stmt.all();
};

const updateSessionTitle = (id, title) => {
    const stmt = db.prepare(`
        UPDATE sessions 
        SET title = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    stmt.run(title, id);
    return getSession(id);
};

const deleteSession = (id) => {
    const stmt = db.prepare(`
        UPDATE sessions 
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    stmt.run(id);
    return { success: true };
};

const getSessionMessages = (sessionId) => {
    const stmt = db.prepare(`
        SELECT * FROM messages 
        WHERE session_id = ? 
        ORDER BY created_at ASC
    `);
    return stmt.all(sessionId);
};

// ============ MESSAGE FUNCTIONS ============

const addMessage = (sessionId, role, content) => {
    const uuid = uuidv4();
    const stmt = db.prepare(`
        INSERT INTO messages (uuid, session_id, role, content)
        VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(uuid, sessionId, role, content);

    // Update session's updated_at
    updateSessionTimestamp(sessionId);

    return {
        id: result.lastInsertRowid,
        uuid: uuid,
        session_id: sessionId,
        role: role,
        content: content,
        created_at: new Date().toISOString()
    };
};

const getMessage = (id) => {
    const stmt = db.prepare(`
        SELECT * FROM messages WHERE id = ?
    `);
    return stmt.get(id);
};

const updateMessage = (id, content) => {
    const stmt = db.prepare(`
        UPDATE messages 
        SET content = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    stmt.run(content, id);
    return getMessage(id);
};

const deleteMessage = (id) => {
    const message = getMessage(id);
    if (!message) {
        throw new Error('Message not found');
    }

    const stmt = db.prepare(`
        DELETE FROM messages 
        WHERE id = ? OR 
              (session_id = ? AND created_at > ?)
    `);
    stmt.run(id, message.session_id, message.created_at);

    return { success: true };
};

const deleteMessagesAfter = (sessionId, messageId) => {
    const message = getMessage(messageId);
    if (!message) {
        throw new Error('Message not found');
    }

    const stmt = db.prepare(`
        DELETE FROM messages 
        WHERE session_id = ? AND created_at >= ?
    `);
    stmt.run(sessionId, message.created_at);

    return { success: true };
};

// ============ UTILITY FUNCTIONS ============

const updateSessionTimestamp = (sessionId) => {
    const stmt = db.prepare(`
        UPDATE sessions 
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    stmt.run(sessionId);
};

const getStatistics = () => {
    const sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE deleted_at IS NULL').get();
    const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages').get();
    const dbSize = fs.statSync(dbPath).size;

    return {
        totalSessions: sessionCount.count,
        totalMessages: messageCount.count,
        databaseSize: `${(dbSize / 1024 / 1024).toFixed(2)} MB`
    };
};

const backupDatabase = () => {
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupPath = path.join(backupDir, `chat_${timestamp}.db`);

    fs.copyFileSync(dbPath, backupPath);
    return backupPath;
};

const resetDatabase = () => {
    if (db) db.close();
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }
    return initializeDatabase();
};

// ============ AVAILABLE MODELS ============

const AVAILABLE_MODELS = {
    'gpt-4o-mini': {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'GitHub Models (Azure OpenAI)',
        description: 'Fast, efficient model for most tasks',
        maxTokens: 4096,
        costPer1kTokens: 0.00015,
        capabilities: ['chat', 'text-generation'],
        url: 'https://models.inference.ai.azure.com'
    },
    'gpt-4o': {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'GitHub Models (Azure OpenAI)',
        description: 'Most capable model for complex tasks',
        maxTokens: 8192,
        costPer1kTokens: 0.00300,
        capabilities: ['chat', 'text-generation', 'vision'],
        url: 'https://models.inference.ai.azure.com'
    },
    'mistral-large': {
        id: 'mistral-large',
        name: 'Mistral Large',
        provider: 'GitHub Models',
        description: 'Open-source large model',
        maxTokens: 8192,
        costPer1kTokens: 0.00200,
        capabilities: ['chat', 'text-generation'],
        url: 'https://models.inference.ai.azure.com'
    },
    'claude-3-5-sonnet': {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'GitHub Models',
        description: 'Anthropic Claude model',
        maxTokens: 8192,
        costPer1kTokens: 0.00300,
        capabilities: ['chat', 'text-generation'],
        url: 'https://models.inference.ai.azure.com'
    }
};

const getAvailableModels = () => {
    return Object.values(AVAILABLE_MODELS);
};

const getModel = (modelId) => {
    return AVAILABLE_MODELS[modelId] || AVAILABLE_MODELS['gpt-4o-mini'];
};

// ============ EXPORTS ============

module.exports = {
    // Database initialization
    initializeDatabase,
    db: () => db,

    // Session functions
    createSession,
    getSession,
    getAllSessions,
    updateSessionTitle,
    deleteSession,
    getSessionMessages,

    // Message functions
    addMessage,
    getMessage,
    updateMessage,
    deleteMessage,
    deleteMessagesAfter,

    // Utility functions
    updateSessionTimestamp,
    getStatistics,
    backupDatabase,
    resetDatabase,

    // Model functions
    AVAILABLE_MODELS,
    getAvailableModels,
    getModel
};
