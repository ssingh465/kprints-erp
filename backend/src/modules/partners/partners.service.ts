import { prisma } from '../../lib/prisma.js';
import { investmentDateInPeriod, ResolvedPeriod, serializePeriod } from '../../utils/period.js';
import { FinanceService } from '../finance/finance.service.js';

const SHARE_SUM_TARGET = 100;
const SHARE_TOLERANCE = 0.01;

export function projectedProfitShareTotal(
  partners: { id: string; profitSharePercent: number }[],
  pending?: { id?: string; profitSharePercent: number }
): number {
  let sum = partners.reduce((total, partner) => {
    if (pending?.id && partner.id === pending.id) {
      return total;
    }
    return total + partner.profitSharePercent;
  }, 0);

  if (pending) {
    sum += pending.profitSharePercent;
  }

  return sum;
}

/** Save-time check: shares may be below 100% while partners are being set up. */
export function assertProfitSharesDoNotExceed100(
  partners: { id: string; profitSharePercent: number }[],
  pending?: { id?: string; profitSharePercent: number }
): void {
  const sum = projectedProfitShareTotal(partners, pending);

  if (sum > SHARE_SUM_TARGET + SHARE_TOLERANCE) {
    throw new Error(
      `Partner profit shares cannot exceed 100%. Current total would be ${sum.toFixed(2)}%.`
    );
  }
}

function mapPartner(partner: {
  id: string;
  name: string;
  profitSharePercent: number;
  createdAt: Date;
  updatedAt: Date;
  investments: Array<{
    id: string;
    partnerId: string;
    amount: number;
    date: Date;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}) {
  const totalInvested = partner.investments.reduce((sum, row) => sum + row.amount, 0);

  return {
    id: partner.id,
    name: partner.name,
    profitSharePercent: partner.profitSharePercent,
    totalInvested,
    investmentCount: partner.investments.length,
    investments: partner.investments.map((investment) => ({
      id: investment.id,
      partnerId: investment.partnerId,
      amount: investment.amount,
      date: investment.date.toISOString(),
      notes: investment.notes,
      createdAt: investment.createdAt.toISOString(),
      updatedAt: investment.updatedAt.toISOString(),
    })),
    createdAt: partner.createdAt.toISOString(),
    updatedAt: partner.updatedAt.toISOString(),
  };
}

export class PartnersService {
  private readonly finance = new FinanceService();

  private partnerInclude(period?: ResolvedPeriod) {
    return {
      investments: {
        ...(period ? { where: investmentDateInPeriod(period) } : {}),
        orderBy: { date: 'desc' as const },
      },
    };
  }

  async list(period?: ResolvedPeriod) {
    const partners = await prisma.partner.findMany({
      include: this.partnerInclude(period),
      orderBy: { name: 'asc' },
    });

    return partners.map(mapPartner);
  }

  async getById(id: string) {
    const partner = await prisma.partner.findUnique({
      where: { id },
      include: this.partnerInclude(),
    });

    if (!partner) {
      return null;
    }

    return mapPartner(partner);
  }

  async create(data: { name: string; profitSharePercent: number }) {
    const existing = await prisma.partner.findMany({ select: { id: true, profitSharePercent: true } });
    assertProfitSharesDoNotExceed100(existing, { profitSharePercent: data.profitSharePercent });

    const partner = await prisma.partner.create({
      data: {
        name: data.name.trim(),
        profitSharePercent: data.profitSharePercent,
      },
      include: this.partnerInclude(),
    });

    return mapPartner(partner);
  }

  async update(id: string, data: { name?: string; profitSharePercent?: number }) {
    const existing = await prisma.partner.findMany({ select: { id: true, profitSharePercent: true } });
    const current = existing.find((partner) => partner.id === id);

    if (!current) {
      throw new Error('Partner not found');
    }

    const nextShare = data.profitSharePercent ?? current.profitSharePercent;
    assertProfitSharesDoNotExceed100(existing, { id, profitSharePercent: nextShare });

    const partner = await prisma.partner.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.profitSharePercent !== undefined ? { profitSharePercent: data.profitSharePercent } : {}),
      },
      include: this.partnerInclude(),
    });

    return mapPartner(partner);
  }

  async delete(id: string) {
    await prisma.partner.delete({ where: { id } });
  }

  async addInvestment(partnerId: string, data: { amount: number; date: string | Date; notes?: string }) {
    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) {
      throw new Error('Partner not found');
    }

    const investment = await prisma.partnerInvestment.create({
      data: {
        partnerId,
        amount: data.amount,
        date: new Date(data.date),
        notes: data.notes?.trim() || null,
      },
    });

    return {
      id: investment.id,
      partnerId: investment.partnerId,
      amount: investment.amount,
      date: investment.date.toISOString(),
      notes: investment.notes,
      createdAt: investment.createdAt.toISOString(),
      updatedAt: investment.updatedAt.toISOString(),
    };
  }

  async updateInvestment(
    partnerId: string,
    investmentId: string,
    data: { amount?: number; date?: string | Date; notes?: string }
  ) {
    const investment = await prisma.partnerInvestment.findFirst({
      where: { id: investmentId, partnerId },
    });

    if (!investment) {
      throw new Error('Investment not found');
    }

    const updated = await prisma.partnerInvestment.update({
      where: { id: investmentId },
      data: {
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.date !== undefined ? { date: new Date(data.date) } : {}),
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
      },
    });

    return {
      id: updated.id,
      partnerId: updated.partnerId,
      amount: updated.amount,
      date: updated.date.toISOString(),
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteInvestment(partnerId: string, investmentId: string) {
    const investment = await prisma.partnerInvestment.findFirst({
      where: { id: investmentId, partnerId },
    });

    if (!investment) {
      throw new Error('Investment not found');
    }

    await prisma.partnerInvestment.delete({ where: { id: investmentId } });
  }

  async getDistribution(period: ResolvedPeriod) {
    const [summary, partners] = await Promise.all([
      this.finance.getSummary(period),
      prisma.partner.findMany({
        include: this.partnerInclude(period),
        orderBy: { name: 'asc' },
      }),
    ]);

    const revenue = summary.revenue;
    const expenseTotal = summary.expenses;
    const netProfit = summary.profit;
    const distributableProfit = Math.max(0, netProfit);
    const totalSharePercent = partners.reduce((sum, partner) => sum + partner.profitSharePercent, 0);
    const sharesValid = Math.abs(totalSharePercent - SHARE_SUM_TARGET) <= SHARE_TOLERANCE;

    const mappedPartners = partners.map(mapPartner);

    return {
      revenue,
      expenseTotal,
      netProfit,
      distributableProfit,
      sharesValid,
      totalSharePercent,
      period: serializePeriod(period),
      partners: mappedPartners.map((partner) => ({
        partnerId: partner.id,
        partnerName: partner.name,
        profitSharePercent: partner.profitSharePercent,
        totalInvested: partner.totalInvested,
        distributionAmount: sharesValid
          ? distributableProfit * (partner.profitSharePercent / 100)
          : 0,
      })),
    };
  }
}
