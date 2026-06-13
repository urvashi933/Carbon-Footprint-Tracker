const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dbService = require('../services/db.service');
const { JWT_SECRET } = require('../middlewares/auth.middleware');

async function register(req, res) {
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
        const existingUser = await dbService.findUserByUsername(trimmedUsername);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUserId = await dbService.createUser(trimmedUsername, hashedPassword);

        const token = jwt.sign({ id: newUserId, username: trimmedUsername }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, username: trimmedUsername });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function login(req, res) {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Username and password must be strings' });
    }

    try {
        const user = await dbService.findUserByUsername(username.trim());
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
}

module.exports = { register, login };
