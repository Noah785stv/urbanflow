import type { Server } from 'node:http';
import { HttpService } from '@nestjs/axios';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request, { Response } from 'supertest';
import { throwError } from 'rxjs';
import { In, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { CarbonLog } from '../src/modules/carbon/entities/carbon-log.entity';
import { User } from '../src/modules/user/entities/user.entity';

interface RegisterResponseBody {
  id: string;
  email: string;
}

interface AuthTokensResponseBody {
  accessToken: string;
}

interface CarbonLogResponseBody {
  id: string;
  loggedAt: string;
  co2Grams: number;
  distanceMeters: number;
  referenceCo2Grams: number;
  savedGrams: number;
  modeBreakdown: Array<{
    mode: string;
    distanceMeters: number;
    co2Grams: number;
  }>;
}

interface CarbonLogPageResponseBody {
  items: CarbonLogResponseBody[];
  total: number;
  page: number;
  limit: number;
}

interface CarbonLogSummaryResponseBody {
  totalCo2Grams: number;
  totalSavedGrams: number;
  monthly: Array<{
    month: string;
    co2Grams: number;
    savedGrams: number;
    tripCount: number;
  }>;
}

function bodyAs<T>(response: Response): T {
  return response.body as T;
}

async function registerAndLogin(
  httpServer: Server,
  userRepository: Repository<User>,
  createdUserIds: string[],
  emailPrefix: string,
): Promise<string> {
  const email = `${emailPrefix}.${Date.now()}.${Math.random().toString(36).slice(2)}@urbanflow.test`;
  const password = 'un-mot-de-passe-tres-solide';

  const registerResponse = await request(httpServer)
    .post('/api/v1/auth/register')
    .send({ email, password })
    .expect(201);
  createdUserIds.push(bodyAs<RegisterResponseBody>(registerResponse).id);
  await userRepository.update({ email }, { emailVerified: true });

  const loginResponse = await request(httpServer)
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);
  return bodyAs<AuthTokensResponseBody>(loginResponse).accessToken;
}

/**
 * Parcours d'intégration F4 (§12) : confirmation d'un trajet (recalcul
 * serveur, jamais le CO₂ du client), agrégats du tableau de bord, et
 * appartenance stricte (un utilisateur ne voit jamais les logs d'un autre).
 * `HttpService` est mocké pour échouer systématiquement — aucun appel réseau
 * réel en CI (§12), sans objet ici (le module Carbon n'en fait aucun).
 */
