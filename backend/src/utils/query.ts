import { Context } from 'hono';

export function parseQueryParams(c: Context) {
  const query = c.req.query();
  const page = parseInt(query.page || '1', 10);
  const limit = parseInt(query.limit || query.pageSize || '100', 10);
  const search = query.search || query.q || '';
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = (query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
    search: search.trim(),
    sortBy,
    sortOrder: sortOrder as 'asc' | 'desc',
    rawQuery: query
  };
}
