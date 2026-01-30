# Nordnet External API v2 Integration

This document describes how to set up and use the Nordnet External API v2 integration in the Claude Trading Intelligence System (CTIS).

## Overview

The Nordnet integration allows you to:
- View your Nordnet accounts and balances
- Fetch real-time portfolio positions
- Search for instruments (stocks, ETFs, etc.)
- Subscribe to real-time price feeds
- Place and manage orders (future feature)

## Prerequisites

1. **Nordnet Account**: You need an active Nordnet account in Sweden, Norway, Denmark, or Finland.

2. **API Access**: Request API access from Nordnet:
   - Visit [Nordnet External API](https://www.nordnet.se/externalapi) (or your country's equivalent)
   - Contact Nordnet Trading Support to get started

3. **SSH Key Pair**: Generate an ed25519 SSH key pair for authentication.

## Setup Instructions

### Step 1: Generate SSH Key Pair

The Nordnet API uses ed25519 SSH keys for authentication. Generate a key pair:

```bash
# Generate ed25519 key pair
ssh-keygen -t ed25519 -f ~/.ssh/nordnet_ed25519 -C "nordnet-api"

# This creates:
# - ~/.ssh/nordnet_ed25519 (private key - keep this SECRET!)
# - ~/.ssh/nordnet_ed25519.pub (public key - upload to Nordnet)
```

**Important**:
- Never share your private key
- Keep a secure backup
- The private key should not have a passphrase for automated use (or handle passphrase in code)

### Step 2: Upload Public Key to Nordnet

1. Log in to your Nordnet account
2. Navigate to the External API section
3. Upload your public key (`~/.ssh/nordnet_ed25519.pub`)
4. Nordnet will provide you with an **API Key**

### Step 3: Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Nordnet API Configuration
NORDNET_API_KEY=your-api-key-from-nordnet
NORDNET_COUNTRY=se  # se, no, dk, or fi
NORDNET_PRIVATE_KEY_PATH=/home/user/.ssh/nordnet_ed25519

# OR provide key content directly (for deployment/CI)
# NORDNET_PRIVATE_KEY="-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----"
```

### Step 4: Verify Setup

Start the development server and check the status endpoint:

```bash
npm run dev
```

Visit `http://localhost:3000/api/nordnet/status` to verify:

```json
{
  "configured": true,
  "available": true,
  "validVersion": true,
  "authenticated": false
}
```

## API Endpoints

### Status Check
```
GET /api/nordnet/status
```

Returns API configuration and availability status.

### Authentication
```
POST /api/nordnet/auth   # Authenticate
DELETE /api/nordnet/auth # Logout
```

### Accounts
```
GET /api/nordnet/accounts
```

Returns all your Nordnet accounts.

### Positions
```
GET /api/nordnet/positions           # All positions across all accounts
GET /api/nordnet/positions?accno=123 # Positions for specific account
```

Returns portfolio positions with computed P&L fields.

### Instruments Search
```
GET /api/nordnet/instruments?q=AAPL         # Search by name/symbol
GET /api/nordnet/instruments?id=123         # Get by instrument ID
GET /api/nordnet/instruments?isin=US0378... # Get by ISIN code
```

## Usage Examples

### TypeScript/JavaScript Client

```typescript
import { NordnetClient } from './app/lib/nordnet';

// Create client
const client = new NordnetClient({
  apiKey: process.env.NORDNET_API_KEY!,
  country: 'se',
  privateKeyPath: process.env.NORDNET_PRIVATE_KEY_PATH,
});

// Authenticate
const session = await client.authenticate();
console.log('Session expires in:', session.data?.expires_in, 'seconds');

// Get accounts
const accounts = await client.getAccounts();
console.log('Accounts:', accounts.data);

// Get positions
const positions = await client.getAllPositions();
console.log('Positions:', positions.data);

// Search instruments
const results = await client.searchInstruments('Apple');
console.log('Found:', results.data);
```

### React Hook (Frontend)

```typescript
// In your component
const [positions, setPositions] = useState([]);

useEffect(() => {
  fetch('/api/nordnet/positions')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setPositions(data.positions);
      }
    });
}, []);
```

### Real-time Price Feed

```typescript
import { NordnetFeedClient, NORDNET_MARKETS } from './app/lib/nordnet';

// After authentication
const feed = new NordnetFeedClient(session.data, 'public', {
  onConnect: () => console.log('Connected to feed'),
  onPrice: (price) => {
    console.log(`${price.i}: ${price.last} (${price.bid}/${price.ask})`);
  },
});

await feed.connect();

// Subscribe to Ericsson B on Stockholm Large Cap
feed.subscribePrice(NORDNET_MARKETS.STOCKHOLM_LARGE_CAP, '101');
```

## Authentication Flow

The Nordnet API uses a challenge-response authentication:

```
1. Client → POST /api/2/login/start { api_key }
2. Server → { challenge: "uuid" }
3. Client: Sign challenge with ed25519 private key
4. Client → POST /api/2/login/verify { api_key, signature }
5. Server → { session_key, expires_in, feeds... }
```

Sessions expire after 30 minutes (1800 seconds). The client handles re-authentication automatically.

## Market IDs

Common Nordnet market IDs:

| Market | ID |
|--------|-----|
| Stockholm Large Cap | 11 |
| Stockholm Mid Cap | 12 |
| Stockholm Small Cap | 13 |
| First North Stockholm | 27 |
| Copenhagen | 14 |
| Helsinki | 15 |
| Oslo | 16 |
| NYSE | 2 |
| NASDAQ | 3 |
| XETRA | 7 |

## Error Handling

All API responses follow this structure:

```typescript
interface NordnetApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```

Common error codes:
- `NOT_AUTHENTICATED` - Session expired or not logged in
- `INVALID_SIGNATURE` - Authentication signature invalid
- `NETWORK_ERROR` - Network connectivity issue
- `RATE_LIMITED` - Too many requests

## Rate Limiting

The client includes built-in rate limiting (100ms between requests by default). Adjust if needed:

```typescript
// In client.ts
private rateLimitDelay = 100; // milliseconds
```

## Security Best Practices

1. **Never commit credentials**: Use environment variables
2. **Restrict key permissions**: `chmod 600 ~/.ssh/nordnet_ed25519`
3. **Use separate keys**: Don't reuse keys for other services
4. **Monitor API usage**: Check Nordnet's API dashboard
5. **Rotate keys periodically**: Generate new keys annually

## Troubleshooting

### "Not authenticated" errors
- Check that your API key is correct
- Verify your private key path
- Ensure the private key matches the public key uploaded to Nordnet

### "Invalid signature" errors
- Verify you're using an ed25519 key (not RSA)
- Check the key file format (OpenSSH format required)
- Ensure no passphrase on the key (or handle it in code)

### "Connection refused" errors
- Check your internet connection
- Verify the country code matches your Nordnet account
- Contact Nordnet support if API is down

## Resources

- [Nordnet External API Documentation](https://www.nordnet.se/externalapi/docs)
- [Nordnet API Examples (Python)](https://github.com/nordnet/next-api-v2-examples)
- [ed25519 Key Generation](https://man.openbsd.org/ssh-keygen)

## Support

For API access and technical issues:
- Contact Nordnet Trading Support
- Email: trading@nordnet.se (Sweden)

For integration issues with CTIS:
- Open an issue on GitHub
