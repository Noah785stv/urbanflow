import { envValidationSchema } from './env.validation';

interface ValidatedEnv {
  NODE_ENV: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  NAVITIA_BASE_URL: string;
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
    NAVITIA_API_KEY: 'a-navitia-key',
    NAVITIA_COVERAGE: 'fr-idf',
    GBFS_FEED_URLS: '["https://exemple.tld/gbfs.json"]',
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
    expect(value.NAVITIA_BASE_URL).toBe('https://api.navitia.io/v1');
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

  it('accepte GBFS_FEED_URLS vide (aucun opérateur configuré)', () => {
    const { error } = envValidationSchema.validate(
      validEnv({ GBFS_FEED_URLS: '[]' }),
    );

    expect(error).toBeUndefined();
  });

  it("rejette GBFS_FEED_URLS si ce n'est pas un JSON valide", () => {
    const { error } = envValidationSchema.validate(
      validEnv({ GBFS_FEED_URLS: 'pas-du-json' }),
    );

    expect(error).toBeDefined();
  });

  it("rejette GBFS_FEED_URLS si ce n'est pas un tableau d'URLs (§9 A10)", () => {
    const { error } = envValidationSchema.validate(
      validEnv({ GBFS_FEED_URLS: '["pas-une-url"]' }),
    );

    expect(error).toBeDefined();
  });

  it('rejette une NAVITIA_COVERAGE absente', () => {
    const env = validEnv();
    delete env.NAVITIA_COVERAGE;

    const { error } = envValidationSchema.validate(env);

    expect(error).toBeDefined();
  });
});
