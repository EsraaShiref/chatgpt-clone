// server.js - Main Express Server File

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Import database and routes
const { initializeDatabase } = require('./database');
const chatRoutes = require('./routes/chat');
const modelRoutes = require('./routes/models');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ MIDDLEWARE ============

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Static files (serve public folder)
app.use(express.static(path.join(__dirname, 'public')));

// ============ ROUTES ============

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API Routes
app.use('/api', chatRoutes);
app.use('/api', modelRoutes);

// Serve index.html for all other routes (SPA)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.path,
        method: req.method
    });
});

// Error handler middleware
app.use(errorHandler);

// ============ SERVER STARTUP ============

// Initialize database and start server
const startServer = async () => {
    try {
        // Initialize database
        await initializeDatabase();
        console.log('✅ Database initialized successfully');

        // Start server
        app.listen(PORT, () => {
            console.log('');
            console.log('╔════════════════════════════════════════╗');
            console.log('║   ChatGPT Clone - Node.js Server       ║');
            console.log('╠════════════════════════════════════════╣');
            console.log(`║ 🚀 Server is running on:               ║`);
            console.log(`║    http://localhost:${PORT}${''.padEnd(35 - PORT.toString().length)}║`);
            console.log('║                                        ║');
            console.log('║ 📚 API Documentation:                  ║');
            console.log(`║    http://localhost:${PORT}/api${''.padEnd(21 - PORT.toString().length)}║`);
            console.log('║                                        ║');
            console.log('║ 🛑 Press Ctrl+C to stop the server     ║');
            console.log('╚════════════════════════════════════════╝');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Server shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n🛑 Server shutting down gracefully...');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = app;
