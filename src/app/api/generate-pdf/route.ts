import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

interface ReceiptItem {
  id: string;
  inventoryItemId?: number | null;
  formattedId?: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Launch browser
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Create HTML content with proper Vietnamese characters
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
          body {
            font-family: 'Roboto', sans-serif;
            margin: 0;
            padding: 20px;
            font-size: 12px;
            line-height: 1.4;
          }
          .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #0066cc;
          }
          .company-info {
            text-align: right;
            font-size: 10px;
          }
          .description {
            text-align: center;
            margin: 15px 0;
            font-size: 11px;
          }
          .title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin: 20px 0;
          }
          .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .customer-info, .order-info {
            width: 45%;
          }
          .info-row {
            margin-bottom: 8px;
          }
          .label {
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background-color: #f0f0f0;
            padding: 8px;
            text-align: left;
            font-weight: bold;
          }
          td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
          }
          .summary {
            text-align: right;
            margin-top: 20px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-style: italic;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            <img src="file://${process.cwd()}/public/Logo.png" alt="SUTYGON Logo" style="width: 120px; height: auto;">
          </div>
          <div class="company-info">
            <div><strong>CÔNG TY TNHH MTV SUTYGON</strong></div>
            <div>76 Nguyễn Chí Thanh, Q.Hải Châu, TP. Đà Nẵng</div>
            <div>0905 923 149 - 0905 188 428</div>
            <div>sutygon@gmail.com</div>
            <div>MTS: 0401514965</div>
          </div>
        </div>

        <div class="description">
          Chuyên tổ chức sự kiện, cho thuê trang phục biểu diễn, cưới hỏi, văn nghệ và đạo cụ hàng đầu Đà Nẵng
        </div>

        <div class="title">BIÊN NHẬN</div>

        <div class="info-section">
          <div class="customer-info">
            <div class="info-row">
              <span class="label">Khách Hàng:</span> ${data.customerName}
            </div>
            <div class="info-row">
              <span class="label">Địa chỉ:</span> ${data.customerAddress}
            </div>
            <div class="info-row">
              <span class="label">SĐT:</span> ${data.customerPhone}
            </div>
          </div>
          <div class="order-info">
            <div class="info-row">
              <span class="label">Số phiếu:</span> ${data.orderId}
            </div>
            <div class="info-row">
              <span class="label">Ngày đặt:</span> ${data.orderDate}
            </div>
            <div class="info-row">
              <span class="label">Ngày thuê:</span> ${data.rentDate}
            </div>
            <div class="info-row">
              <span class="label">Ngày trả:</span> ${data.returnDate}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên sản phẩm</th>
              <th>Giá</th>
              <th>SL</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((item: ReceiptItem) => `
              <tr>
                <td>${item.formattedId || item.inventoryItemId || item.id}</td>
                <td>${item.name}</td>
                <td>${item.price.toLocaleString('vi-VN')}</td>
                <td>${item.quantity}</td>
                <td>${item.total.toLocaleString('vi-VN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <div class="info-row">
            <span class="label">Tổng cộng:</span> ${data.totalAmount.toLocaleString('vi-VN')} đ
          </div>
          <div class="info-row">
            <span class="label">VAT:</span> ${data.vatAmount.toLocaleString('vi-VN')} đ
          </div>
          <div class="info-row">
            <span class="label">Đặt cọc:</span> ${data.depositAmount.toLocaleString('vi-VN')} đ
          </div>
        </div>

        <div class="footer">
          Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi!
        </div>
      </body>
      </html>
    `;

    // Set content and wait for fonts to load
    await page.setContent(htmlContent);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for fonts to load

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true
    });

    await browser.close();

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Bien_Nhan_${data.orderId}_${data.customerName.replace(/[^a-zA-Z0-9\s\u00C0-\u017F]/g, '').replace(/\s+/g, '_').substring(0, 30)}_${new Date().toISOString().split('T')[0]}.pdf"`
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
} 