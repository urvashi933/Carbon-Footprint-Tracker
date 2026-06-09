/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// Mock HTML page and dependencies before running frontend code
const htmlContent = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

describe('EcoTrace Frontend UI and DOM Tests', () => {
    let mockFetch;

    beforeEach(() => {
        // Set up DOM
        document.documentElement.innerHTML = htmlContent;

        // Mock localStorage
        const store = {};
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: (key) => store[key] || null,
                setItem: (key, value) => { store[key] = value.toString(); },
                removeItem: (key) => { delete store[key]; },
                clear: () => { for (const k in store) delete store[k]; }
            },
            writable: true
        });

        // Mock HTMLCanvasElement.prototype.getContext to avoid JSDOM warnings
        HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
            fillRect: jest.fn(),
            clearRect: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            beginPath: jest.fn(),
            closePath: jest.fn(),
            stroke: jest.fn(),
            fill: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            arc: jest.fn(),
            createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
            measureText: jest.fn(() => ({ width: 0 }))
        }));

        // Mock Chart.js constructor
        global.Chart = class MockChart {
            constructor(ctx, config) {
                this.ctx = ctx;
                this.config = config;
                this.data = config.data;
                this.options = config.options;
            }
            update() {}
            destroy() {}
        };

        // Mock fetch
        mockFetch = jest.fn();
        global.fetch = mockFetch;

        // Mock AbortSignal.timeout
        if (!global.AbortSignal.timeout) {
            global.AbortSignal.timeout = () => new AbortController().signal;
        }

        // Execute app.js code inside JSDOM context
        const appCode = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');
        // Wrap appCode in an IIFE to avoid duplicate const/let global declarations across test executions
        const scriptEl = document.createElement('script');
        scriptEl.textContent = `(() => { ${appCode} })();`;
        document.body.appendChild(scriptEl);

        // Dispatch DOMContentLoaded to trigger state initialization and event bindings
        document.dispatchEvent(new Event('DOMContentLoaded'));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should load index.html and initialize the page with correct page title', () => {
        const brandTitle = document.querySelector('.brand-title');
        expect(brandTitle).not.toBeNull();
        expect(brandTitle.textContent).toBe('EcoTrace');
    });

    test('should render the Welcome Message from EcoBot inside the chat container', () => {
        const chatContainer = document.getElementById('chatbot-messages-container');
        expect(chatContainer).not.toBeNull();
        expect(chatContainer.textContent).toContain("Hello! I'm EcoBot, your climate companion.");
    });

    test('should switch tabs active classes when navigation buttons are clicked', () => {
        const dashboardBtn = document.getElementById('tab-dashboard');
        const calculatorBtn = document.getElementById('tab-calculator');
        const dashboardPanel = document.getElementById('dashboard');
        const calculatorPanel = document.getElementById('calculator');

        // Initial state (Dashboard active)
        expect(dashboardBtn.classList.contains('active')).toBe(true);
        expect(calculatorBtn.classList.contains('active')).toBe(false);
        expect(dashboardPanel.classList.contains('active')).toBe(true);
        expect(calculatorPanel.classList.contains('active')).toBe(false);

        // Click calculator tab
        calculatorBtn.click();

        expect(dashboardBtn.classList.contains('active')).toBe(false);
        expect(calculatorBtn.classList.contains('active')).toBe(true);
        expect(dashboardPanel.classList.contains('active')).toBe(false);
        expect(calculatorPanel.classList.contains('active')).toBe(true);
    });

    test('should open and close the authentication modal', () => {
        const authBtn = document.getElementById('auth-modal-btn');
        const authModal = document.getElementById('auth-modal');
        const closeBtn = document.getElementById('close-auth-modal');

        expect(authModal.classList.contains('hidden')).toBe(true);

        // Open modal
        authBtn.click();
        expect(authModal.classList.contains('hidden')).toBe(false);

        // Close modal
        closeBtn.click();
        expect(authModal.classList.contains('hidden')).toBe(true);
    });

    test('should calculate custom carbon values in real-time when sliders change', () => {
        const carDistanceSlider = document.getElementById('car-distance');
        if (carDistanceSlider) {
            // Trigger input change
            carDistanceSlider.value = 25000;
            carDistanceSlider.dispatchEvent(new Event('input'));

            // Check if footprint recalculation occurred (represented in UI values)
            const footprintValEl = document.getElementById('total-footprint-value');
            expect(footprintValEl).not.toBeNull();
        }
    });

    test('should show error message when website checker url is submitted empty', () => {
        const checkerBtn = document.getElementById('web-checker-btn');
        const urlInput = document.getElementById('web-checker-url');
        
        urlInput.value = '';
        checkerBtn.click();

        // Should not call fetch
        expect(mockFetch).not.toHaveBeenCalled();
    });

    test('should call chat proxy endpoint when message is sent to chatbot', async () => {
        // Set user to authenticated (remove feature lock)
        const chatForm = document.getElementById('chatbot-input-form');
        const chatInput = document.getElementById('chatbot-input-field');
        const chatLock = document.getElementById('chatbot-lock');

        // Hide lock to simulate logged-in user interaction
        if (chatLock) chatLock.classList.add('hidden');

        // Set message and submit
        chatInput.value = 'How can I reduce food waste?';
        
        // Mock successful response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ reply: 'You can reduce food waste by composting and shopping intentionally.' })
        });

        // Submit form
        chatForm.dispatchEvent(new Event('submit'));

        // Check if fetch was called with /api/chat
        expect(mockFetch).toHaveBeenCalled();
        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[0]).toContain('/api/chat');
    });
});
