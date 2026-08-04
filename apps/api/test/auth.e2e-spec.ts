import type { Server } from 'node:http';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request, { Response } from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/modules/user/entities/user.entity';

interface RegisterResponseBody {
  id: string;
  email: string;
}

interface AuthTokensResponseBody {
  accessToken: string;
  refreshToken: string;
}

interface AccessTokenResponseBody {
  accessToken: string;
}

interface ErrorResponseBody {
  message: string;
}

interface UserProfileResponseBody {
  email: string;
  mobilityProfile: {
    preferredModes: string[];
    hasHomeLocation: boolean;
    hasWorkLocation: boolean;
  };
}

function bodyAs<T>(response: Response): T {
  return response.body as T;
}

/**
 * Parcours d'intégration F1 (§10) : register → verify-email → login → me →
 * patch → delete, plus les cas d'erreur clés du §9 (critères d'acceptation).
 * Tourne contre le Postgres/Redis de dev (docker-compose) — comme toute
 * suite Supertest de la pyramide de tests (§6.1), pas contre des mocks.
 */
describe('Auth & Users (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let userRepository: Repository<User>;
  let logSpy: jest.SpyInstance;

  const password = 'un-mot-de-passe-tres-solide';
  const userAEmail = `e2e.a.${Date.now()}@urbanflow.test`;
  const userBEmail = `e2e.b.${Date.now()}@urbanflow.test`;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();

    // Reproduit la configuration de main.ts (versioning, validation) pour un test représentatif.
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    httpServer = app.getHttpServer() as Server;
    userRepository = moduleRef.get(getRepositoryToken(User));
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterAll(async () => {
    logSpy.mockRestore();
    if (createdUserIds.length > 0) {
      await userRepository.delete(createdUserIds);
    }
    await app.close();
  });

  function extractVerificationToken(email: string): string {
    const call = logSpy.mock.calls.find(
      ([message]: [unknown]) =>
        typeof message === 'string' && message.includes(email),
    ) as [string] | undefined;
    if (!call) {
      throw new Error(`Aucun lien de vérification journalisé pour ${email}`);
    }
    const token = call[0].split('token=')[1];
    if (!token) {
      throw new Error(`Lien de vérification mal formé pour ${email}`);
    }
    return token;
  }

  describe('parcours nominal', () => {
    let accessToken: string;
    let refreshToken: string;

    it('POST /auth/register crée le compte et le profil vide', async () => {
      const response = await request(httpServer)
        .post('/api/v1/auth/register')
        .send({ email: userAEmail, password })
        .expect(201);

      const body = bodyAs<RegisterResponseBody>(response);
      expect(body.email).toBe(userAEmail);
      expect(body.id).toEqual(expect.any(String));
      expect(body).not.toHaveProperty('passwordHash');
      createdUserIds.push(body.id);
    });

    it('POST /auth/verify-email avec un jeton invalide échoue', async () => {
      await request(httpServer)
        .post('/api/v1/auth/verify-email')
        .send({ token: 'jeton-invalide' })
        .expect(401);
    });

    it("POST /auth/verify-email valide l'e-mail avec le bon jeton", async () => {
      const token = extractVerificationToken(userAEmail);

      await request(httpServer)
        .post('/api/v1/auth/verify-email')
        .send({ token })
        .expect(200);
    });

    it('POST /auth/login échoue avec un message générique si le mot de passe est faux', async () => {
      const response = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ email: userAEmail, password: 'mot-de-passe-incorrect' })
        .expect(401);

      expect(bodyAs<ErrorResponseBody>(response).message).toBe(
        'Identifiants invalides.',
      );
    });

    it('POST /auth/login retourne un access et un refresh token', async () => {
      const response = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ email: userAEmail, password })
        .expect(200);

      const body = bodyAs<AuthTokensResponseBody>(response);
      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.refreshToken).toEqual(expect.any(String));
      accessToken = body.accessToken;
      refreshToken = body.refreshToken;
    });

    it('GET /users/me sans token est rejeté (401)', async () => {
      await request(httpServer).get('/api/v1/users/me').expect(401);
    });

    it('GET /users/me retourne le profil sans donnée sensible', async () => {
      const response = await request(httpServer)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = bodyAs<UserProfileResponseBody>(response);
      expect(body.email).toBe(userAEmail);
      expect(body).not.toHaveProperty('passwordHash');
      expect(body.mobilityProfile).toMatchObject({
        preferredModes: [],
        hasHomeLocation: false,
        hasWorkLocation: false,
      });
    });

    it('PATCH /users/me rejette un mode de transport hors énumération', async () => {
      await request(httpServer)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ preferredModes: ['fusée'] })
        .expect(400);
    });

    it('PATCH /users/me rejette un point domicile sans consentement de géolocalisation', async () => {
      await request(httpServer)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ homeLocation: { latitude: 48.1173, longitude: -1.6778 } })
        .expect(400);
    });

    it('PATCH /users/me accepte domicile + consentement, jamais en clair dans la réponse', async () => {
      const response = await request(httpServer)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          preferredModes: ['bike', 'tram'],
          geolocationConsent: true,
          homeLocation: { latitude: 48.1173, longitude: -1.6778 },
        })
        .expect(200);

      const body = bodyAs<UserProfileResponseBody>(response);
      expect(body.mobilityProfile.preferredModes).toEqual(['bike', 'tram']);
      expect(body.mobilityProfile.hasHomeLocation).toBe(true);
      expect(JSON.stringify(body)).not.toContain('48.1173');
      expect(body.mobilityProfile).not.toHaveProperty('homeLocationEncrypted');
    });

    it('POST /auth/refresh sans token est rejeté (401)', async () => {
      await request(httpServer).post('/api/v1/auth/refresh').expect(401);
    });

    it('POST /auth/refresh émet un nouvel access token', async () => {
      const response = await request(httpServer)
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(200);

      expect(bodyAs<AccessTokenResponseBody>(response).accessToken).toEqual(
        expect.any(String),
      );
    });

    it('POST /auth/logout révoque le refresh token', async () => {
      await request(httpServer)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      await request(httpServer)
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);
    });

    it('DELETE /users/me supprime le compte (soft-delete RGPD)', async () => {
      await request(httpServer)
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('POST /auth/login échoue après suppression du compte', async () => {
      await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ email: userAEmail, password })
        .expect(401);
    });
  });

  describe("cas d'erreur", () => {
    it('POST /auth/register rejette un mot de passe de moins de 12 caractères', async () => {
      await request(httpServer)
        .post('/api/v1/auth/register')
        .send({
          email: `e2e.short.${Date.now()}@urbanflow.test`,
          password: 'court1234',
        })
        .expect(400);
    });

    it('POST /auth/register rejette un e-mail déjà utilisé', async () => {
      const duplicateEmail = `e2e.dup.${Date.now()}@urbanflow.test`;

      const first = await request(httpServer)
        .post('/api/v1/auth/register')
        .send({ email: duplicateEmail, password })
        .expect(201);
      createdUserIds.push(bodyAs<RegisterResponseBody>(first).id);

      await request(httpServer)
        .post('/api/v1/auth/register')
        .send({ email: duplicateEmail, password })
        .expect(409);
    });
  });

  describe('isolation entre utilisateurs (§9 — A01)', () => {
    it("le profil renvoyé par GET /users/me correspond toujours à l'appelant, jamais à un autre utilisateur", async () => {
      const registerResponse = await request(httpServer)
        .post('/api/v1/auth/register')
        .send({ email: userBEmail, password })
        .expect(201);
      createdUserIds.push(bodyAs<RegisterResponseBody>(registerResponse).id);

      const token = extractVerificationToken(userBEmail);
      await request(httpServer)
        .post('/api/v1/auth/verify-email')
        .send({ token })
        .expect(200);

      const loginResponse = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ email: userBEmail, password })
        .expect(200);
      const { accessToken } = bodyAs<AuthTokensResponseBody>(loginResponse);

      const meResponse = await request(httpServer)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const meBody = bodyAs<UserProfileResponseBody>(meResponse);
      expect(meBody.email).toBe(userBEmail);
      expect(meBody.email).not.toBe(userAEmail);
    });
  });
});
