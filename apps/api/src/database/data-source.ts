import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

// DataSource dédiée au CLI de migration TypeORM (`pnpm migration:*`), distincte
// du `DatabaseModule` NestJS qui gère la connexion applicative via ConfigService.
config({ path: '../../.env' });

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  namingStrategy: new SnakeNamingStrategy(),
  entities: ['src/modules/**/entities/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});
