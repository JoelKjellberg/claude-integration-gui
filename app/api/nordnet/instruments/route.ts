/**
 * Nordnet Instruments Search
 * GET /api/nordnet/instruments?q=AAPL - Search for instruments
 * GET /api/nordnet/instruments?id=123 - Get instrument by ID
 * GET /api/nordnet/instruments?isin=US0378331005 - Get instrument by ISIN
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

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const instrumentId = searchParams.get('id');
    const isin = searchParams.get('isin');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Get instrument by ID
    if (instrumentId) {
      const result = await client.getInstrument(parseInt(instrumentId, 10));

      if (!result.success) {
        return NextResponse.json(
          { error: 'Instrument not found', details: result.error },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        instrument: result.data,
      });
    }

    // Get instrument by ISIN
    if (isin) {
      const result = await client.getInstrumentByIsin(isin);

      if (!result.success) {
        return NextResponse.json(
          { error: 'Instrument not found', details: result.error },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        instruments: result.data,
      });
    }

    // Search by query
    if (query) {
      const result = await client.searchInstruments(query, limit);

      if (!result.success) {
        return NextResponse.json(
          { error: 'Search failed', details: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        instruments: result.data,
        query,
        count: result.data?.length ?? 0,
      });
    }

    // No search parameters provided
    return NextResponse.json(
      {
        error: 'Missing search parameter',
        hint: 'Use ?q=AAPL for search, ?id=123 for ID lookup, or ?isin=US0378331005 for ISIN lookup',
      },
      { status: 400 }
    );
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
