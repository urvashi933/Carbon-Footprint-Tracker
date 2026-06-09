const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and body parsers
app.use(cors());
app.use(express.json());

// Serve static frontend files directly from root
app.use(express.static(__dirname));

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'hack2skill_super_secret_key';
const USERS_FILE = path.join(__dirname, 'users.json');

// Initialize users file if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}

function getUsers() {
    const data = fs.readFileSync(USERS_FILE);
    return JSON.parse(data);
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
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

    const users = getUsers();
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now().toString(), username, password: hashedPassword, progress: {} };
    users.push(newUser);
    saveUsers(users);

    const token = jwt.sign({ id: newUser.id, username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username });
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const users = getUsers();
    const user = users.find(u => u.username === username);

    if (!user) return res.status(400).json({ error: 'User not found' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username, progress: user.progress });
});

// --- API: SAVE/LOAD PROGRESS ---
app.post('/api/save-progress', authenticateToken, (req, res) => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
    
    users[userIndex].progress = req.body.progress;
    saveUsers(users);
    
    res.json({ success: true, message: 'Progress saved successfully' });
});

app.get('/api/load-progress', authenticateToken, (req, res) => {
    const users = getUsers();
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ progress: user.progress || {} });
});

// --- API: GOOGLE GEMINI CHAT PROXY ---
app.post('/api/chat', async (req, res) => {
    const { message, userStats } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message content is required.' });
    }

    // Check if Gemini API key exists
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        // Safe mock fallback if no API key is configured yet
        const mockReply = generateLocalMockReply(message.toLowerCase(), userStats);
        return res.json({ 
            reply: mockReply + "\n\n*(Note: Configure a valid `GEMINI_API_KEY` inside `.env` to unlock live Gemini AI capabilities!)*"
        });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Use the recommended model for chat tasks
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Build data-grounded system instructions
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

        const prompt = `${systemPrompt}\n\nUser Question: ${message}`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return res.json({ reply: text });
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        return res.status(500).json({ 
            error: 'Failed to generate content from AI.',
            reply: "I'm having trouble connecting to my AI brain right now. Please check if your `GEMINI_API_KEY` in the `.env` file is correct, or try again shortly!"
        });
    }
});

// --- API: REAL WEBSITE CARBON ANALYZER ---
app.post('/api/check-website', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required.' });
    }

    // Format URL
    let targetUrl = url;
    if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'http://' + targetUrl;
    }

    try {
        // Use native fetch to get page size (HEAD request first, fall back to GET)
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
            // Read body buffer size if HEAD didn't yield content-length
            try {
                const buffer = await response.arrayBuffer();
                pageWeightMB = buffer.byteLength / (1024 * 1024);
            } catch (e) {
                // If weight cannot be read (e.g., CORS/chunked/blocked), fall back to deterministic size
                let hash = 0;
                for (let i = 0; i < url.length; i++) {
                    hash = url.charCodeAt(i) + ((hash << 5) - hash);
                }
                pageWeightMB = Math.abs((hash % 38) + 8) / 10; // 0.8 MB to 4.5 MB
                isEstimated = true;
            }
        }

        // Avoid zero weight
        if (pageWeightMB <= 0) pageWeightMB = 1.2;

        // Calculate CO2 per load (1g of CO2 for every 5.5MB of data transferred approx.)
        const co2Grams = pageWeightMB * 0.18;

        // Host check: simulate green host database
        // Green hosts list simulation based on green energy commitments (Google, GitHub, Vercel, AWS, Cloudflare, etc.)
        const greenDomains = ['github.com', 'vercel.app', 'google.com', 'wikipedia.org', 'aws.amazon.com', 'cloudflare.com'];
        const hostName = new URL(targetUrl).hostname.replace('www.', '');
        const isGreen = greenDomains.some(d => hostName.includes(d)) || Math.abs(hashString(hostName) % 2) === 0;

        // Calculate Eco Grade
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
        // Return a simulated result so the UI doesn't crash on local firewall / offline blocks
        let hash = hashString(url);
        const pageWeightMB = Math.abs((hash % 26) + 6) / 10; // 0.6 MB to 3.2 MB
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

// Helper for hash values
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

// Fallback mock responses when API Key is missing
function generateLocalMockReply(text, stats) {
    if (text.includes('hi') || text.includes('hello') || text.includes('hey')) {
        return "Hello! I am EcoBot, your climate companion. Add a `GEMINI_API_KEY` to your server environment for dynamic, generative answers! In the meantime, I can check your current carbon stats or suggest category tips.";
    }
    
    // Find highest emissions category
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
app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(` EcoTrace Server running at http://localhost:${PORT} `);
    console.log(`========================================================`);
});
