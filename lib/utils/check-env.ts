/**
 * ✅ TAHAP 7: Environment Variable Validation Script
 * 
 * Script untuk memvalidasi environment variables sebelum aplikasi berjalan.
 * Akan melempar Error (Hard Fail) jika variabel kritis tidak ditemukan.
 * Memberikan Warning untuk variabel optional.
 * 
 * USAGE:
 * - Dipanggil otomatis saat `npm start` atau `npm run build`
 * - Bisa juga dipanggil manual: `node scripts/check-env.js`
 * 
 * INTEGRATION:
 * - Add to instrumentation.ts (Next.js 14+)
 * - Or add to next.config.js
 * - Or add as prestart script in package.json
 * 
 * @see .env.example
 */

/**
 * Environment Variable Configuration
 * Defines required and optional variables with validation rules
 */
interface EnvVarConfig {
    name: string;
    required: boolean;
    description: string;
    validator?: (value: string) => { valid: boolean; error?: string };
    default?: string;
}

const ENV_CONFIG: EnvVarConfig[] = [
    // ============================================
    // 🔴 CRITICAL VARIABLES (HARD FAIL IF MISSING)
    // ============================================
    {
        name: 'MONGODB_URI',
        required: true,
        description: 'MongoDB connection string',
        validator: (value) => {
            if (!value.startsWith('mongodb://') && !value.startsWith('mongodb+srv://')) {
                return {
                    valid: false,
                    error: 'Must start with mongodb:// or mongodb+srv://',
                };
            }
            return { valid: true };
        },
    },
    {
        name: 'NEXTAUTH_SECRET',
        required: false, // Only required if auth is enabled
        description: 'NextAuth secret key for JWT signing',
        validator: (value) => {
            if (value && value.length < 32) {
                return {
                    valid: false,
                    error: 'Must be at least 32 characters for security',
                };
            }
            return { valid: true };
        },
    },
    {
        name: 'NEXTAUTH_URL',
        required: false, // Only required if auth is enabled
        description: 'NextAuth base URL',
        validator: (value) => {
            if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                return {
                    valid: false,
                    error: 'Must start with http:// or https://',
                };
            }
            return { valid: true };
        },
    },

    // ============================================
    // 🟡 RECOMMENDED VARIABLES (WARNING IF MISSING)
    // ============================================
    {
        name: 'LOG_LEVEL',
        required: false,
        description: 'Logging level (DEBUG|INFO|WARN|ERROR)',
        default: 'INFO',
        validator: (value) => {
            const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
            if (value && !validLevels.includes(value.toUpperCase())) {
                return {
                    valid: false,
                    error: `Must be one of: ${validLevels.join(', ')}`,
                };
            }
            return { valid: true };
        },
    },
    {
        name: 'NODE_ENV',
        required: false,
        description: 'Node environment (development|production|test)',
        default: 'development',
        validator: (value) => {
            const validEnvs = ['development', 'production', 'test'];
            if (value && !validEnvs.includes(value)) {
                return {
                    valid: false,
                    error: `Must be one of: ${validEnvs.join(', ')}`,
                };
            }
            return { valid: true };
        },
    },

    // ============================================
    // 🟢 OPTIONAL VARIABLES (INFO ONLY)
    // ============================================
    {
        name: 'GOOGLE_API_KEY',
        required: false,
        description: 'Google Sheets API key (optional feature)',
    },
    {
        name: 'GOOGLE_SERVICE_ACCOUNT_EMAIL',
        required: false,
        description: 'Google Service Account email (optional feature)',
    },
    {
        name: 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
        required: false,
        description: 'Google Service Account private key (optional feature)',
    },
    {
        name: 'GOOGLE_SPREADSHEET_ID',
        required: false,
        description: 'Google Spreadsheet ID (optional feature)',
    },
    {
        name: 'GOOGLE_SHEET_NAME',
        required: false,
        description: 'Google Sheet name (optional feature)',
        default: 'Hasil',
    },
    {
        name: 'HEALTH_CHECK_INTERVAL',
        required: false,
        description: 'Health check interval in milliseconds',
        default: '30000',
    },
    {
        name: 'HEALTH_CHECK_TIMEOUT',
        required: false,
        description: 'Health check timeout in milliseconds',
        default: '10000',
    },
    {
        name: 'PORT',
        required: false,
        description: 'Server port',
        default: '3000',
    },
];

/**
 * Validation Result Types
 */
interface ValidationResult {
    success: boolean;
    errors: string[];
    warnings: string[];
    info: string[];
}

/**
 * Main validation function
 */
