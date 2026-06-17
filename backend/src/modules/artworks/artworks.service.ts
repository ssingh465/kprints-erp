import { prisma } from '../../lib/prisma.js';
import { removeArtworkStorage, removeArtworkStorageByUrl } from '../../utils/artwork-storage.js';

export class ArtworksService {
  async list(options: { search?: string; skip?: number; take?: number }) {
    const { search, skip, take } = options;
    const where: Record<string, unknown> = {};

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

  async getById(id: string) {
    return prisma.artworkUpload.findUnique({
      where: { id },
      include: {
        order: { select: { orderNo: true, customerName: true, status: true } },
      },
    });
  }

  async delete(id: string) {
    const artwork = await prisma.artworkUpload.findUnique({ where: { id } });
    if (!artwork) {
      throw new Error('Artwork upload not found');
    }

    await removeArtworkStorage(artwork.storagePath);
    if (!artwork.storagePath) {
      await removeArtworkStorageByUrl(artwork.fileUrl);
    }

    return prisma.artworkUpload.delete({ where: { id } });
  }

  async deleteByOrderId(orderId: string): Promise<void> {
    const artworks = await prisma.artworkUpload.findMany({ where: { orderId } });
    for (const artwork of artworks) {
      await removeArtworkStorage(artwork.storagePath);
      if (!artwork.storagePath) {
        await removeArtworkStorageByUrl(artwork.fileUrl);
      }
    }
  }
}
