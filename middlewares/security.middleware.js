const helmet = require('helmet');

const securityHeaders = helmet({
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
});

const pathBlocker = (req, res, next) => {
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
};

module.exports = {
    securityHeaders,
    pathBlocker
};
