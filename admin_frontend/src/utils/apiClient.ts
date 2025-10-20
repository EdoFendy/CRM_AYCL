import ky, { Options } from 'ky';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

interface ApiClientOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  searchParams?: Record<string, string | number | boolean | undefined>;
  token?: string | null;
  headers?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pageInfo: {
    nextCursor?: string | null;
    prevCursor?: string | null;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

const client = ky.create({
  prefixUrl: API_BASE_URL,
  hooks: {
    beforeRequest: [
      (request) => {
        request.headers.set('X-Requested-With', 'AYCL-Admin');
      },
    ],
  },
});

export async function apiClient<T = any>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
  const { method = 'GET', body, searchParams, token, headers } = options;

  const requestOptions: Options = {
    method,
    searchParams,
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
  };

  if (token) {
    requestOptions.headers = { ...requestOptions.headers, Authorization: `Bearer ${token}` };
  }

  if (body) {
    requestOptions.json = body;
  }

  try {
    const response = await client(endpoint, requestOptions).json<T>();
    return response;
  } catch (error: any) {
    const correlationId = error?.response?.headers?.get?.('x-correlation-id');
    const payload = await error?.response?.json?.();
    const message = payload?.message ?? error.message ?? 'Unknown error';
    const err = new Error(`${message}${correlationId ? ` (CID: ${correlationId})` : ''}`);
    (err as any).details = payload?.details;
    (err as any).correlationId = correlationId;
    throw err;
  }
}
