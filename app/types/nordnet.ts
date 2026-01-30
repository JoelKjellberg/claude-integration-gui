/**
 * Nordnet External API v2 Type Definitions
 *
 * Based on: https://github.com/nordnet/next-api-v2-examples
 * Documentation: https://www.nordnet.se/externalapi/docs
 */

// Supported Nordnet countries
export type NordnetCountry = 'se' | 'no' | 'dk' | 'fi';

// API Configuration
export interface NordnetConfig {
  apiKey: string;
  privateKeyPath?: string;      // Path to ed25519 private key file
  privateKeyContent?: string;   // Or provide key content directly
  country: NordnetCountry;
}

// Authentication
export interface NordnetAuthChallenge {
  challenge: string;
}

export interface NordnetSession {
  session_key: string;
  expires_in: number;
  public_feed: NordnetFeedInfo;
  private_feed: NordnetFeedInfo;
}

export interface NordnetFeedInfo {
  hostname: string;
  port: number;
  encrypted: boolean;
}

// API Status
export interface NordnetApiStatus {
  system_running: boolean;
  valid_version: boolean;
  timestamp: number;
  message: string;
}

// Account Information
export interface NordnetAccount {
  accno: number;
  accid: string;
  type: string;
  default: boolean;
  alias?: string;
  is_blocked: boolean;
  account_currency: string;
}

export interface NordnetAccountInfo {
  account_credit: NordnetAmount;
  account_sum: NordnetAmount;
  collateral: NordnetAmount;
  credit_account_sum: NordnetAmount;
  forward_sum: NordnetAmount;
  future_sum: NordnetAmount;
  loan_limit: NordnetAmount;
  own_capital: NordnetAmount;
  own_capital_morning: NordnetAmount;
  pawn_value: NordnetAmount;
  trading_power: NordnetAmount;
  unrealized_future_profit_loss: NordnetAmount;
}

export interface NordnetAmount {
  value: number;
  currency: string;
}

// Portfolio / Positions
export interface NordnetPosition {
  accno: number;
  instrument: NordnetInstrument;
  qty: number;
  pawn_percent: number;
  market_value_acc: NordnetAmount;
  market_value: NordnetAmount;
  acq_price: NordnetAmount;
  acq_price_acc: NordnetAmount;
  morning_price: NordnetAmount;
}

export interface NordnetInstrument {
  instrument_id: number;
  tradables: NordnetTradable[];
  currency: string;
  instrument_group_type: string;
  instrument_type: string;
  multiplier: number;
  symbol: string;
  isin_code: string;
  market_id: number;
  name: string;
  sector?: string;
  sector_group?: string;
}

export interface NordnetTradable {
  market_id: number;
  identifier: string;
  tick_size_id: number;
  lot_size: number;
  display_order: number;
}

// Price Data (from feed)
export interface NordnetPriceData {
  type: 'price';
  data: {
    m: number;           // market_id
    i: string;           // identifier
    id: number;          // price_id
    bid: number;
    bid_volume: number;
    ask: number;
    ask_volume: number;
    last: number;
    last_volume: number;
    high: number;
    low: number;
    open: number;
    close: number;
    turnover: number;
    turnover_volume: number;
    vwap: number;
    tick_timestamp: number;
    trade_timestamp: number;
  };
}

// Orders
export interface NordnetOrder {
  order_id: number;
  price: NordnetAmount;
  volume: number;
  tradable: NordnetTradable;
  open_volume: number;
  traded_volume: number;
  side: 'BUY' | 'SELL';
  order_type: 'LIMIT' | 'MARKET' | 'STOP_LOSS' | 'STOP_LIMIT';
  validity: NordnetValidity;
  action_state: string;
  order_state: string;
}

export interface NordnetValidity {
  type: 'DAY' | 'GTC' | 'IOC' | 'FOK';
  valid_until?: string;
}

export interface NordnetOrderRequest {
  identifier: string;
  market_id: number;
  price?: number;
  volume: number;
  side: 'BUY' | 'SELL';
  order_type: 'LIMIT' | 'MARKET';
  currency: string;
  valid_until?: string;
}

// Trades / Transactions
export interface NordnetTrade {
  trade_id: number;
  accno: number;
  order_id: number;
  tradable: NordnetTradable;
  price: NordnetAmount;
  volume: number;
  side: 'BUY' | 'SELL';
  counterparty?: string;
  tradetime: string;
  settlement_date?: string;
}

// Market Info
export interface NordnetMarket {
  market_id: number;
  country: string;
  name: string;
  currency: string;
}

// Search Results
export interface NordnetSearchResult {
  instrument_id: number;
  symbol: string;
  name: string;
  isin_code: string;
  instrument_type: string;
  currency: string;
  market_id: number;
}

// Feed Commands
export interface NordnetFeedCommand {
  cmd: 'login' | 'subscribe' | 'unsubscribe';
  args: Record<string, any>;
}

export interface NordnetFeedLoginArgs {
  session_key: string;
  service: string;
}

export interface NordnetFeedSubscribeArgs {
  t: 'price' | 'depth' | 'trade' | 'indicator';
  m: number;    // market_id
  i: string;    // identifier
}

// API Error
export interface NordnetApiError {
  code: string;
  message: string;
}

// Client State
export interface NordnetClientState {
  isAuthenticated: boolean;
  sessionKey: string | null;
  sessionExpiry: Date | null;
  country: NordnetCountry;
}

// API Response wrapper
export interface NordnetApiResponse<T> {
  success: boolean;
  data?: T;
  error?: NordnetApiError;
}
