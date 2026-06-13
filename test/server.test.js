// Set environment to test to use database.test.sqlite and bypass high rate limiting
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_12345';

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../server');
const { initDB, closeDB } = require('../services/db.service');

// Clear Gemini API key after server.js loads (and runs dotenv.config()) to force local mock fallback responses during testing
delete process.env.GEMINI_API_KEY;

describe('EcoTrace Backend API Integration Tests', () => {
    beforeAll(async () => {
        // Initialize the test database
        await initDB();
    });

    afterAll(async () => {
        // Close database connection
        await closeDB();

        // Clean up test database file
        try {
            const testDbPath = path.join(__dirname, '..', 'database.test.sqlite');
            if (fs.existsSync(testDbPath)) {
                fs.unlinkSync(testDbPath);
            }
        } catch (e) {
            console.error('Failed to delete test database file:', e.message);
        }
    });

    // --- TEST STATIC FILE SERVING ---
    describe('Static File Serving', () => {
        it('should serve index.html at root', async () => {
            const res = await request(app).get('/');
            expect(res.status).toBe(200);
            expect(res.text).toContain('<!DOCTYPE html>');
            expect(res.text).toContain('EcoTrace');
        });
    });

    // --- TEST AUTHENTICATION ---
    describe('Authentication APIs', () => {
        const uniqueUsername = `user_${Date.now()}`;
        const userPassword = 'password123';

        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/register')
                .send({ username: uniqueUsername, password: userPassword });
            
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.username).toBe(uniqueUsername);
        });

        it('should fail to register an existing username', async () => {
            const res = await request(app)
                .post('/api/register')
                .send({ username: uniqueUsername, password: userPassword });
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'User already exists');
        });

        it('should fail registration with invalid input types', async () => {
            const res = await request(app)
                .post('/api/register')
                .send({ username: 12345, password: userPassword });
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Username and password must be strings');
        });

        it('should fail registration with invalid username length', async () => {
            const res = await request(app)
                .post('/api/register')
                .send({ username: 'ab', password: userPassword });
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Username must be between 3 and 30 characters');
        });

        it('should fail registration with invalid username format', async () => {
            const res = await request(app)
                .post('/api/register')
                .send({ username: 'user@name', password: userPassword });
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Username must contain only alphanumeric characters, underscores, or hyphens');
        });

        it('should fail registration with too short password', async () => {
            const res = await request(app)
                .post('/api/register')
                .send({ username: 'validUser', password: '123' });
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Password must be between 6 and 72 characters');
        });

        it('should login successfully with correct credentials', async () => {
            const res = await request(app)
                .post('/api/login')
                .send({ username: uniqueUsername, password: userPassword });
            
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.username).toBe(uniqueUsername);
            expect(res.body).toHaveProperty('progress');
        });

        it('should fail login with wrong password', async () => {
            const res = await request(app)
                .post('/api/login')
                .send({ username: uniqueUsername, password: 'wrongpassword' });
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Invalid password');
        });

        it('should fail login for non-existent user', async () => {
            const res = await request(app)
                .post('/api/login')
                .send({ username: 'nonexistentuser', password: userPassword });
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'User not found');
        });
    });

    // --- TEST PROGRESS SAVING & LOADING ---
    describe('User Progress APIs (Authenticated)', () => {
        let token;
        const username = `progress_user_${Date.now()}`;
        const password = 'password123';
        const dummyProgress = {
            calculatorInputs: { carFuel: 'electric', carDistance: 5000 },
            commitments: ['led-bulbs', 'cold-wash']
        };

        beforeAll(async () => {
            // Register a user to get an auth token
            const res = await request(app)
                .post('/api/register')
                .send({ username, password });
            token = res.body.token;
        });

        it('should fail to load progress without authorization token', async () => {
            const res = await request(app).get('/api/load-progress');
            expect(res.status).toBe(401);
        });

        it('should fail to save progress with invalid authorization token', async () => {
            const res = await request(app)
                .post('/api/save-progress')
                .set('Authorization', 'Bearer invalid_token_here')
                .send({ progress: dummyProgress });
            expect(res.status).toBe(403);
        });

        it('should save progress successfully when authenticated', async () => {
            const res = await request(app)
                .post('/api/save-progress')
                .set('Authorization', `Bearer ${token}`)
                .send({ progress: dummyProgress });
            
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success', true);
        });

        it('should load saved progress successfully when authenticated', async () => {
            const res = await request(app)
                .get('/api/load-progress')
                .set('Authorization', `Bearer ${token}`);
            
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('progress');
            expect(res.body.progress.calculatorInputs.carFuel).toBe('electric');
            expect(res.body.progress.commitments).toContain('led-bulbs');
        });
    });

    // --- TEST WEBSITE ANALYZER ---
    describe('Website Analyzer API', () => {
        it('should calculate estimated metrics for standard URL request', async () => {
            const res = await request(app)
                .post('/api/check-website')
                .send({ url: 'google.com' });
            
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('url');
            expect(res.body).toHaveProperty('weightMB');
            expect(res.body).toHaveProperty('co2Grams');
            expect(res.body).toHaveProperty('grade');
            expect(res.body).toHaveProperty('isGreen');
        });

        it('should fail if no URL is provided', async () => {
            const res = await request(app)
                .post('/api/check-website')
                .send({});
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'URL is required.');
        });
    });

    // --- TEST ECOBOT CHAT ---
    describe('EcoBot Chat API', () => {
        const dummyStats = {
            transport: 4.5,
            energy: 2.1,
            food: 1.5,
            waste: 0.8,
            digital: 0.3,
            total: 9.2,
            commitments: [{ title: 'Switch to LED Bulbs', impact: 150 }]
        };

        it('should return mock local response when no valid Gemini API key is configured', async () => {
            const res = await request(app)
                .post('/api/chat')
                .send({ message: 'analyze stats', userStats: dummyStats });
            
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('reply');
            expect(res.body.reply).toContain('9.20 Tons CO₂e/year');
            expect(res.body.reply).toContain('Configure a valid `GEMINI_API_KEY`');
        });

        it('should fail if message content is missing', async () => {
            const res = await request(app)
                .post('/api/chat')
                .send({ userStats: dummyStats });
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Message content is required.');
        });
    });
});
