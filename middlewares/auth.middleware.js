const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Secure fallback secret generated dynamically at runtime
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

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

module.exports = {
    authenticateToken,
    JWT_SECRET
};
