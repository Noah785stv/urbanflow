import { envValidationSchema } from './env.validation';

interface ValidatedEnv {
  NODE_ENV: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
}

function validEnv(
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'a-secret-of-16-chars-or-more',
    JWT_REFRESH_SECRET: 'another-secret-of-16-chars-or-more',
    ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
    ...overrides,
  };
}

describe('envValidationSchema', () => {
  it('accepte un environnement valide et applique les valeurs par défaut', () => {
    const result = envValidationSchema.validate(validEnv());

    expect(result.error).toBeUndefined();
    const value = result.value as ValidatedEnv;
    expect(value.NODE_ENV).toBe('development');
    expect(value.JWT_EXPIRES_IN).toBe('15m');
    expect(value.JWT_REFRESH_EXPIRES_IN).toBe('7d');
  });

  it('rejette une ENCRYPTION_KEY qui ne fait pas 32 octets une fois décodée', () => {
    const { error } = envValidationSchema.validate(
      validEnv({ ENCRYPTION_KEY: Buffer.alloc(16, 1).toString('base64') }),
    );

    expect(error).toBeDefined();
    expect(error?.message).toContain('ENCRYPTION_KEY');
  });

  it('rejette un JWT_SECRET trop court (§5.7 A02)', () => {
    const { error } = envValidationSchema.validate(
      validEnv({ JWT_SECRET: 'trop-court' }),
    );

    expect(error).toBeDefined();
  });

  it('rejette une DATABASE_URL absente', () => {
    const env = validEnv();
    delete env.DATABASE_URL;

    const { error } = envValidationSchema.validate(env);

    expect(error).toBeDefined();
  });
});
