const { GoogleGenerativeAI } = require('@google/generative-ai');
const { sanitizeText, redactSecrets } = require('../utils/sanitize.util');

function generateLocalMockReply(msg, userStats) {
    const defaultReply = "I'm currently running in offline mode. I can see you've generated some carbon stats. Lowering meat consumption and utilizing public transit are the fastest ways to reduce your footprint!";
    if (msg.includes('stats') || msg.includes('highest')) {
        let maxCat = '';
        let maxVal = -1;
        const keys = ['transport', 'energy', 'food', 'waste', 'digital'];
        keys.forEach(k => {
            if (userStats[k] && userStats[k] > maxVal) { maxVal = userStats[k]; maxCat = k; }
        });
        const totalStr = userStats.total ? `${userStats.total.toFixed(2)} Tons CO₂e/year` : '0 Tons CO₂e/year';
        if (maxVal > 0) return `You have a total footprint of ${totalStr}. Your highest emitting category is ${maxCat} at ${maxVal} tons. Focus on reducing that first!`;
        return `You have a total footprint of ${totalStr}. Try filling out the calculator.`;
    }
    return defaultReply;
}

async function handleChat(req, res) {
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
}

async function checkWebsite(req, res) {
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
        const response = await fetch(targetUrl, { method: 'HEAD', timeout: 5000 });
        let contentLength = response.headers.get('content-length');
        
        let weightMB = 0;
        let isEstimated = false;

        if (contentLength) {
            weightMB = parseInt(contentLength) / (1024 * 1024);
        } else {
            const getResp = await fetch(targetUrl, { method: 'GET', timeout: 5000 });
            const text = await getResp.text();
            weightMB = text.length / (1024 * 1024);
            isEstimated = true;
        }

        if (weightMB === 0) weightMB = 1.5; 

        const co2Grams = weightMB * 0.18; 
        const isGreen = Math.random() > 0.5; 

        let grade = 'C';
        if (co2Grams < 0.2) grade = 'A';
        else if (co2Grams < 0.5) grade = 'B';
        else if (co2Grams > 1.0) grade = 'D';
        else if (co2Grams > 2.0) grade = 'F';

        res.json({
            url,
            weightMB: parseFloat(weightMB.toFixed(2)),
            co2Grams: parseFloat(co2Grams.toFixed(2)),
            isGreen,
            grade,
            isEstimated
        });

    } catch (error) {
        console.error('Error fetching website:', error.message);
        res.status(500).json({ error: 'Failed to analyze website. Ensure the URL is accessible.' });
    }
}

module.exports = { handleChat, checkWebsite };
