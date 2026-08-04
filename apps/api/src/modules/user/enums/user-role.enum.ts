/** Rôle RBAC de l'utilisateur (§5.7 A01). Détermine l'accès via `RolesGuard`. */
export enum UserRole {
  Citizen = 'citizen',
  Premium = 'premium',
  Admin = 'admin',
}
