import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../storage/minio.service';
import { APP_CONFIG, BUCKET_NAMES } from '@food-ordering/config';
import { v4 as uuidv4 } from 'uuid';

export interface VendorInput {
  branchId?: string;
  name: string;
  taxId?: string;
  address?: string;
  office?: string;
  phone?: string;
  email?: string;
}

export interface ExpenseInput {
  branchId: string;
  vendorId?: string;
  vendorName?: string;
  vendorTaxId?: string;
  vendorAddress?: string;
  vendorOffice?: string;
  expenseDate: string;
  paidAt?: string;
  category: string;
  description: string;
  documentNumber?: string;
  subtotal: number;
  vatAmount?: number;
  status?: string;
}

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService, private minioService: MinioService) {}

  async listVendors(branchId?: string) {
    return this.prisma.expenseVendor.findMany({
      where: { isActive: true, ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}) },
      orderBy: { name: 'asc' },
    });
  }

  async createVendor(input: VendorInput) {
    if (!input.name?.trim()) throw new BadRequestException('กรุณาระบุชื่อผู้ขาย');
    return this.prisma.expenseVendor.create({
      data: {
        branchId: input.branchId || null,
        name: input.name.trim(), taxId: input.taxId?.trim() || null,
        address: input.address?.trim() || null, office: input.office?.trim() || null,
        phone: input.phone?.trim() || null, email: input.email?.trim() || null,
      },
    });
  }

  async updateVendor(id: string, input: Partial<VendorInput>) {
    return this.prisma.expenseVendor.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.taxId !== undefined ? { taxId: input.taxId.trim() || null } : {}),
        ...(input.address !== undefined ? { address: input.address.trim() || null } : {}),
        ...(input.office !== undefined ? { office: input.office.trim() || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone.trim() || null } : {}),
        ...(input.email !== undefined ? { email: input.email.trim() || null } : {}),
      },
    });
  }

  async deactivateVendor(id: string) {
    return this.prisma.expenseVendor.update({ where: { id }, data: { isActive: false } });
  }

  async getVendor(id: string) {
    const vendor = await this.prisma.expenseVendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException('ไม่พบผู้ขาย');
    return vendor;
  }

  async listExpenses(branchId?: string, month?: string, category?: string) {
    const range = this.monthRange(month);
    const expenses = await this.prisma.expense.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(category ? { category } : {}),
        ...(range ? { expenseDate: range } : {}),
      },
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
      include: { vendor: true, attachments: true, branch: { select: { id: true, name: true } } },
    });
    return expenses.map((expense) => ({
      ...expense,
      attachments: expense.attachments.map((attachment) => ({
        ...attachment,
        url: `/api/attachments/expenses/${expense.id}/${attachment.id}`,
      })),
    }));
  }

  async createExpense(input: ExpenseInput, createdBy?: string) {
    if (!input.category?.trim() || !input.description?.trim()) throw new BadRequestException('กรุณาระบุหมวดและรายละเอียดรายจ่าย');
    const subtotal = Number(input.subtotal);
    const vatAmount = Number(input.vatAmount || 0);
    if (!Number.isFinite(subtotal) || subtotal < 0 || !Number.isFinite(vatAmount) || vatAmount < 0) {
      throw new BadRequestException('ยอดเงินหรือภาษีไม่ถูกต้อง');
    }
    const vendor = input.vendorId ? await this.getVendor(input.vendorId) : null;
    const expenseDate = new Date(input.expenseDate);
    if (Number.isNaN(expenseDate.getTime())) throw new BadRequestException('วันที่รายจ่ายไม่ถูกต้อง');
    const total = subtotal + vatAmount;
    return this.prisma.expense.create({
      data: {
        branchId: input.branchId, vendorId: vendor?.id || null,
        vendorName: vendor?.name || input.vendorName?.trim() || null,
        vendorTaxId: vendor?.taxId || input.vendorTaxId?.trim() || null,
        vendorAddress: vendor?.address || input.vendorAddress?.trim() || null,
        vendorOffice: vendor?.office || input.vendorOffice?.trim() || null,
        expenseDate, paidAt: input.paidAt ? new Date(input.paidAt) : null,
        category: input.category.trim(), description: input.description.trim(),
        documentNumber: input.documentNumber?.trim() || null,
        subtotal, vatAmount, total, status: input.status === 'DRAFT' ? 'DRAFT' : 'CONFIRMED',
        createdBy,
      },
      include: { attachments: true },
    });
  }

  async updateExpense(id: string, input: Partial<ExpenseInput>) {
    const current = await this.getExpense(id);
    const subtotal = input.subtotal === undefined ? Number(current.subtotal) : Number(input.subtotal);
    const vatAmount = input.vatAmount === undefined ? Number(current.vatAmount) : Number(input.vatAmount);
    if (!Number.isFinite(subtotal) || subtotal < 0 || !Number.isFinite(vatAmount) || vatAmount < 0) {
      throw new BadRequestException('ยอดเงินหรือภาษีไม่ถูกต้อง');
    }
    const vendor = input.vendorId === undefined ? undefined : input.vendorId ? await this.getVendor(input.vendorId) : null;
    const expenseDate = input.expenseDate === undefined ? undefined : new Date(input.expenseDate);
    if (expenseDate && Number.isNaN(expenseDate.getTime())) throw new BadRequestException('วันที่รายจ่ายไม่ถูกต้อง');
    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(vendor !== undefined ? {
          vendorId: vendor?.id || null, vendorName: vendor?.name || input.vendorName?.trim() || null,
          vendorTaxId: vendor?.taxId || input.vendorTaxId?.trim() || null,
          vendorAddress: vendor?.address || input.vendorAddress?.trim() || null,
          vendorOffice: vendor?.office || input.vendorOffice?.trim() || null,
        } : {}),
        ...(expenseDate ? { expenseDate } : {}),
        ...(input.category !== undefined ? { category: input.category.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() } : {}),
        ...(input.documentNumber !== undefined ? { documentNumber: input.documentNumber.trim() || null } : {}),
        ...(input.status !== undefined ? { status: input.status === 'DRAFT' ? 'DRAFT' : 'CONFIRMED' } : {}),
        subtotal, vatAmount, total: subtotal + vatAmount,
      },
    });
  }

  async deleteExpense(id: string) {
    const attachments = await this.prisma.expenseAttachment.findMany({
      where: { expenseId: id },
      select: { bucket: true, objectKey: true },
    });
    const filesByBucket = attachments.reduce<Map<string, string[]>>((groups, attachment) => {
      groups.set(attachment.bucket, [...(groups.get(attachment.bucket) || []), attachment.objectKey]);
      return groups;
    }, new Map());
    await Promise.all([...filesByBucket.entries()].map(([bucket, objectKeys]) => this.minioService.removeFiles(bucket, objectKeys)));
    return this.prisma.expense.delete({ where: { id } });
  }

  async attachFile(expenseId: string, file: { originalname: string; mimetype: string; size: number; buffer: Buffer }) {
    const expense = await this.getExpense(expenseId);
    if (!APP_CONFIG.ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype as any) || file.size > APP_CONFIG.MAX_SLIP_SIZE_BYTES) {
      throw new BadRequestException('รองรับเฉพาะรูป JPG, PNG, WebP ขนาดไม่เกิน 5 MB');
    }
    const ext = file.originalname.split('.').pop() || 'jpg';
    const objectKey = `expenses/${expense.branchId}/${expense.expenseDate.getFullYear()}/${String(expense.expenseDate.getMonth() + 1).padStart(2, '0')}/${expense.id}/${uuidv4()}.${ext}`;
    await this.minioService.uploadFile(BUCKET_NAMES.EXPENSES, objectKey, file.buffer, file.mimetype);
    return this.prisma.expenseAttachment.create({ data: { expenseId, bucket: BUCKET_NAMES.EXPENSES, objectKey, mimeType: file.mimetype, size: file.size } });
  }

  async getExpense(id: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id }, include: { attachments: true } });
    if (!expense) throw new NotFoundException('ไม่พบรายการรายจ่าย');
    return expense;
  }

  async monthlySummary(branchId?: string, month?: string) {
    const range = this.monthRange(month);
    const rows = await this.prisma.expense.groupBy({
      by: ['category'],
      where: { status: 'CONFIRMED', ...(branchId ? { branchId } : {}), ...(range ? { expenseDate: range } : {}) },
      _sum: { subtotal: true, vatAmount: true, total: true },
    });
    const totals = rows.reduce((result, row) => ({
      subtotal: result.subtotal + Number(row._sum.subtotal || 0),
      vatAmount: result.vatAmount + Number(row._sum.vatAmount || 0),
      total: result.total + Number(row._sum.total || 0),
    }), { subtotal: 0, vatAmount: 0, total: 0 });
    return { month: month || null, totals, categories: rows.map((row) => ({ category: row.category, subtotal: Number(row._sum.subtotal || 0), vatAmount: Number(row._sum.vatAmount || 0), total: Number(row._sum.total || 0) })) };
  }

  private monthRange(month?: string) {
    if (!month) return undefined;
    const [year, monthNumber] = month.split('-').map(Number);
    if (!year || !monthNumber) throw new BadRequestException('รูปแบบเดือนต้องเป็น YYYY-MM');
    return { gte: new Date(year, monthNumber - 1, 1), lt: new Date(year, monthNumber, 1) };
  }

  async getAttachmentBuffer(bucketName: string, objectName: string) {
    return this.minioService.getFileBuffer(bucketName, objectName);
  }
}
