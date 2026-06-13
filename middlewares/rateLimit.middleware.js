const rateLimit = require('express-rate-limit');

// Note: express-rate-limit uses an in-memory store by default.
// For production deployments on serverless architectures like Vercel, 
// this store will reset on container cycles. 
// A central store (e.g., Redis via rate-limit-redis) should be configured here.

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

module.exports = {
    apiLimiter,
    chatLimiter,
    webLimiter
};
