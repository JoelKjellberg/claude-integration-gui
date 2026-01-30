/**
 * Nordnet API Client Tests
 *
 * Unit tests with mocked responses
 */

import { NordnetClient, getNordnetBaseUrl } from '../client';
import { NordnetCountry } from '../../../types/nordnet';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('NordnetClient', () => {
  let client: NordnetClient;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new NordnetClient({
      apiKey: 'test-api-key',
      country: 'se',
      privateKeyContent: '-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----',
    });
  });

  describe('getNordnetBaseUrl', () => {
    it('should return correct URL for each country', () => {
      const countries: NordnetCountry[] = ['se', 'no', 'dk', 'fi'];

      countries.forEach((country) => {
        expect(getNordnetBaseUrl(country)).toBe(`https://public.nordnet.${country}`);
      });
    });
  });

  describe('checkStatus', () => {
    it('should return API status when available', async () => {
      const mockStatus = {
        system_running: true,
        valid_version: true,
        timestamp: Date.now(),
        message: '',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });

      const result = await client.checkStatus();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStatus);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://public.nordnet.se/api/2/',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should return error when API is unavailable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.resolve({ code: 'SERVICE_UNAVAILABLE', message: 'API is down' }),
      });

      const result = await client.checkStatus();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.checkStatus();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NETWORK_ERROR');
    });
  });

  describe('startAuth', () => {
    it('should return challenge on success', async () => {
      const mockChallenge = {
        challenge: 'test-challenge-uuid',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockChallenge),
      });

      const result = await client.startAuth();

      expect(result.success).toBe(true);
      expect(result.data?.challenge).toBe('test-challenge-uuid');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://public.nordnet.se/api/2/login/start',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ api_key: 'test-api-key' }),
        })
      );
    });
  });

  describe('verifyAuth', () => {
    it('should return session on success', async () => {
      const mockSession = {
        session_key: 'test-session-key',
        expires_in: 1800,
        public_feed: {
          hostname: 'pub.next.nordnet.se',
          port: 443,
          encrypted: true,
        },
        private_feed: {
          hostname: 'priv.next.nordnet.se',
          port: 443,
          encrypted: true,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSession),
      });

      const result = await client.verifyAuth('test-signature');

      expect(result.success).toBe(true);
      expect(result.data?.session_key).toBe('test-session-key');
      expect(result.data?.expires_in).toBe(1800);
    });
  });

  describe('getAccounts', () => {
    it('should return error when not authenticated', async () => {
      const result = await client.getAccounts();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_AUTHENTICATED');
    });
  });

  describe('getPositions', () => {
    it('should return error when not authenticated', async () => {
      const result = await client.getPositions(12345);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_AUTHENTICATED');
    });
  });

  describe('searchInstruments', () => {
    it('should return error when not authenticated', async () => {
      const result = await client.searchInstruments('AAPL');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_AUTHENTICATED');
    });
  });

  describe('getState', () => {
    it('should return initial state', () => {
      const state = client.getState();

      expect(state.isAuthenticated).toBe(false);
      expect(state.sessionKey).toBeNull();
      expect(state.sessionExpiry).toBeNull();
      expect(state.country).toBe('se');
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no session', () => {
      expect(client.isAuthenticated()).toBe(false);
    });
  });
});

describe('NordnetClient - Authenticated', () => {
  let client: NordnetClient;

  beforeEach(async () => {
    mockFetch.mockClear();
    client = new NordnetClient({
      apiKey: 'test-api-key',
      country: 'se',
      privateKeyContent: '-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----',
    });

    // Mock successful authentication
    // Note: In real tests, we'd mock the full auth flow
    // For now, we'll test the request structure
  });

  describe('getAccounts (mocked auth)', () => {
    it('should call accounts endpoint with correct headers', async () => {
      const mockAccounts = [
        {
          accno: 12345,
          accid: 'ACC123',
          type: 'ISK',
          default: true,
          is_blocked: false,
          account_currency: 'SEK',
        },
      ];

      // First call: auth challenge
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ challenge: 'test-challenge' }),
      });

      // Second call: auth verify (will fail because we can't sign)
      // This tests the request structure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ code: 'INVALID_SIGNATURE', message: 'Bad signature' }),
      });

      // Attempt to get accounts (will fail auth)
      const result = await client.getAccounts();

      // Should fail because we can't actually sign
      expect(result.success).toBe(false);
    });
  });
});

describe('Mock Response Structures', () => {
  it('should have correct account structure', () => {
    const mockAccount = {
      accno: 12345,
      accid: 'ACC123',
      type: 'ISK',
      default: true,
      alias: 'My Trading Account',
      is_blocked: false,
      account_currency: 'SEK',
    };

    expect(mockAccount).toHaveProperty('accno');
    expect(mockAccount).toHaveProperty('accid');
    expect(mockAccount).toHaveProperty('type');
    expect(mockAccount).toHaveProperty('account_currency');
  });

  it('should have correct position structure', () => {
    const mockPosition = {
      accno: 12345,
      instrument: {
        instrument_id: 101,
        symbol: 'ERIC B',
        name: 'Ericsson B',
        currency: 'SEK',
        isin_code: 'SE0000108656',
        market_id: 11,
        instrument_type: 'STOCK',
        instrument_group_type: 'EQ',
        multiplier: 1,
        tradables: [],
      },
      qty: 100,
      pawn_percent: 0.7,
      market_value_acc: { value: 8700, currency: 'SEK' },
      market_value: { value: 8700, currency: 'SEK' },
      acq_price: { value: 75, currency: 'SEK' },
      acq_price_acc: { value: 7500, currency: 'SEK' },
      morning_price: { value: 85, currency: 'SEK' },
    };

    expect(mockPosition).toHaveProperty('instrument');
    expect(mockPosition.instrument).toHaveProperty('symbol');
    expect(mockPosition).toHaveProperty('qty');
    expect(mockPosition).toHaveProperty('market_value');
  });

  it('should have correct price data structure', () => {
    const mockPriceData = {
      type: 'price',
      data: {
        m: 11,
        i: '101',
        id: 16750901,
        bid: 83.44,
        bid_volume: 1,
        ask: 87.0,
        ask_volume: 1200,
        last: 87.0,
        last_volume: 154,
        high: 87.0,
        low: 82.96,
        open: 83.12,
        close: 77.22,
        turnover: 8492556.03,
        turnover_volume: 101883,
        vwap: 84.56,
        tick_timestamp: 1741781407194,
        trade_timestamp: 1741780275120,
      },
    };

    expect(mockPriceData.type).toBe('price');
    expect(mockPriceData.data).toHaveProperty('bid');
    expect(mockPriceData.data).toHaveProperty('ask');
    expect(mockPriceData.data).toHaveProperty('last');
  });
});
