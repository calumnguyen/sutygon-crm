import { NextRequest, NextResponse } from 'next/server';
import { updateVATPercentage, getVATPercentage } from '@/lib/utils/storeSettings';

export async function GET() {
  try {
    const vatPercentage = await getVATPercentage();
    return NextResponse.json({ vatPercentage });
  } catch (error) {
    console.error('Error getting VAT percentage:', error);
    return NextResponse.json({ error: 'Failed to get VAT percentage' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { vatPercentage } = await request.json();
    
    if (typeof vatPercentage !== 'number' || vatPercentage < 0 || vatPercentage > 100) {
      return NextResponse.json({ error: 'Invalid VAT percentage' }, { status: 400 });
    }
    
    const success = await updateVATPercentage(vatPercentage);
    
    if (success) {
      return NextResponse.json({ success: true, vatPercentage });
    } else {
      return NextResponse.json({ error: 'Failed to update VAT percentage' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating VAT percentage:', error);
    return NextResponse.json({ error: 'Failed to update VAT percentage' }, { status: 500 });
  }
} 