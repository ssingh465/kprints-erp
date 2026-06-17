import type { Prisma } from '@prisma/client';

type TransactionClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

type SerialPrefix = 'ORD' | 'JOB' | 'INV';

function parseSerialNumber(value: string, prefix: SerialPrefix): number {
  const match = value.match(new RegExp(`^${prefix}-(\\d+)$`));
  return match ? parseInt(match[1], 10) : 0;
}

async function serialBase(tx: TransactionClient, prefix: SerialPrefix): Promise<number> {
  const settings = await tx.settings.findFirst({
    select: { serialOrderBase: true, serialJobBase: true, serialInvoiceBase: true },
  });

  if (prefix === 'ORD') return settings?.serialOrderBase ?? 1048;
  if (prefix === 'JOB') return settings?.serialJobBase ?? 500;
  return settings?.serialInvoiceBase ?? 1000;
}

export async function nextSerialNumber(
  tx: TransactionClient,
  prefix: SerialPrefix
): Promise<string> {
  const defaultStart = await serialBase(tx, prefix);

  if (prefix === 'ORD') {
    const rows = await tx.order.findMany({ select: { orderNo: true } });
    const max = rows.reduce((acc, row) => Math.max(acc, parseSerialNumber(row.orderNo, 'ORD')), defaultStart);
    return `ORD-${max + 1}`;
  }

  if (prefix === 'JOB') {
    const rows = await tx.productionJob.findMany({ select: { jobNo: true } });
    const max = rows.reduce((acc, row) => Math.max(acc, parseSerialNumber(row.jobNo, 'JOB')), defaultStart);
    return `JOB-${max + 1}`;
  }

  const rows = await tx.invoice.findMany({ select: { invoiceNo: true } });
  const max = rows.reduce((acc, row) => Math.max(acc, parseSerialNumber(row.invoiceNo, 'INV')), defaultStart);
  return `INV-${max + 1}`;
}
