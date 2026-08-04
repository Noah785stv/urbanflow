import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { DEFAULT_TENANT_ID } from '../../common/constants/tenant.constants';
import { MobilityProfile } from '../user/entities/mobility-profile.entity';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../user/enums/user-role.enum';
import { AuthService } from './auth.service';
import { refreshTokenRedisKey } from './auth.constants';

interface MockRepo {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
}

/** Mock générique de `Repository<T>` qui capture l'entité passée à `save()` via `onSave`. */
function buildMockRepo<T>(onSave?: (entity: Partial<T>) => void): MockRepo {
  return {
    findOne: jest.fn(),
    create: jest.fn((entity: Partial<T>) => entity),
    save: jest.fn((entity: Partial<T>) => {
      onSave?.(entity);
      return Promise.resolve({ id: 'generated-id', ...entity });
    }),
    update: jest.fn(),
  };
}

describe('AuthService', () => {
  let userRepository: MockRepo;
  let mobilityProfileRepository: MockRepo;
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let jwtService: JwtService;
  let configService: ConfigService;
  let service: AuthService;
  let lastSavedUser: Partial<User> | undefined;
  let lastSavedProfile: Partial<MobilityProfile> | undefined;

  beforeEach(() => {
    lastSavedUser = undefined;
    lastSavedProfile = undefined;
    userRepository = buildMockRepo<User>((entity) => {
      lastSavedUser = entity;
    });
    mobilityProfileRepository = buildMockRepo<MobilityProfile>((entity) => {
      lastSavedProfile = entity;
    });
    redis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

    configService = {
      get: jest.fn((key: string, fallback?: string) => {
        const values: Record<string, string> = {
          JWT_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
          CORS_ORIGIN: 'http://localhost:3000',
        };
        return values[key] ?? fallback;
      }),
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          JWT_SECRET: 'access-secret-at-least-16-chars',
          JWT_REFRESH_SECRET: 'refresh-secret-at-least-16-chars',
        };
        const value = values[key];
        if (!value) {
          throw new Error(`Missing ${key}`);
        }
        return value;
      }),
    } as unknown as ConfigService;

    jwtService = new JwtService({});

    service = new AuthService(
      userRepository as unknown as Repository<User>,
      mobilityProfileRepository as unknown as Repository<MobilityProfile>,
      jwtService,
      configService,
      redis as never,
    );
  });

  describe('register', () => {
    it('crée un utilisateur avec un mot de passe haché (jamais en clair)', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.register({
        email: 'Jane.Doe@Example.com',
        password: 'un-mot-de-passe-solide',
      });

      expect(result.email).toBe('jane.doe@example.com');
      const savedPasswordHash = lastSavedUser?.passwordHash ?? '';
      expect(savedPasswordHash).not.toBe('un-mot-de-passe-solide');
      expect(
        await bcrypt.compare('un-mot-de-passe-solide', savedPasswordHash),
      ).toBe(true);
      expect(lastSavedUser?.tenantId).toBe(DEFAULT_TENANT_ID);
      expect(lastSavedUser?.role).toBe(UserRole.Citizen);
    });

    it('crée un profil de mobilité vide associé', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await service.register({
        email: 'jane@example.com',
        password: 'un-mot-de-passe-solide',
      });

      expect(lastSavedProfile?.preferredModes).toEqual([]);
      expect(lastSavedProfile?.constraints).toEqual({
        pmr: false,
        personalBike: false,
      });
      expect(lastSavedProfile?.geolocationConsent).toBe(false);
    });

    it("rejette l'inscription si l'e-mail existe déjà pour le tenant", async () => {
      userRepository.findOne.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'jane@example.com',
          password: 'un-mot-de-passe-solide',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('journalise un jeton de vérification en Redis avec un TTL de 24h', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await service.register({
        email: 'jane@example.com',
        password: 'un-mot-de-passe-solide',
      });

      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('auth:email-verify:'),
        'generated-id',
        'EX',
        24 * 60 * 60,
      );
    });
  });

  describe('verifyEmail', () => {
    it("valide l'e-mail quand le jeton est présent en Redis", async () => {
      redis.get.mockResolvedValue('user-id');

      await service.verifyEmail({ token: 'valid-token' });

      expect(userRepository.update).toHaveBeenCalledWith(
        { id: 'user-id' },
        { emailVerified: true },
      );
      expect(redis.del).toHaveBeenCalledWith(
        expect.stringContaining('valid-token'),
      );
    });

    it('rejette un jeton invalide ou expiré', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.verifyEmail({ token: 'unknown' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('login', () => {
    const passwordHash = bcrypt.hashSync('un-mot-de-passe-solide', 4);

    it('retourne un access et un refresh token pour des identifiants valides', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-id',
        tenantId: DEFAULT_TENANT_ID,
        email: 'jane@example.com',
        passwordHash,
        emailVerified: true,
        role: UserRole.Citizen,
      });

      const tokens = await service.login({
        email: 'jane@example.com',
        password: 'un-mot-de-passe-solide',
      });

      expect(tokens.accessToken).toEqual(expect.any(String));
      expect(tokens.refreshToken).toEqual(expect.any(String));
      expect(redis.set).toHaveBeenCalledWith(
        refreshTokenRedisKey('user-id'),
        expect.any(String),
        'EX',
        expect.any(Number),
      );
    });

    it("rejette avec un message générique si l'utilisateur n'existe pas", async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'inconnu@example.com',
          password: 'peu-importe-1234',
        }),
      ).rejects.toThrow('Identifiants invalides.');
    });

    it('rejette avec le même message générique si le mot de passe est incorrect', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-id',
        tenantId: DEFAULT_TENANT_ID,
        email: 'jane@example.com',
        passwordHash,
        emailVerified: true,
        role: UserRole.Citizen,
      });

      await expect(
        service.login({
          email: 'jane@example.com',
          password: 'mauvais-mot-de-passe',
        }),
      ).rejects.toThrow('Identifiants invalides.');
    });

    it("bloque la connexion tant que l'e-mail n'est pas vérifié", async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-id',
        tenantId: DEFAULT_TENANT_ID,
        email: 'jane@example.com',
        passwordHash,
        emailVerified: false,
        role: UserRole.Citizen,
      });

      await expect(
        service.login({
          email: 'jane@example.com',
          password: 'un-mot-de-passe-solide',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('issueAccessToken', () => {
    it('émet un nouvel access token pour un utilisateur existant', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-id',
        tenantId: DEFAULT_TENANT_ID,
        role: UserRole.Citizen,
      });

      const result = await service.issueAccessToken('user-id');

      expect(result.accessToken).toEqual(expect.any(String));
    });

    it("rejette si l'utilisateur n'existe plus", async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.issueAccessToken('deleted-user')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('révoque le refresh token en supprimant la clé Redis associée', async () => {
      await service.logout('user-id');

      expect(redis.del).toHaveBeenCalledWith(refreshTokenRedisKey('user-id'));
    });
  });
});
