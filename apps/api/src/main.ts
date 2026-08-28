import {
  ClassSerializerInterceptor,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { buildOpenApiDocument } from './config/swagger.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Arrêt propre (12-Factor) : ferme les connexions (Postgres, Redis) sur SIGTERM/SIGINT.
  app.enableShutdownHooks();

  // En-têtes HTTP durcis (OWASP A05 — §5.7)
  app.use(helmet());

  // CORS restreint à l'origine du front
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  // Versioning d'API : toutes les routes sous /api/v1 (§5.4)
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Validation globale des DTO (OWASP A03 — §5.7)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Filet de sécurité en complément de la sérialisation explicite des réponses :
  // exclut tout champ @Exclude() (password_hash, valeurs chiffrées) si une entité
  // devait un jour être renvoyée directement (§6).
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Doc OpenAPI interactive (interop C9). La CSP par défaut d'Helmet
  // (script-src 'self', pas de style inline) reste stricte PARTOUT ailleurs
  // — elle est relâchée uniquement sur ce chemin, jamais globalement, car la
  // page HTML servie par Swagger UI embarque un script d'amorçage inline
  // (l'appel `SwaggerUIBundle({...})`) et des styles inline : bloqués par
  // les directives par défaut, la page resterait blanche sans cet
  // assouplissement ciblé. `/api/docs-json` (le JSON brut, sans page HTML)
  // n'a pas besoin de cette relaxation et n'est pas concerné par ce chemin.
  app.use(
    '/api/docs',
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'", 'https:'],
        },
      },
    }),
  );
  SwaggerModule.setup('api/docs', app, buildOpenApiDocument(app));

  const port = process.env.API_PORT ?? 3001;
  await app.listen(port);
}

void bootstrap();
