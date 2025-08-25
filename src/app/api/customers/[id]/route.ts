import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decryptCustomerData } from '@/lib/utils/customerEncryption';
import { withAuth, AuthenticatedRequest } from '@/lib/utils/authMiddleware';

export const GET = withAuth(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const customerId = parseInt(id);
      if (isNaN(customerId)) {
        return NextResponse.json(
          { error: 'Invalid customer ID' },
          { status: 400 }
        );
      }

      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId)
      });

      if (!customer) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }

             const decryptedCustomer = decryptCustomerData(customer);
       return NextResponse.json(decryptedCustomer);
     } catch (error) {
       console.error('Error fetching customer:', error);
       return NextResponse.json(
         { error: 'Failed to fetch customer' },
         { status: 500 }
       );
     }
   }
 );

export const DELETE = withAuth(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const customerId = parseInt(id);
      if (isNaN(customerId)) {
        return NextResponse.json(
          { error: 'Invalid customer ID' },
          { status: 400 }
        );
      }

      // Check if customer exists
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId)
      });

      if (!customer) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }

      // Delete the customer
      await db.delete(customers).where(eq(customers.id, customerId));

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting customer:', error);
      return NextResponse.json(
        { error: 'Failed to delete customer' },
        { status: 500 }
      );
    }
  }
); 