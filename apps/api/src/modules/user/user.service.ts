import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { AuthService } from '../auth/auth.service';
import { CarbonLogService } from '../carbon/carbon-log.service';
import { UpdateMobilityProfileDto } from './dto/update-mobility-profile.dto';
import { MobilityProfile } from './entities/mobility-profile.entity';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { MobilityConstraints } from './types/mobility-constraints.interface';

export interface UserProfileResponse {
  id: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  createdAt: Date;
  mobilityProfile: {
    preferredModes: string[];
    constraints: MobilityConstraints;
    transportSubscriptions: string[];
    geolocationConsent: boolean;
    geolocationConsentAt: Date | null;
    hasHomeLocation: boolean;
    hasWorkLocation: boolean;
  };
}

/** Service User & Profile (§5.3) — accès et mise à jour du profil de mobilité. */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(MobilityProfile)
    private readonly mobilityProfileRepository: Repository<MobilityProfile>,
    private readonly encryptionService: EncryptionService,
    private readonly authService: AuthService,
    private readonly carbonLogService: CarbonLogService,
  ) {}

  async getProfile(userId: string): Promise<UserProfileResponse> {
    const { user, profile } = await this.findUserAndProfileOrThrow(userId);
    return this.toResponse(user, profile);
  }

  async updateProfile(
    userId: string,
    dto: UpdateMobilityProfileDto,
  ): Promise<UserProfileResponse> {
    const { user, profile } = await this.findUserAndProfileOrThrow(userId);

    if (dto.preferredModes !== undefined) {
      profile.preferredModes = dto.preferredModes;
    }
    if (dto.constraints !== undefined) {
      profile.constraints = dto.constraints;
    }
    if (dto.transportSubscriptions !== undefined) {
      profile.transportSubscriptions = dto.transportSubscriptions;
    }

    if (dto.geolocationConsent !== undefined) {
      profile.geolocationConsent = dto.geolocationConsent;
      profile.geolocationConsentAt = dto.geolocationConsent ? new Date() : null;
    }

    if (dto.homeLocation !== undefined || dto.workLocation !== undefined) {
      // §5.3 : écrire un point domicile/travail exige le consentement de géolocalisation.
      if (!profile.geolocationConsent) {
        throw new BadRequestException(
          "Le consentement de géolocalisation est requis avant d'enregistrer domicile/travail.",
        );
      }
    }
    if (dto.homeLocation !== undefined) {
      profile.homeLocationEncrypted = this.encryptionService.encrypt(
        JSON.stringify(dto.homeLocation),
      );
    }
    if (dto.workLocation !== undefined) {
      profile.workLocationEncrypted = this.encryptionService.encrypt(
        JSON.stringify(dto.workLocation),
      );
    }

    const saved = await this.mobilityProfileRepository.save(profile);
    return this.toResponse(user, saved);
  }

  async deleteAccount(userId: string): Promise<void> {
    const { user, profile } = await this.findUserAndProfileOrThrow(userId);

    // Anonymisation immédiate des données directement identifiantes (§5.4 RGPD),
    // puis soft-delete : un compte supprimé ne peut plus se connecter (le
    // repository TypeORM exclut automatiquement les lignes `deleted_at` non nulles).
    user.email = `deleted-${user.id}@anonymized.invalid`;
    user.passwordHash = randomBytes(32).toString('hex'); // jamais réutilisé (login déjà bloqué)
    await this.userRepository.save(user);
    await this.userRepository.softDelete({ id: user.id });

    profile.homeLocationEncrypted = null;
    profile.workLocationEncrypted = null;
    profile.geolocationConsent = false;
    profile.geolocationConsentAt = null;
    await this.mobilityProfileRepository.save(profile);

    // Les `carbon_log` sont déjà minimisés (ni origine ni destination, F4
    // §4.2) mais restent liés à l'utilisateur : purge avec le compte (§9).
    // Pas de FK CASCADE possible ici (le compte est soft-deleted, jamais
    // réellement supprimé) — suppression explicite, comme pour le profil.
    await this.carbonLogService.deleteAllForUser(user.tenantId, userId);

    await this.authService.logout(userId);
  }

  private async findUserAndProfileOrThrow(
    userId: string,
  ): Promise<{ user: User; profile: MobilityProfile }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const profile = await this.mobilityProfileRepository.findOne({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Profil de mobilité introuvable.');
    }

    return { user, profile };
  }

  private toResponse(
    user: User,
    profile: MobilityProfile,
  ): UserProfileResponse {
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      createdAt: user.createdAt,
      mobilityProfile: {
        preferredModes: profile.preferredModes,
        constraints: profile.constraints,
        transportSubscriptions: profile.transportSubscriptions,
        geolocationConsent: profile.geolocationConsent,
        geolocationConsentAt: profile.geolocationConsentAt,
        hasHomeLocation: profile.homeLocationEncrypted !== null,
        hasWorkLocation: profile.workLocationEncrypted !== null,
      },
    };
  }
}
