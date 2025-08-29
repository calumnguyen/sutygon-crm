import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';

interface ReceiptItem {
  id: string;
  inventoryItemId?: number | null;
  formattedId?: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface PaymentHistory {
  date: string;
  method: 'cash' | 'qr';
  amount: number;
}

interface Discount {
  id: number;
  itemizedName: string;
  discountAmount: number;
  discountType: 'vnd' | 'percent';
  discountValue: number;
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Generate QR code for Google Review
    const googleReviewUrl =
      'https://search.google.com/local/writereview?placeid=ChIJz3ZmxDAYQjEREAXF-VdDjF0';
    const qrCodeDataUrl = await QRCode.toDataURL(googleReviewUrl, {
      width: 120,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    // Generate barcode for order number
    const orderNumber = (
      typeof data.orderId === 'number'
        ? data.orderId
        : parseInt(data.orderId?.replace(/\D/g, '')) || 0
    )
      .toString()
      .padStart(6, '0');
    const barcodeValue = `ORDER-${orderNumber}`;
    const barcodePng = await bwipjs.toBuffer({
      bcid: 'code128',
      text: barcodeValue,
      scale: 2,
      height: 12,
      includetext: true,
      textxalign: 'center',
      textsize: 10,
    });
    const barcodeDataUrl = `data:image/png;base64,${barcodePng.toString('base64')}`;

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
            padding: 15px;
            font-size: 10px;
            line-height: 1.2;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
          }
          .logo {
            font-size: 20px;
            font-weight: bold;
            color: #ec4899;
            flex: 1;
          }
          .barcode {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
          }
          .company-info {
            text-align: right;
            font-size: 8px;
            flex: 1;
          }
          .description {
            text-align: center;
            margin: 10px 0;
            font-size: 9px;
          }
          .title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin: 15px 0;
          }
          .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
          }
          .customer-info, .order-info {
            width: 45%;
          }
          .info-row {
            margin-bottom: 4px;
          }
          .label {
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          th {
            background-color: #f0f0f0;
            padding: 4px 6px;
            text-align: left;
            font-weight: bold;
            font-size: 9px;
          }
          td {
            padding: 3px 6px;
            border-bottom: 1px solid #ddd;
            font-size: 9px;
          }
          .summary {
            text-align: right;
            margin-top: 15px;
          }
          .payment-history {
            margin: 15px 0;
          }
          .payment-history h3 {
            margin: 10px 0 5px 0;
            font-size: 12px;
            font-weight: bold;
            color: #333;
          }
          .payment-history table {
            margin: 5px 0;
          }
          .payment-history th, .payment-history td {
            padding: 2px 4px;
            font-size: 8px;
          }
          .settlement-info {
            margin: 15px 0;
          }
          .settlement-info h3 {
            margin: 10px 0 5px 0;
            font-size: 12px;
            font-weight: bold;
            color: #333;
          }
          .settlement-info .flex {
            display: flex;
            gap: 15px;
            margin: 5px 0;
          }
          .settlement-info .flex > div {
            flex: 1;
          }
          .settlement-info .info-row {
            margin-bottom: 3px;
          }
          .document-info {
            margin: 15px 0;
          }
          .document-info h3 {
            margin: 10px 0 5px 0;
            font-size: 12px;
            font-weight: bold;
            color: #333;
          }
          .document-info .info-row {
            margin-bottom: 3px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-style: italic;
            font-size: 8px;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">SUTYGON</div>
          <div class="barcode">
            <img src="${barcodeDataUrl}" alt="Order Barcode" style="height: 40px; margin-bottom: 2px;"/>
            <div style="font-size: 9px; color: #333; margin-top: 2px;">${barcodeValue}</div>
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
            ${data.items
              .map(
                (item: ReceiptItem) => `
              <tr>
                <td>${item.formattedId || item.inventoryItemId || item.id}</td>
                <td>${item.name}</td>
                <td>${item.price.toLocaleString('vi-VN')}</td>
                <td>${item.quantity}</td>
                <td>${item.total.toLocaleString('vi-VN')}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="summary">
          <div class="info-row">
            <span class="label">Tổng cộng:</span> ${data.totalAmount.toLocaleString('vi-VN')} đ
          </div>
          ${
            data.discounts && data.discounts.length > 0
              ? `
          <div class="info-row">
            <span class="label">Giảm giá:</span> -${data.discounts.reduce((sum: number, discount: Discount) => sum + discount.discountAmount, 0).toLocaleString('vi-VN')} đ
          </div>
          `
              : ''
          }
          <div class="info-row">
            <span class="label">VAT:</span> ${(() => {
              const subtotalAfterDiscount =
                data.totalAmount -
                (data.discounts?.reduce(
                  (sum: number, discount: Discount) => sum + discount.discountAmount,
                  0
                ) || 0);
              return Math.round(subtotalAfterDiscount * 0.08).toLocaleString('vi-VN');
            })()} đ
          </div>
          <div class="info-row">
            <span class="label">Đặt cọc:</span> ${data.depositAmount.toLocaleString('vi-VN')} đ
          </div>
          <div class="info-row" style="font-weight: bold; font-size: 11px; margin-top: 5px; border-top: 1px solid #ddd; padding-top: 5px;">
            <span class="label">Tổng cần thanh toán:</span> ${(() => {
              const subtotalAfterDiscount =
                data.totalAmount -
                (data.discounts?.reduce(
                  (sum: number, discount: Discount) => sum + discount.discountAmount,
                  0
                ) || 0);
              const vatAmount = Math.round(subtotalAfterDiscount * 0.08);
              const totalWithVat = subtotalAfterDiscount + vatAmount;
              const totalWithDeposit = totalWithVat + data.depositAmount;
              return totalWithDeposit.toLocaleString('vi-VN');
            })()} đ
          </div>
        </div>

        ${
          data.discounts && data.discounts.length > 0
            ? `
        <div class="payment-history">
          <h3>Chi Tiết Giảm Giá</h3>
          <table>
            <thead>
              <tr>
                <th>Loại Giảm Giá</th>
                <th style="text-align: right;">Số Tiền</th>
              </tr>
            </thead>
            <tbody>
              ${data.discounts
                .map(
                  (discount: Discount) => `
                <tr>
                  <td>${discount.itemizedName}${discount.discountType === 'percent' ? ` (${discount.discountValue}%)` : ''}</td>
                  <td style="text-align: right; color: #dc2626;">-${discount.discountAmount.toLocaleString('vi-VN')} đ</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
        `
            : ''
        }

        ${
          data.paymentHistory &&
          data.paymentHistory.length > 0 &&
          data.paymentHistory.some((payment: PaymentHistory) => payment.amount > 0)
            ? `
        <div class="payment-history">
          <h3>Lịch Sử Thanh Toán</h3>
          <table>
            <thead>
              <tr>
                <th>Ngày Thanh Toán</th>
                <th>Phương Thức</th>
                <th style="text-align: right;">Số Tiền</th>
              </tr>
            </thead>
            <tbody>
              ${data.paymentHistory
                .filter((payment: PaymentHistory) => payment.amount > 0)
                .map(
                  (payment: PaymentHistory) => `
                <tr>
                  <td>${payment.date}</td>
                  <td>${payment.method === 'qr' ? 'QR Code' : 'Tiền mặt'}</td>
                  <td style="text-align: right;">${payment.amount.toLocaleString('vi-VN')} đ</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <div style="text-align: right; margin-top: 5px; font-weight: bold; font-size: 9px;">
            <span>Tổng đã thanh toán:</span> ${data.paymentHistory.reduce((sum: number, payment: PaymentHistory) => sum + payment.amount, 0).toLocaleString('vi-VN')} đ
          </div>
        </div>
        `
            : ''
        }



        ${
          data.settlementInfo
            ? `
        <div class="settlement-info">
          <h3>Thông Tin Thanh Toán</h3>
          <div class="flex">
            <div>
              ${
                data.settlementInfo.remainingBalance > 0
                  ? `
              <div class="info-row">
                <span class="label" style="color: #dc2626; font-weight: bold;">Số tiền còn nợ:</span>
                <span style="margin-left: 5px; color: #dc2626; font-weight: bold;">${data.settlementInfo.remainingBalance.toLocaleString('vi-VN')} đ</span>
              </div>
              `
                  : `
              <div class="info-row" style="color: #059669; font-weight: bold;">
                <span>✓ Đơn hàng đã được thanh toán đầy đủ</span>
              </div>
              `
              }
            </div>
            <div>
              <div class="info-row">
                <span class="label">Tiền cọc đã trả khách:</span>
                <span style="margin-left: 5px; ${
                  data.settlementInfo.depositReturned > 0
                    ? 'color: #059669; font-weight: bold;'
                    : ''
                }">${data.settlementInfo.depositReturned.toLocaleString('vi-VN')} đ</span>
              </div>
              ${
                data.settlementInfo.depositReturnedDate
                  ? `
              <div class="info-row">
                <span class="label">Ngày trả cọc:</span>
                <span style="margin-left: 5px;">${data.settlementInfo.depositReturnedDate}</span>
              </div>
              `
                  : ''
              }
              ${
                data.settlementInfo.depositReturned === 0 && data.depositAmount > 0
                  ? `
              <div class="info-row" style="color: #d97706; font-weight: bold;">
                <span>⚠ Tiền cọc chưa được trả</span>
              </div>
              `
                  : ''
              }
            </div>
          </div>
        </div>
        `
            : ''
        }

        ${
          data.settlementInfo &&
          data.settlementInfo.documentType &&
          !data.settlementInfo.documentType.includes('TAX_INVOICE_EXPORTED')
            ? `
        <div class="document-info">
          <h3>Thông Tin Giấy Tờ</h3>
          <div>
            <div class="info-row">
              <span class="label">Loại giấy tờ để lại:</span>
              <span style="margin-left: 5px;">${data.settlementInfo.documentType}</span>
            </div>
            <div class="info-row">
              <span class="label">Giấy tờ đã trả khách:</span>
              <span style="margin-left: 5px; ${
                data.settlementInfo.documentReturned
                  ? 'color: #059669; font-weight: bold;'
                  : 'color: #dc2626; font-weight: bold;'
              }">${data.settlementInfo.documentReturned ? '✓ Đã trả' : '✗ Chưa trả'}</span>
            </div>
            ${
              data.settlementInfo.documentReturnedDate
                ? `
            <div class="info-row">
              <span class="label">Ngày trả giấy tờ:</span>
              <span style="margin-left: 5px;">${data.settlementInfo.documentReturnedDate}</span>
            </div>
            `
                : ''
            }
          </div>
        </div>
        `
            : ''
        }

        <div class="footer">
          <div>Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi!</div>
          <div style="margin-top: 5px; font-size: 7px; color: #666;">
            <span>Được tạo lúc: ${new Date().toLocaleString('vi-VN')}</span>
            ${data.lastUpdated ? `<span style="margin-left: 15px;">Cập nhật lần cuối: ${new Date(data.lastUpdated).toLocaleString('vi-VN')}</span>` : ''}
          </div>
        </div>

        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
          <div style="display: flex; gap: 20px; align-items: flex-start;">
            <div style="flex: 1; text-align: center;">
              <div style="font-size: 10px; font-weight: bold; margin-bottom: 8px; color: #ec4899;">
                Yêu thích trải nghiệm của bạn? Hãy tặng SUTYGON 5 sao trên Google Review nhé!<br/>
                Quét mã QR bên dưới để lan tỏa niềm vui 💖
              </div>
              <div style="background-color: #f8f9fa; padding: 8px; border-radius: 4px; display: inline-block;">
                <img src='${qrCodeDataUrl}' alt='Google Review QR Code' style='width: 80px; height: 80px;'/>
              </div>
            </div>
            <div style="flex: 1; text-align: center;">
              <div style="font-size: 10px; font-weight: bold; margin-bottom: 8px; color: #0066cc;">
                Có điều gì chưa hài lòng? Đừng ngại liên hệ tụi mình nhé!
              </div>
              <div style="font-size: 9px; color: #666; line-height: 1.3;">
                <div>Email: <b>cskh@sutygon.com</b></div>
                <div>Hotline: <b>0905 188 428</b></div>
                <div style="margin-top: 4px; font-size: 8px; color: #888;">Đội ngũ SUTYGON luôn sẵn sàng lắng nghe bạn! 😊</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Set content and wait for fonts to load
    await page.setContent(htmlContent);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for fonts to load

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
      printBackground: true,
    });

    await browser.close();

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Bien_Nhan_${data.orderId}_${data.customerName
          .replace(/[^a-zA-Z0-9\s\u00C0-\u017F]/g, '')
          .replace(/\s+/g, '_')
          .substring(0, 30)}_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
