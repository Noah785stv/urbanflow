import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/**
 * Doc OpenAPI (interop C9) — construite une seule fois ici, réutilisée à la
 * fois par l'UI Swagger montée sur /api/docs (main.ts) et par le script
 * d'export autonome (openapi-export.ts), pour ne jamais désynchroniser les
 * deux. Décorateurs minimaux sur les contrôleurs (@ApiTags, @ApiBearerAuth) :
 * les formes des DTO sont inférées automatiquement par le plugin CLI
 * @nestjs/swagger (nest-cli.json), pas par des @ApiProperty à la main.
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('UrbanFlow Mobility API')
    .setDescription(
      'Planificateur de trajets multimodaux et empreinte carbone — API REST versionnée (/api/v1).',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('auth', 'Inscription, connexion, rafraîchissement, déconnexion')
    .addTag('users', 'Profil de mobilité, suppression de compte (RGPD)')
    .addTag('trips', 'Planificateur multimodal')
    .addTag('carbon-logs', 'Empreinte carbone (F4)')
    .addTag('stations', 'Vélos/trottinettes partagés (GBFS)')
    .addTag('stops', 'Horaires temps réel (GTFS-RT)')
    .addTag('health', 'Sonde de santé (Postgres, Redis)')
    .build();

  return SwaggerModule.createDocument(app, config);
}
