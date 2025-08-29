import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { orderDiscounts } from '@/lib/db/schema';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; discountId: string }> }
) {
  try {
    const { id, discountId } = await params;

    console.log('Deleting discount:', { orderId: id, discountId });

    // Delete the discount
    await db.delete(orderDiscounts).where(eq(orderDiscounts.id, parseInt(discountId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting discount:', error);
    return NextResponse.json({ error: 'Failed to delete discount' }, { status: 500 });
  }
}
