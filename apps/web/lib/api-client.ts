import { getTokens, setTokens } from './token-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/** Forme d'erreur standard renvoyée par Nest (aucun filtre d'exception custom côté API). */
interface NestErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function toApiError(status: number, body: unknown): ApiError {
  const nestBody = body as Partial<NestErrorBody> | null;
  const rawMessage = nestBody?.message;
  const message = Array.isArray(rawMessage)
    ? rawMessage.join(' ')
    : (rawMessage ?? `Erreur ${status}`);
  return new ApiError(status, message);
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  return text ? (JSON.parse(text) as unknown) : null;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

async function rawRequest(
  path: string,
  options: RequestOptions,
  bearerToken?: string,
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  return fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

/**
 * `POST /auth/refresh` attend le refresh token en `Authorization: Bearer`
 * (même mécanisme que l'access token, cf. `jwt-refresh.strategy.ts`) — pas
 * l'access token. Ce n'est donc pas un appel `apiRequest` ordinaire.
 */
async function refreshAccessToken(): Promise<string | null> {
  const current = getTokens();
  if (!current) {
    return null;
  }

  const response = await rawRequest('/auth/refresh', { method: 'POST' }, current.refreshToken);

  if (!response.ok) {
    setTokens(null);
    return null;
  }

  const body = (await parseJsonBody(response)) as { accessToken: string };
  setTokens({ accessToken: body.accessToken, refreshToken: current.refreshToken });
  return body.accessToken;
}

/**
 * Client HTTP unique (§9) : attache l'access token courant, retente une fois
 * via `refresh` sur 401, sinon laisse l'appelant (contexte d'auth) gérer la
 * redirection vers `/login`.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await rawRequest(path, options, getTokens()?.accessToken);

  if (response.status === 401 && getTokens()) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      response = await rawRequest(path, options, refreshedToken);
    }
  }

  if (!response.ok) {
    throw toApiError(response.status, await parseJsonBody(response));
  }

  return (await parseJsonBody(response)) as T;
}
