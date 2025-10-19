export interface CursorPaginationInput {
  limit?: number;
  cursor?: string;
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor?: string;
}

export function parseCursorPagination(query: Record<string, unknown>): CursorPaginationInput {
  const limit = Math.min(Number(query.limit ?? 20), 100);
  const cursor = typeof query.cursor === 'string' ? query.cursor : undefined;
  return { limit, cursor };
}

export function buildPaginationResponse<T>(items: T[], limit: number): CursorPaginationResult<T> {
  const data = items.slice(0, limit);
  const hasMore = items.length > limit;
  const nextCursor = hasMore ? JSON.stringify({}) : undefined; // TODO: implement real cursor encoding
  return { data, nextCursor };
}
