import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { NodeStatus, AuthConfig } from '@/types';
import { HealthCheckResult } from './healthCheck';

/**
 * Playwright-based Health Check
 * For URLs that require authentication
 * Handles login process and performs actual health check after authentication
 */

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let browserIdleTimeout: NodeJS.Timeout | null = null;

/**
 * Initialize browser instance (singleton)
 */
async function initializeBrowser() {
    if (!browser) {
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        });

        console.log('✅ Playwright browser initialized');
    }
    
    // Reset idle timeout whenever browser is used
    if (browserIdleTimeout) {
        clearTimeout(browserIdleTimeout);
    }
    
    // Auto-close browser after 5 minutes of inactivity to prevent memory leak
    browserIdleTimeout = setTimeout(async () => {
        console.log('🧹 Closing idle browser after 5 minutes of inactivity');
        await closeBrowser();
    }, 300000); // 5 minutes
    
    return { browser, context };
}

/**
 * Close browser instance
 */
export async function closeBrowser() {
    if (browserIdleTimeout) {
        clearTimeout(browserIdleTimeout);
        browserIdleTimeout = null;
    }
    if (context) {
        await context.close();
        context = null;
    }
    if (browser) {
        await browser.close();
        browser = null;
        console.log('Browser closed');
    }
}

/**
 * Perform health check with authentication
 */
export async function performPlaywrightHealthCheck(
    url: string,
    authConfig: AuthConfig,
    timeoutMs: number = 35000
): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let page: Page | null = null;

    try {
        // Initialize browser
        const { context: ctx } = await initializeBrowser();
        if (!ctx) {
            throw new Error('Failed to initialize browser');
        }

        // Create new page
        page = await ctx.newPage();

        // Check for console errors - set up listener BEFORE navigation
        const consoleErrors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Perform login if required
        if (authConfig.type === 'BROWSER_LOGIN' && authConfig.username && authConfig.password) {
            console.log(`🔐 Attempting login for ${url}...`);
            await performLogin(page, authConfig, timeoutMs, url);
            console.log(`✅ Login successful for ${url}`);
        }

        // Navigate to target URL
        console.log(`🌐 Navigating to ${url}...`);
        const response = await page.goto(url, {
            timeout: timeoutMs,
            waitUntil: 'domcontentloaded'
        });

        // Calculate latency
        const latency = Date.now() - startTime;

        // Check HTTP status
        const httpStatus = response?.status() || 0;

        // Determine status (consistent with healthCheck.ts)
        let status: NodeStatus;
        if (httpStatus >= 500) {
            status = 'DOWN';
        } else if (httpStatus >= 400) {
            status = 'WARNING';
        } else if (latency > 5000) {
            // > 5s latency = WARNING (consistent with simple health check)
            status = 'WARNING';
        } else {
            status = 'STABLE';
        }

        // Wait for page to stabilize
        try {
            console.log('⏳ Waiting 30s for page stabilization (User Requested)...');
            await page.waitForTimeout(30000); // Specific 30s wait request
            await page.waitForLoadState('networkidle', { timeout: 30000 });
        } catch {
            // Network idle timeout is not critical
            console.log('⚠️ Network idle timeout (normal for dynamic pages)');
        }

        await page.close();

        return {
            status,
            latency,
            httpStatus,
            error: consoleErrors.length > 0 ? `Console errors: ${consoleErrors.length}` : undefined
        };

    } catch (error: any) {
        const latency = Date.now() - startTime;

        if (page) {
            await page.close().catch(() => { /* ignore close errors */ });
        }

        // Handle errors
        if (error.message.includes('Timeout') || error.name === 'TimeoutError') {
            return {
                status: 'DOWN',
                latency: timeoutMs,
                error: 'Request timeout'
            };
        }

        if (error.message.includes('net::') || error.message.includes('DNS')) {
            return {
                status: 'DOWN',
                latency,
                error: 'Network error'
            };
        }

        if (error.message.includes('Login') || error.message.includes('Authentication')) {
            return {
                status: 'DOWN',
                latency,
                error: `Authentication failed: ${error.message}`
            };
        }

        return {
            status: 'DOWN',
            latency,
            error: error.message || 'Health check failed'
        };
    }
}

