import { NextRequest, NextResponse } from 'next/server';
import { getAllCustomers, createCustomer } from '@/lib/actions/customers';

export async function GET() {
  const customers = await getAllCustomers();
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const [customer] = await createCustomer(data);
  return NextResponse.json(customer, { status: 201 });
}
