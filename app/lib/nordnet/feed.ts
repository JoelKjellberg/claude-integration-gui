/**
 * Nordnet Real-time Feed Client
 *
 * Handles WebSocket connections to Nordnet's public and private feeds
 * for real-time price updates, order updates, etc.
 */

import {
  NordnetSession,
  NordnetFeedCommand,
  NordnetFeedLoginArgs,
  NordnetFeedSubscribeArgs,
  NordnetPriceData,
} from '../../types/nordnet';

const SERVICE_NAME = 'NEXTAPI';

export type FeedType = 'public' | 'private';
export type SubscriptionType = 'price' | 'depth' | 'trade' | 'indicator';

export interface FeedSubscription {
  type: SubscriptionType;
  marketId: number;
  identifier: string;
}

export interface FeedEventHandlers {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onPrice?: (data: NordnetPriceData['data']) => void;
  onDepth?: (data: any) => void;
  onTrade?: (data: any) => void;
  onIndicator?: (data: any) => void;
  onHeartbeat?: () => void;
  onMessage?: (data: any) => void;
}

/**
 * Nordnet Feed Client for real-time data
 *
 * Note: This is designed for server-side usage with Node.js WebSocket
 * For browser usage, you'd need to proxy through an API route
 */
export class NordnetFeedClient {
  private session: NordnetSession;
  private feedType: FeedType;
  private ws: WebSocket | null = null;
  private handlers: FeedEventHandlers;
  private subscriptions: Map<string, FeedSubscription> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private buffer = '';

  constructor(session: NordnetSession, feedType: FeedType, handlers: FeedEventHandlers = {}) {
    this.session = session;
    this.feedType = feedType;
    this.handlers = handlers;
  }

  /**
   * Get feed connection info
   */
  private getFeedInfo() {
    return this.feedType === 'public' ? this.session.public_feed : this.session.private_feed;
  }

