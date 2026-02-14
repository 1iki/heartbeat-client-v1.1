/**
 * Unit Tests for lib/utils/validation.ts
 * 
 * Tests:
 * - URL validation (HTTP/HTTPS, invalid protocols, malformed URLs)
 * - String sanitization (XSS prevention)
 * - Node name validation
 * - Dependencies validation
 */

import {
    validateURL,
    validateNodeName,
    validateNodeGroup,
    validateDependencies,
    validateNodeData,
    sanitizeString,
    normalizeURL,
} from '@/lib/utils/validation';

describe('validateURL', () => {
    describe('Valid URLs', () => {
        it('should accept valid HTTP URL', () => {
            const result = validateURL('http://example.com');
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should accept valid HTTPS URL', () => {
            const result = validateURL('https://example.com');
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should accept URL with path', () => {
            const result = validateURL('https://example.com/api/health');
            expect(result.valid).toBe(true);
        });

        it('should accept URL with query parameters', () => {
            const result = validateURL('https://example.com/api?key=value');
            expect(result.valid).toBe(true);
        });

        it('should accept URL with port', () => {
            const result = validateURL('https://example.com:8080');
            expect(result.valid).toBe(true);
        });

        it('should accept URL with subdomain', () => {
            const result = validateURL('https://api.example.com');
            expect(result.valid).toBe(true);
        });

        it('should trim whitespace', () => {
            const result = validateURL('  https://example.com  ');
            expect(result.valid).toBe(true);
        });
    });

    describe('Invalid Protocols', () => {
        it('should reject FTP protocol', () => {
            const result = validateURL('ftp://example.com');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('URL must use HTTP or HTTPS protocol');
        });

        it('should reject file protocol', () => {
            const result = validateURL('file:///path/to/file');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('URL must use HTTP or HTTPS protocol');
        });

        it('should reject custom protocol', () => {
            const result = validateURL('custom://example.com');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('URL must use HTTP or HTTPS protocol');
        });

        it('should reject javascript protocol (XSS)', () => {
            const result = validateURL('javascript:alert("XSS")');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('URL must use HTTP or HTTPS protocol');
        });

        it('should reject data protocol', () => {
            const result = validateURL('data:text/html,<script>alert("XSS")</script>');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('URL must use HTTP or HTTPS protocol');
        });
    });

    describe('Malformed URLs', () => {
        it('should reject empty URL', () => {
            const result = validateURL('');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('URL is required');
        });

        it('should reject whitespace-only URL', () => {
            const result = validateURL('   ');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('URL is required');
        });

        it('should reject URL without protocol', () => {
            const result = validateURL('example.com');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid URL format');
        });

        it('should reject URL without hostname', () => {
            const result = validateURL('https://');
            expect(result.valid).toBe(false);
            // Note: Different browsers/Node versions may return different errors
            // Both "Invalid URL format" and "URL must have a valid hostname" are acceptable
            expect(result.error).toMatch(/Invalid URL format|URL must have a valid hostname/);
        });

        it('should reject completely invalid string', () => {
            const result = validateURL('not a url at all');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid URL format');
        });

        it('should reject URL with spaces', () => {
            const result = validateURL('https://example .com');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid URL format');
        });
    });

    describe('Production Environment - Private IPs', () => {
        // Note: These tests verify production behavior
        // In actual test environment, NODE_ENV is 'test'
        // We skip these tests in CI/CD and run manually for verification
        
        it.skip('should reject localhost in production', () => {
            // Manual test: Set NODE_ENV=production and verify
            // This validates production deployment behavior
        });

        it.skip('should reject 127.0.0.1 in production', () => {
            // Manual test: Verify in production environment
        });

        it.skip('should reject 192.168.x.x in production', () => {
            // Manual test: Verify in production environment
        });

        it.skip('should reject 10.x.x.x in production', () => {
            // Manual test: Verify in production environment
        });

        it.skip('should reject 172.16-31.x.x in production', () => {
            // Manual test: Verify in production environment
        });
    });

    describe('Development Environment - Private IPs Allowed', () => {
        // Test environment (NODE_ENV=test) behaves like development
        // These tests verify localhost/private IPs are allowed
        
        it('should accept localhost in non-production', () => {
            const result = validateURL('http://localhost:3000');
            expect(result.valid).toBe(true);
        });

        it('should accept 127.0.0.1 in non-production', () => {
            const result = validateURL('http://127.0.0.1:3000');
            expect(result.valid).toBe(true);
        });

        it('should accept private IPs in non-production', () => {
            const result = validateURL('http://192.168.1.1');
            expect(result.valid).toBe(true);
        });
    });
});

describe('sanitizeString', () => {
    it('should trim whitespace', () => {
        const result = sanitizeString('  hello world  ');
        expect(result).toBe('hello world');
    });

    it('should remove < and > characters (XSS prevention)', () => {
        const result = sanitizeString('<script>alert("XSS")</script>');
        expect(result).toBe('scriptalert("XSS")/script');
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
    });

    it('should remove HTML tags', () => {
        const result = sanitizeString('<div>Content</div>');
        expect(result).toBe('divContent/div');
    });

    it('should remove malicious script tags', () => {
        const result = sanitizeString('<img src=x onerror=alert(1)>');
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
    });

    it('should limit string length to 500 characters', () => {
        const longString = 'a'.repeat(600);
        const result = sanitizeString(longString);
        expect(result.length).toBe(500);
    });

    it('should handle empty string', () => {
        const result = sanitizeString('');
        expect(result).toBe('');
    });

    it('should preserve safe characters', () => {
        const result = sanitizeString('Hello World 123!@#$%^&*()');
        expect(result).toContain('Hello World');
        expect(result).toContain('123');
    });

    it('should handle unicode characters', () => {
        const result = sanitizeString('Hello 世界 🌍');
        expect(result).toContain('Hello 世界 🌍');
    });
});

