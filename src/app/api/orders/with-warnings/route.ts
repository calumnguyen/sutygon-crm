import { NextRequest, NextResponse } from 'next/server';
import { getOrdersWithWarnings } from '@/lib/utils/warningService';
import { validateApiSession } from '@/lib/utils/authMiddleware';

export async function GET(request: NextRequest) {
  try {
    const requestId = `with-warnings-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const authResult = await validateApiSession(request, requestId);

    if (!authResult.success) {
      return authResult.response!;
    }

    const user = authResult.user;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const resolved = searchParams.get('resolved'); // 'true', 'false', or undefined for all

    let resolvedBoolean: boolean | undefined;
    if (resolved === 'true') {
      resolvedBoolean = true;
    } else if (resolved === 'false') {
      resolvedBoolean = false;
    }

    const result = await getOrdersWithWarnings(page, limit, resolvedBoolean);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching orders with warnings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