export function validateEnvironment(): ValidationResult {
    const result: ValidationResult = {
        success: true,
        errors: [],
        warnings: [],
        info: [],
    };

    console.log('🔍 Validating environment variables...\n');

    // Check each configuration
    for (const config of ENV_CONFIG) {
        const value = process.env[config.name];

        // Check if required variable is missing
        if (config.required && !value) {
            result.success = false;
            result.errors.push(
                `❌ CRITICAL: ${config.name} is required but not set\n` +
                `   Description: ${config.description}\n` +
                `   See .env.example for reference`
            );
            continue;
        }

        // If value exists, run validator
        if (value && config.validator) {
            const validation = config.validator(value);
            if (!validation.valid) {
                result.success = false;
                result.errors.push(
                    `❌ INVALID: ${config.name}\n` +
                    `   Error: ${validation.error}\n` +
                    `   Current value: ${value.substring(0, 20)}...`
                );
                continue;
            }
        }

        // Check if optional but recommended variable is missing
        if (!config.required && !value && config.default) {
            result.warnings.push(
                `⚠️  ${config.name} not set, using default: ${config.default}\n` +
                `   Description: ${config.description}`
            );
        }

        // Info for optional variables without defaults
        if (!config.required && !value && !config.default) {
            result.info.push(
                `ℹ️  ${config.name} not set (optional)\n` +
                `   Description: ${config.description}`
            );
        }

        // Success message for set variables
        if (value) {
            const displayValue = config.name.includes('SECRET') || config.name.includes('KEY')
                ? '***hidden***'
                : value.length > 40
                ? value.substring(0, 40) + '...'
                : value;

            console.log(`✅ ${config.name}: ${displayValue}`);
        }
    }

    console.log('\n' + '='.repeat(60));

    // Print errors
    if (result.errors.length > 0) {
        console.error('\n🔴 CRITICAL ERRORS:\n');
        result.errors.forEach((error) => console.error(error + '\n'));
    }

    // Print warnings
    if (result.warnings.length > 0) {
        console.warn('\n🟡 WARNINGS:\n');
        result.warnings.forEach((warning) => console.warn(warning + '\n'));
    }

    // Print info
    if (result.info.length > 0 && process.env.NODE_ENV === 'development') {
        console.info('\nℹ️  INFO:\n');
        result.info.forEach((info) => console.info(info + '\n'));
    }

    console.log('='.repeat(60) + '\n');

    return result;
}

/**
 * Check for common misconfigurations
 */
export function checkCommonMisconfigurations(): string[] {
    const issues: string[] = [];

    // Check if MongoDB URI is localhost in production
    if (
        process.env.NODE_ENV === 'production' &&
        process.env.MONGODB_URI?.includes('localhost')
    ) {
        issues.push(
            '⚠️  WARNING: MONGODB_URI points to localhost in production environment'
        );
    }

    // Check if NEXTAUTH_URL is localhost in production
    if (
        process.env.NODE_ENV === 'production' &&
        process.env.NEXTAUTH_URL?.includes('localhost')
    ) {
        issues.push(
            '⚠️  WARNING: NEXTAUTH_URL points to localhost in production environment'
        );
    }

    // Check if using both Google API key and Service Account
    if (
        process.env.GOOGLE_API_KEY &&
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    ) {
        issues.push(
            'ℹ️  INFO: Both GOOGLE_API_KEY and Service Account are set. Service Account will be used.'
        );
    }

    // Check if LOG_LEVEL is DEBUG in production
    if (
        process.env.NODE_ENV === 'production' &&
        process.env.LOG_LEVEL?.toUpperCase() === 'DEBUG'
    ) {
        issues.push(
            '⚠️  WARNING: LOG_LEVEL=DEBUG in production may impact performance'
        );
    }

    return issues;
}

/**
 * Run validation and exit with error code if validation fails
 * This function should be called at application startup
 */
export function checkEnvironmentOrExit(): void {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 ENVIRONMENT VALIDATION - TAHAP 7');
    console.log('='.repeat(60) + '\n');

    // Run main validation
    const result = validateEnvironment();

    // Check for common misconfigurations
    const misconfigurations = checkCommonMisconfigurations();
    if (misconfigurations.length > 0) {
        console.log('\n🔧 CONFIGURATION CHECKS:\n');
        misconfigurations.forEach((issue) => console.log(issue));
        console.log('');
    }

    // Exit with error if validation failed
    if (!result.success) {
        console.error('❌ Environment validation FAILED. Please fix the errors above.\n');
        console.error('📖 Refer to .env.example for proper configuration.\n');
        process.exit(1);
    }

    // Success message
    console.log('✅ Environment validation PASSED\n');
    
    if (result.warnings.length > 0) {
        console.log('⚠️  Some warnings detected. Application will run with defaults.\n');
    }

    console.log('='.repeat(60) + '\n');
}

// If running as standalone script
if (require.main === module) {
    checkEnvironmentOrExit();
}
