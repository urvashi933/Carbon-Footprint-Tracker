# Security Policy

EcoTrace is a personal carbon-footprint tracker. This document describes the security posture of the application and how to report issues.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately by opening a [GitHub security advisory](https://github.com/urvashi933/Carbon-Footprint-Tracker/security/advisories/new) rather than a public issue. We aim to acknowledge reports within 72 hours.

Please include:

- A description of the issue and its impact.
- Steps to reproduce (a proof of concept is appreciated).
- Any suggested remediation.

## Scope

In scope:

- The Node.js Express application and its API routes (`/api/chat`, `/api/check-website`, `/api/register`, `/api/login`, `/api/save-progress`, `/api/load-progress`).
- Client-side data handling and storage.
- The SQLite database implementation and user session validation.
- The AI integration layer.

Out of scope:

- The upstream Google Gemini API service.
- Denial-of-service via volumetric traffic (handled at the hosting platform edge).

## Security Design

### Secret Handling

- The Gemini API key and JWT secret are read **only** server-side, from the `GEMINI_API_KEY` and `JWT_SECRET` environment variables. They are never serialized into the client bundle, never sent to the browser, and never logged.
- The JWT secret is securely generated as a random bytes fallback at runtime if not provided, preventing static analysis key extraction flags.

### Transport and Headers

Secure HTTP headers are set using `helmet` in `server.js`:

- `Content-Security-Policy` — strict policy denying `object-src 'none'`, `frame-ancestors 'none'`, and restricting script execution to self and required CDNs.
- `Strict-Transport-Security` with a two-year max-age.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` to prevent clickjacking and MIME sniffing.
- Remove `X-Powered-By` header to prevent server fingerprinting.

### Input Validation and Sanitization

- Every API request body is validated strictly in the controllers: username/password length constraints, type assertions, and existence checks.
- User chatbot queries are sanitized on the backend: Unicode normalization, removal of control and zero-width / bidirectional-override characters, and length clamping to 1000 characters. This mitigates prompt-injection obfuscation.
- Sensitive values like authorization headers, tokens, or JWTs are redacted from server log messages using a regular expression-based scanner.

### Abuse Protection

- Fixed-window rate limiters restrict the number of requests to authentication, website checker, and chat endpoints per client IP.
- The JSON parser enforces a payload body-size limit (10kb) to prevent CPU resource exhaustion and denial-of-service.

### Prompt Safety

- The system prompt constrains the assistant to the user's real, computed footprint and forbids inventing figures or revealing its instructions.
- Chat history is length- and count-clamped before being sent to the model.

### Data Privacy

- Active commitments, simulated configurations, and guest footprints live in local browser storage (`localStorage`). User account profiles and saved footprint stats live in a secure, local SQLite database (`database.sqlite`).
