/**
 * Jest Configuration for Next.js + TypeScript + React Testing Library
 * 
 * Configured for:
 * - Next.js 14+ App Router
 * - TypeScript support
 * - React Testing Library
 * - Three.js mocking (canvas/WebGL)
 * - Path aliases (@/)
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
    dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
    // Setup files to run before each test
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    
    // Test environment
    testEnvironment: 'jest-environment-jsdom',
    
    // Module name mapper for path aliases
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@/components/(.*)$': '<rootDir>/components/$1',
        '^@/lib/(.*)$': '<rootDir>/lib/$1',
        '^@/types$': '<rootDir>/types/index.ts',
        '^@/app/(.*)$': '<rootDir>/app/$1',
        
        // Mock static assets
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/__mocks__/fileMock.js',
    },
    
    // Coverage configuration
    collectCoverageFrom: [
        'lib/**/*.{js,jsx,ts,tsx}',
        'components/**/*.{js,jsx,ts,tsx}',
        'app/**/*.{js,jsx,ts,tsx}',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/.next/**',
        '!**/coverage/**',
        '!**/jest.config.js',
        '!**/next.config.js',
    ],
    
    // Test match patterns
    testMatch: [
        '**/__tests__/**/*.[jt]s?(x)',
        '**/?(*.)+(spec|test).[jt]s?(x)',
    ],
    
    // Transform files
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['@swc/jest', {
            jsc: {
                transform: {
                    react: {
                        runtime: 'automatic',
                    },
                },
            },
        }],
    },
    
    // Module file extensions
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    
    // Ignore patterns
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/.next/',
    ],
    
    // Transform ignore patterns (don't transform node_modules except specific packages)
    transformIgnorePatterns: [
        'node_modules/(?!(three|@react-three|@mediapipe|d3-force|d3-quadtree|d3-dispatch|d3-timer)/)',
    ],
    
    // Globals
    globals: {
        'ts-jest': {
            tsconfig: {
                jsx: 'react-jsx',
            },
        },
    },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
