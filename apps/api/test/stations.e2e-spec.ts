import type { Server } from 'node:http';
import { HttpService } from '@nestjs/axios';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StationType } from '@urbanflow/shared-types';
import request, { Response } from 'supertest';
import { throwError } from 'rxjs';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Station } from '../src/modules/integration/entities/station.entity';
import { User } from '../src/modules/user/entities/user.entity';

interface RegisterResponseBody {
  id: string;
  email: string;
}

interface AuthTokensResponseBody {
  accessToken: string;
}

interface StationNearbyResponseBody {
  station: { name: string };
  distanceMeters: number;
  status: unknown;
}

function bodyAs<T>(response: Response): T {
  return response.body as T;
}

const RENNES_CENTER = { latitude: 48.1173, longitude: -1.6778 };
// ~300 m au sud du centre, toujours dans le rayon de recherche par défaut.
const RENNES_NEARBY = { latitude: 48.1146, longitude: -1.6778 };
const PARIS = { latitude: 48.8566, longitude: 2.3522 };

/**
 * Parcours d'intégration F3 (§12) : proximité PostGIS réelle (ST_DWithin)
 * contre le Postgres de CI, et mode dégradé pour les prochains passages.
 * `HttpService` est mocké pour échouer systématiquement — aucun appel réseau
 * réel vers Navitia/GBFS (§12 : "aucun appel réseau réel en CI").
 */
describe('Stations & Stops (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let userRepository: Repository<User>;
  let stationRepository: Repository<Station>;
  let accessToken: string;
  const createdUserIds: string[] = [];
  const createdStationIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(HttpService)
      .useValue({
        get: () =>
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
    stationRepository = moduleRef.get(getRepositoryToken(Station));

    const email = `f3.e2e.${Date.now()}@urbanflow.test`;
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
    accessToken = bodyAs<AuthTokensResponseBody>(loginResponse).accessToken;

    const saved = await stationRepository.save([
      stationRepository.create({
        tenantId: '00000000-0000-0000-0000-000000000001',
        provider: 'gbfs:e2e-test',
        externalId: 'near',
        name: 'Station proche',
        stationType: StationType.Dock,
        location: {
          type: 'Point',
          coordinates: [RENNES_CENTER.longitude, RENNES_CENTER.latitude],
        },
        capacity: 10,
      }),
      stationRepository.create({
        tenantId: '00000000-0000-0000-0000-000000000001',
        provider: 'gbfs:e2e-test',
        externalId: 'medium',
        name: 'Station à 300m',
        stationType: StationType.Dock,
        location: {
          type: 'Point',
          coordinates: [RENNES_NEARBY.longitude, RENNES_NEARBY.latitude],
        },
        capacity: 5,
      }),
      stationRepository.create({
        tenantId: '00000000-0000-0000-0000-000000000001',
        provider: 'gbfs:e2e-test',
        externalId: 'far',
        name: 'Station lointaine (Paris)',
        stationType: StationType.Dock,
        location: {
          type: 'Point',
          coordinates: [PARIS.longitude, PARIS.latitude],
        },
        capacity: 5,
      }),
    ]);
    createdStationIds.push(...saved.map((station) => station.id));
  });

  afterAll(async () => {
    if (createdStationIds.length > 0) {
      await stationRepository.delete(createdStationIds);
    }
    if (createdUserIds.length > 0) {
      await userRepository.delete(createdUserIds);
    }
    await app.close();
  });

  describe('GET /stations/nearby', () => {
    it('sans token est rejeté (401)', async () => {
      await request(httpServer)
        .get('/api/v1/stations/nearby?lat=48.1173&lng=-1.6778&radius=1000')
        .expect(401);
    });

    it('rejette un rayon hors bornes (400)', async () => {
      await request(httpServer)
        .get('/api/v1/stations/nearby?lat=48.1173&lng=-1.6778&radius=99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('renvoie les stations dans le rayon, triées par distance croissante (PostGIS)', async () => {
      const response = await request(httpServer)
        .get('/api/v1/stations/nearby?lat=48.1173&lng=-1.6778&radius=1000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const results = bodyAs<StationNearbyResponseBody[]>(response);
      const names = results.map((result) => result.station.name);

      expect(names).toEqual(['Station proche', 'Station à 300m']);
      expect(names).not.toContain('Station lointaine (Paris)');
      expect(results[0]?.distanceMeters).toBeLessThan(
        results[1]?.distanceMeters ?? Infinity,
      );
    });

    it("signale l'absence de statut temps réel (aucun flux GBFS réel configuré en test)", async () => {
      const response = await request(httpServer)
        .get('/api/v1/stations/nearby?lat=48.1173&lng=-1.6778&radius=1000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const results = bodyAs<StationNearbyResponseBody[]>(response);
      expect(results.every((result) => result.status === null)).toBe(true);
    });
  });

  describe('GET /stops/:id/departures', () => {
    it("mode dégradé : répond quand même si la source est injoignable, jamais d'échec global (§4.6)", async () => {
      const response = await request(httpServer)
        .get('/api/v1/stops/stop_point:e2e/departures')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(bodyAs<unknown[]>(response)).toEqual([]);
    });

    it('sans token est rejeté (401)', async () => {
      await request(httpServer)
        .get('/api/v1/stops/stop_point:e2e/departures')
        .expect(401);
    });
  });
});
