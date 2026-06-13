const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { securityHeaders, pathBlocker } = require('./middlewares/security.middleware');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');
const dbService = require('./services/db.service');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Vercel's reverse proxy headers
app.set('trust proxy', 1);

// Security Middlewares
app.use(securityHeaders);
app.use(pathBlocker);

// Standard Middlewares
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Base API Rate Limiting
app.use('/api/', apiLimiter);

// Serve static frontend
app.use(express.static(__dirname));

// Mount Routes
app.use('/api', require('./routes/auth.routes'));
app.use('/api', require('./routes/progress.routes'));
app.use('/api', require('./routes/api.routes'));

// Database Initialization
if (process.env.NODE_ENV !== 'test') {
    dbService.initDB().catch(console.error);
}

// Start Server
let server;
if (process.env.NODE_ENV !== 'test') {
    server = app.listen(PORT, () => {
        console.log(`Server listening at http://localhost:${PORT}`);
    });
}

// Graceful Shutdown
function gracefulShutdown() {
    console.log('\nReceived shutdown signal. Closing server...');
    if (server) {
        server.close(async () => {
            console.log('HTTP server closed.');
            await dbService.closeDB();
            console.log('Database connections closed.');
            process.exit(0);
        });
    } else {
        dbService.closeDB().then(() => process.exit(0));
    }
    setTimeout(() => {
        console.error('Forcing shutdown after 10s');
        process.exit(1);
    }, 10000);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = app;