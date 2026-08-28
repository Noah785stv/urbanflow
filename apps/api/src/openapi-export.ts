import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { buildOpenApiDocument } from './config/swagger.config';

/**
 * Génère apps/api/openapi.json à partir de la même config que l'UI Swagger
 * (/api/docs, voir swagger.config.ts) — jamais désynchronisés. Démarre le
 * contexte Nest complet (donc Postgres/Redis doivent tourner, comme pour
 * `start:dev`) mais aucun serveur HTTP n'écoute jamais.
 * `pnpm --filter @urbanflow/api openapi:export`.
 */
async function exportOpenApiDocument(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = buildOpenApiDocument(app);
  const outputPath = join(process.cwd(), 'openapi.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`Document OpenAPI écrit dans ${outputPath}`);
  await app.close();
}

void exportOpenApiDocument();