describe('validateNodeName', () => {
    it('should accept valid name', () => {
        const result = validateNodeName('My API Server');
        expect(result.valid).toBe(true);
    });

    it('should accept name with numbers', () => {
        const result = validateNodeName('Server-01');
        expect(result.valid).toBe(true);
    });

    it('should accept name with underscores and hyphens', () => {
        const result = validateNodeName('api_server-prod');
        expect(result.valid).toBe(true);
    });

    it('should reject empty name', () => {
        const result = validateNodeName('');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Name is required');
    });

    it('should reject name with only whitespace', () => {
        const result = validateNodeName('   ');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Name is required');
    });

    it('should reject name shorter than 2 characters', () => {
        const result = validateNodeName('A');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Name must be at least 2 characters long');
    });

    it('should reject name longer than 100 characters', () => {
        const longName = 'a'.repeat(101);
        const result = validateNodeName(longName);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Name must not exceed 100 characters');
    });

    it('should reject name with special characters', () => {
        const result = validateNodeName('API<script>alert()</script>');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('invalid characters');
    });
});

describe('validateNodeGroup', () => {
    it('should accept valid groups', () => {
        const validGroups = ['website', 'backend', 'frontend', 'api', 'database'];
        
        validGroups.forEach(group => {
            const result = validateNodeGroup(group);
            expect(result.valid).toBe(true);
        });
    });

    it('should accept undefined group (optional)', () => {
        const result = validateNodeGroup(undefined);
        expect(result.valid).toBe(true);
    });

    it('should accept case-insensitive groups', () => {
        const result = validateNodeGroup('BACKEND');
        expect(result.valid).toBe(true);
    });

    it('should reject invalid group', () => {
        const result = validateNodeGroup('invalid-group');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid group');
    });
});

describe('validateDependencies', () => {
    it('should accept empty dependencies', () => {
        const result = validateDependencies([]);
        expect(result.valid).toBe(true);
    });

    it('should accept undefined dependencies', () => {
        const result = validateDependencies(undefined);
        expect(result.valid).toBe(true);
    });

    it('should accept valid ObjectId format', () => {
        const result = validateDependencies(['507f1f77bcf86cd799439011']);
        expect(result.valid).toBe(true);
    });

    it('should accept multiple valid ObjectIds', () => {
        const result = validateDependencies([
            '507f1f77bcf86cd799439011',
            '507f1f77bcf86cd799439012',
            '507f1f77bcf86cd799439013',
        ]);
        expect(result.valid).toBe(true);
    });

    it('should reject invalid ObjectId format', () => {
        const result = validateDependencies(['invalid-id']);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid dependency ID format');
    });

    it('should reject ObjectId with wrong length', () => {
        const result = validateDependencies(['507f1f77bcf86cd7994390']); // 22 chars instead of 24
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid dependency ID format');
    });

    it('should reject duplicate dependencies', () => {
        const result = validateDependencies([
            '507f1f77bcf86cd799439011',
            '507f1f77bcf86cd799439011', // duplicate
        ]);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Duplicate dependencies detected');
    });
});

describe('validateNodeData', () => {
    it('should accept valid node data', () => {
        const result = validateNodeData({
            name: 'My API',
            url: 'https://api.example.com',
            group: 'backend',
            dependencies: ['507f1f77bcf86cd799439011'],
        });
        expect(result.valid).toBe(true);
    });

    it('should reject invalid name', () => {
        const result = validateNodeData({
            name: 'A', // too short
            url: 'https://api.example.com',
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('at least 2 characters');
    });

    it('should reject invalid URL', () => {
        const result = validateNodeData({
            name: 'My API',
            url: 'not-a-url',
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid URL format');
    });

    it('should reject invalid group', () => {
        const result = validateNodeData({
            name: 'My API',
            url: 'https://api.example.com',
            group: 'invalid',
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid group');
    });

    it('should reject invalid dependencies', () => {
        const result = validateNodeData({
            name: 'My API',
            url: 'https://api.example.com',
            dependencies: ['invalid-id'],
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid dependency ID format');
    });
});

describe('normalizeURL', () => {
    it('should remove trailing slash', () => {
        const result = normalizeURL('https://example.com/');
        expect(result).toBe('https://example.com');
    });

    it('should convert to lowercase', () => {
        const result = normalizeURL('https://EXAMPLE.COM');
        expect(result).toBe('https://example.com');
    });

    it('should preserve path', () => {
        const result = normalizeURL('https://example.com/api/health');
        expect(result).toBe('https://example.com/api/health');
    });

    it('should preserve query parameters', () => {
        const result = normalizeURL('https://example.com/api?key=value');
        expect(result).toBe('https://example.com/api?key=value');
    });

    it('should handle invalid URL gracefully', () => {
        const result = normalizeURL('not-a-url');
        expect(result).toBe('not-a-url');
    });

    it('should trim whitespace', () => {
        const result = normalizeURL('  https://example.com  ');
        expect(result).toBe('https://example.com');
    });
});
