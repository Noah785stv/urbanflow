import type { JwtSignOptions } from '@nestjs/jwt';

/**
 * `@nestjs/jwt` type `expiresIn` via le littéral `StringValue` de la lib `ms`
 * (ex. `'15m'`), incompatible avec le `string` générique renvoyé par
 * `ConfigService` (12-Factor). Ce helper centralise la conversion explicite
 * plutôt que de disperser des `as any` dans le service.
 */
export function asJwtDuration(
  value: string,
): NonNullable<JwtSignOptions['expiresIn']> {
  return value as NonNullable<JwtSignOptions['expiresIn']>;
}
