/** Payload du JWT de rafraîchissement (§5.2). `jti` permet la révocation via Redis. */
export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}
