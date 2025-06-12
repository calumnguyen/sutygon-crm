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
  return NextResponse.json(customer, { status: 201 });
}
