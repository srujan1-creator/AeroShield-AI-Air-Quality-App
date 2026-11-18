/**
 * AeroShield AI - Client-Side Security & Sanitization Module
 * Implements strict multi-layer XSS defense, prompt-injection checks, and safe DOM manipulation.
 */

(function (window) {
    'use strict';

    const XSS_PATTERNS = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
        /<embed\b[^>]*>/gi,
        /<link\b[^>]*>/gi,
        /\bon\w+\s*=/gi,           // Event handlers: onerror=, onload=, onclick=
        /javascript:\s*/gi,        // Pseudo-protocol injection
        /data:\s*text\/html/gi,
        /vbscript:\s*/gi
    ];

    const INJECTION_PATTERNS = [
        /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules|commands)/i,
        /disregard\s+(all\s+)?(previous|prior|above)/i,
        /you\s+are\s+now\s+(a|an|the)?\s*(unrestricted|jailbroken|dan|evil|root|developer)/i,
        /act\s+as\s+(dan|jailbreak|unfiltered|system\s*admin)/i,
        /system\s+override/i,
        /print\s+(the\s+)?system\s+prompt/i,
        /reveal\s+(the\s+)?(hidden|internal|system)\s+(instructions|prompt|rules)/i,
        /bypass\s+safety\s+(filters|rules|checks|guidelines)/i,
        /<\|im_start\|>/i,
        /<\|im_end\|>/i,
        /\[system\]/i,
        /\[developer\]/i
    ];

    const Security = {
        /**
         * Escape raw string into safe HTML entities.
         * Prevents HTML tag interpretation in browser DOM.
         */
        escapeHTML: function (str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        /**
         * Sanitize dirty input: strips dangerous tags, attribute handlers, and applies entity escapes.
         */
        sanitizeHTML: function (dirty, maxLength = 2000) {
            if (dirty === null || dirty === undefined) return '';
            let text = String(dirty).trim();
            if (text.length > maxLength) {
                text = text.slice(0, maxLength);
            }

            // Strip out dangerous patterns
            for (let i = 0; i < XSS_PATTERNS.length; i++) {
                text = text.replace(XSS_PATTERNS[i], '');
            }

            // Entity encode remaining text
            return Security.escapeHTML(text);
        },

        /**
         * Check for prompt injection patterns
         * Returns { isInjected: boolean, matched: string|null }
         */
        checkPromptInjection: function (text) {
            if (!text || typeof text !== 'string') return { isInjected: false, matched: null };
            for (let i = 0; i < INJECTION_PATTERNS.length; i++) {
                const match = text.match(INJECTION_PATTERNS[i]);
                if (match) {
                    return { isInjected: true, matched: match[0] };
                }
            }
            if ((text.match(/```/g) || []).length > 4) {
                return { isInjected: true, matched: 'excessive_backticks' };
            }
            return { isInjected: false, matched: null };
        },

        /**
         * Validate input length and boundary
         */
        validateLength: function (value, min = 0, max = 100) {
            if (value === null || value === undefined) return min === 0;
            const len = String(value).trim().length;
            return len >= min && len <= max;
        },

        /**
         * Safe DOM population utility
         */
        safeSetText: function (element, text) {
            if (!element) return;
            element.textContent = text !== null && text !== undefined ? String(text) : '';
        }
    };

    window.Security = Security;
})(window);
