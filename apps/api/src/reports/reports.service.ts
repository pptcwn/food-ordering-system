import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@food-ordering/types';
import { MinioService } from '../storage/minio.service';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { existsSync } from 'fs';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService, private minioService: MinioService) {}

  /**
   * Get Sales and Operations Summary
   */
  async getSalesSummary(branchId?: string, startDate?: string, endDate?: string) {
    const where: any = {};
    if (branchId) {
      where.branchId = branchId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // 1. Total Orders & Revenue (Paid / Delivered / Completed)
    const allOrders = await this.prisma.order.findMany({
      where,
      include: {
        items: true,
        payment: true,
        branch: true,
      },
    });

    const totalOrdersCount = allOrders.length;
    const completedOrders = allOrders.filter(
      (o) =>
        o.orderStatus === OrderStatus.PAID ||
        o.orderStatus === OrderStatus.CONFIRMED ||
        o.orderStatus === OrderStatus.PREPARING ||
        o.orderStatus === OrderStatus.READY ||
        o.orderStatus === OrderStatus.OUT_FOR_DELIVERY ||
        o.orderStatus === OrderStatus.DELIVERED ||
        o.orderStatus === OrderStatus.COMPLETED,
    );

    const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalFoodRevenue = completedOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);
    const totalDeliveryFees = completedOrders.reduce((sum, o) => sum + Number(o.deliveryFee), 0);
    const totalDiscounts = completedOrders.reduce((sum, o) => sum + Number(o.discount || 0), 0);

    const cancelledOrdersCount = allOrders.filter(
      (o) => o.orderStatus === OrderStatus.CANCELLED || o.orderStatus === OrderStatus.EXPIRED,
    ).length;

    // 2. Orders by Status Breakdown
    const statusBreakdown: Record<string, number> = {};
    allOrders.forEach((o) => {
      statusBreakdown[o.orderStatus] = (statusBreakdown[o.orderStatus] || 0) + 1;
    });

    // 3. Top Selling Products
    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    completedOrders.forEach((o) => {
      o.items.forEach((item) => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
          };
        }
        productSalesMap[item.productId].quantity += item.quantity;
        productSalesMap[item.productId].revenue += Number(item.subtotal);
      });
    });

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // 4. Branch Breakdown
    const branchBreakdownMap: Record<string, { name: string; orders: number; revenue: number }> = {};
    completedOrders.forEach((o) => {
      const bId = o.branchId;
      if (!branchBreakdownMap[bId]) {
        branchBreakdownMap[bId] = {
          name: o.branch.name,
          orders: 0,
          revenue: 0,
        };
      }
      branchBreakdownMap[bId].orders += 1;
      branchBreakdownMap[bId].revenue += Number(o.total);
    });

    return {
      totalOrdersCount,
      completedOrdersCount: completedOrders.length,
      cancelledOrdersCount,
      totalRevenue,
      totalFoodRevenue,
      totalDeliveryFees,
      totalDiscounts,
      statusBreakdown,
      topSellingProducts,
      branchBreakdown: Object.values(branchBreakdownMap),
    };
  }

  /**
   * Daily / Weekly Sales Trends (for visual charts)
   */
  async getSalesTrends(branchId?: string, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        ...(branchId ? { branchId } : {}),
        orderStatus: {
          in: [
            OrderStatus.PAID,
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.OUT_FOR_DELIVERY,
            OrderStatus.DELIVERED,
            OrderStatus.COMPLETED,
          ],
        },
      },
      select: {
        createdAt: true,
        total: true,
        subtotal: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by Date string YYYY-MM-DD
    const trendsMap: Record<string, { date: string; revenue: number; orders: number }> = {};

    for (let i = 0; i <= days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - i));
      const key = d.toISOString().split('T')[0];
      trendsMap[key] = { date: key, revenue: 0, orders: 0 };
    }

    orders.forEach((o) => {
      const key = new Date(o.createdAt).toISOString().split('T')[0];
      if (trendsMap[key]) {
        trendsMap[key].revenue += Number(o.total);
        trendsMap[key].orders += 1;
      }
    });

    return Object.values(trendsMap);
  }

  /**
   * Export all orders to CSV formatted text
   */
  async exportOrdersCsv(branchId?: string, startDate?: string, endDate?: string): Promise<string> {
    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { name: true } },
        payment: { select: { provider: true, status: true } },
      },
    });

    const header = [
      'Order No',
      'Date',
      'Branch',
      'Customer',
      'Phone',
      'Order Type',
      'Subtotal',
      'Delivery Fee',
      'Discount',
      'Total',
      'Order Status',
      'Payment Status',
    ].join(',');

    const rows = orders.map((o) => {
      const date = new Date(o.createdAt).toISOString().replace('T', ' ').substring(0, 19);
      return [
        `"${o.orderNo}"`,
        `"${date}"`,
        `"${o.branch?.name || ''}"`,
        `"${o.customerName || ''}"`,
        `"${o.customerPhone || ''}"`,
        `"${o.orderType}"`,
        Number(o.subtotal || 0),
        Number(o.deliveryFee || 0),
        Number(o.discount || 0),
        Number(o.total || 0),
        `"${o.orderStatus}"`,
        `"${o.payment?.status || o.paymentStatus}"`,
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }

  async exportExpenses(options: { branchId?: string; month: string; format: 'pdf' | 'xlsx'; includeAttachments: boolean }) {
    const [year, monthNumber] = options.month.split('-').map(Number);
    if (!year || !monthNumber || monthNumber > 12) throw new BadRequestException('รูปแบบเดือนต้องเป็น YYYY-MM');
    const start = new Date(year, monthNumber - 1, 1);
    const end = new Date(year, monthNumber, 1);
    const expenses = await this.prisma.expense.findMany({
      where: { status: 'CONFIRMED', ...(options.branchId ? { branchId: options.branchId } : {}), expenseDate: { gte: start, lt: end } },
      include: { branch: { select: { name: true, address: true } }, attachments: true },
      orderBy: [{ expenseDate: 'asc' }, { createdAt: 'asc' }],
    });
    const totals = expenses.reduce((total, expense) => ({
      subtotal: total.subtotal + Number(expense.subtotal), vat: total.vat + Number(expense.vatAmount), amount: total.amount + Number(expense.total),
    }), { subtotal: 0, vat: 0, amount: 0 });
    const branchLabel = expenses[0]?.branch?.name || 'ทุกสาขา';
    if (options.format === 'xlsx') {
      const buffer = await this.createExpenseWorkbook(expenses, totals, options.month, branchLabel);
      return { buffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename: `expense-report-${options.month}.xlsx` };
    }
    const buffer = await this.createExpensePdf(expenses, totals, options.month, branchLabel, options.includeAttachments);
    return { buffer, contentType: 'application/pdf', filename: `expense-report-${options.month}.pdf` };
  }

  private async createExpenseWorkbook(expenses: any[], totals: { subtotal: number; vat: number; amount: number }, month: string, branchLabel: string) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Food Ordering';
    const sheet = workbook.addWorksheet('รายจ่าย');
    sheet.mergeCells('A1:J1');
    sheet.getCell('A1').value = `รายงานรายจ่ายและภาษีซื้อ ประจำเดือน ${month}`;
    sheet.getCell('A1').font = { bold: true, size: 16 };
    sheet.mergeCells('A2:J2');
    sheet.getCell('A2').value = `สาขา: ${branchLabel}`;
    sheet.addRow([]);
    const header = sheet.addRow(['วันที่', 'สาขา', 'หมวด', 'รายละเอียด', 'ผู้ขาย', 'เลขผู้เสียภาษี', 'เลขที่เอกสาร', 'ยอดก่อน VAT', 'VAT ซื้อ', 'ยอดรวม']);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
    expenses.forEach((expense) => sheet.addRow([
      this.formatDate(expense.expenseDate), expense.branch.name, expense.category, expense.description, expense.vendorName || '', expense.vendorTaxId || '', expense.documentNumber || '',
      Number(expense.subtotal), Number(expense.vatAmount), Number(expense.total),
    ]));
    const summary = sheet.addRow(['', '', '', '', '', '', 'รวม', totals.subtotal, totals.vat, totals.amount]);
    summary.font = { bold: true };
    ['H', 'I', 'J'].forEach((column) => sheet.getColumn(column).numFmt = '#,##0.00');
    sheet.columns.forEach((column, index) => { column.width = [14, 24, 18, 38, 28, 20, 20, 16, 14, 16][index] || 16; });
    sheet.views = [{ state: 'frozen', ySplit: 4 }];
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private async createExpensePdf(expenses: any[], totals: { subtotal: number; vat: number; amount: number }, month: string, branchLabel: string, includeAttachments: boolean): Promise<Buffer> {
    const document = new PDFDocument({ size: 'A4', margin: 36, autoFirstPage: true });
    const chunks: Buffer[] = [];
    document.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    const complete = new Promise<Buffer>((resolve, reject) => { document.on('end', () => resolve(Buffer.concat(chunks))); document.on('error', reject); });
    const fontPath = this.getPdfFontPath();
    const font = fontPath || 'Helvetica';
    const pageWidth = document.page.width - 72;
    const drawFooter = () => undefined;
    const drawHeader = (title: string, subtitle: string) => {
      document.rect(36, 36, pageWidth, 68).fill('#075f4d');
      document.fillColor('#ffffff').font(font).fontSize(18).text(title, 52, 52, { width: pageWidth - 32 });
      document.fontSize(10).fillColor('#d1fae5').text(subtitle, 52, 78, { width: pageWidth - 32 });
      document.fillColor('#0f172a');
      document.y = 124;
    };
    const newReportPage = (continuation = false) => {
      if (continuation) document.addPage();
      drawHeader('รายงานรายจ่ายและภาษีซื้อ', `${branchLabel}  |  ประจำเดือน ${month}${continuation ? '  |  รายการต่อ' : ''}`);
    };
    const drawTableHeader = () => {
      const columns = [36, 90, 150, 270, 375, 462];
      const y = document.y;
      document.rect(36, y, pageWidth, 24).fill('#e2e8f0');
      document.fillColor('#334155').font(font).fontSize(8);
      ['วันที่', 'หมวด', 'รายละเอียด / ผู้ขาย', 'เลขเอกสาร', 'VAT', 'ยอดรวม'].forEach((label, index) => document.text(label, columns[index] + 4, y + 8, { width: (columns[index + 1] || 559) - columns[index] - 8 }));
      document.y = y + 28;
    };

    newReportPage();
    document.roundedRect(36, 124, pageWidth, 92, 10).fill('#f0fdf4');
    document.fillColor('#166534').font(font).fontSize(11).text('สรุปยอดประจำเดือน', 52, 140);
    const cards = [
      ['รายการยืนยันแล้ว', `${expenses.length} รายการ`],
      ['ยอดก่อน VAT', this.money(totals.subtotal)],
      ['VAT ซื้อ', this.money(totals.vat)],
      ['ยอดรวมรายจ่าย', this.money(totals.amount)],
    ];
    cards.forEach(([label, value], index) => {
      const x = 52 + index * 127;
      document.fillColor('#64748b').fontSize(8).text(label, x, 166, { width: 110 });
      document.fillColor('#0f172a').fontSize(13).text(value, x, 184, { width: 110 });
    });
    document.y = 238;
    drawTableHeader();
    expenses.forEach((expense, index) => {
      const rowY = document.y;
      const description = `${expense.description}\n${expense.vendorName || 'ไม่ระบุผู้ขาย'}`;
      document.font(font).fontSize(8);
      const rowHeight = Math.max(42, document.heightOfString(description, { width: 116 }) + 16);
      if (rowY + rowHeight > 780) { newReportPage(true); drawTableHeader(); }
      const y = document.y;
      if (index % 2 === 0) document.rect(36, y, pageWidth, rowHeight).fill('#f8fafc');
      document.fillColor('#334155').font(font).fontSize(8);
      document.text(this.formatDate(expense.expenseDate), 40, y + 8, { width: 46 });
      document.text(expense.category, 94, y + 8, { width: 52 });
      document.text(description, 154, y + 8, { width: 112 });
      document.text(expense.documentNumber || '-', 274, y + 8, { width: 96 });
      document.text(this.money(Number(expense.vatAmount)), 379, y + 8, { width: 78, align: 'right' });
      document.text(this.money(Number(expense.total)), 466, y + 8, { width: 88, align: 'right' });
      document.y = y + rowHeight;
    });
    document.moveDown(0.6);
    document.rect(270, document.y, 289, 46).fill('#ecfdf5');
    document.fillColor('#166534').font(font).fontSize(9).text(`ยอดก่อน VAT  ${this.money(totals.subtotal)}     VAT  ${this.money(totals.vat)}`, 282, document.y + 9, { width: 265, align: 'right' });
    document.fontSize(12).text(`ยอดรวมสุทธิ  ${this.money(totals.amount)}`, 282, document.y + 25, { width: 265, align: 'right' });
    drawFooter();
    if (includeAttachments) {
      for (const expense of expenses) {
        for (const attachment of expense.attachments) {
          try {
            const image = await this.minioService.getFileBuffer(attachment.bucket, attachment.objectKey);
            document.addPage();
            drawHeader('เอกสารแนบรายจ่าย', `${this.formatDate(expense.expenseDate)}  |  ${expense.documentNumber || 'ไม่มีเลขที่เอกสาร'}`);
            document.font(font).fontSize(10).fillColor('#0f172a').text(expense.description, 36, 124, { width: pageWidth });
            document.fontSize(8).fillColor('#64748b').text(`ผู้ขาย: ${expense.vendorName || '-'}  |  ยอดรวม: ${this.money(Number(expense.total))}`, 36, 144, { width: pageWidth });
            document.image(image, 36, 174, { fit: [pageWidth, 590], align: 'center', valign: 'center' });
            drawFooter();
          } catch {
            document.font(font).fontSize(9).text(`ไม่สามารถโหลดเอกสารแนบ: ${attachment.objectKey}`);
          }
        }
      }
    }
    document.end();
    return complete;
  }

  private formatDate(value: Date) { return new Intl.DateTimeFormat('en-GB').format(value); }
  private money(value: number) { return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  private getPdfFontPath() {
    const candidates = [process.env.REPORT_PDF_FONT_PATH, 'C:\\Windows\\Fonts\\tahoma.ttf'].filter(Boolean) as string[];
    return candidates.find((candidate) => existsSync(candidate));
  }

  async exportRevenue(branchId: string | undefined, month: string, format: 'pdf' | 'xlsx') {
    const [year, monthNumber] = month.split('-').map(Number);
    const range = { gte: new Date(year, monthNumber - 1, 1), lt: new Date(year, monthNumber, 1) };
    const [orders, settlements] = await Promise.all([
      this.prisma.order.findMany({ where: { ...(branchId ? { branchId } : {}), createdAt: range, orderStatus: { in: [OrderStatus.PAID, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, OrderStatus.COMPLETED] } }, select: { orderNo: true, createdAt: true, total: true, branch: { select: { name: true } } } }),
      this.prisma.revenueSettlement.findMany({ where: { ...(branchId ? { branchId } : {}), settlementDate: range }, include: { deductions: true, branch: { select: { name: true } } }, orderBy: { settlementDate: 'asc' } }),
    ]);
    const systemTotal = orders.reduce((sum, row) => sum + Number(row.total), 0);
    const gross = settlements.reduce((sum, row) => sum + Number(row.grossAmount), 0);
    const deductions = settlements.reduce((sum, row) => sum + Number(row.deductionsTotal), 0);
    const net = settlements.reduce((sum, row) => sum + Number(row.netAmount), 0);
    const rows = [
      ...orders.map((row) => ({ source: 'ระบบของเรา', date: row.createdAt, reference: row.orderNo, branch: row.branch.name, gross: Number(row.total), deductions: 0, net: Number(row.total) })),
      ...settlements.map((row) => ({ source: row.source === 'GRAB' ? 'Grab' : 'LINE MAN', date: row.settlementDate, reference: row.referenceNumber || '-', branch: row.branch.name, gross: Number(row.grossAmount), deductions: Number(row.deductionsTotal), net: Number(row.netAmount) })),
    ];
    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('รายรับ');
      sheet.addRow([`รายงานรายรับ ประจำเดือน ${month}`]); sheet.addRow(['แหล่งรายรับ', 'วันที่', 'สาขา', 'เลขอ้างอิง', 'ยอดขายรวม', 'ยอดหัก', 'ยอดรับสุทธิ']);
      rows.forEach((row) => sheet.addRow([row.source, this.formatDate(row.date), row.branch, row.reference, row.gross, row.deductions, row.net]));
      sheet.addRow(['รวม', '', '', '', systemTotal + gross, deductions, systemTotal + net]);
      sheet.columns.forEach((column, index) => { column.width = [18, 14, 24, 22, 16, 16, 18][index] || 16; });
      ['E', 'F', 'G'].forEach((column) => sheet.getColumn(column).numFmt = '#,##0.00');
      return { buffer: Buffer.from(await workbook.xlsx.writeBuffer()), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename: `revenue-report-${month}.xlsx` };
    }
    const document = new PDFDocument({ size: 'A4', margin: 36 }); const chunks: Buffer[] = [];
    document.on('data', (chunk) => chunks.push(Buffer.from(chunk))); const done = new Promise<Buffer>((resolve, reject) => { document.on('end', () => resolve(Buffer.concat(chunks))); document.on('error', reject); });
    const font = this.getPdfFontPath() || 'Helvetica'; const pageWidth = document.page.width - 72;
    const drawHeader = (continued = false) => { document.rect(36, 36, pageWidth, 68).fill('#075f4d'); document.font(font).fillColor('#ffffff').fontSize(18).text('รายงานรายรับประจำเดือน', 52, 52); document.fontSize(10).fillColor('#d1fae5').text(`ประจำเดือน ${month}${continued ? '  |  รายการต่อ' : ''}`, 52, 78); document.fillColor('#0f172a'); document.y = 124; };
    const drawTableHeader = () => { const y = document.y; const cols = [36, 105, 188, 320, 415, 487]; document.rect(36, y, pageWidth, 24).fill('#e2e8f0'); document.font(font).fontSize(8).fillColor('#334155'); ['แหล่งรายรับ', 'วันที่', 'สาขา / เลขอ้างอิง', 'ยอดขายรวม', 'ยอดหัก', 'รับสุทธิ'].forEach((label, index) => document.text(label, cols[index] + 4, y + 8, { width: (cols[index + 1] || 559) - cols[index] - 8 })); document.y = y + 28; };
    drawHeader();
    document.roundedRect(36, 124, pageWidth, 92, 10).fill('#f0fdf4'); document.font(font).fontSize(11).fillColor('#166534').text('สรุปรายรับประจำเดือน', 52, 140);
    [['ระบบของเรา', systemTotal], ['Grab / LINE MAN', gross], ['ยอดหัก', deductions], ['รับสุทธิรวม', systemTotal + net]].forEach(([label, value], index) => { const x = 52 + index * 127; document.fillColor('#64748b').fontSize(8).text(String(label), x, 166, { width: 110 }); document.fillColor('#0f172a').fontSize(13).text(this.money(Number(value)), x, 184, { width: 110 }); });
    document.y = 238; drawTableHeader();
    rows.forEach((row, index) => { if (document.y > 748) { document.addPage(); drawHeader(true); drawTableHeader(); } const y = document.y; if (index % 2 === 0) document.rect(36, y, pageWidth, 38).fill('#f8fafc'); document.font(font).fontSize(8).fillColor('#334155'); document.text(row.source, 40, y + 8, { width: 61 }); document.text(this.formatDate(row.date), 109, y + 8, { width: 75 }); document.text(`${row.branch}\n${row.reference}`, 192, y + 8, { width: 124 }); document.text(this.money(row.gross), 324, y + 14, { width: 83, align: 'right' }); document.text(this.money(row.deductions), 419, y + 14, { width: 60, align: 'right' }); document.text(this.money(row.net), 491, y + 14, { width: 64, align: 'right' }); document.y = y + 38; });
    document.moveDown(0.6); document.rect(340, document.y, 219, 44).fill('#ecfdf5'); document.font(font).fillColor('#166534').fontSize(9).text(`ยอดขายรวม  ${this.money(systemTotal + gross)}`, 352, document.y + 8, { width: 195, align: 'right' }); document.fontSize(12).text(`ยอดรับสุทธิ  ${this.money(systemTotal + net)}`, 352, document.y + 24, { width: 195, align: 'right' });
    document.end();
    return { buffer: await done, contentType: 'application/pdf', filename: `revenue-report-${month}.pdf` };
  }
}
