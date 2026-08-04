import { UserRole } from '../../user/enums/user-role.enum';

/** Payload du JWT d'accès (§5.2). Volontairement minimal (pas d'e-mail : moins de PII dans le token). */
export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  role: UserRole;
}