/**
 * Perform login process
 */
async function performLogin(page: Page, authConfig: AuthConfig, timeoutMs: number, url: string) {
    const loginUrl = authConfig.loginUrl || page.url();
    const username = authConfig.username!;
    const password = authConfig.password!;

    try {
        // For modal login, we start at the main URL (or loginUrl if specified, but usually main)
        const targetUrl = authConfig.loginUrl || url;

        console.log(`📄 Navigating to login page/modal: ${targetUrl}`);
        await page.goto(targetUrl, {
            waitUntil: 'networkidle',
            timeout: timeoutMs
        });

        await page.waitForTimeout(2000);

        // Handle Modal Trigger
        if (authConfig.loginType === 'modal') {
            console.log('🔍 Looking for modal trigger...');
            const triggerSelectors = authConfig.modalTriggerSelector ? [authConfig.modalTriggerSelector] : [
                'button:has-text("Login")',
                'button:has-text("Sign in")',
                'button:has-text("Masuk")',
                'a:has-text("Login")',
                'a:has-text("Sign in")',
                '[data-testid*="login"]',
                '[id*="login-btn"]',
                '.login-button'
            ];

            let triggerClicked = false;
            for (const selector of triggerSelectors) {
                try {
                    const element = await page.$(selector);
                    if (element && await element.isVisible()) {
                        await element.click();
                        console.log(`✅ Modal trigger clicked: ${selector}`);
                        triggerClicked = true;
                        // Wait for modal to animate in
                        await page.waitForTimeout(1000);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!triggerClicked) {
                console.warn('⚠️ Could not find modal trigger, attempting to find inputs directly...');
            }
        }



        // OPTIMIZATION: Check if we are already logged in (Session Reuse)
        // If we are already at the dashboard/target, we don't need to fill credentials
        try {
            console.log('🔍 Checking if already logged in...');
            // We reuse the verify function but catch errors so we don't fail the whole flow if not logged in
            await verifyLoginSuccess(page, authConfig);
            console.log('⚡ Session reused! Already logged in. Skipping credential entry.');
            return;
        } catch (e) {
            console.log('ℹ️ Not logged in yet, proceeding with credentials...');
        }

        // Username selectors (auto-detection)
        const usernameSelectors = authConfig.usernameSelector ? [authConfig.usernameSelector] : [
            'input[id="email"]',
            'input[name="email"]',
            'input[id="Email"]',
            'input[name="Email"]',
            'input[id="username"]',
            'input[name="username"]',
            'input[type="email"]',
            'input[placeholder*="email" i]',
            'input[placeholder*="username" i]',
            'input[type="text"]:visible'
        ];

        // Try to fill username
        let usernameFilled = false;
        for (const selector of usernameSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    const isVisible = await element.isVisible();
                    if (isVisible) {
                        await element.fill(username);
                        console.log(`✅ Username filled using selector: ${selector}`);
                        usernameFilled = true;
                        break;
                    }
                }
            } catch {
                continue;
            }
        }

        if (!usernameFilled) {
            throw new Error('Failed to find username input field');
        }

        // Password selectors
        const passwordSelectors = authConfig.passwordSelector ? [authConfig.passwordSelector] : [
            'input[id="password"]',
            'input[name="password"]',
            'input[type="password"]',
            'input[placeholder*="password" i]'
        ];

        // Try to fill password
        let passwordFilled = false;
        for (const selector of passwordSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    const isVisible = await element.isVisible();
                    if (isVisible) {
                        await element.fill(password);
                        console.log(`✅ Password filled using selector: ${selector}`);
                        passwordFilled = true;
                        break;
                    }
                }
            } catch {
                continue;
            }
        }

        if (!passwordFilled) {
            throw new Error('Failed to find password input field');
        }

        // Submit form
        const submitSelectors = authConfig.submitSelector ? [authConfig.submitSelector] : [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Login")',
            'button:has-text("Log in")',
            'button:has-text("Sign in")',
            'button:has-text("Masuk")',
            '[class*="login" i] button',
            '[class*="submit" i] button',
            'button[class*="primary" i]',
            '[role="button"]:has-text("Login")',
            '[role="button"]:has-text("Sign in")'
        ];

        let submitted = false;
        for (const selector of submitSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    const isVisible = await element.isVisible();
                    if (isVisible) {
                        await element.click();
                        console.log(`✅ Submit button clicked: ${selector}`);
                        submitted = true;
                        break;
                    }
                }
            } catch {
                continue;
            }
        }

        if (!submitted) {
            console.log('⚠️ Fallback: Pressing Enter key');
            await page.keyboard.press('Enter');
        }

        // Wait for navigation after login
        await page.waitForTimeout(3000);

        // Verify login success
        await verifyLoginSuccess(page, authConfig);

        console.log('✅ Login verification passed');

    } catch (error: any) {
        console.error('❌ Login failed:', error.message);
        throw new Error(`Login failed: ${error.message}`);
    }
}

