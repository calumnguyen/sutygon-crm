import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { paymentHistory, users } from '@/lib/db/schema';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    console.log('Fetching payment history for order:', id);

    // Fetch payment history with user details (only payments with actual amounts)
    const payments = await db
      .select({
        id: paymentHistory.id,
        orderId: paymentHistory.orderId,
        paymentMethod: paymentHistory.paymentMethod,
        amount: paymentHistory.amount,
        paymentDate: paymentHistory.paymentDate,
        processedByUser: {
          id: users.id,
          name: users.name,
        },
      })
      .from(paymentHistory)
      .leftJoin(users, eq(paymentHistory.processedByUserId, users.id))
      .where(and(eq(paymentHistory.orderId, parseInt(id)), sql`${paymentHistory.amount} > 0`))
      .orderBy(paymentHistory.paymentDate);

    console.log('Payment history found:', payments);

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json({ error: 'Failed to fetch payment history' }, { status: 500 });
  }
}
