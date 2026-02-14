# 🚀 QUICK REFERENCE: Code Quality Improvements

**Quick access untuk developer yang ingin menggunakan pattern dan utilities hasil audit.**

---

## 📚 TABLE OF CONTENTS

1. [Constants Usage](#constants-usage)
2. [Logging](#logging)
3. [API Helpers](#api-helpers)
4. [Error Handling](#error-handling)
5. [Type Safety Patterns](#type-safety-patterns)
6. [Input Validation](#input-validation)
7. [Performance Patterns](#performance-patterns)
8. [Testing Examples](#testing-examples)

---

## 🎯 CONSTANTS USAGE

### Import Constants
```typescript
import { UI_CONSTANTS } from '@/lib/constants';
```

### Tooltip Positioning
```typescript
// ❌ BEFORE: Magic numbers
<div style={{ left: x + 15, top: y + 15 }}>

// ✅ AFTER: Named constants
<div style={{ 
    left: x + UI_CONSTANTS.TOOLTIP.OFFSET_X,
    top: y + UI_CONSTANTS.TOOLTIP.OFFSET_Y 
}}>
```

### Node Hover Sizing
```typescript
// ❌ BEFORE: Hard-coded multiplier
const hoverSize = baseSize * 1.2;

// ✅ AFTER: Named constant
const hoverSize = baseSize * UI_CONSTANTS.NODE.HOVER_SIZE_MULTIPLIER;
```

### Layout Configuration
```typescript
// ❌ BEFORE: Magic numbers everywhere
for (let i = 0; i < 800; i++) { ... }
if (alphaChange < 0.01 && alpha < 0.05) { ... }

// ✅ AFTER: Self-documenting constants
const iterations = Math.min(
    UI_CONSTANTS.LAYOUT.MAX_ITERATIONS,
    UI_CONSTANTS.LAYOUT.BASE_ITERATIONS + (nodes.length * UI_CONSTANTS.LAYOUT.ITERATIONS_PER_NODE)
);

if (alphaChange < UI_CONSTANTS.LAYOUT.CONVERGENCE_THRESHOLD && 
    alpha < UI_CONSTANTS.LAYOUT.ALPHA_THRESHOLD) {
    break;
}
```

### Resize Debouncing
```typescript
// ❌ BEFORE: Hard-coded delay
setTimeout(handleResize, 200);

// ✅ AFTER: Named constant
setTimeout(handleResize, UI_CONSTANTS.RESIZE.DEBOUNCE_MS);
```

---

## � LOGGING

### Import Logger
```typescript
import { logger } from '@/lib/utils/logger';
```

### Basic Logging
```typescript
// DEBUG - Detailed diagnostic info
logger.debug('User data loaded', { userId, timestamp });

// INFO - General informational messages
logger.info('Operation completed successfully');

// WARN - Warning messages
logger.warn('Deprecated API used', { endpoint, version });

// ERROR - Error conditions with stack trace
logger.error('Operation failed', error);
```

### Logging with Context
```typescript
// Always include context for better debugging
logger.info('Node created successfully', {
    nodeId: nodeData.id,
    nodeName: nodeData.name,
    url: nodeData.url
});

logger.error('Background check failed', error, {
    nodeId: node._id,
    nodeName: node.name,
    url: node.url,
    attempt: retryCount
});
```

### Specialized Logging
```typescript
// Health check logging
logger.healthCheck(url, {
    status: 'STABLE',
    latency: 120,
    httpStatus: 200
});

// API request logging
logger.apiRequest('POST', '/api/nodes', 201, 45);
```

### Environment Configuration
```bash
# .env.local
LOG_LEVEL=DEBUG  # Development (shows all logs)
LOG_LEVEL=INFO   # Production (hides debug logs)
```

**Output Examples:**

**Development (Pretty-print):**
```
ℹ️  [10:30:45] Node created successfully
  {
    "nodeId": "65abc123",
    "nodeName": "API Server",
    "url": "https://api.example.com"
  }

❌ [10:31:02] Background check failed
  Error: Request timeout
  Stack: at performHealthCheck (...)
```

**Production (JSON):**
```json
{"level":"INFO","timestamp":"2026-02-09T10:30:45.123Z","message":"Node created successfully","context":{"nodeId":"65abc123"}}
```

---

## 🛠️ API HELPERS

### Import Helpers
```typescript
import { 
    handleAPIError, 
    successResponse, 
    validationError, 
    conflictError,
    notFoundError,
    databaseError,
    withErrorHandling 
} from '@/lib/utils/api-helpers';
```

### Success Response
```typescript
// Simple success
export async function GET(request: NextRequest) {
    const data = await fetchData();
    return successResponse(data);
}

// With message and custom status
const newNode = await NodeModel.create(data);
return successResponse(newNode, 'Node created successfully', 201);

// Auto-adds count for arrays
const nodes = await NodeModel.find();
return successResponse(nodes); // { success: true, data: [...], count: 12 }
```

### Error Responses
```typescript
// Validation error
if (!validation.valid) {
    return validationError(validation.error || 'Validation failed', 'email');
}

// Not found error
const node = await NodeModel.findById(id);
if (!node) {
    return notFoundError('Node', id);
}

// Conflict error
if (existingNode) {
    return conflictError('Node with this URL already exists', {
        url: trimmedUrl,
        existingNodeId: existingNode._id
    });
}

// Database error
if (!process.env.MONGODB_URI) {
    return databaseError();
}
```

### Generic Error Handling
```typescript
// Manual try-catch
try {
    const data = await operation();
    logger.info('Operation succeeded', { count: data.length });
    return successResponse(data);
} catch (error) {
    return handleAPIError(error, { endpoint: 'GET /api/data' });
}

// Auto wrapper (cleanest approach)
export const POST = withErrorHandling(
    async (request: NextRequest) => {
        const data = await createResource();
        return successResponse(data, 'Resource created', 201);
    },
    { endpoint: 'POST /api/resource' }
);
```

### Error Classification
**Automatic HTTP status code mapping:**
- Validation errors → 400
- Not found → 404
- Conflicts → 409
- Database errors → 503
- Internal errors → 500

```typescript
// handleAPIError automatically classifies and logs
function classifyError(error: unknown): ErrorType {
    if (message.includes('validation')) return VALIDATION;
    if (message.includes('not found')) return NOT_FOUND;
    if (message.includes('already exists')) return CONFLICT;
    if (message.includes('mongodb')) return DATABASE;
    return INTERNAL;
}
```

---

## �🛡️ ERROR HANDLING

### Custom APIError Class
```typescript
import { APIError } from '@/lib/hooks/useNodeData';

// Throwing APIError
throw new APIError(
    'Invalid credentials',  // Message
    401,                    // HTTP status code
    { detail: 'Token expired' }  // Optional response data
);
```

### Fetcher with AbortController
```typescript
const fetcher = async (url: string, signal?: AbortSignal) => {
    try {
        const res = await fetch(url, { signal });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new APIError(
                errorData.error || `HTTP ${res.status}: ${res.statusText}`,
                res.status,
                errorData
            );
        }
        
        return await res.json();
        
    } catch (error) {
        // Re-throw APIError as-is
        if (error instanceof APIError) throw error;
        
        // Handle AbortError (request cancelled)
        if (error instanceof Error && error.name === 'AbortError') {
            throw new APIError('Request cancelled', 0, { aborted: true });
        }
        
        // Network error
        throw new APIError(
            'Network error: Unable to reach server',
            0,
            { originalError: error }
        );
    }
};
```

### SWR with Auto-Cancellation
```typescript
import useSWR from 'swr';
import { APIError } from '@/lib/hooks/useNodeData';

export function useData() {
    const { data, error } = useSWR(
        '/api/data',
        (url) => {
            // Create AbortController for this request
            const controller = new AbortController();
            const promise = fetcher(url, controller.signal);
            
            // Attach abort method for SWR cleanup
            (promise as any).cancel = () => controller.abort();
            
            return promise;
        }
    );
    
    return { data, error: error as APIError };
}
```

### Error Handling in Components
```typescript
const { data, error } = useData();

if (error) {
    if (error instanceof APIError) {
        if (error.statusCode === 401) {
            // Unauthorized - redirect to login
            router.push('/login');
        } else if (error.statusCode === 0) {
            // Network error
            return <NetworkErrorMessage />;
        } else {
            // Other API error
            return <ErrorMessage message={error.message} />;
        }
    }
}
```

---

## 🔒 TYPE SAFETY PATTERNS

### D3 Simulation Node Interface
```typescript
import * as d3 from 'd3-force';

interface SimulationNode extends d3.SimulationNodeDatum {
    id: string;
    x: number;
    y: number;
    z: number;
    radius: number;
}

// ❌ BEFORE: any type
const nodes: any[] = data.map(d => ({ ...d }));
d3.forceCollide((d: any) => d.radius);

// ✅ AFTER: Typed
const nodes: SimulationNode[] = data.map(d => ({
    id: d.id,
    x: d.x,
    y: d.y,
    z: 0,
    radius: d.size
}));

d3.forceCollide<SimulationNode>((d) => d.radius);
```

### Typed D3 Force Functions
```typescript
const simulation = d3
    .forceSimulation<SimulationNode>(simulationNodes)
    .force("collision", d3.forceCollide<SimulationNode>((d) => d.radius + offset))
    .force("charge", d3.forceManyBody<SimulationNode>().strength(5))
    .force("x", d3.forceX<SimulationNode>(0).strength(0.1))
    .force("y", d3.forceY<SimulationNode>(0).strength(0.1));
```

### Typed Helper Functions
```typescript
// ❌ BEFORE: any parameter
const clampPosition = (node: any) => {
    node.x = Math.max(minX, Math.min(maxX, node.x));
};

// ✅ AFTER: Typed parameter
const clampPosition = (node: SimulationNode): void => {
    const margin = node.radius;
    node.x = Math.max(bounds.minX + margin, Math.min(bounds.maxX - margin, node.x || 0));
    node.y = Math.max(bounds.minY + margin, Math.min(bounds.maxY - margin, node.y || 0));
    node.z = 0;
};
```

### Error Type Narrowing
```typescript
// ❌ BEFORE: any in catch
try {
    await riskyOperation();
} catch (error: any) {
    console.error(error.message); // No type safety
}

// ✅ AFTER: Type narrowing
try {
    await riskyOperation();
} catch (error) {
    if (error instanceof APIError) {
        console.error(`API Error ${error.statusCode}:`, error.message);
    } else if (error instanceof Error) {
        console.error('Error:', error.message);
    } else {
        console.error('Unknown error:', error);
    }
}
```

---

## ✅ INPUT VALIDATION

### Import Validation Utilities
```typescript
import { 
    validateURL, 
    validateNodeName, 
    sanitizeString,
    normalizeURL 
} from '@/lib/utils/validation';
```

### URL Validation
```typescript
const urlCheck = validateURL(userInput);

if (!urlCheck.valid) {
    return NextResponse.json(
        { error: urlCheck.error },
        { status: 400 }
    );
}

// Valid URL - proceed
const url = userInput;
```

### Node Name Validation
```typescript
const nameCheck = validateNodeName(userInput);

if (!nameCheck.valid) {
    return NextResponse.json(
        { error: nameCheck.error },
        { status: 400 }
    );
}

// Valid name - sanitize for safety
const sanitizedName = sanitizeString(userInput);
```

### Complete Validation Example
```typescript
export async function POST(request: NextRequest) {
    const body = await request.json();
    
    // Validate URL
    const urlCheck = validateURL(body.url);
    if (!urlCheck.valid) {
        return NextResponse.json({ error: urlCheck.error }, { status: 400 });
    }
    
    // Validate name
    const nameCheck = validateNodeName(body.name);
    if (!nameCheck.valid) {
        return NextResponse.json({ error: nameCheck.error }, { status: 400 });
    }
    
    // Sanitize inputs
    const node = {
        name: sanitizeString(body.name),
        url: body.url,
        group: body.group ? sanitizeString(body.group) : 'Default'
    };
    
    // Proceed with database operation
    await NodeModel.create(node);
}
```

---

## ⚡ PERFORMANCE PATTERNS

### State Separation (Prevent Memory Leaks)
```typescript
// ❌ BEFORE: Single object state (causes re-renders)
const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: {} });

// ✅ AFTER: Separate independent states
const [tooltipVisible, setTooltipVisible] = useState(false);
const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
const [tooltipData, setTooltipData] = useState({});
```

### Stable Callback References
```typescript
// ❌ BEFORE: New function every render
const handleMouseMove = (e: MouseEvent) => {
    setTooltipPosition({ x: e.clientX, y: e.clientY });
};

// ✅ AFTER: Stable reference with useCallback
const handleMouseMove = useCallback((e: MouseEvent) => {
    setTooltipPosition({ x: e.clientX, y: e.clientY });
}, []); // Empty deps = stable reference
```

### Memoized Components
```typescript
// ❌ BEFORE: Component re-renders every time
const TooltipContent = ({ nodeName, status }) => { ... };

// ✅ AFTER: Memoized to prevent unnecessary re-renders
const TooltipContent = React.memo(({ nodeName, status }) => {
    return <div>...</div>;
});
```

### Serialized Dependencies for useMemo
```typescript
// ❌ BEFORE: Map object in dependencies (unstable)
const result = useMemo(() => {
    return expensiveCalculation(nodePositions);
}, [nodePositions]); // Map object changes every render

// ✅ AFTER: Serialized JSON for stable comparison
const nodePositionsJSON = useMemo(
    () => JSON.stringify(Array.from(nodePositions.entries())),
    [nodePositions]
);

const result = useMemo(() => {
    return expensiveCalculation(nodePositions);
}, [nodePositionsJSON]); // String is stable
```

### Non-Blocking Heavy Calculations
```typescript
// ❌ BEFORE: Blocking calculation
const positions = calculateLayout(nodes); // UI freezes
setNodePositions(positions);

// ✅ AFTER: Deferred to next tick
useEffect(() => {
    setLoading(true);
    
    const timeoutId = setTimeout(() => {
        const positions = calculateLayout(nodes);
        setNodePositions(positions);
        setLoading(false);
    }, UI_CONSTANTS.ANIMATION.LAYOUT_DEFER_MS); // 0 = next tick
    
    return () => clearTimeout(timeoutId);
}, [nodes]);
```

### Optimized Resize Listener
```typescript
useEffect(() => {
    const handleResize = () => {
        startTransition(() => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        });
    };

    let timeoutId: NodeJS.Timeout;
    let rafId: number;
    
    const optimizedResize = () => {
        clearTimeout(timeoutId);
        cancelAnimationFrame(rafId);
        
        timeoutId = setTimeout(() => {
            rafId = requestAnimationFrame(handleResize);
        }, UI_CONSTANTS.RESIZE.DEBOUNCE_MS);
    };

    window.addEventListener('resize', optimizedResize, { passive: true });
    
    return () => {
        window.removeEventListener('resize', optimizedResize);
        clearTimeout(timeoutId);
        cancelAnimationFrame(rafId);
    };
}, []);
```

### Dynamic Iterations with Early Termination
```typescript
// ❌ BEFORE: Fixed iterations (wastes CPU)
for (let i = 0; i < 800; i++) {
    simulation.tick();
}

// ✅ AFTER: Dynamic + early termination
const iterations = Math.min(
    UI_CONSTANTS.LAYOUT.MAX_ITERATIONS,
    UI_CONSTANTS.LAYOUT.BASE_ITERATIONS + (nodes.length * UI_CONSTANTS.LAYOUT.ITERATIONS_PER_NODE)
);

let previousAlpha = Infinity;

for (let i = 0; i < iterations; i++) {
    simulation.tick();
    
    // Check convergence every 50 iterations
    if (i > UI_CONSTANTS.LAYOUT.CONVERGENCE_MIN_ITERATIONS && 
        i % UI_CONSTANTS.LAYOUT.CONVERGENCE_CHECK_INTERVAL === 0) {
        const currentAlpha = simulation.alpha();
        const alphaChange = Math.abs(previousAlpha - currentAlpha);
        
        if (alphaChange < UI_CONSTANTS.LAYOUT.CONVERGENCE_THRESHOLD && 
            currentAlpha < UI_CONSTANTS.LAYOUT.ALPHA_THRESHOLD) {
            console.log(`✅ Converged after ${i} iterations`);
            break;
        }
        
        previousAlpha = currentAlpha;
    }
}
```

---

## 🧪 TESTING EXAMPLES

### Unit Test: Logger
```typescript
import { logger } from '@/lib/utils/logger';

describe('Logger', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    it('logs info messages with context', () => {
        logger.info('Test message', { userId: '123' });
        expect(console.log).toHaveBeenCalled();
    });

    it('logs errors with stack trace', () => {
        const error = new Error('Test error');
        logger.error('Operation failed', error);
        expect(console.error).toHaveBeenCalled();
    });
});
```

### Unit Test: API Helpers
```typescript
import { handleAPIError, successResponse, validationError } from '@/lib/utils/api-helpers';

describe('API Helpers', () => {
    it('returns success response with data', () => {
        const data = { id: '123', name: 'Test' };
        const response = successResponse(data);
        
        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data).toEqual(data);
    });

    it('handles validation errors', () => {
        const response = validationError('Invalid email', 'email');
        
        expect(response.status).toBe(400);
        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error).toContain('Invalid email');
    });

    it('classifies errors correctly', () => {
        const error = new Error('Node not found');
        const response = handleAPIError(error);
        
        expect(response.status).toBe(404);
    });
});
```

### Unit Test: Validation Functions
```typescript
import { validateURL, validateNodeName } from '@/lib/utils/validation';

describe('validateURL', () => {
    it('accepts valid HTTPS URLs', () => {
        const result = validateURL('https://example.com');
        expect(result.valid).toBe(true);
    });
    
    it('rejects javascript: protocol', () => {
        const result = validateURL('javascript:alert(1)');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('HTTP/HTTPS');
    });
    
    it('rejects invalid URL format', () => {
        const result = validateURL('not a url');
        expect(result.valid).toBe(false);
    });
});

describe('validateNodeName', () => {
    it('accepts valid names', () => {
        const result = validateNodeName('My Service 123');
        expect(result.valid).toBe(true);
    });
    
    it('rejects empty names', () => {
        const result = validateNodeName('');
        expect(result.valid).toBe(false);
    });
    
    it('rejects names with special characters', () => {
        const result = validateNodeName('Service<script>');
        expect(result.valid).toBe(false);
    });
});
```

### Component Test: FuzzyParticleNode
```typescript
import { render, fireEvent } from '@testing-library/react';
import { FuzzyParticleNode } from '@/components/three/FuzzyParticleNode';

describe('FuzzyParticleNode', () => {
    it('renders with correct status', () => {
        const { container } = render(
            <FuzzyParticleNode
                nodeId="1"
                nodeName="Test"
                nodeUrl="https://test.com"
                position={[0, 0, 0]}
                status="DOWN"
            />
        );
        
        // Assert node is rendered
        expect(container.querySelector('points')).toBeInTheDocument();
    });
    
    it('calls onHover when hovered', () => {
        const onHover = jest.fn();
        
        const { container } = render(
            <FuzzyParticleNode
                nodeId="1"
                nodeName="Test"
                nodeUrl="https://test.com"
                position={[0, 0, 0]}
                status="STABLE"
                onHover={onHover}
            />
        );
        
        // Simulate hover
        const hoverSphere = container.querySelector('mesh');
        fireEvent.pointerOver(hoverSphere);
        
        expect(onHover).toHaveBeenCalledWith('1', 'Test', 'STABLE', expect.any(Object));
    });
});
```

### Integration Test: API Route
```typescript
import { POST } from '@/app/api/nodes/route';
import { NextRequest } from 'next/server';

describe('POST /api/nodes', () => {
    it('creates node with valid data', async () => {
        const request = new NextRequest('http://localhost:3000/api/nodes', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Test Service',
                url: 'https://test.com',
                group: 'Backend'
            })
        });
        
        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.name).toBe('Test Service');
    });
    
    it('rejects invalid URL', async () => {
        const request = new NextRequest('http://localhost:3000/api/nodes', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Test',
                url: 'javascript:alert(1)'
            })
        });
        
        const response = await POST(request);
        
        expect(response.status).toBe(400);
    });
});
```

---

## 📚 CHEAT SHEET

### Quick Import Reference
```typescript
// Logging
import { logger } from '@/lib/utils/logger';

// API Helpers
import { 
    handleAPIError, 
    successResponse, 
    validationError, 
    conflictError 
} from '@/lib/utils/api-helpers';

// Constants
import { UI_CONSTANTS } from '@/lib/constants';

// Error Handling
import { APIError } from '@/lib/hooks/useNodeData';

// Validation
import { validateURL, validateNodeName, sanitizeString } from '@/lib/utils/validation';

// Types
import { SimulationNode } from '@/lib/layouts/AtomLayout';
```

### Common Patterns
```typescript
// ✅ Good: Separate state, stable callbacks, memoized components
const [visible, setVisible] = useState(false);
const [position, setPosition] = useState({ x: 0, y: 0 });
### Common Patterns
```typescript
// ✅ Good: Logging with context
logger.info('Operation completed', { userId, duration });
logger.error('Failed to save', error, { resourceId });

// ✅ Good: API helpers for clean code
return successResponse(data);
return validationError('Invalid email', 'email');
return handleAPIError(error, { endpoint: 'POST /api/users' });

// ✅ Good: Separate state, stable callbacks, memoized components
const [visible, setVisible] = useState(false);
const [position, setPosition] = useState({ x: 0, y: 0 });
const handler = useCallback(() => { ... }, []);
const Content = React.memo(({ data }) => { ... });

// ✅ Good: Type-safe error handling
try {
    await fetch(url, { signal });
} catch (error) {
    if (error instanceof APIError) { ... }
}

// ✅ Good: Input validation
const check = validateURL(input);
if (!check.valid) return validationError(check.error);
```

---

**Last Updated:** February 9, 2026  
**Version:** 2.0  
**For questions:** Refer to COMPLETE_AUDIT_REPORT.md
