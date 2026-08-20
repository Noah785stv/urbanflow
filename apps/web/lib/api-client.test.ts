import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, ApiError } from './api-client';
import { getTokens, setTokens } from './token-store';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiRequest', () => {
  beforeEach(() => {
    setTokens(null);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('attache le Bearer access token courant', async () => {
    setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await apiRequest('/users/me');

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer access-1');
  });

  it('retente une fois via /auth/refresh après un 401, puis rejoue la requête', async () => {
    setTokens({ accessToken: 'expired', refreshToken: 'refresh-1' });
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(401, { statusCode: 401 }))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'fresh' }))
      .mockResolvedValueOnce(jsonResponse(200, { hello: 'world' }));

    const result = await apiRequest('/users/me');

    expect(result).toEqual({ hello: 'world' });
    expect(fetch).toHaveBeenCalledTimes(3);

    const refreshCall = vi.mocked(fetch).mock.calls[1] as [string, RequestInit];
    expect(refreshCall[0]).toContain('/auth/refresh');
    expect((refreshCall[1].headers as Record<string, string>).Authorization).toBe(
      'Bearer refresh-1',
    );

    const retryCall = vi.mocked(fetch).mock.calls[2] as [string, RequestInit];
    expect((retryCall[1].headers as Record<string, string>).Authorization).toBe('Bearer fresh');
    expect(getTokens()).toEqual({ accessToken: 'fresh', refreshToken: 'refresh-1' });
  });

  it('efface les jetons si le refresh échoue aussi (session à ré-authentifier)', async () => {
    setTokens({ accessToken: 'expired', refreshToken: 'expired-too' });
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(401, { statusCode: 401 }))
      .mockResolvedValueOnce(jsonResponse(401, { statusCode: 401 }));

    await expect(apiRequest('/users/me')).rejects.toThrow(ApiError);
    expect(getTokens()).toBeNull();
  });

  it('joint les messages de validation (tableau) en une seule erreur lisible', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(400, {
        statusCode: 400,
        message: ['email must be an email', 'password too short'],
        error: 'Bad Request',
      }),
    );

    await expect(apiRequest('/auth/register', { method: 'POST' })).rejects.toThrow(
      'email must be an email password too short',
    );
  });
});
