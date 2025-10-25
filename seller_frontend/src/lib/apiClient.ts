import ky, { type Options } from 'ky';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

interface ApiClientOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  searchParams?: Record<string, string | number | boolean | undefined>;
  token?: string | null;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

const client = ky.create({
  prefixUrl: API_BASE_URL,
  hooks: {
    beforeRequest: [
      (request) => {
        request.headers.set('X-Requested-With', 'AYCL-Seller');
      }
    ]
  }
});

export async function apiClient<T>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
  const { method = 'GET', body, searchParams, token, headers, isFormData } = options;

  const requestOptions: Options = {
    method,
    ...(searchParams && { searchParams: searchParams as Record<string, string | number | boolean> }),
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(headers ?? {})
    }
  };

  if (token) {
    requestOptions.headers = {
      ...requestOptions.headers,
      Authorization: `Bearer ${token}`
    };
  }

  if (body !== undefined) {
    if (isFormData && body instanceof FormData) {
      requestOptions.body = body;
    } else {
      requestOptions.json = body;
    }
  }

  try {
    return await client(endpoint, requestOptions).json<T>();
  } catch (error: any) {
    const correlationId = error?.response?.headers?.get?.('x-correlation-id');
    const payload = await error?.response?.json?.();
    const message = payload?.message ?? error?.message ?? 'Errore sconosciuto';
    const err = new Error(`${message}${correlationId ? ` (CID: ${correlationId})` : ''}`);
    (err as any).details = payload?.details;
    (err as any).correlationId = correlationId;
    throw err;
  }
}
