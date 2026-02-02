/**
 * Nordnet External API v2 Client
 *
 * A TypeScript client for the Nordnet External API v2.
 * Handles authentication, session management, and API calls.
 *
 * Based on: https://github.com/nordnet/next-api-v2-examples
 */

import {
  NordnetConfig,
  NordnetCountry,
  NordnetApiStatus,
  NordnetSession,
  NordnetAuthChallenge,
  NordnetAccount,
  NordnetAccountInfo,
  NordnetPosition,
  NordnetInstrument,
  NordnetOrder,
  NordnetOrderRequest,
  NordnetTrade,
  NordnetSearchResult,
  NordnetApiResponse,
  NordnetApiError,
  NordnetClientState,
} from '../../types/nordnet';

// Constants
const API_VERSION = '2';
const API_PREFIX = '/api';
const SERVICE_NAME = 'NEXTAPI';

/**
 * Get the base URL for a Nordnet country
 */
export function getNordnetBaseUrl(country: NordnetCountry): string {
  return `https://public.nordnet.${country}`;
}

/**
 * Sign a challenge using ed25519 private key
 * Note: This requires the 'crypto' module available in Node.js
 */
export async function signChallenge(
  challenge: string,
  privateKeyContent: string
): Promise<string> {
  // Dynamic import for Node.js crypto
  const crypto = await import('crypto');

  // Parse the private key
  const privateKey = crypto.createPrivateKey({
    key: privateKeyContent,
    format: 'pem',
  });

  // Sign the challenge
  const signature = crypto.sign(null, Buffer.from(challenge, 'utf-8'), privateKey);

  // Return base64 encoded signature
  return signature.toString('base64');
}

/**
 * Nordnet API Client Class
 */
export class NordnetClient {
  private config: NordnetConfig;
  private baseUrl: string;
  private sessionKey: string | null = null;
  private sessionExpiry: Date | null = null;
  private rateLimitDelay = 100; // ms between requests

  constructor(config: NordnetConfig) {
    this.config = config;
    this.baseUrl = getNordnetBaseUrl(config.country);
  }

  /**
   * Get current client state
   */
  getState(): NordnetClientState {
    return {
      isAuthenticated: this.isAuthenticated(),
      sessionKey: this.sessionKey,
      sessionExpiry: this.sessionExpiry,
      country: this.config.country,
    };
  }

