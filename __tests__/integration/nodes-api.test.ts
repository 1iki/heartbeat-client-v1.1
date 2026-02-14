/**
 * ✅ TAHAP 7: Integration Test for API Nodes Route
 * 
 * Integration test untuk menguji API route dengan simulasi HTTP request/response
 * yang sebenarnya, bukan mock yang terlalu terisolasi.
 * 
 * CRITICAL SCENARIOS:
 * 1. Valid POST request -> 201 dengan format APIResponse yang benar
 * 2. Validation Error -> 400 dengan error message spesifik dari zod
 * 3. Refactoring check -> handleAPIError mengembalikan JSON standar
 * 
 * @jest-environment node
 * 
 * @see app/api/nodes/route.ts
 * @see lib/utils/api-helpers.ts
 */

import { APIResponse } from '@/lib/utils/api-helpers';

// Mock dependencies before imports
jest.mock('@/lib/db/mongoose');
jest.mock('@/lib/db/models/Node');
jest.mock('@/lib/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

// Import after mocks
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/nodes/route';
import NodeModel from '@/lib/db/models/Node';
import connectDB from '@/lib/db/mongoose';

describe('Integration Test: API /api/nodes', () => {
    const MONGODB_URI_BACKUP = process.env.MONGODB_URI;

    beforeAll(() => {
        // Ensure MONGODB_URI is set for tests
        process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    });

    afterAll(() => {
        // Restore original env
        process.env.MONGODB_URI = MONGODB_URI_BACKUP;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        (connectDB as jest.Mock).mockResolvedValue(true);
    });

    describe('POST /api/nodes - Integration Scenarios', () => {
        /**
         * SCENARIO 1: Valid POST Request
         * Memastikan endpoint mengembalikan status 201 dengan format APIResponse yang benar
         */
        it('should return 201 with proper APIResponse format for valid data', async () => {
            // Arrange: Mock database operations
            (NodeModel.findOne as jest.Mock).mockResolvedValue(null); // No existing node
            (NodeModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]), // No URL conflict
            });
            (NodeModel.validateDependencies as jest.Mock).mockResolvedValue(true);
            
            const mockCreatedNode = {
                _id: '507f1f77bcf86cd799439011',
                name: 'Test API',
                url: 'https://api.example.com',
                group: 'api',
                dependencies: [],
                status: 'FRESH',
                latency: 0,
                history: [],
                lastChecked: new Date('2026-02-09T10:00:00Z'),
                authConfig: undefined,
            };
            
            (NodeModel.create as jest.Mock).mockResolvedValue(mockCreatedNode);

            // Act: Simulate HTTP POST request
            const payload = {
                name: 'Test API',
                url: 'https://api.example.com',
                group: 'api',
                dependencies: [],
            };

            const request = new NextRequest('http://localhost:3000/api/nodes', {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const response = await POST(request);

            // Assert: Response structure
            expect(response.status).toBe(201);

            const responseData: APIResponse = await response.json();

            // ✅ CRITICAL: Validate APIResponse schema
            expect(responseData).toHaveProperty('success');
            expect(responseData).toHaveProperty('data');
            expect(responseData).toHaveProperty('message');
            expect(responseData.success).toBe(true);

            // ✅ Validate data structure matches NodeData interface
            expect(responseData.data).toMatchObject({
                id: '507f1f77bcf86cd799439011',
                name: 'Test API',
                url: 'https://api.example.com',
                group: 'api',
                status: 'FRESH',
                latency: 0,
            });

            expect(responseData.data.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO date format
        });

        /**
         * SCENARIO 2: Validation Error
         * Memastikan endpoint mengembalikan 400 dengan error message yang spesifik
         */
        it('should return 400 with specific error message when URL is missing', async () => {
            // Act: Send payload without required 'url' field
            const invalidPayload = {
                name: 'Test API',
                group: 'api',
                // url is MISSING - should trigger validation error
            };

            const request = new NextRequest('http://localhost:3000/api/nodes', {
                method: 'POST',
                body: JSON.stringify(invalidPayload),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const response = await POST(request);

            // Assert: 400 status
            expect(response.status).toBe(400);

            const responseData: APIResponse = await response.json();

            // ✅ CRITICAL: Validate error response structure
            expect(responseData.success).toBe(false);
            expect(responseData).toHaveProperty('error');
            expect(typeof responseData.error).toBe('string');
            
            // ✅ Error message should mention the missing field
            expect(responseData.error).toMatch(/url/i);
        });

        /**
         * SCENARIO 3: Invalid URL Format
         */
        it('should return 400 when URL format is invalid', async () => {
            // Act: Send payload with invalid URL
            const invalidPayload = {
                name: 'Test API',
                url: 'not-a-valid-url',
                group: 'api',
            };

            const request = new NextRequest('http://localhost:3000/api/nodes', {
                method: 'POST',
                body: JSON.stringify(invalidPayload),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const response = await POST(request);

            // Assert: 400 status
            expect(response.status).toBe(400);

            const responseData: APIResponse = await response.json();
            expect(responseData.success).toBe(false);
            expect(responseData.error).toMatch(/invalid|url/i);
        });

        /**
         * SCENARIO 4: Duplicate Name Conflict
         */
        it('should return 409 when node name already exists', async () => {
            // Arrange: Mock existing node with same name
            const existingNode = {
                _id: '507f1f77bcf86cd799439011',
                name: 'Existing API',
                url: 'https://existing.com',
            };

            (NodeModel.findOne as jest.Mock).mockResolvedValue(existingNode);

            // Act: Try to create node with duplicate name
            const payload = {
                name: 'Existing API',
                url: 'https://new.com',
                group: 'api',
            };

            const request = new NextRequest('http://localhost:3000/api/nodes', {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const response = await POST(request);

            // Assert: 409 Conflict status
            expect(response.status).toBe(409);

            const responseData: APIResponse = await response.json();
            expect(responseData.success).toBe(false);
            expect(responseData.error).toMatch(/already exists/i);
        });

        /**
         * SCENARIO 5: Refactoring Check - handleAPIError Integration
         * Memastikan bahwa helper handleAPIError menangkap error internal
         * dan mengembalikan JSON standar, bukan crash HTML dari Next.js
         */
        it('should handle internal errors gracefully with handleAPIError', async () => {
            // Arrange: Force database error
            const dbError = new Error('MongoDB connection failed');
            (connectDB as jest.Mock).mockRejectedValue(dbError);

            // Act: Send valid request but DB throws error
            const payload = {
                name: 'Test API',
                url: 'https://api.example.com',
                group: 'api',
            };

            const request = new NextRequest('http://localhost:3000/api/nodes', {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const response = await POST(request);

            // Assert: Should return JSON error, not HTML crash
            expect(response.status).toBeGreaterThanOrEqual(500);
            expect(response.status).toBeLessThan(600);

            const contentType = response.headers.get('content-type');
            expect(contentType).toContain('application/json');

            const responseData: APIResponse = await response.json();

            // ✅ CRITICAL: Must be valid APIResponse format
            expect(responseData).toHaveProperty('success');
            expect(responseData.success).toBe(false);
            expect(responseData).toHaveProperty('error');
            expect(typeof responseData.error).toBe('string');
        });
    });

    describe('GET /api/nodes - Integration Scenarios', () => {
        /**
         * SCENARIO 6: Successful GET with Empty Database
         */
        it('should return 200 with empty array when no nodes exist', async () => {
            // Arrange: Mock empty database
            (NodeModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            });

            // Act: Send GET request
            const request = new NextRequest('http://localhost:3000/api/nodes', {
                method: 'GET',
            });

            const response = await GET(request);

            // Assert: 200 status with empty data
            expect(response.status).toBe(200);

            const responseData: APIResponse = await response.json();
            expect(responseData.success).toBe(true);
            expect(responseData.data).toEqual([]);
            expect(responseData.count).toBe(0);
        });

        /**
         * SCENARIO 7: Successful GET with Multiple Nodes
         */
        it('should return 200 with array of nodes and count', async () => {
            // Arrange: Mock database with nodes
            const mockNodes = [
                {
                    _id: '507f1f77bcf86cd799439011',
                    name: 'API 1',
                    url: 'https://api1.com',
                    group: 'api',
                    dependencies: [],
                    status: 'STABLE',
                    latency: 120,
                    history: [],
                    lastChecked: new Date('2026-02-09T10:00:00Z'),
                    httpStatus: 200,
                    statusMessage: null,
                },
                {
                    _id: '507f1f77bcf86cd799439012',
                    name: 'API 2',
                    url: 'https://api2.com',
                    group: 'backend',
                    dependencies: [],
                    status: 'DOWN',
                    latency: 0,
                    history: [],
                    lastChecked: new Date('2026-02-09T10:00:00Z'),
                    httpStatus: 500,
                    statusMessage: 'Internal Server Error',
                },
            ];

            (NodeModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockNodes),
            });

            // Act: Send GET request
            const request = new NextRequest('http://localhost:3000/api/nodes', {
                method: 'GET',
            });

            const response = await GET(request);

            // Assert: 200 status with data
            expect(response.status).toBe(200);

            const responseData: APIResponse = await response.json();
            expect(responseData.success).toBe(true);
            expect(responseData.data).toHaveLength(2);
            expect(responseData.count).toBe(2);

            // ✅ Validate data transformation (ObjectId -> string)
            expect(responseData.data[0].id).toBe('507f1f77bcf86cd799439011');
            expect(responseData.data[0].name).toBe('API 1');
        });

        /**
         * SCENARIO 8: GET when MongoDB is not configured
         */
        it('should return graceful response when MONGODB_URI is not set', async () => {
            // Arrange: Temporarily remove MONGODB_URI
            const originalUri = process.env.MONGODB_URI;
            delete process.env.MONGODB_URI;

            // Act: Send GET request
            const request = new NextRequest('http://localhost:3000/api/nodes', {
                method: 'GET',
            });

            const response = await GET(request);

            // Assert: Should return 200 with empty data and message
            expect(response.status).toBe(200);

            const responseData: APIResponse = await response.json();
            expect(responseData.success).toBe(true);
            expect(responseData.data).toEqual([]);
            expect(responseData.count).toBe(0);
            expect(responseData.message).toMatch(/MongoDB not configured/i);

            // Restore env
            process.env.MONGODB_URI = originalUri;
        });
    });

    describe('Error Response Format Validation', () => {
        /**
         * SCENARIO 9: All error responses must be JSON
         * No HTML error pages should leak through
         */
        it('should always return JSON even on unexpected errors', async () => {
            // Arrange: Force unexpected error type
            (connectDB as jest.Mock).mockImplementation(() => {
                throw { weird: 'error', object: true }; // Not an Error instance
            });

            // Act: Send request
            const request = new NextRequest('http://localhost:3000/api/nodes', {
                method: 'POST',
                body: JSON.stringify({ name: 'Test', url: 'https://test.com' }),
                headers: { 'Content-Type': 'application/json' },
            });

            const response = await POST(request);

            // Assert: Must still return valid JSON
            const contentType = response.headers.get('content-type');
            expect(contentType).toContain('application/json');

            const responseData: APIResponse = await response.json();
            expect(responseData).toHaveProperty('success');
            expect(responseData.success).toBe(false);
        });
    });
});
