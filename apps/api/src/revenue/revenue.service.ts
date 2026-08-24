import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../storage/minio.service';
import { APP_CONFIG, BUCKET_NAMES } from '@food-ordering/config';
import { OrderStatus } from '@food-ordering/types';
import { v4 as uuidv4 } from 'uuid';

type DeductionInput = { type: string; description?: string; amount: number };
type SettlementInput = { branchId: string; source: string; settlementDate: string; periodStart?: string; periodEnd?: string; referenceNumber?: string; grossAmount: number; note?: string; deductions?: DeductionInput[] };
const PLATFORM_SOURCES = ['GRAB', 'LINEMAN'];
const PAID_STATUSES = [OrderStatus.PAID, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, OrderStatus.COMPLETED];

@Injectable()
export class RevenueService {
  constructor(private prisma: PrismaService, private minioService: MinioService) {}

  async list(branchId: string | undefined, source: string, month?: string) {
    this.validateSource(source);
    const range = this.monthRange(month);
    const rows = await this.prisma.revenueSettlement.findMany({
      where: { ...(branchId ? { branchId } : {}), source, ...(range ? { settlementDate: range } : {}) },
      include: { branch: { select: { id: true, name: true } }, deductions: true, attachments: true },
      orderBy: [{ settlementDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => this.withAttachmentUrls(row));
  }

  async summary(branchId: string | undefined, source: string, month?: string) {
    const rows = await this.list(branchId, source, month);
    return rows.reduce((result, row: any) => ({ gross: result.gross + Number(row.grossAmount), deductions: result.deductions + Number(row.deductionsTotal), net: result.net + Number(row.netAmount), count: result.count + 1 }), { gross: 0, deductions: 0, net: 0, count: 0 });
  }

  async create(input: SettlementInput, createdBy?: string) {
    this.validateSource(input.source);
    const payload = this.normaliseInput(input);
    return this.prisma.revenueSettlement.create({
      data: { ...payload, createdBy, deductions: { create: payload.deductions }, },
      include: { deductions: true, attachments: true, branch: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, input: Partial<SettlementInput>) {
    const current = await this.get(id);
    const payload = this.normaliseInput({ ...current, ...input, branchId: current.branchId, source: current.source, deductions: input.deductions ?? current.deductions } as SettlementInput);
    return this.prisma.revenueSettlement.update({
      where: { id },
      data: { ...payload, deductions: { deleteMany: {}, create: payload.deductions } },
      include: { deductions: true, attachments: true, branch: { select: { id: true, name: true } } },
    });
  }

  async delete(id: string) {
    const settlement = await this.get(id);
    const groups = settlement.attachments.reduce<Map<string, string[]>>((map, item) => { map.set(item.bucket, [...(map.get(item.bucket) || []), item.objectKey]); return map; }, new Map());
    await Promise.all([...groups].map(([bucket, keys]) => this.minioService.removeFiles(bucket, keys)));
    return this.prisma.revenueSettlement.delete({ where: { id } });
  }

  async attachFile(id: string, file: { originalname: string; mimetype: string; size: number; buffer: Buffer }) {
    const settlement = await this.get(id);
    if (!APP_CONFIG.ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype as any) || file.size > APP_CONFIG.MAX_SLIP_SIZE_BYTES) throw new BadRequestException('รองรับเฉพาะรูป JPG, PNG, WebP ขนาดไม่เกิน 5 MB');
    const ext = file.originalname.split('.').pop() || 'jpg';
    const objectKey = `revenue/${settlement.branchId}/${settlement.source.toLowerCase()}/${settlement.settlementDate.getFullYear()}/${String(settlement.settlementDate.getMonth() + 1).padStart(2, '0')}/${settlement.id}/${uuidv4()}.${ext}`;
    await this.minioService.uploadFile(BUCKET_NAMES.REVENUE, objectKey, file.buffer, file.mimetype);
    return this.prisma.revenueAttachment.create({ data: { settlementId: id, bucket: BUCKET_NAMES.REVENUE, objectKey, mimeType: file.mimetype, size: file.size } });
  }

  async systemRevenue(branchId?: string, month?: string) {
    const range = this.monthRange(month);
    const orders = await this.prisma.order.findMany({
      where: { ...(branchId ? { branchId } : {}), ...(range ? { createdAt: range } : {}), orderStatus: { in: PAID_STATUSES } },
      select: { id: true, orderNo: true, createdAt: true, subtotal: true, deliveryFee: true, discount: true, total: true, branch: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const totals = orders.reduce((result, order) => ({ food: result.food + Number(order.subtotal), delivery: result.delivery + Number(order.deliveryFee), discount: result.discount + Number(order.discount), total: result.total + Number(order.total) }), { food: 0, delivery: 0, discount: 0, total: 0 });
    return { orders, totals: { ...totals, count: orders.length } };
  }

  async get(id: string) {
    const row = await this.prisma.revenueSettlement.findUnique({ where: { id }, include: { deductions: true, attachments: true } });
    if (!row) throw new NotFoundException('ไม่พบรายการรายรับ');
    return row;
  }

  private normaliseInput(input: SettlementInput) {
    const grossAmount = Number(input.grossAmount);
    const deductions = (input.deductions || []).filter((item) => item.type?.trim()).map((item) => ({ type: item.type.trim(), description: item.description?.trim() || null, amount: Number(item.amount || 0) }));
    if (!Number.isFinite(grossAmount) || grossAmount < 0 || deductions.some((item) => !Number.isFinite(item.amount) || item.amount < 0)) throw new BadRequestException('จำนวนเงินไม่ถูกต้อง');
    const settlementDate = new Date(input.settlementDate);
    if (Number.isNaN(settlementDate.getTime())) throw new BadRequestException('วันที่รับเงินไม่ถูกต้อง');
    const deductionsTotal = deductions.reduce((sum, item) => sum + item.amount, 0);
    return { branchId: input.branchId, source: input.source, settlementDate, periodStart: input.periodStart ? new Date(input.periodStart) : null, periodEnd: input.periodEnd ? new Date(input.periodEnd) : null, referenceNumber: input.referenceNumber?.trim() || null, grossAmount, deductionsTotal, netAmount: grossAmount - deductionsTotal, note: input.note?.trim() || null, deductions };
  }

  private validateSource(source: string) { if (!PLATFORM_SOURCES.includes(source)) throw new BadRequestException('ไม่รองรับแหล่งรายรับนี้'); }
  private monthRange(month?: string) { if (!month) return undefined; const [year, monthNumber] = month.split('-').map(Number); if (!year || !monthNumber || monthNumber > 12) throw new BadRequestException('รูปแบบเดือนต้องเป็น YYYY-MM'); return { gte: new Date(year, monthNumber - 1, 1), lt: new Date(year, monthNumber, 1) }; }
  private withAttachmentUrls(row: any) { 
    return { 
      ...row, 
      attachments: row.attachments.map((item: any) => ({ 
        ...item, 
        url: `/api/attachments/revenue/${row.id}/${item.id}` 
      })) 
    }; 
  }

  async getAttachmentBuffer(bucketName: string, objectName: string) {
    return this.minioService.getFileBuffer(bucketName, objectName);
  }
}
