import { NextRequest, NextResponse } from 'next/server';
import { getAllCustomers, createCustomer, getCustomerByPhone } from '@/lib/actions/customers';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  if (phone) {
    const customer = await getCustomerByPhone(phone);
    return NextResponse.json(customer?.[0] || null);
  }
  const customers = await getAllCustomers();
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const [customer] = await createCustomer(data);
  
  // Decrypt the customer data before returning to frontend
  const { decryptCustomerData } = await import('@/lib/utils/customerEncryption');
  const decryptedCustomer = decryptCustomerData(customer);
  
  return NextResponse.json(decryptedCustomer, { status: 201 });
}
