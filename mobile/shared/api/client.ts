import Constants from 'expo-constants';

// Resolve the host IP: use Expo's debugger host (works on physical devices),
// fall back to localhost for simulators/web.
function getHostIp(): string {
  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    return debuggerHost.split(':')[0]; // strip Expo's Metro port
  }
  return 'localhost';
}

const HOST = getHostIp();

// Single unified API on port 5100
const BASE_URLS = {
  cleaning: `http://${HOST}:5100/api`,
  shopping: `http://${HOST}:5100/api`,
  finance: `http://${HOST}:5100/api`,
} as const;

type ServiceName = keyof typeof BASE_URLS;

type ExtraHeaders = Record<string, string>;

async function request<T>(
  service: ServiceName,
  path: string,
  options?: RequestInit,
  extraHeaders?: ExtraHeaders,
): Promise<T> {
  const url = `${BASE_URLS[service]}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
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
  get: <T>(path: string, extraHeaders?: ExtraHeaders) =>
    request<T>('cleaning', path, undefined, extraHeaders),
  post: <T>(path: string, body: unknown, extraHeaders?: ExtraHeaders) =>
    request<T>('cleaning', path, { method: 'POST', body: JSON.stringify(body) }, extraHeaders),
  put: <T>(path: string, body: unknown, extraHeaders?: ExtraHeaders) =>
    request<T>('cleaning', path, { method: 'PUT', body: JSON.stringify(body) }, extraHeaders),
  patch: <T>(path: string, body: unknown, extraHeaders?: ExtraHeaders) =>
    request<T>('cleaning', path, { method: 'PATCH', body: JSON.stringify(body) }, extraHeaders),
  delete: <T>(path: string, extraHeaders?: ExtraHeaders) =>
    request<T>('cleaning', path, { method: 'DELETE' }, extraHeaders),
};

export const shoppingApi = {
  get: <T>(path: string, extraHeaders?: ExtraHeaders) =>
    request<T>('shopping', path, undefined, extraHeaders),
  post: <T>(path: string, body: unknown, extraHeaders?: ExtraHeaders) =>
    request<T>('shopping', path, { method: 'POST', body: JSON.stringify(body) }, extraHeaders),
  put: <T>(path: string, body: unknown, extraHeaders?: ExtraHeaders) =>
    request<T>('shopping', path, { method: 'PUT', body: JSON.stringify(body) }, extraHeaders),
  patch: <T>(path: string, body: unknown, extraHeaders?: ExtraHeaders) =>
    request<T>('shopping', path, { method: 'PATCH', body: JSON.stringify(body) }, extraHeaders),
  delete: <T>(path: string, extraHeaders?: ExtraHeaders) =>
    request<T>('shopping', path, { method: 'DELETE' }, extraHeaders),
};

export const financeApi = {
  get: <T>(path: string, extraHeaders?: ExtraHeaders) =>
    request<T>('finance', path, undefined, extraHeaders),
  post: <T>(path: string, body: unknown, extraHeaders?: ExtraHeaders) =>
    request<T>('finance', path, { method: 'POST', body: JSON.stringify(body) }, extraHeaders),
  put: <T>(path: string, body: unknown, extraHeaders?: ExtraHeaders) =>
    request<T>('finance', path, { method: 'PUT', body: JSON.stringify(body) }, extraHeaders),
  delete: <T>(path: string, extraHeaders?: ExtraHeaders) =>
    request<T>('finance', path, { method: 'DELETE' }, extraHeaders),
};
