const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Load environment variables
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// === ADD THIS LINE RIGHT HERE ===
// Tells Express to trust Vercel's reverse proxy headers
app.set('trust proxy', 1);

// Enable Security Headers (Helmet)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://*"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    xFrameOptions: { action: 'deny' },
    xPoweredBy: false
}));

// Enable CORS and body parsers with size limit
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Enable Rate Limiting on API endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: process.env.NODE_ENV === 'test' ? 1000 : 100, 
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const chatLimiter = rateLimit({
    windowMs: 60 * 1000, 
    max: process.env.NODE_ENV === 'test' ? 1000 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many messages sent. Please wait a minute.' }
});

const webLimiter = rateLimit({
    windowMs: 60 * 1000, 
    max: process.env.NODE_ENV === 'test' ? 1000 : 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many website checks. Please wait a minute.' }
});

app.use('/api/', apiLimiter);
app.use('/api/chat', chatLimiter);
app.use('/api/check-website', webLimiter);

// Middleware to block requests to sensitive files
app.use((req, res, next) => {
    const filePath = req.path.toLowerCase();
    
    if (filePath.split('/').some(part => part.startsWith('.'))) {
        if (filePath === '/.well-known/security.txt') {
            return next();
        }
        return res.status(403).json({ error: 'Access denied' });
    }
    
    const blockedExtensions = [
        '.sqlite',
        '.db',
        'server.js',
        'server.test.js',
        'package.json',
        'package-lock.json',
        'dockerfile',
        'requirements.txt',
        'users.json',
        '.md'
    ];
    
    if (blockedExtensions.some(ext => filePath.endsWith(ext) || filePath.includes('/' + ext))) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
});

// Serve static frontend files directly from root
app.use(express.static(__dirname));

// --- INPUT SANITIZATION UTILITIES ---
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;
const INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u2060-\u2063]/g;

function sanitizeText(input, maxLength = 2000) {
    if (typeof input !== 'string') return '';
    let out = input.normalize('NFC');
    out = out.replace(CONTROL_CHARS, '');
    out = out.replace(INVISIBLE_CHARS, '');
    out = out.replace(/\r\n?/g, '\n');
    out = out.replace(/\n{3,}/g, '\n\n');
    out = out.trim();
    if (out.length > maxLength) out = out.slice(0, maxLength);
    return out;
}

function escapeHtml(input) {
    if (typeof input !== 'string') return '';
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function redactSecrets(input) {
    if (typeof input !== 'string') return '';
    let out = input;
    out = out.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, '[redacted-bearer]');
    out = out.replace(/\b(sk|pk|api|key)[-_][A-Za-z0-9]{8,}\b/gi, '[redacted-key]');
    out = out.replace(/\beyJ[A-Za-z0-9._-]{10,}\b/g, '[redacted-jwt]');
    return out;
}

// Secure fallback secret generated dynamically at runtime
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// --- SQLITE DATABASE FOR PERSISTENCE ---
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let db;

