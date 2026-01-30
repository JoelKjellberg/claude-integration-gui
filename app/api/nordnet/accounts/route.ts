/**
 * Nordnet Accounts
 * GET /api/nordnet/accounts - Get all accounts
 */

import { NextResponse } from 'next/server';
import { getNordnetClient } from '../../../lib/nordnet';

export async function GET() {
  try {
    const client = getNordnetClient();

    if (!client) {
      return NextResponse.json(
        { error: 'Nordnet API not configured' },
        { status: 503 }
      );
    }

    // Check authentication
    if (!client.getState().isAuthenticated) {
      // Try to authenticate
      const authResult = await client.authenticate();
      if (!authResult.success) {
        return NextResponse.json(
          { error: 'Not authenticated', details: authResult.error },
          { status: 401 }
        );
      }
    }

    // Get accounts
    const result = await client.getAccounts();

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch accounts', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      accounts: result.data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
