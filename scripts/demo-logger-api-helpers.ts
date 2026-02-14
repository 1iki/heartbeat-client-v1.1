/**
 * DEMO: Logger & API Helpers Usage
 * 
 * This file demonstrates all patterns from ISU #12 and #13
 * Run: `npx ts-node scripts/demo-logger-api-helpers.ts`
 */

import { logger } from '../lib/utils/logger';
import { 
    handleAPIError, 
    successResponse, 
    validationError, 
    conflictError,
    notFoundError,
    databaseError
} from '../lib/utils/api-helpers';

// ============================================
// DEMO 1: Logger Usage
// ============================================

console.log('\n========================================');
console.log('DEMO 1: Logger Usage');
console.log('========================================\n');

// Basic logging
logger.debug('This is a DEBUG message', { detail: 'Only shows when LOG_LEVEL=DEBUG' });
logger.info('Application started successfully');
logger.warn('Deprecated API endpoint used', { endpoint: '/api/v1/users' });

// Error logging with stack trace
try {
    throw new Error('Database connection failed');
} catch (error) {
    logger.error('Critical error occurred', error as Error, {
        database: 'mongodb',
        host: 'localhost:27017'
    });
}

// Logging with rich context
logger.info('User logged in', {
    userId: '65abc123',
    email: 'user@example.com',
    timestamp: new Date().toISOString(),
    ipAddress: '192.168.1.1'
});

// Specialized logging: Health check
logger.healthCheck('https://api.example.com', {
    status: 'STABLE',
    latency: 120,
    httpStatus: 200
});

logger.healthCheck('https://down-service.com', {
    status: 'DOWN',
    latency: 5000,
    httpStatus: 503
}, { nodeId: '65abc456', nodeName: 'Payment API' });

// Specialized logging: API request
logger.apiRequest('GET', '/api/nodes', 200, 45);
logger.apiRequest('POST', '/api/users', 201, 120);
logger.apiRequest('DELETE', '/api/nodes/123', 404, 15);

// ============================================
// DEMO 2: API Helpers - Success Responses
// ============================================

console.log('\n========================================');
console.log('DEMO 2: API Helpers - Success Responses');
console.log('========================================\n');

// Simple success response
const userData = { id: '123', name: 'John Doe', email: 'john@example.com' };
const successResp1 = successResponse(userData);
console.log('Simple success:', await successResp1.json());

// Success with message
const nodeData = { id: '456', name: 'API Server', url: 'https://api.example.com' };
const successResp2 = successResponse(nodeData, 'Node created successfully', 201);
console.log('\nSuccess with message:', await successResp2.json());

// Success with array (auto-adds count)
const nodes = [
    { id: '1', name: 'Node 1' },
    { id: '2', name: 'Node 2' },
    { id: '3', name: 'Node 3' }
];
const successResp3 = successResponse(nodes);
console.log('\nSuccess with array:', await successResp3.json());

// ============================================
// DEMO 3: API Helpers - Error Responses
// ============================================

console.log('\n========================================');
console.log('DEMO 3: API Helpers - Error Responses');
console.log('========================================\n');

// Validation error
const validationResp = validationError('Email is required', 'email');
console.log('Validation error:', await validationResp.json(), '(Status:', validationResp.status, ')');

// Not found error
const notFoundResp = notFoundError('Node', '65abc123');
console.log('\nNot found error:', await notFoundResp.json(), '(Status:', notFoundResp.status, ')');

// Conflict error
const conflictResp = conflictError('Node with this URL already exists', {
    url: 'https://duplicate.com',
    existingNodeId: '65abc456'
});
console.log('\nConflict error:', await conflictResp.json(), '(Status:', conflictResp.status, ')');

// Database error
const dbResp = databaseError();
console.log('\nDatabase error:', await dbResp.json(), '(Status:', dbResp.status, ')');

// ============================================
// DEMO 4: API Helpers - Error Classification
// ============================================

console.log('\n========================================');
console.log('DEMO 4: API Helpers - Error Classification');
console.log('========================================\n');

// Validation error (auto-classified to 400)
try {
    throw new Error('Validation failed: email is invalid');
} catch (error) {
    const resp = handleAPIError(error, { endpoint: 'POST /api/users' });
    console.log('Auto-classified validation:', await resp.json(), '(Status:', resp.status, ')');
}

// Not found error (auto-classified to 404)
try {
    throw new Error('User not found in database');
} catch (error) {
    const resp = handleAPIError(error, { endpoint: 'GET /api/users/123' });
    console.log('\nAuto-classified not found:', await resp.json(), '(Status:', resp.status, ')');
}

// Conflict error (auto-classified to 409)
try {
    throw new Error('User with this email already exists');
} catch (error) {
    const resp = handleAPIError(error, { endpoint: 'POST /api/users' });
    console.log('\nAuto-classified conflict:', await resp.json(), '(Status:', resp.status, ')');
}

// Database error (auto-classified to 503)
try {
    throw new Error('MongoDB connection timeout');
} catch (error) {
    const resp = handleAPIError(error, { endpoint: 'GET /api/nodes' });
    console.log('\nAuto-classified database:', await resp.json(), '(Status:', resp.status, ')');
}

