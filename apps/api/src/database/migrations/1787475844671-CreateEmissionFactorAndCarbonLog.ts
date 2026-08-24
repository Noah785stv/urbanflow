import { MigrationInterface, QueryRunner } from 'typeorm';

// Tenant unique du MVP (§5.4) — voir `common/constants/tenant.constants.ts`,
// non importable ici (les migrations tournent hors contexte Nest/DI).
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
// Date de référence des facteurs ADEME saisis au lancement de F4 (§4.7.3).
const SEED_VALID_FROM = '2026-01-01';

export class CreateEmissionFactorAndCarbonLog1787475844671 implements MigrationInterface {
  name = 'CreateEmissionFactorAndCarbonLog1787475844671';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."transport_mode" AS ENUM('walk', 'bike', 'electric_bike', 'scooter', 'metro', 'tram', 'bus', 'regional_train', 'car_solo', 'carpool')`,
    );
    await queryRunner.query(
      `CREATE TABLE "emission_factor" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "mode" "public"."transport_mode" NOT NULL, "grams_per_km" numeric(10,3) NOT NULL, "valid_from" date NOT NULL, "valid_to" date, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d43611b38f58108945ea9bf3019" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ad7eb010e66058d9726b58708f" ON "emission_factor" ("tenant_id", "mode", "valid_from") `,
    );

    await queryRunner.query(
      `CREATE TABLE "carbon_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "user_id" uuid NOT NULL, "logged_at" TIMESTAMP WITH TIME ZONE NOT NULL, "co2_grams" integer NOT NULL, "distance_meters" integer NOT NULL, "reference_co2_grams" integer NOT NULL, "saved_grams" integer NOT NULL, "mode_breakdown" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ad21d1a50cb8fd0b9e023eab4d0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_57f26d43ec92f656fe9de59f83" ON "carbon_log" ("tenant_id", "user_id", "logged_at") `,
    );

    // Seed des facteurs ADEME (§4.7.3) : Walk/Bike neutres, VAE 11, trottinette
    // 28, métro/tram 4, bus 113, TER 25, covoiturage 64, voiture solo 193
    // gCO2e/km — mêmes valeurs que `DEFAULT_EMISSION_FACTORS` (repli code),
    // qui doit être maintenu en synchronisation manuelle (pas de lecture
    // dynamique de ce fichier de constantes depuis une migration).
    await queryRunner.query(
      `INSERT INTO "emission_factor" ("tenant_id", "mode", "grams_per_km", "valid_from") VALUES
        ('${DEFAULT_TENANT_ID}', 'walk', 0, '${SEED_VALID_FROM}'),
        ('${DEFAULT_TENANT_ID}', 'bike', 0, '${SEED_VALID_FROM}'),
        ('${DEFAULT_TENANT_ID}', 'electric_bike', 11, '${SEED_VALID_FROM}'),
        ('${DEFAULT_TENANT_ID}', 'scooter', 28, '${SEED_VALID_FROM}'),
        ('${DEFAULT_TENANT_ID}', 'metro', 4, '${SEED_VALID_FROM}'),
        ('${DEFAULT_TENANT_ID}', 'tram', 4, '${SEED_VALID_FROM}'),
        ('${DEFAULT_TENANT_ID}', 'bus', 113, '${SEED_VALID_FROM}'),
        ('${DEFAULT_TENANT_ID}', 'regional_train', 25, '${SEED_VALID_FROM}'),
        ('${DEFAULT_TENANT_ID}', 'car_solo', 193, '${SEED_VALID_FROM}'),
        ('${DEFAULT_TENANT_ID}', 'carpool', 64, '${SEED_VALID_FROM}')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_57f26d43ec92f656fe9de59f83"`,
    );
    await queryRunner.query(`DROP TABLE "carbon_log"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ad7eb010e66058d9726b58708f"`,
    );
    await queryRunner.query(`DROP TABLE "emission_factor"`);
    await queryRunner.query(`DROP TYPE "public"."transport_mode"`);
  }
}
