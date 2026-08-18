import type { Server } from 'node:http';
import { HttpService } from '@nestjs/axios';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JourneyOption, TransportMode } from '@urbanflow/shared-types';
import request, { Response } from 'supertest';
import { throwError } from 'rxjs';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/modules/user/entities/user.entity';
import { TRANSPORT_PROVIDERS } from '../src/modules/integration/providers/provider.tokens';

interface RegisterResponseBody {
  id: string;
  email: string;
}

interface AuthTokensResponseBody {
  accessToken: string;
}

interface PlanTripResponseBody {
  journeys: Array<{
    co2Grams: number;
    estimatedCostCents: number | null;
    labels: string[];
    sections: Array<{ mode: string }>;
  }>;
  stale: boolean;
  updatedAt: string | null;
}

function bodyAs<T>(response: Response): T {
  return response.body as T;
}

const RENNES_CENTER_COORDS = { latitude: 48.1173, longitude: -1.6778 };
const RENNES_GARE_COORDS = { latitude: 48.1032, longitude: -1.6726 };
// Coordonnées distinctes de RENNES_* pour garantir une clé de cache différente (§5.4).
const NANTES_COORDS = { latitude: 47.2184, longitude: -1.5536 };
const NANTES_NEARBY_COORDS = { latitude: 47.23, longitude: -1.56 };

const NOMINAL_JOURNEYS: JourneyOption[] = [
  {
    departureAt: '2026-08-17T08:00:00+02:00',
    arrivalAt: '2026-08-17T08:16:00+02:00',
    durationSeconds: 960,
    sections: [
      { mode: TransportMode.Walk, durationSeconds: 300, distanceMeters: 400 },
      { mode: TransportMode.Bus, durationSeconds: 660, distanceMeters: 3000 },
    ],
  },
  {
    departureAt: '2026-08-17T08:05:00+02:00',
    arrivalAt: '2026-08-17T08:30:00+02:00',
    durationSeconds: 1500,
    sections: [
      { mode: TransportMode.Walk, durationSeconds: 600, distanceMeters: 800 },
      { mode: TransportMode.Metro, durationSeconds: 900, distanceMeters: 2600 },
    ],
  },
  {
    departureAt: '2026-08-17T08:10:00+02:00',
    arrivalAt: '2026-08-17T08:40:00+02:00',
    durationSeconds: 1800,
    sections: [
      {
        mode: TransportMode.CarSolo,
        durationSeconds: 1800,
        distanceMeters: 8000,
      },
    ],
  },
];

/**
 * Parcours d'intégration F2 (§10) : `POST /trips/plan` nominal (≥ 3 options
 * étiquetées, CO₂/coût réels via `CarbonEstimatorService`/`FareEstimator`) et
 * mode dégradé (`RoutingProvider` en échec → réponse `stale`, jamais de 500).
 * `HttpService` est mocké et `TRANSPORT_PROVIDERS` remplacé par un provider
 * factice — aucun appel réseau réel (OTP/GBFS) en CI (§12).
 */
describe('Trips (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let userRepository: Repository<User>;
  let accessToken: string;
  const createdUserIds: string[] = [];
  const fakeRoutingProvider = {
    id: 'fake-routing',
    modes: [TransportMode.Walk, TransportMode.Bus],
    isAvailable: () => Promise.resolve(true),
    getJourneys: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(HttpService)
      .useValue({
        get: () =>
          throwError(() => new Error('e2e : réseau désactivé, voir §12')),
        post: () =>
          throwError(() => new Error('e2e : réseau désactivé, voir §12')),
      })
      .overrideProvider(TRANSPORT_PROVIDERS)
      .useValue([fakeRoutingProvider])
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

    const email = `f2.e2e.${Date.now()}@urbanflow.test`;
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
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await userRepository.delete(createdUserIds);
    }
    await app.close();
  });

  describe('POST /trips/plan', () => {
    it('sans token est rejeté (401)', async () => {
      await request(httpServer)
        .post('/api/v1/trips/plan')
        .send({ from: RENNES_CENTER_COORDS, to: RENNES_GARE_COORDS })
        .expect(401);
    });

    it('rejette des coordonnées invalides (400, §7 A03)', async () => {
      await request(httpServer)
        .post('/api/v1/trips/plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          from: { latitude: 999, longitude: -1.6778 },
          to: RENNES_GARE_COORDS,
        })
        .expect(400);
    });

    it('renvoie au moins 3 options étiquetées avec CO₂ et coût réels (cas nominal, §4.5)', async () => {
      fakeRoutingProvider.getJourneys.mockResolvedValueOnce(NOMINAL_JOURNEYS);

      const response = await request(httpServer)
        .post('/api/v1/trips/plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ from: RENNES_CENTER_COORDS, to: RENNES_GARE_COORDS })
        .expect(201);

      const body = bodyAs<PlanTripResponseBody>(response);

      expect(body.stale).toBe(false);
      expect(body.journeys).toHaveLength(3);
      // Bus 3 km * 113 gCO2e/km = 339 ; ticket TC unique = 180 ; ex-æquo le moins cher.
      expect(body.journeys[0]).toMatchObject({
        co2Grams: 339,
        estimatedCostCents: 180,
        labels: ['fastest', 'cheapest'],
      });
      // Metro 2.6 km * 4 gCO2e/km = 10.4 -> 10 (le plus écologique) ; même ticket TC.
      expect(body.journeys[1]).toMatchObject({
        co2Grams: 10,
        estimatedCostCents: 180,
        labels: ['greenest', 'cheapest'],
      });
      // Voiture solo 8 km : ni la plus rapide (égalité non atteinte), ni la plus verte, ni la moins chère.
      expect(body.journeys[2]).toMatchObject({
        co2Grams: 1544,
        estimatedCostCents: 240,
        labels: [],
      });
    });

    it('mode dégradé : répond quand même si le RoutingProvider est en panne, jamais de 500 (§4.6)', async () => {
      fakeRoutingProvider.getJourneys.mockRejectedValueOnce(
        new Error('OTP indisponible (e2e)'),
      );

      const response = await request(httpServer)
        .post('/api/v1/trips/plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ from: NANTES_COORDS, to: NANTES_NEARBY_COORDS })
        .expect(201);

      const body = bodyAs<PlanTripResponseBody>(response);
      expect(body).toEqual({ journeys: [], stale: true, updatedAt: null });
    });
  });
});