/**
 * Verify login was successful
 */
async function verifyLoginSuccess(page: Page, authConfig: AuthConfig) {
    const currentUrl = page.url();

    // Custom Selector Check (User defined)
    if (authConfig.loginSuccessSelector) {
        try {
            console.log(`🔍 Checking custom verification selector: ${authConfig.loginSuccessSelector}`);
            const element = await page.$(authConfig.loginSuccessSelector);
            if (element) {
                console.log('✅ Custom verification element found');
                return;
            } else {
                throw new Error(`Custom verification element not found: ${authConfig.loginSuccessSelector}`);
            }
        } catch (e) {
            throw new Error(`Custom verification failed: ${authConfig.loginSuccessSelector}`);
        }
    }


    // Check if still on login page
    if (currentUrl.includes('login') || currentUrl.includes('signin')) {
        // Look for error messages
        const hasErrors = await page.evaluate(() => {
            const errorSelectors = [
                '.error', '.alert-danger', '.error-message',
                '[class*="error"]', '[role="alert"]'
            ];

            for (const selector of errorSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent && element.textContent.trim().length > 0) {
                    return true;
                }
            }
            return false;
        });

        if (hasErrors) {
            throw new Error('Login failed - error messages detected');
        }
    }

    // Check for logged-in indicators
    const isLoggedIn = await page.evaluate(() => {
        const indicators = [
            '.user-menu',
            '.profile-menu',
            '.dashboard',
            'button:has-text("Logout")',
            'button:has-text("Log out")',
            '.logout-btn',
            '[href*="logout"]',
            '[href*="signout"]',
            '.user-avatar',
            '#user-dropdown'
        ];

        return indicators.some(selector => {
            try {
                return document.querySelector(selector) !== null;
            } catch {
                return false;
            }
        });
    });

    // Strategy 2: Check if inputs are GONE (Implies successful navigation)
    if (!isLoggedIn) {
        // If we can't find positive indicators, check negatives.
        // If the password field is GONE, we probably logged in.
        const passwordFieldGone = await page.evaluate(() => {
            return !document.querySelector('input[type="password"]');
        });

        if (passwordFieldGone) {
            console.log('✅ Login verified (Password field disappeared)');
            return;
        }
    }

    if (isLoggedIn) {
        console.log('✅ Login verified (Indicator found)');
        return;
    }

    // Strategy 3: Check URL Change
    const newUrl = page.url();
    if (!newUrl.includes('login') && !newUrl.includes('signin') && newUrl !== currentUrl) {
        console.log('✅ Login verified (URL changed)');
        return;
    }

    console.warn('⚠️ Warning: No logged-in indicators found, but continuing...');
}
