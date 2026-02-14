/**
 * API Helper Utilities
 * ✅ ISU #13: Eliminate code duplication in API routes
 * 
 * Provides standardized error handling and response formatting
 * for Next.js API routes
 */

import { NextResponse } from 'next/server';
import { logger } from './logger';
import { APIError } from '@/lib/hooks/useNodeData';

/**
 * Standard API Response Format
 */
export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    count?: number;
}

/**
 * Error Type Classification
 */
export enum ErrorType {
    VALIDATION = 'VALIDATION',
    NOT_FOUND = 'NOT_FOUND',
    CONFLICT = 'CONFLICT',
    UNAUTHORIZED = 'UNAUTHORIZED',
    DATABASE = 'DATABASE',
    NETWORK = 'NETWORK',
    INTERNAL = 'INTERNAL',
}

/**
 * Error Status Code Mapping
 */
const ERROR_STATUS_CODES: Record<ErrorType, number> = {
    [ErrorType.VALIDATION]: 400,
    [ErrorType.NOT_FOUND]: 404,
    [ErrorType.CONFLICT]: 409,
    [ErrorType.UNAUTHORIZED]: 401,
    [ErrorType.DATABASE]: 503,
    [ErrorType.NETWORK]: 503,
    [ErrorType.INTERNAL]: 500,
};

/**
 * Classify error type from error object
 */
function classifyError(error: unknown): ErrorType {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        // Validation errors
        if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
            return ErrorType.VALIDATION;
        }
        
        // Not found errors
        if (message.includes('not found') || message.includes('does not exist')) {
            return ErrorType.NOT_FOUND;
        }
        
        // Conflict errors
        if (message.includes('already exists') || message.includes('duplicate') || message.includes('conflict')) {
            return ErrorType.CONFLICT;
        }
        
        // Database errors
        if (message.includes('mongodb') || message.includes('database') || message.includes('connection')) {
            return ErrorType.DATABASE;
        }
        
        // Network errors
        if (message.includes('network') || message.includes('timeout') || message.includes('econnrefused')) {
            return ErrorType.NETWORK;
        }
    }
    
    // Default to internal error
    return ErrorType.INTERNAL;
}

/**
 * Extract error message from unknown error type
 */
function extractErrorMessage(error: unknown): string {
    if (error instanceof APIError) {
        return error.message;
    }
    
    if (error instanceof Error) {
        return error.message;
    }
    
    if (typeof error === 'string') {
        return error;
    }
    
    return 'An unexpected error occurred';
}

/**
 * Handle API Error
 * Converts any error to standardized NextResponse with logging
 * 
 * @param error - Error object (can be Error, APIError, or unknown)
 * @param context - Additional context for logging (e.g., { nodeId, url })
 * @param customMessage - Custom user-facing error message (optional)
 * @returns NextResponse with error details
 */
export function handleAPIError(
    error: unknown,
    context?: Record<string, any>,
    customMessage?: string
): NextResponse<APIResponse> {
    // Extract error details
    const errorMessage = extractErrorMessage(error);
    const errorType = classifyError(error);
    const statusCode = ERROR_STATUS_CODES[errorType];
    
    // Log error with context
    logger.error(
        `API Error: ${errorMessage}`,
        error instanceof Error ? error : undefined,
        {
            errorType,
            statusCode,
            ...context,
        }
    );
    
    // Build response
    const response: APIResponse = {
        success: false,
        error: customMessage || errorMessage,
    };
    
    // Add additional error details in development
    if (process.env.NODE_ENV === 'development' && error instanceof Error) {
        response.message = error.stack;
    }
    
    return NextResponse.json(response, { status: statusCode });
}

/**
 * Success Response
 * Returns standardized success response
 * 
 * @param data - Response data
 * @param message - Optional success message
 * @param statusCode - HTTP status code (default: 200)
 * @returns NextResponse with success data
 */
