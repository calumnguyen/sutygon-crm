export interface ReceiptData {
  orderId: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  orderDate: string;
  rentDate: string;
  returnDate: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
  }>;
  totalAmount: number;
  vatAmount: number;
  depositAmount: number;
  paymentHistory?: Array<{
    date: string;
    method: 'cash' | 'qr';
    amount: number;
  }>;
  settlementInfo?: {
    remainingBalance: number;
    depositReturned: number;
    depositReturnedDate?: string;
    documentType?: string;
    documentReturned: boolean;
    documentReturnedDate?: string;
  };
  lastUpdated?: string;
}

export async function generateReceiptPDF(data: ReceiptData): Promise<void> {
  try {
    // Call the API route to generate PDF
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }

    // Get the PDF blob
    const pdfBlob = await response.blob();

    // Create download link
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;

    // Set filename
    const sanitizedCustomerName = data.customerName
      .replace(/[^a-zA-Z0-9\s\u00C0-\u017F]/g, '') // Keep Vietnamese characters
      .replace(/\s+/g, '_')
      .substring(0, 30); // Limit length
    const fileName = `Bien_Nhan_${data.orderId}_${sanitizedCustomerName}_${new Date().toISOString().split('T')[0]}.pdf`;
    link.download = fileName;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}