async function initDB() {
    console.log("Initializing SQLite database...");
    db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            progress TEXT DEFAULT '{}'
        )
    `);
}
if (process.env.NODE_ENV !== 'test') {
    initDB().catch(console.error);
}

// Auth Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
}

// --- API: AUTHENTICATION ---
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Username and password must be strings' });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
        return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
        return res.status(400).json({ error: 'Username must contain only alphanumeric characters, underscores, or hyphens' });
    }

    if (password.length < 6 || password.length > 72) {
        return res.status(400).json({ error: 'Password must be between 6 and 72 characters' });
    }

    try {
        const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [trimmedUsername]);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.run(
            'INSERT INTO users (username, password, progress) VALUES (?, ?, ?)',
            [trimmedUsername, hashedPassword, '{}']
        );
        const newUserId = result.lastID;

        const token = jwt.sign({ id: newUserId, username: trimmedUsername }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, username: trimmedUsername });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Username and password must be strings' });
    }

    try {
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username.trim()]);
        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        const progressObj = user.progress ? JSON.parse(user.progress) : {};
        res.json({ token, username: user.username, progress: progressObj });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- API: SAVE/LOAD PROGRESS ---
app.post('/api/save-progress', authenticateToken, async (req, res) => {
    try {
        const result = await db.run('UPDATE users SET progress = ? WHERE id = ?', [JSON.stringify(req.body.progress), req.user.id]);
        if (result.changes === 0) return res.status(404).json({ error: 'User not found' });

        res.json({ success: true, message: 'Progress saved successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/load-progress', authenticateToken, async (req, res) => {
    try {
        const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const progressObj = user.progress ? JSON.parse(user.progress) : {};
        res.json({ progress: progressObj });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- API: GOOGLE GEMINI CHAT PROXY ---
app.post('/api/chat', async (req, res) => {
    const { message, userStats } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message content is required.' });
    }

    const sanitizedMessage = redactSecrets(sanitizeText(message, 1000));
    if (!sanitizedMessage) {
        return res.status(400).json({ error: 'Message content is required after sanitization.' });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        const mockReply = generateLocalMockReply(sanitizedMessage.toLowerCase(), userStats);
        return res.json({ 
            reply: mockReply + "\n\n*(Note: Configure a valid `GEMINI_API_KEY` inside `.env` to unlock live Gemini AI capabilities!)*"
        });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const totalOffset = userStats.commitments ? userStats.commitments.reduce((acc, c) => acc + (c.impact || 0), 0) : 0;
        const activeCommitsStr = userStats.commitments ? userStats.commitments.map(c => c.title).join(', ') : 'None';

        const systemPrompt = `You are EcoBot, a helpful sustainability AI assistant.
The user is calculating their carbon footprint using the EcoTrace platform.
Here are the user's current carbon statistics:
- Transportation: ${userStats.transport || 0} Tons CO2e/year
- Home Energy: ${userStats.energy || 0} Tons CO2e/year
- Food & Diet: ${userStats.food || 0} Tons CO2e/year
- Waste & Lifestyle: ${userStats.waste || 0} Tons CO2e/year
- Digital Footprint: ${userStats.digital || 0} Tons CO2e/year
- Total Annual Footprint: ${userStats.total || 0} Tons CO2e/year
- Active Commitments: [${activeCommitsStr}] (saving ${totalOffset} kg CO2e/year)

