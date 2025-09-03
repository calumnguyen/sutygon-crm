import { NextRequest, NextResponse } from 'next/server';
import { getOrderItems, createOrderItem } from '@/lib/actions/orders';
import { validateApiSession } from '@/lib/utils/authMiddleware';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const items = await getOrderItems(orderId);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching order items:', error);
    return NextResponse.json({ error: 'Failed to fetch order items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authenticate the request
    const requestId = `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const authResult = await validateApiSession(request, requestId);
    if (!authResult.success) {
      return authResult.response!;
    }

    const { id } = await params;
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      name,
      size,
      quantity,
      price,
      isExtension = false,
      extraDays,
      feeType,
      percent,
      isCustom = false,
    } = body;

    // Validate required fields
    if (!name || !size || !quantity || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create the order item
    const newItem = await createOrderItem({
      orderId,
      inventoryItemId: isCustom ? null : null, // For extensions and custom items, set to null
      name,
      size,
      quantity,
      price,
      isExtension,
      extraDays,
      feeType,
      percent,
      isCustom,
      formattedId: null, // Will be set by the function
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error creating order item:', error);
    return NextResponse.json({ error: 'Failed to create order item' }, { status: 500 });
  }
}
