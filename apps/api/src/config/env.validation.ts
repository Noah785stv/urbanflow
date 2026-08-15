import * as Joi from 'joi';

/**
 * Schéma de validation des variables d'environnement.
 * L'application refuse de démarrer si une variable critique manque ou est invalide.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  API_PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  // AES-256-GCM (§4.3) : clé de 32 octets encodée en base64.
  ENCRYPTION_KEY: Joi.string()
    .custom((value: string, helpers) => {
      if (Buffer.from(value, 'base64').length !== 32) {
        return helpers.error('any.invalid');
      }
      return value;
    }, 'longueur de clé AES-256 (32 octets)')
    .required(),
  CORS_ORIGIN: Joi.string().uri().default('http://localhost:3000'),

  // Intégration transport (F3) — §9 A10 : uniquement des hôtes configurés,
  // jamais une URL fournie par l'utilisateur.
  // OpenTripPlanner auto-hébergé (ADR-005) : remplace Navitia (accès payant).
  OTP_BASE_URL: Joi.string().uri().default('http://127.0.0.1:8081'),
  GBFS_FEED_URLS: Joi.string()
    .custom((value: string, helpers) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch {
        return helpers.error('any.invalid');
      }
      const isValid =
        Array.isArray(parsed) &&
        parsed.every(
          (url) => typeof url === 'string' && /^https?:\/\//.test(url),
        );
      return isValid ? value : helpers.error('any.invalid');
    }, "liste JSON d'URLs GBFS valides")
    .required(),
});
