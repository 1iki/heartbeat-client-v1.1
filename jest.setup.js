/**
 * Jest Setup File
 * Runs before each test to configure the testing environment
 */

// Import Jest DOM matchers
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter() {
        return {
            push: jest.fn(),
            replace: jest.fn(),
            prefetch: jest.fn(),
            back: jest.fn(),
            pathname: '/',
            query: {},
            asPath: '/',
        };
    },
    usePathname() {
        return '/';
    },
    useSearchParams() {
        return new URLSearchParams();
    },
}));

// Mock canvas for Three.js (only in jsdom environment)
if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => {
        return {
            fillStyle: '',
            fillRect: jest.fn(),
            clearRect: jest.fn(),
            getImageData: jest.fn(() => ({
                data: new Array(4),
            })),
            putImageData: jest.fn(),
            createImageData: jest.fn(() => []),
            setTransform: jest.fn(),
            drawImage: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            beginPath: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            closePath: jest.fn(),
            stroke: jest.fn(),
            translate: jest.fn(),
            scale: jest.fn(),
            rotate: jest.fn(),
            arc: jest.fn(),
            fill: jest.fn(),
            measureText: jest.fn(() => ({ width: 0 })),
            transform: jest.fn(),
            rect: jest.fn(),
            clip: jest.fn(),
        };
    });
}

// Mock WebGL context for Three.js (only in jsdom environment)
if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
        if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') {
            return {
                canvas: document.createElement('canvas'),
                drawingBufferWidth: 800,
                drawingBufferHeight: 600,
                getParameter: jest.fn(),
                getExtension: jest.fn(),
                createShader: jest.fn(),
                shaderSource: jest.fn(),
                compileShader: jest.fn(),
                getShaderParameter: jest.fn(() => true),
                createProgram: jest.fn(),
                attachShader: jest.fn(),
                linkProgram: jest.fn(),
                getProgramParameter: jest.fn(() => true),
                useProgram: jest.fn(),
                createBuffer: jest.fn(),
                bindBuffer: jest.fn(),
                bufferData: jest.fn(),
                enableVertexAttribArray: jest.fn(),
                vertexAttribPointer: jest.fn(),
                createTexture: jest.fn(),
                bindTexture: jest.fn(),
                texParameteri: jest.fn(),
                texImage2D: jest.fn(),
                createFramebuffer: jest.fn(),
                bindFramebuffer: jest.fn(),
                framebufferTexture2D: jest.fn(),
                createRenderbuffer: jest.fn(),
                bindRenderbuffer: jest.fn(),
                renderbufferStorage: jest.fn(),
                framebufferRenderbuffer: jest.fn(),
                checkFramebufferStatus: jest.fn(() => 36053), // FRAMEBUFFER_COMPLETE
                clear: jest.fn(),
                clearColor: jest.fn(),
                clearDepth: jest.fn(),
                enable: jest.fn(),
                disable: jest.fn(),
                depthFunc: jest.fn(),
                viewport: jest.fn(),
                drawArrays: jest.fn(),
                drawElements: jest.fn(),
                getUniformLocation: jest.fn(),
                getAttribLocation: jest.fn(),
                uniform1f: jest.fn(),
                uniform2f: jest.fn(),
                uniform3f: jest.fn(),
                uniform4f: jest.fn(),
                uniform1i: jest.fn(),
                uniformMatrix4fv: jest.fn(),
            };
        }
        
        // Fallback to 2d context
        return {
            fillStyle: '',
            fillRect: jest.fn(),
            clearRect: jest.fn(),
            getImageData: jest.fn(() => ({ data: new Array(4) })),
            putImageData: jest.fn(),
            createImageData: jest.fn(() => []),
            setTransform: jest.fn(),
            drawImage: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            beginPath: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            closePath: jest.fn(),
            stroke: jest.fn(),
            translate: jest.fn(),
            scale: jest.fn(),
            rotate: jest.fn(),
            arc: jest.fn(),
            fill: jest.fn(),
            measureText: jest.fn(() => ({ width: 0 })),
            transform: jest.fn(),
            rect: jest.fn(),
            clip: jest.fn(),
        };
    });
}

// Mock window.matchMedia (for responsive components) - only in jsdom
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(), // deprecated
            removeListener: jest.fn(), // deprecated
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });

    // Mock IntersectionObserver
    global.IntersectionObserver = class IntersectionObserver {
        constructor() {}
        disconnect() {}
        observe() {}
        takeRecords() {
            return [];
        }
        unobserve() {}
    };

    // Mock ResizeObserver
    global.ResizeObserver = class ResizeObserver {
        constructor() {}
        disconnect() {}
        observe() {}
        unobserve() {}
    };

    // Suppress console errors in tests (optional - comment out if you want to see all errors)
    const originalError = console.error;
    beforeAll(() => {
        console.error = (...args) => {
            // Suppress known Three.js warnings in test environment
            if (
                typeof args[0] === 'string' &&
                (args[0].includes('THREE.WebGLRenderer') ||
                 args[0].includes('WebGL') ||
                 args[0].includes('getContext'))
            ) {
                return;
            }
            originalError.call(console, ...args);
        };
    });

    afterAll(() => {
        console.error = originalError;
    });
}

// Set up environment variables for tests
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
