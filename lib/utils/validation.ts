/**
 * Input Validation Utilities
 * Provides strict validation for user inputs before database operations
 * 
 * ✅ TAHAP 2 FIX: Prevent invalid data from entering the system
 */

/**
 * URL Validation Result
 */
export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validate URL format and protocol
 * 
 * @param url - URL string to validate
 * @returns Validation result with error message if invalid
 * 
 * @example
 * validateURL('https://example.com') // { valid: true }
 * validateURL('not-a-url') // { valid: false, error: 'Invalid URL format' }
 * validateURL('ftp://example.com') // { valid: false, error: 'URL must use HTTP or HTTPS protocol' }
 */
export function validateURL(url: string): ValidationResult {
    // Check if URL is empty or just whitespace
    if (!url || url.trim().length === 0) {
        return {
            valid: false,
            error: 'URL is required'
        };
    }

    // Trim whitespace
    const trimmedUrl = url.trim();

    try {
        // Parse URL using native URL API
        const parsed = new URL(trimmedUrl);
        
        // Check valid protocols (only http and https)
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return {
                valid: false,
                error: 'URL must use HTTP or HTTPS protocol'
            };
        }
        
        // Check hostname exists and is not empty
        if (!parsed.hostname || parsed.hostname.length === 0) {
            return {
                valid: false,
                error: 'URL must have a valid hostname'
            };
        }

        // Check for localhost or private IPs in production
        if (process.env.NODE_ENV === 'production') {
            const privatePatterns = [
                /^localhost$/i,
                /^127\.\d+\.\d+\.\d+$/,
                /^192\.168\.\d+\.\d+$/,
                /^10\.\d+\.\d+\.\d+$/,
                /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
            ];

            if (privatePatterns.some(pattern => pattern.test(parsed.hostname))) {
                return {
                    valid: false,
                    error: 'Cannot monitor private/localhost URLs in production'
                };
            }
        }
        
        return { valid: true };
        
    } catch (error) {
        return {
            valid: false,
            error: 'Invalid URL format'
        };
    }
}

/**
 * Validate node name
 * 
 * @param name - Node name to validate
 * @returns Validation result
 */
export function validateNodeName(name: string): ValidationResult {
    if (!name || name.trim().length === 0) {
        return {
            valid: false,
            error: 'Name is required'
        };
    }

    const trimmedName = name.trim();

    // Name length constraints
    if (trimmedName.length < 2) {
        return {
            valid: false,
            error: 'Name must be at least 2 characters long'
        };
    }

    if (trimmedName.length > 100) {
        return {
            valid: false,
            error: 'Name must not exceed 100 characters'
        };
    }

    // Allow alphanumeric, spaces, hyphens, underscores, dots
    const validNamePattern = /^[a-zA-Z0-9\s\-_.]+$/;
    if (!validNamePattern.test(trimmedName)) {
        return {
            valid: false,
            error: 'Name contains invalid characters. Use only letters, numbers, spaces, hyphens, underscores, and dots'
        };
    }

    return { valid: true };
}

/**
 * Validate node group
 * 
 * @param group - Node group to validate
 * @returns Validation result
 */
export function validateNodeGroup(group?: string): ValidationResult {
    // Group is optional, default to "website" if not provided
    if (!group) {
        return { valid: true };
    }

    const validGroups = [
        'iframe',
        'video',
        'game',
        'webgl',
        'website',
        'backend',
        'frontend',
        'api',
        'database',
        'service'
    ];

    if (!validGroups.includes(group.toLowerCase())) {
        return {
            valid: false,
            error: `Invalid group. Must be one of: ${validGroups.join(', ')}`
        };
    }

    return { valid: true };
}

/**
 * Validate array of dependency IDs
 * 
 * @param dependencies - Array of MongoDB ObjectId strings
 * @returns Validation result
 */
export function validateDependencies(dependencies?: string[]): ValidationResult {
    if (!dependencies || dependencies.length === 0) {
        return { valid: true }; // Empty dependencies is valid
    }

    // Check if all dependencies are valid ObjectId format (24 hex characters)
    const objectIdPattern = /^[a-fA-F0-9]{24}$/;
    
    for (const dep of dependencies) {
        if (!objectIdPattern.test(dep)) {
            return {
                valid: false,
                error: `Invalid dependency ID format: ${dep}`
            };
        }
    }

    // Check for duplicates
    const uniqueDeps = new Set(dependencies);
    if (uniqueDeps.size !== dependencies.length) {
        return {
            valid: false,
            error: 'Duplicate dependencies detected'
        };
    }

    return { valid: true };
}

/**
 * Comprehensive node validation
 * Validates all fields of a node creation request
 * 
 * @param data - Node data to validate
 * @returns Validation result
 */
export function validateNodeData(data: {
    name?: string;
    url?: string;
    group?: string;
    dependencies?: string[];
}): ValidationResult {
    // Validate name
    const nameValidation = validateNodeName(data.name || '');
    if (!nameValidation.valid) {
        return nameValidation;
    }

    // Validate URL
    const urlValidation = validateURL(data.url || '');
    if (!urlValidation.valid) {
        return urlValidation;
    }

    // Validate group
    const groupValidation = validateNodeGroup(data.group);
    if (!groupValidation.valid) {
        return groupValidation;
    }

    // Validate dependencies
    const depsValidation = validateDependencies(data.dependencies);
    if (!depsValidation.valid) {
        return depsValidation;
    }

    return { valid: true };
}

/**
 * Sanitize string input (trim and escape HTML)
 * 
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove < and > to prevent XSS
        .substring(0, 500); // Limit length
}

/**
 * Normalize URL for comparison
 * Removes trailing slashes and converts to lowercase
 * 
 * @param url - URL to normalize
 * @returns Normalized URL
 */
export function normalizeURL(url: string): string {
    try {
        const parsed = new URL(url.trim());
        // Reconstruct URL without trailing slash
        return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/$/, '')}${parsed.search}`.toLowerCase();
    } catch {
        return url.trim().replace(/\/$/, '').toLowerCase();
    }
}
