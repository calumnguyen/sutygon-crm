import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// For now, we'll store the tax invoice status in the documentType field
// This is a temporary solution until we can add the proper column
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const body = await request.json();
    const { taxInvoiceExported } = body;

    if (typeof taxInvoiceExported !== 'boolean') {
      return NextResponse.json({ error: 'taxInvoiceExported must be a boolean' }, { status: 400 });
    }

    // For now, we'll store this in the documentType field as a special value
    // This is a temporary solution
    const taxInvoiceStatus = taxInvoiceExported
      ? 'TAX_INVOICE_EXPORTED:true'
      : 'TAX_INVOICE_EXPORTED:false';

    const [updatedOrder] = await db
      .update(orders)
      .set({
        documentType: taxInvoiceStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      taxInvoiceExported,
    });
  } catch (error) {
    console.error('Error updating tax invoice export status:', error);
    return NextResponse.json(
      { error: 'Failed to update tax invoice export status' },
      { status: 500 }
    );
  }
}

// GET endpoint to check current status
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if tax invoice is exported by looking at documentType
    const taxInvoiceExported = order.documentType === 'TAX_INVOICE_EXPORTED:true';

    return NextResponse.json({
      success: true,
      taxInvoiceExported,
    });
  } catch (error) {
    console.error('Error getting tax invoice export status:', error);
    return NextResponse.json({ error: 'Failed to get tax invoice export status' }, { status: 500 });
  }
}