export function successResponse<T = any>(
    data: T,
    message?: string,
    statusCode: number = 200
): NextResponse<APIResponse<T>> {
    const response: APIResponse<T> = {
        success: true,
        data,
    };
    
    if (message) {
        response.message = message;
    }
    
    // Add count if data is array
    if (Array.isArray(data)) {
        response.count = data.length;
    }
    
    return NextResponse.json(response, { status: statusCode });
}

/**
 * Validation Error Response
 * Specialized response for validation errors
 * 
 * @param validationError - Validation error message
 * @param field - Field name that failed validation (optional)
 * @returns NextResponse with validation error
 */
export function validationError(
    validationError: string,
    field?: string
): NextResponse<APIResponse> {
    logger.warn('Validation error', {
        error: validationError,
        field,
    });
    
    return NextResponse.json(
        {
            success: false,
            error: validationError,
            ...(field && { field }),
        },
        { status: 400 }
    );
}

/**
 * Not Found Response
 * Specialized response for resource not found
 * 
 * @param resource - Resource name (e.g., "Node", "User")
 * @param identifier - Resource identifier (e.g., ID)
 * @returns NextResponse with not found error
 */
export function notFoundError(
    resource: string,
    identifier?: string
): NextResponse<APIResponse> {
    const message = identifier
        ? `${resource} with identifier '${identifier}' not found`
        : `${resource} not found`;
    
    logger.warn('Resource not found', {
        resource,
        identifier,
    });
    
    return NextResponse.json(
        {
            success: false,
            error: message,
        },
        { status: 404 }
    );
}

/**
 * Conflict Error Response
 * Specialized response for conflict errors (e.g., duplicate resources)
 * 
 * @param message - Conflict message
 * @param context - Additional context
 * @returns NextResponse with conflict error
 */
export function conflictError(
    message: string,
    context?: Record<string, any>
): NextResponse<APIResponse> {
    logger.warn('Conflict error', {
        message,
        ...context,
    });
    
    return NextResponse.json(
        {
            success: false,
            error: message,
        },
        { status: 409 }
    );
}

/**
 * Database Connection Error Response
 * Specialized response for database connection issues
 * 
 * @param message - Optional custom message
 * @returns NextResponse with database error
 */
export function databaseError(
    message?: string
): NextResponse<APIResponse> {
    const defaultMessage = 'Database connection failed. Please configure MongoDB in .env.local';
    
    logger.error('Database error', undefined, {
        message: message || defaultMessage,
    });
    
    return NextResponse.json(
        {
            success: false,
            error: message || defaultMessage,
            isConfigError: true,
        },
        { status: 503 }
    );
}

/**
 * Try-Catch Wrapper for API Route Handlers
 * Wraps async function with standardized error handling
 * 
 * @param handler - Async handler function
 * @param context - Context for error logging
 * @returns Wrapped handler with error handling
 * 
 * @example
 * export const GET = withErrorHandling(
 *   async (request: NextRequest) => {
 *     const data = await fetchData();
 *     return successResponse(data);
 *   },
 *   { endpoint: 'GET /api/nodes' }
 * );
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T,
    context?: Record<string, any>
): T {
    return (async (...args: any[]) => {
        try {
            return await handler(...args);
        } catch (error) {
            return handleAPIError(error, context);
        }
    }) as T;
}

/**
 * Parse Request Body Safely
 * Handles JSON parsing with error handling
 * 
 * @param request - NextRequest object
 * @returns Parsed body or throws validation error
 */
export async function parseRequestBody<T = any>(request: Request): Promise<T> {
    try {
        const body = await request.json();
        return body as T;
    } catch (error) {
        throw new Error('Invalid JSON in request body');
    }
}

/**
 * Validate Required Fields
 * Checks if required fields are present in object
 * 
 * @param data - Data object to validate
 * @param requiredFields - Array of required field names
 * @throws Error if any required field is missing
 */
export function validateRequiredFields(
    data: Record<string, any>,
    requiredFields: string[]
): void {
    const missingFields = requiredFields.filter(
        field => data[field] === undefined || data[field] === null || data[field] === ''
    );
    
    if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
}
