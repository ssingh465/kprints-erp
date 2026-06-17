import { prisma } from '../../lib/prisma.js';

export class PosterCategoriesService {
  async list() {
    return prisma.posterCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async create(name: string) {
    return prisma.posterCategory.create({ data: { name: name.trim() } });
  }

  async update(id: string, name: string) {
    return prisma.posterCategory.update({
      where: { id },
      data: { name: name.trim() },
    });
  }

  async delete(id: string) {
    const linked = await prisma.poster.count({ where: { categoryId: id } });
    if (linked > 0) {
      throw new Error('Category is linked to posters and cannot be deleted');
    }
    return prisma.posterCategory.delete({ where: { id } });
  }
}
