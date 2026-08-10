import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserAndMobilityProfile1785761597340 implements MigrationInterface {
  name = 'CreateUserAndMobilityProfile1785761597340';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "mobility_profile" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "preferred_modes" jsonb NOT NULL, "constraints" jsonb NOT NULL, "transport_subscriptions" text array NOT NULL, "home_location_encrypted" text, "work_location_encrypted" text, "geolocation_consent" boolean NOT NULL DEFAULT false, "geolocation_consent_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_88d25261582757bae2a682692a6" UNIQUE ("user_id"), CONSTRAINT "REL_88d25261582757bae2a682692a" UNIQUE ("user_id"), CONSTRAINT "PK_57177823171a9779e1be8c46055" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('citizen', 'premium', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "email_verified" boolean NOT NULL DEFAULT false, "role" "public"."user_role" NOT NULL DEFAULT 'citizen', "deleted_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b8f79c6cc2a72309532fb80062" ON "user" ("tenant_id", "email") `,
    );
    await queryRunner.query(
      `ALTER TABLE "mobility_profile" ADD CONSTRAINT "FK_88d25261582757bae2a682692a6" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mobility_profile" DROP CONSTRAINT "FK_88d25261582757bae2a682692a6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b8f79c6cc2a72309532fb80062"`,
    );
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_role"`);
    await queryRunner.query(`DROP TABLE "mobility_profile"`);
  }
}
