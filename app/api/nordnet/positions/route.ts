/**
 * Nordnet Positions
 * GET /api/nordnet/positions - Get all positions across all accounts
 * GET /api/nordnet/positions?accno=123 - Get positions for a specific account
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNordnetClient } from '../../../lib/nordnet';

export async function GET(request: NextRequest) {
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
      const authResult = await client.authenticate();
      if (!authResult.success) {
        return NextResponse.json(
          { error: 'Not authenticated', details: authResult.error },
          { status: 401 }
        );
      }
    }

    // Check for specific account
    const accno = request.nextUrl.searchParams.get('accno');

    let result;
    if (accno) {
      result = await client.getPositions(parseInt(accno, 10));
    } else {
      result = await client.getAllPositions();
    }

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch positions', details: result.error },
        { status: 500 }
      );
    }

    // Transform positions to include useful computed fields
    const positions = result.data?.map((position) => ({
      ...position,
      // Computed fields
      currentValue: position.market_value?.value ?? 0,
      costBasis: position.acq_price?.value ? position.acq_price.value * position.qty : 0,
      unrealizedPnL:
        (position.market_value?.value ?? 0) -
        (position.acq_price?.value ? position.acq_price.value * position.qty : 0),
      unrealizedPnLPercent:
        position.acq_price?.value && position.qty
          ? (((position.market_value?.value ?? 0) -
              position.acq_price.value * position.qty) /
              (position.acq_price.value * position.qty)) *
            100
          : 0,
    }));

    return NextResponse.json({
      success: true,
      positions,
      count: positions?.length ?? 0,
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
