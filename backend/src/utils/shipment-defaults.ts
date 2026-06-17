import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

type TransactionClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface ShipmentDefaults {
  carrier: string;
  city: string;
}

export async function getShipmentDefaults(tx?: TransactionClient): Promise<ShipmentDefaults> {
  const client = tx ?? prisma;
  const settings = await client.settings.findFirst({
    select: { defaultCarrier: true, defaultShipmentCity: true },
  });

  return {
    carrier: settings?.defaultCarrier || 'Delhivery',
    city: settings?.defaultShipmentCity || 'Delhi',
  };
}