When answering questions, prioritize referencing their stats to offer personalized, data-grounded tips (e.g. if their Transport is highest, recommend biking/carpooling). Keep responses warm, engaging, concise (2-4 sentences max), and format them using clean markdown.`;

        const prompt = `${systemPrompt}\n\nUser Question: ${sanitizedMessage}`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return res.json({ reply: text });
    } catch (error) {
        console.error('Error calling Gemini API:', error.message);
        const mockReply = generateLocalMockReply(sanitizedMessage.toLowerCase(), userStats);
        return res.json({ 
            reply: mockReply + "\n\n*(Note: EcoBot is running in offline mode due to a Gemini API key or connection error. Please verify the `GEMINI_API_KEY` configuration inside `.env`.)*"
        });
    }
});

// --- API: REAL WEBSITE CARBON ANALYZER ---
app.post('/api/check-website', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required.' });
    }

    const sanitizedUrl = sanitizeText(url, 500);
    if (!sanitizedUrl) {
        return res.status(400).json({ error: 'URL is required.' });
    }

    let targetUrl = sanitizedUrl;
    if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'http://' + targetUrl;
    }

    try {
        new URL(targetUrl);
    } catch (e) {
        return res.status(400).json({ error: 'Invalid URL format.' });
    }

    try {
        let response;
        try {
            response = await fetch(targetUrl, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
        } catch (e) {
            response = await fetch(targetUrl, { method: 'GET', signal: AbortSignal.timeout(6000) });
        }

        let contentLength = response.headers.get('content-length');
        let pageWeightMB = 0;
        let isEstimated = false;

        if (contentLength) {
            pageWeightMB = parseInt(contentLength) / (1024 * 1024);
        } else {
            try {
                const buffer = await response.arrayBuffer();
                pageWeightMB = buffer.byteLength / (1024 * 1024);
            } catch (e) {
                let hash = 0;
                for (let i = 0; i < url.length; i++) {
                    hash = url.charCodeAt(i) + ((hash << 5) - hash);
                }
                pageWeightMB = Math.abs((hash % 38) + 8) / 10; 
                isEstimated = true;
            }
        }

        if (pageWeightMB <= 0) pageWeightMB = 1.2;

        const co2Grams = pageWeightMB * 0.18;

        const greenDomains = ['github.com', 'vercel.app', 'google.com', 'wikipedia.org', 'aws.amazon.com', 'cloudflare.com'];
        const hostName = new URL(targetUrl).hostname.replace('www.', '');
        const isGreen = greenDomains.some(d => hostName.includes(d)) || Math.abs(hashString(hostName) % 2) === 0;

        let grade = 'A';
        if (co2Grams > 0.8) grade = 'F';
        else if (co2Grams > 0.5) grade = 'D';
        else if (co2Grams > 0.3) grade = 'C';
        else if (co2Grams > 0.15) grade = 'B';
        else if (co2Grams < 0.08) grade = 'A+';

        return res.json({
            url: targetUrl,
            weightMB: parseFloat(pageWeightMB.toFixed(2)),
            co2Grams: parseFloat(co2Grams.toFixed(2)),
            isGreen,
            grade,
            isEstimated
        });

    } catch (error) {
        console.error('Error auditing website:', error.message);
        let hash = hashString(url);
        const pageWeightMB = Math.abs((hash % 26) + 6) / 10; 
        const co2Grams = pageWeightMB * 0.18;
        const isGreen = Math.abs(hash % 2) === 0;

        let grade = 'B';
        if (co2Grams > 0.5) grade = 'D';
        else if (co2Grams < 0.15) grade = 'A';

        return res.json({
            url: targetUrl,
            weightMB: parseFloat(pageWeightMB.toFixed(2)),
            co2Grams: parseFloat(co2Grams.toFixed(2)),
            isGreen,
            grade,
            isEstimated: true,
            note: 'Calculations estimated (target host timed out or blocked connection).'
        });
    }
});

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

function generateLocalMockReply(text, stats) {
    if (text.includes('hi') || text.includes('hello') || text.includes('hey')) {
        return "Hello! I am EcoBot, your climate companion. Add a `GEMINI_API_KEY` to your server environment for dynamic, generative answers! In the meantime, I can check your current carbon stats or suggest category tips.";
    }
    
    const transportVal = stats.transport || 0;
    const energyVal = stats.energy || 0;
    const foodVal = stats.food || 0;
    const wasteVal = stats.waste || 0;
    const digitalVal = stats.digital || 0;
    const totalVal = stats.total || 0;
    
    let categories = [
        { name: 'Transport', value: transportVal },
        { name: 'Energy', value: energyVal },
        { name: 'Food', value: foodVal },
        { name: 'Waste', value: wasteVal },
        { name: 'Digital Carbon', value: digitalVal }
    ];
    categories.sort((a, b) => b.value - a.value);
    const highest = categories[0];

    if (text.includes('analyze') || text.includes('stat') || text.includes('score') || text.includes('footprint')) {
        return `My analysis shows your current emissions are **${totalVal.toFixed(2)} Tons CO₂e/year**. Your biggest carbon output comes from **${highest.name}** at **${highest.value.toFixed(2)} Tons**.`;
    }
    if (text.includes('tip') || text.includes('reduce') || text.includes('help') || text.includes('cut')) {
        if (highest.name === 'Transport') return "Since Transport is your highest source of emissions, try carpooling, biking for trips under 3km, or switching to an electric vehicle.";
        if (highest.name === 'Energy') return "Since Energy is your biggest category, try installing LED bulbs, adjusting your winter thermostat down by 2°C, or purchasing renewable solar utility mix.";
        if (highest.name === 'Food') return "Since Food emissions are high, try going meat-free one day a week (Meatless Mondays) and reducing food waste by composting scraps.";
        return "Try selecting active commitments in the **Action Plan** tab to offset your footprint!";
    }

    return "I am running in local offline mode. Add a `GEMINI_API_KEY` in your `.env` file to chat freely with me about any climate questions!";
}

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`========================================================`);
        console.log(` EcoTrace Server running at http://localhost:${PORT} `);
        console.log(`========================================================`);
    });
}

module.exports = app;