  /**
   * Check if session is valid
   */
  isAuthenticated(): boolean {
    if (!this.sessionKey || !this.sessionExpiry) {
      return false;
    }
    // Add 60 second buffer before expiry
    return new Date() < new Date(this.sessionExpiry.getTime() - 60000);
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: Record<string, any>,
    requiresAuth = true
  ): Promise<NordnetApiResponse<T>> {
    // Check authentication
    if (requiresAuth && !this.isAuthenticated()) {
      return {
        success: false,
        error: { code: 'NOT_AUTHENTICATED', message: 'Session expired or not authenticated' },
      };
    }

    const url = `${this.baseUrl}${API_PREFIX}/${API_VERSION}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    // Add session key for authenticated requests
    if (requiresAuth && this.sessionKey) {
      headers['Authorization'] = `Bearer ${this.sessionKey}`;
    }

    try {
      // Rate limiting
      await this.delay(this.rateLimitDelay);

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.code || `HTTP_${response.status}`,
            message: data.message || response.statusText,
          },
        };
      }

      return { success: true, data: data as T };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown network error',
        },
      };
    }
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================
  // Authentication
  // ============================================

  /**
   * Check API status
   */
  async checkStatus(): Promise<NordnetApiResponse<NordnetApiStatus>> {
    return this.request<NordnetApiStatus>('GET', '/', undefined, false);
  }

  /**
   * Start authentication challenge
   */
  async startAuth(): Promise<NordnetApiResponse<NordnetAuthChallenge>> {
    return this.request<NordnetAuthChallenge>(
      'POST',
      '/login/start',
      { api_key: this.config.apiKey },
      false
    );
  }

  /**
   * Complete authentication with signed challenge
   */
  async verifyAuth(signature: string): Promise<NordnetApiResponse<NordnetSession>> {
    return this.request<NordnetSession>(
      'POST',
      '/login/verify',
      {
        service: SERVICE_NAME,
        api_key: this.config.apiKey,
        signature,
      },
      false
    );
  }

  /**
   * Full authentication flow
   */
  async authenticate(): Promise<NordnetApiResponse<NordnetSession>> {
    // Get private key content
    let privateKeyContent = this.config.privateKeyContent;

    if (!privateKeyContent && this.config.privateKeyPath) {
      // Read from file (server-side only)
      try {
        const fs = await import('fs');
        privateKeyContent = fs.readFileSync(this.config.privateKeyPath, 'utf-8');
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'KEY_READ_ERROR',
            message: `Could not read private key: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        };
      }
    }

    if (!privateKeyContent) {
      return {
        success: false,
        error: {
          code: 'NO_PRIVATE_KEY',
          message: 'No private key provided',
        },
      };
    }

    // Step 1: Start authentication, get challenge
    const challengeResult = await this.startAuth();
    if (!challengeResult.success || !challengeResult.data) {
      return {
        success: false,
        error: challengeResult.error || { code: 'CHALLENGE_FAILED', message: 'Failed to get challenge' },
      };
    }

    // Step 2: Sign the challenge
    let signature: string;
    try {
      signature = await signChallenge(challengeResult.data.challenge, privateKeyContent);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SIGN_ERROR',
          message: `Failed to sign challenge: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      };
    }

    // Step 3: Verify signature, get session
    const sessionResult = await this.verifyAuth(signature);
    if (!sessionResult.success || !sessionResult.data) {
      return {
        success: false,
        error: sessionResult.error || { code: 'VERIFY_FAILED', message: 'Failed to verify signature' },
      };
    }

    // Store session info
    this.sessionKey = sessionResult.data.session_key;
    this.sessionExpiry = new Date(Date.now() + sessionResult.data.expires_in * 1000);

    return sessionResult;
  }

  /**
   * Logout and invalidate session
   */
  async logout(): Promise<NordnetApiResponse<void>> {
    const result = await this.request<void>('DELETE', '/login');
    this.sessionKey = null;
    this.sessionExpiry = null;
    return result;
  }

  // ============================================
  // Accounts
  // ============================================

  /**
   * Get all accounts
   */
  async getAccounts(): Promise<NordnetApiResponse<NordnetAccount[]>> {
    return this.request<NordnetAccount[]>('GET', '/accounts');
  }

  /**
   * Get account info (balances, etc.)
   */
  async getAccountInfo(accno: number): Promise<NordnetApiResponse<NordnetAccountInfo>> {
    return this.request<NordnetAccountInfo>('GET', `/accounts/${accno}/info`);
  }

  // ============================================
  // Portfolio
  // ============================================

  /**
   * Get all positions for an account
   */
  async getPositions(accno: number): Promise<NordnetApiResponse<NordnetPosition[]>> {
    return this.request<NordnetPosition[]>('GET', `/accounts/${accno}/positions`);
  }

  /**
   * Get all positions across all accounts
   */
  async getAllPositions(): Promise<NordnetApiResponse<NordnetPosition[]>> {
    const accountsResult = await this.getAccounts();
    if (!accountsResult.success || !accountsResult.data) {
      return accountsResult as NordnetApiResponse<NordnetPosition[]>;
    }

    const allPositions: NordnetPosition[] = [];
    for (const account of accountsResult.data) {
      const positionsResult = await this.getPositions(account.accno);
      if (positionsResult.success && positionsResult.data) {
        allPositions.push(...positionsResult.data);
      }
    }

    return { success: true, data: allPositions };
  }

  // ============================================
  // Instruments
  // ============================================

  /**
   * Search for instruments
   */
  async searchInstruments(
    query: string,
    limit = 10
  ): Promise<NordnetApiResponse<NordnetSearchResult[]>> {
    return this.request<NordnetSearchResult[]>(
      'GET',
      `/instruments?query=${encodeURIComponent(query)}&limit=${limit}`
    );
  }

  /**
   * Get instrument by ID
   */
  async getInstrument(instrumentId: number): Promise<NordnetApiResponse<NordnetInstrument>> {
    return this.request<NordnetInstrument>('GET', `/instruments/${instrumentId}`);
  }

  /**
   * Get instrument by ISIN
   */
  async getInstrumentByIsin(isin: string): Promise<NordnetApiResponse<NordnetInstrument[]>> {
    return this.request<NordnetInstrument[]>('GET', `/instruments?isin=${isin}`);
  }

  // ============================================
  // Orders
  // ============================================

  /**
   * Get all orders for an account
   */
  async getOrders(accno: number): Promise<NordnetApiResponse<NordnetOrder[]>> {
    return this.request<NordnetOrder[]>('GET', `/accounts/${accno}/orders`);
  }

  /**
   * Place an order
   */
  async placeOrder(
    accno: number,
    order: NordnetOrderRequest
  ): Promise<NordnetApiResponse<NordnetOrder>> {
    return this.request<NordnetOrder>('POST', `/accounts/${accno}/orders`, order);
  }

  /**
   * Modify an order
   */
  async modifyOrder(
    accno: number,
    orderId: number,
    updates: Partial<NordnetOrderRequest>
  ): Promise<NordnetApiResponse<NordnetOrder>> {
    return this.request<NordnetOrder>('PUT', `/accounts/${accno}/orders/${orderId}`, updates);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(accno: number, orderId: number): Promise<NordnetApiResponse<void>> {
    return this.request<void>('DELETE', `/accounts/${accno}/orders/${orderId}`);
  }

  // ============================================
  // Trades
  // ============================================

  /**
   * Get trades for an account
   */
  async getTrades(accno: number): Promise<NordnetApiResponse<NordnetTrade[]>> {
    return this.request<NordnetTrade[]>('GET', `/accounts/${accno}/trades`);
  }

  // ============================================
  // Markets
  // ============================================

  /**
   * Get market info
   */
  async getMarkets(): Promise<NordnetApiResponse<any[]>> {
    return this.request<any[]>('GET', '/markets');
  }

  /**
   * Get trading calendar
   */
  async getTradingCalendar(marketId: number): Promise<NordnetApiResponse<any>> {
    return this.request<any>('GET', `/markets/${marketId}/trading_calendar`);
  }
}

/**
 * Create a Nordnet client from environment variables
 */
export function createNordnetClientFromEnv(): NordnetClient | null {
  const apiKey = process.env.NORDNET_API_KEY;
  const country = process.env.NORDNET_COUNTRY as NordnetCountry | undefined;
  const privateKeyPath = process.env.NORDNET_PRIVATE_KEY_PATH;
  const privateKeyContent = process.env.NORDNET_PRIVATE_KEY;

  if (!apiKey || !country) {
    console.warn('Nordnet API credentials not configured');
    return null;
  }

  if (!privateKeyPath && !privateKeyContent) {
    console.warn('Nordnet private key not configured');
    return null;
  }

  return new NordnetClient({
    apiKey,
    country,
    privateKeyPath,
    privateKeyContent,
  });
}

/**
 * Singleton instance for server-side usage
 */
let clientInstance: NordnetClient | null = null;

export function getNordnetClient(): NordnetClient | null {
  if (!clientInstance) {
    clientInstance = createNordnetClientFromEnv();
  }
  return clientInstance;
}
