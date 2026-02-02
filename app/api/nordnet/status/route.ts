/**
 * Nordnet API Status Check
 * GET /api/nordnet/status
 *
 * Check if Nordnet API is available and credentials are configured.
 */

import { NextResponse } from 'next/server';
import { getNordnetClient } from '../../../lib/nordnet';

export async function GET() {
  try {
    const client = getNordnetClient();

    if (!client) {
      return NextResponse.json({
        configured: false,
        message: 'Nordnet API credentials not configured',
        instructions: 'Set NORDNET_API_KEY, NORDNET_COUNTRY, and NORDNET_PRIVATE_KEY_PATH in your .env file',
      });
    }

    // Check API status
    const statusResult = await client.checkStatus();

    if (!statusResult.success) {
      return NextResponse.json(
        {
          configured: true,
          available: false,
          error: statusResult.error,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      configured: true,
      available: statusResult.data?.system_running ?? false,
      validVersion: statusResult.data?.valid_version ?? false,
      timestamp: statusResult.data?.timestamp,
      authenticated: client.getState().isAuthenticated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