  /**
   * Connect to the feed
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const feedInfo = this.getFeedInfo();
      const protocol = feedInfo.encrypted ? 'wss' : 'ws';
      const url = `${protocol}://${feedInfo.hostname}:${feedInfo.port}`;

      try {
        // For Node.js, we need the 'ws' package
        // For browser, native WebSocket works
        if (typeof window === 'undefined') {
          // Server-side: use dynamic import for ws package
          import('ws').then(({ default: WebSocket }) => {
            this.ws = new WebSocket(url) as any;
            this.setupEventHandlers(resolve, reject);
          }).catch(reject);
        } else {
          // Browser-side
          this.ws = new WebSocket(url);
          this.setupEventHandlers(resolve, reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(resolve: () => void, reject: (error: Error) => void): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Send login command
      this.login()
        .then(() => {
          this.handlers.onConnect?.();
          resolve();
        })
        .catch(reject);
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      this.handlers.onDisconnect?.();
      this.attemptReconnect();
    };

    this.ws.onerror = (event: any) => {
      const error = new Error(event.message || 'WebSocket error');
      this.handlers.onError?.(error);
      reject(error);
    };

    this.ws.onmessage = (event: any) => {
      this.handleMessage(event.data);
    };
  }

  /**
   * Handle incoming messages (may be partial JSON)
   */
  private handleMessage(data: string): void {
    this.buffer += data;

    // Messages are newline-delimited JSON
    const lines = this.buffer.split('\n');

    // Process complete lines
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        try {
          const json = JSON.parse(line);
          this.processMessage(json);
        } catch (error) {
          // Not valid JSON, skip
          console.warn('Invalid JSON from feed:', line);
        }
      }
    }

    // Keep incomplete last line in buffer
    this.buffer = lines[lines.length - 1];
  }

  /**
   * Process a parsed message
   */
  private processMessage(message: any): void {
    this.handlers.onMessage?.(message);

    switch (message.type) {
      case 'price':
        this.handlers.onPrice?.(message.data);
        break;
      case 'depth':
        this.handlers.onDepth?.(message.data);
        break;
      case 'trade':
        this.handlers.onTrade?.(message.data);
        break;
      case 'indicator':
        this.handlers.onIndicator?.(message.data);
        break;
      case 'heartbeat':
        this.handlers.onHeartbeat?.();
        break;
      default:
        // Unknown message type
        break;
    }
  }

  /**
   * Send a command to the feed
   */
  private send(command: NordnetFeedCommand): void {
    if (!this.ws || !this.isConnected) {
      throw new Error('Not connected to feed');
    }

    const message = JSON.stringify(command) + '\n';
    this.ws.send(message);
  }

  /**
   * Login to the feed
   */
  private async login(): Promise<void> {
    const command: NordnetFeedCommand = {
      cmd: 'login',
      args: {
        session_key: this.session.session_key,
        service: SERVICE_NAME,
      },
    };

    this.send(command);
  }

  /**
   * Subscribe to price updates for an instrument
   */
  subscribe(subscription: FeedSubscription): void {
    const key = `${subscription.type}:${subscription.marketId}:${subscription.identifier}`;

    if (this.subscriptions.has(key)) {
      return; // Already subscribed
    }

    const command: NordnetFeedCommand = {
      cmd: 'subscribe',
      args: {
        t: subscription.type,
        m: subscription.marketId,
        i: subscription.identifier,
      },
    };

    if (this.isConnected) {
      this.send(command);
    }

    this.subscriptions.set(key, subscription);
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribe(subscription: FeedSubscription): void {
    const key = `${subscription.type}:${subscription.marketId}:${subscription.identifier}`;

    if (!this.subscriptions.has(key)) {
      return; // Not subscribed
    }

    const command: NordnetFeedCommand = {
      cmd: 'unsubscribe',
      args: {
        t: subscription.type,
        m: subscription.marketId,
        i: subscription.identifier,
      },
    };

    if (this.isConnected) {
      this.send(command);
    }

    this.subscriptions.delete(key);
  }

  /**
   * Subscribe to price updates for a stock
   */
  subscribePrice(marketId: number, identifier: string): void {
    this.subscribe({ type: 'price', marketId, identifier });
  }

  /**
   * Attempt to reconnect on disconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      console.log(`Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.connect()
        .then(() => {
          // Re-subscribe to all previous subscriptions
          for (const subscription of this.subscriptions.values()) {
            this.subscribe(subscription);
          }
        })
        .catch((error) => {
          console.error('Reconnection failed:', error);
        });
    }, delay);
  }

  /**
   * Disconnect from the feed
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.subscriptions.clear();
    this.buffer = '';
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Get active subscriptions
   */
  getSubscriptions(): FeedSubscription[] {
    return Array.from(this.subscriptions.values());
  }
}

/**
 * Common Swedish market IDs on Nordnet
 */
export const NORDNET_MARKETS = {
  // Stockholm
  STOCKHOLM_LARGE_CAP: 11,
  STOCKHOLM_MID_CAP: 12,
  STOCKHOLM_SMALL_CAP: 13,
  FIRST_NORTH_STOCKHOLM: 27,

  // Copenhagen
  COPENHAGEN: 14,
  FIRST_NORTH_COPENHAGEN: 28,

  // Helsinki
  HELSINKI: 15,
  FIRST_NORTH_HELSINKI: 29,

  // Oslo
  OSLO: 16,
  OSLO_EXPAND: 17,

  // US Markets
  NYSE: 2,
  NASDAQ: 3,
  AMEX: 4,

  // European
  XETRA: 7,
  LSE: 6,
} as const;

/**
 * Common instrument identifiers
 * Format: market_id:identifier
 */
export const COMMON_INSTRUMENTS = {
  // Swedish stocks
  'ERIC_B': { marketId: 11, identifier: '101' },
  'VOLV_B': { marketId: 11, identifier: '366' },
  'HM_B': { marketId: 11, identifier: '159' },

  // US stocks (via Nordnet)
  // Note: identifiers vary, need to look up via search
} as const;
