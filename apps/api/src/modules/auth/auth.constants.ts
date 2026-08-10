/** Coût bcrypt (§5.7 A02). Partagé entre AuthService (hachage) et UserService (anonymisation RGPD). */
export const BCRYPT_COST = 12;

/** TTL du token de vérification d'e-mail en Redis (§5.1 — 24 h). */
export const EMAIL_VERIFICATION_TTL_SECONDS = 24 * 60 * 60;

/**
 * Clé Redis du refresh token courant d'un utilisateur. Une seule session de
 * rafraîchissement active à la fois (simplification F1) : une nouvelle
 * connexion ou une déconnexion révoque la précédente.
 */
export const refreshTokenRedisKey = (userId: string): string =>
  `auth:refresh:${userId}`;

/** Clé Redis du jeton de vérification d'e-mail (§5.1). */
export const emailVerificationRedisKey = (token: string): string =>
  `auth:email-verify:${token}`;
