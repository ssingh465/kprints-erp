import { prisma } from '../../lib/prisma.js';

export class ArtworksService {
  async list(options: { search?: string; skip?: number; take?: number }) {
    const { search, skip, take } = options;
    const where: any = {};

    if (search) {
      where.OR = [
        { fileName: { contains: search, mode: 'insensitive' } },
        { order: { orderNo: { contains: search, mode: 'insensitive' } } },
        { order: { customerName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.artworkUpload.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { orderNo: true, customerName: true, status: true } },
        },
      }),
      prisma.artworkUpload.count({ where }),
    ]);

    return { items, total };
  }
}
