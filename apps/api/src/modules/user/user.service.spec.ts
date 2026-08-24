import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { AuthService } from '../auth/auth.service';
import { CarbonLogService } from '../carbon/carbon-log.service';
import { MobilityProfile } from './entities/mobility-profile.entity';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { UserService } from './user.service';

interface MockRepo {
  findOne: jest.Mock;
  save: jest.Mock;
  softDelete: jest.Mock;
}

/** Mock générique de `Repository<T>` qui capture l'entité passée à `save()` via `onSave`. */
function buildMockRepo<T>(onSave?: (entity: T) => void): MockRepo {
  return {
    findOne: jest.fn(),
    save: jest.fn((entity: T) => {
      onSave?.(entity);
      return Promise.resolve(entity);
    }),
    softDelete: jest.fn(),
  };
}

describe('UserService', () => {
  let userRepository: MockRepo;
  let mobilityProfileRepository: MockRepo;
  let encryptionService: { encrypt: jest.Mock; decrypt: jest.Mock };
  let authService: { logout: jest.Mock };
  let carbonLogService: { deleteAllForUser: jest.Mock };
  let service: UserService;

  const baseUser: User = {
    id: 'user-id',
    tenantId: 'tenant-id',
    email: 'jane@example.com',
    passwordHash: 'hash',
    emailVerified: true,
    role: UserRole.Citizen,
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const baseProfile: MobilityProfile = {
    id: 'profile-id',
    userId: 'user-id',
    user: baseUser,
    preferredModes: [],
    constraints: { pmr: false, personalBike: false },
    transportSubscriptions: [],
    homeLocationEncrypted: null,
    workLocationEncrypted: null,
    geolocationConsent: false,
    geolocationConsentAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  let lastSavedUser: User | undefined;
  let lastSavedProfile: MobilityProfile | undefined;

  beforeEach(() => {
    lastSavedUser = undefined;
    lastSavedProfile = undefined;
    userRepository = buildMockRepo<User>((entity) => {
      lastSavedUser = entity;
    });
    mobilityProfileRepository = buildMockRepo<MobilityProfile>((entity) => {
      lastSavedProfile = entity;
    });
    encryptionService = {
      encrypt: jest.fn((value: string) => `encrypted(${value})`),
      decrypt: jest.fn(),
    };
    authService = { logout: jest.fn() };
    carbonLogService = { deleteAllForUser: jest.fn() };

    userRepository.findOne.mockResolvedValue({ ...baseUser });
    mobilityProfileRepository.findOne.mockResolvedValue({ ...baseProfile });

    service = new UserService(
      userRepository as unknown as Repository<User>,
      mobilityProfileRepository as unknown as Repository<MobilityProfile>,
      encryptionService as unknown as EncryptionService,
      authService as unknown as AuthService,
      carbonLogService as unknown as CarbonLogService,
    );
  });

  describe('getProfile', () => {
    it('retourne le profil sans champs sensibles', async () => {
      const result = await service.getProfile('user-id');

      expect(result.email).toBe('jane@example.com');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.mobilityProfile.hasHomeLocation).toBe(false);
    });

    it("rejette si l'utilisateur est introuvable (compte supprimé ou inexistant)", async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getProfile('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('met à jour les modes préférés, contraintes et abonnements', async () => {
      const result = await service.updateProfile('user-id', {
        preferredModes: ['bike'] as never,
        constraints: { pmr: true, personalBike: false },
        transportSubscriptions: ['STAR illimité'],
      });

      expect(result.mobilityProfile.preferredModes).toEqual(['bike']);
      expect(result.mobilityProfile.constraints).toEqual({
        pmr: true,
        personalBike: false,
      });
      expect(result.mobilityProfile.transportSubscriptions).toEqual([
        'STAR illimité',
      ]);
    });

    it('horodate le consentement quand il passe à true, le vide quand il repasse à false', async () => {
      const granted = await service.updateProfile('user-id', {
        geolocationConsent: true,
      });
      expect(granted.mobilityProfile.geolocationConsent).toBe(true);
      expect(granted.mobilityProfile.geolocationConsentAt).not.toBeNull();

      mobilityProfileRepository.findOne.mockResolvedValue({
        ...baseProfile,
        geolocationConsent: true,
        geolocationConsentAt: new Date(),
      });
      const revoked = await service.updateProfile('user-id', {
        geolocationConsent: false,
      });
      expect(revoked.mobilityProfile.geolocationConsent).toBe(false);
      expect(revoked.mobilityProfile.geolocationConsentAt).toBeNull();
    });

    it('rejette un point domicile sans consentement de géolocalisation', async () => {
      await expect(
        service.updateProfile('user-id', {
          homeLocation: { latitude: 48.1173, longitude: -1.6778 },
        }),
      ).rejects.toThrow(BadRequestException);

      expect(encryptionService.encrypt).not.toHaveBeenCalled();
    });

    it('chiffre le point domicile quand le consentement est accordé', async () => {
      const result = await service.updateProfile('user-id', {
        geolocationConsent: true,
        homeLocation: { latitude: 48.1173, longitude: -1.6778 },
      });

      expect(encryptionService.encrypt).toHaveBeenCalledWith(
        JSON.stringify({ latitude: 48.1173, longitude: -1.6778 }),
      );
      expect(result.mobilityProfile.hasHomeLocation).toBe(true);
    });

    it("rejette si l'utilisateur est introuvable", async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfile('unknown', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteAccount', () => {
    it("anonymise l'e-mail, invalide le mot de passe, soft-delete et révoque les tokens", async () => {
      await service.deleteAccount('user-id');

      expect(lastSavedUser?.email).toContain('anonymized.invalid');
      expect(lastSavedUser?.email).not.toBe('jane@example.com');
      expect(lastSavedUser?.passwordHash).not.toBe('hash');

      expect(userRepository.softDelete).toHaveBeenCalledWith({ id: 'user-id' });

      expect(lastSavedProfile?.homeLocationEncrypted).toBeNull();
      expect(lastSavedProfile?.geolocationConsent).toBe(false);

      // Les carbon_log de l'utilisateur sont purgés avec le compte (F4 §9).
      expect(carbonLogService.deleteAllForUser).toHaveBeenCalledWith(
        'tenant-id',
        'user-id',
      );

      expect(authService.logout).toHaveBeenCalledWith('user-id');
    });
  });
});