// Internal error (auto-classified to 500)
try {
    throw new Error('Unexpected error occurred');
} catch (error) {
    const resp = handleAPIError(error, { endpoint: 'POST /api/process' });
    console.log('\nAuto-classified internal:', await resp.json(), '(Status:', resp.status, ')');
}

// ============================================
// DEMO 5: Real-World API Route Pattern
// ============================================

console.log('\n========================================');
console.log('DEMO 5: Real-World API Route Pattern');
console.log('========================================\n');

// Simulated API route handler
async function simulateGetNodesRoute() {
    try {
        // Simulate database fetch
        const nodes = [
            { id: '1', name: 'Node 1', url: 'https://node1.com', status: 'STABLE', latency: 120 },
            { id: '2', name: 'Node 2', url: 'https://node2.com', status: 'DOWN', latency: 5000 },
        ];
        
        logger.info('Fetched nodes successfully', { count: nodes.length });
        return successResponse(nodes);
    } catch (error) {
        return handleAPIError(error, { endpoint: 'GET /api/nodes' });
    }
}

const getNodesResp = await simulateGetNodesRoute();
console.log('GET /api/nodes:', await getNodesResp.json());

// Simulated POST route with validation
async function simulatePostNodeRoute(body: any) {
    try {
        // Validation
        if (!body.name || body.name.trim().length === 0) {
            return validationError('Name is required', 'name');
        }
        
        if (!body.url) {
            return validationError('URL is required', 'url');
        }
        
        // Check duplicate (simulated)
        const exists = body.url === 'https://duplicate.com';
        if (exists) {
            return conflictError('Node with this URL already exists', {
                url: body.url,
                existingNodeId: '65abc789'
            });
        }
        
        // Create node (simulated)
        const newNode = {
            id: '65new123',
            name: body.name,
            url: body.url,
            status: 'FRESH',
            latency: 0
        };
        
        logger.info('Node created successfully', {
            nodeId: newNode.id,
            nodeName: newNode.name,
            url: newNode.url
        });
        
        return successResponse(newNode, 'Node created successfully', 201);
    } catch (error) {
        return handleAPIError(error, {
            endpoint: 'POST /api/nodes',
            requestBody: body
        });
    }
}

// Test successful creation
console.log('\nPOST /api/nodes (success):');
const postSuccessResp = await simulatePostNodeRoute({
    name: 'New Node',
    url: 'https://new-node.com',
    group: 'Backend'
});
console.log(await postSuccessResp.json());

// Test validation error
console.log('\nPOST /api/nodes (validation error):');
const postValidationResp = await simulatePostNodeRoute({
    name: '',
    url: 'https://test.com'
});
console.log(await postValidationResp.json());

// Test conflict error
console.log('\nPOST /api/nodes (conflict):');
const postConflictResp = await simulatePostNodeRoute({
    name: 'Duplicate',
    url: 'https://duplicate.com'
});
console.log(await postConflictResp.json());

// ============================================
// DEMO 6: Real-World Pattern - Complete Flow
// ============================================

console.log('\n========================================');
console.log('DEMO 6: Complete Real-World Flow');
console.log('========================================\n');

// Simulate complete API request lifecycle
async function completeAPIFlow() {
    console.log('📥 Incoming Request: POST /api/nodes');
    logger.info('API request started', {
        method: 'POST',
        endpoint: '/api/nodes',
        timestamp: new Date().toISOString()
    });
    
    const requestBody = {
        name: 'Production API',
        url: 'https://prod-api.example.com',
        group: 'Backend',
        authConfig: {
            provider: 'google',
            clientId: 'abc123'
        }
    };
    
    console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));
    
    try {
        // Validate required fields
        if (!requestBody.name || !requestBody.url) {
            throw new Error('Validation failed: missing required fields');
        }
        
        // Simulate database operation
        logger.info('Creating node in database', {
            nodeName: requestBody.name,
            url: requestBody.url
        });
        
        const newNode = {
            id: '65prod789',
            ...requestBody,
            status: 'FRESH',
            latency: 0,
            createdAt: new Date().toISOString()
        };
        
        logger.info('Node created successfully', {
            nodeId: newNode.id,
            nodeName: newNode.name
        });
        
        const response = successResponse(newNode, 'Node created successfully', 201);
        console.log('✅ Response:', await response.json());
        
    } catch (error) {
        logger.error('Failed to create node', error as Error, {
            endpoint: 'POST /api/nodes',
            requestBody
        });
        
        const errorResponse = handleAPIError(error, {
            endpoint: 'POST /api/nodes',
            requestBody
        });
        
        console.log('❌ Error Response:', await errorResponse.json());
    }
}

await completeAPIFlow();

// ============================================
// Summary
// ============================================

console.log('\n========================================');
console.log('DEMO COMPLETED');
console.log('========================================\n');

console.log('✅ All logger patterns demonstrated');
console.log('✅ All API helper patterns demonstrated');
console.log('✅ Error classification working correctly');
console.log('✅ Real-world patterns shown\n');

console.log('Key Takeaways:');
console.log('1. Use logger.* instead of console.* for structured logging');
console.log('2. Always include context objects for better debugging');
console.log('3. Use successResponse() for consistent response format');
console.log('4. Use specialized error helpers (validationError, conflictError, etc.)');
console.log('5. Use handleAPIError() for automatic error classification and logging\n');
