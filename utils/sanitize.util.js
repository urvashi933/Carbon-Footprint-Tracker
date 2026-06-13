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

module.exports = {
    sanitizeText,
    escapeHtml,
    redactSecrets
};
