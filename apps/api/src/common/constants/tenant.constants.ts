/**
 * Tenant par défaut (§5.4 — multi-tenancy logique posée dès le MVP).
 * F1 ne gère qu'un seul tenant ; la colonne `tenant_id` est présente sur `user`
 * dès à présent pour permettre l'extraction multi-tenant sans migration de schéma.
 */
export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
