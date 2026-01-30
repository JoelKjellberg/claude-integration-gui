/**
 * Nordnet Authentication
 * POST /api/nordnet/auth - Authenticate with Nordnet
 * DELETE /api/nordnet/auth - Logout
 */

import { NextResponse } from 'next/server';
import { getNordnetClient } from '../../../lib/nordnet';

export async function POST() {
  try {
    const client = getNordnetClient();

    if (!client) {
      return NextResponse.json(
        { error: 'Nordnet API not configured' },
        { status: 503 }
      );
    }

    // Check if already authenticated
    if (client.getState().isAuthenticated) {
      return NextResponse.json({
        success: true,
        message: 'Already authenticated',
        session: {
          expiresAt: client.getState().sessionExpiry,
        },
      });
    }

    // Authenticate
    const result = await client.authenticate();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        expiresIn: result.data?.expires_in,
        publicFeed: result.data?.public_feed,
        privateFeed: result.data?.private_feed,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const client = getNordnetClient();

    if (!client) {
      return NextResponse.json(
        { error: 'Nordnet API not configured' },
        { status: 503 }
      );
    }

    await client.logout();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      },
      { status: 500 }
    );
  }
}