describe('Carbon logs (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let userRepository: Repository<User>;
  let carbonLogRepository: Repository<CarbonLog>;
  let accessTokenA: string;
  let accessTokenB: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(HttpService)
      .useValue({
        get: () =>
          throwError(() => new Error('e2e : réseau désactivé, voir §12')),
        post: () =>
          throwError(() => new Error('e2e : réseau désactivé, voir §12')),
      })
      .compile();

    app = moduleRef.createNestApplication();
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
    carbonLogRepository = moduleRef.get(getRepositoryToken(CarbonLog));

    accessTokenA = await registerAndLogin(
      httpServer,
      userRepository,
      createdUserIds,
      'f4.a.e2e',
    );
    accessTokenB = await registerAndLogin(
      httpServer,
      userRepository,
      createdUserIds,
      'f4.b.e2e',
    );
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await carbonLogRepository.delete({ userId: In(createdUserIds) });
      await userRepository.delete(createdUserIds);
    }
    await app.close();
  });

  describe('POST /carbon-logs', () => {
    it('sans token est rejeté (401)', async () => {
      await request(httpServer)
        .post('/api/v1/carbon-logs')
        .send({ sections: [{ mode: 'bus', distanceMeters: 3000 }] })
        .expect(401);
    });

    it('rejette un payload sans sections (400)', async () => {
      await request(httpServer)
        .post('/api/v1/carbon-logs')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .send({})
        .expect(400);
    });

    it('rejette un co2Grams envoyé par le client : champ non whitelisté (400, §6)', async () => {
      await request(httpServer)
        .post('/api/v1/carbon-logs')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .send({
          sections: [{ mode: 'bus', distanceMeters: 3000 }],
          co2Grams: 1,
        })
        .expect(400);
    });

    it('recalcule le CO2 côté serveur et persiste un log minimisé (§4.2, §6)', async () => {
      const response = await request(httpServer)
        .post('/api/v1/carbon-logs')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .send({ sections: [{ mode: 'bus', distanceMeters: 3000 }] })
        .expect(201);

      const body = bodyAs<CarbonLogResponseBody>(response);

      // Bus 3 km * 113 gCO2e/km = 339 ; référence voiture solo 3 km * 193 = 579.
      expect(body.co2Grams).toBe(339);
      expect(body.distanceMeters).toBe(3000);
      expect(body.referenceCo2Grams).toBe(579);
      expect(body.savedGrams).toBe(240);
      expect(body.modeBreakdown).toEqual([
        { mode: 'bus', distanceMeters: 3000, co2Grams: 339 },
      ]);
      expect(body).not.toHaveProperty('origin');
      expect(body).not.toHaveProperty('destination');
    });
  });

  describe('GET /carbon-logs et /carbon-logs/summary — appartenance stricte (§9)', () => {
    it("un utilisateur ne voit que ses propres logs, jamais ceux d'un autre", async () => {
      await request(httpServer)
        .post('/api/v1/carbon-logs')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .send({ sections: [{ mode: 'metro', distanceMeters: 2000 }] })
        .expect(201);

      const responseA = await request(httpServer)
        .get('/api/v1/carbon-logs')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .expect(200);
      const pageA = bodyAs<CarbonLogPageResponseBody>(responseA);
      expect(pageA.items.length).toBeGreaterThanOrEqual(2);

      const responseB = await request(httpServer)
        .get('/api/v1/carbon-logs')
        .set('Authorization', `Bearer ${accessTokenB}`)
        .expect(200);
      const pageB = bodyAs<CarbonLogPageResponseBody>(responseB);
      expect(pageB.items).toEqual([]);
      expect(pageB.total).toBe(0);
    });

    it('sans token est rejeté (401)', async () => {
      await request(httpServer).get('/api/v1/carbon-logs').expect(401);
    });

    it('summary agrège les trajets confirmés du mois courant pour le bon utilisateur', async () => {
      const response = await request(httpServer)
        .get('/api/v1/carbon-logs/summary')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .expect(200);
      const summary = bodyAs<CarbonLogSummaryResponseBody>(response);

      // Bus (339) + Métro 2km*4=8 confirmés plus haut pour l'utilisateur A.
      expect(summary.totalCo2Grams).toBeGreaterThanOrEqual(347);
      expect(summary.monthly.length).toBeGreaterThanOrEqual(1);

      const responseB = await request(httpServer)
        .get('/api/v1/carbon-logs/summary')
        .set('Authorization', `Bearer ${accessTokenB}`)
        .expect(200);
      const summaryB = bodyAs<CarbonLogSummaryResponseBody>(responseB);
      expect(summaryB).toEqual({
        totalCo2Grams: 0,
        totalSavedGrams: 0,
        monthly: [],
      });
    });
  });

  describe('GET /carbon-logs/report', () => {
    it('renvoie un PDF pour le mois courant (§8)', async () => {
      const month = new Date().toISOString().slice(0, 7);

      const response = await request(httpServer)
        .get(`/api/v1/carbon-logs/report?month=${month}`)
        .set('Authorization', `Bearer ${accessTokenA}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect((response.body as Buffer).subarray(0, 5).toString('latin1')).toBe(
        '%PDF-',
      );
    });

    it('rejette un mois mal formé (400)', async () => {
      await request(httpServer)
        .get('/api/v1/carbon-logs/report?month=2026-8')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .expect(400);
    });
  });
});
