import Constants from 'expo-constants';

const API_BASE =
  Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://localhost:5000';

const BASE_URLS = {
  cleaning: `${API_BASE}/api/cleaning`,
  shopping: `${API_BASE}/api/shopping`,
  finance: `${API_BASE}/api/finance`,
} as const;

type ServiceName = keyof typeof BASE_URLS;

async function request<T>(
  service: ServiceName,
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${BASE_URLS[service]}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new ApiError(response.status, response.statusText, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: string,
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

export const cleaningApi = {
  get: <T>(path: string) => request<T>('cleaning', path),
  post: <T>(path: string, body: unknown) =>
    request<T>('cleaning', path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>('cleaning', path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>('cleaning', path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>('cleaning', path, { method: 'DELETE' }),
};

export const shoppingApi = {
  get: <T>(path: string) => request<T>('shopping', path),
  post: <T>(path: string, body: unknown) =>
    request<T>('shopping', path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>('shopping', path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>('shopping', path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>('shopping', path, { method: 'DELETE' }),
};

export const financeApi = {
  get: <T>(path: string) => request<T>('finance', path),
  post: <T>(path: string, body: unknown) =>
    request<T>('finance', path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>('finance', path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>('finance', path, { method: 'DELETE' }),
};
