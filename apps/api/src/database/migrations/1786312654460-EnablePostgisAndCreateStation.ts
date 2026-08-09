import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePostgisAndCreateStation1786312654460 implements MigrationInterface {
  name = 'EnablePostgisAndCreateStation1786312654460';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // §4.1 : active PostGIS avant toute utilisation de la colonne geography(Point).
    // Non généré automatiquement par TypeORM (contrairement à uuid-ossp) — ajouté manuellement.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    await queryRunner.query(
      `CREATE TYPE "public"."station_type" AS ENUM('bike', 'scooter', 'dock', 'transit_stop')`,
    );
    await queryRunner.query(
      `CREATE TABLE "station" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "provider" character varying NOT NULL, "external_id" character varying NOT NULL, "name" character varying NOT NULL, "station_type" "public"."station_type" NOT NULL, "location" geography(Point,4326) NOT NULL, "capacity" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_cad1b3e7182ef8df1057b82f6aa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4c778f09b97bee659d64fdc58b" ON "station" USING GiST ("location") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c1dc66ccc9221be01f449adb56" ON "station" ("provider", "external_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c1dc66ccc9221be01f449adb56"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4c778f09b97bee659d64fdc58b"`,
    );
    await queryRunner.query(`DROP TABLE "station"`);
    await queryRunner.query(`DROP TYPE "public"."station_type"`);
  }
}
