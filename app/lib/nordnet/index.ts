/**
 * Nordnet API Integration - Main Export
 */

// Client
export {
  NordnetClient,
  createNordnetClientFromEnv,
  getNordnetClient,
  getNordnetBaseUrl,
  signChallenge,
} from './client';

// Feed
export {
  NordnetFeedClient,
  NORDNET_MARKETS,
  COMMON_INSTRUMENTS,
  type FeedType,
  type SubscriptionType,
  type FeedSubscription,
  type FeedEventHandlers,
} from './feed';

// Types (re-export for convenience)
export type {
  NordnetConfig,
  NordnetCountry,
  NordnetApiStatus,
  NordnetSession,
  NordnetAuthChallenge,
  NordnetAccount,
  NordnetAccountInfo,
  NordnetPosition,
  NordnetInstrument,
  NordnetTradable,
  NordnetOrder,
  NordnetOrderRequest,
  NordnetTrade,
  NordnetSearchResult,
  NordnetPriceData,
  NordnetApiResponse,
  NordnetApiError,
  NordnetClientState,
} from '../../types/nordnet';
