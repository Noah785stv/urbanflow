import { randomBytes, randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import type Redis from 'ioredis';
import { Repository } from 'typeorm';
import { DEFAULT_TENANT_ID } from '../../common/constants/tenant.constants';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { MobilityProfile } from '../user/entities/mobility-profile.entity';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../user/enums/user-role.enum';
import {
  BCRYPT_COST,
  EMAIL_VERIFICATION_TTL_SECONDS,
  emailVerificationRedisKey,
  refreshTokenRedisKey,
} from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AccessTokenPayload } from './types/access-token-payload.interface';
import { asJwtDuration } from './utils/jwt-duration.util';

// Message volontairement générique (§5.2, OWASP A07) : ne révèle jamais si
// c'est l'e-mail ou le mot de passe qui est invalide.
const GENERIC_AUTH_ERROR = 'Identifiants invalides.';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(MobilityProfile)
    private readonly mobilityProfileRepository: Repository<MobilityProfile>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async register(dto: RegisterDto): Promise<{ id: string; email: string }> {
    const email = dto.email.toLowerCase();

    const existing = await this.userRepository.findOne({
      where: { tenantId: DEFAULT_TENANT_ID, email },
    });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet e-mail.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    const user = await this.userRepository.save(
      this.userRepository.create({
        tenantId: DEFAULT_TENANT_ID,
        email,
        passwordHash,
        role: UserRole.Citizen,
      }),
    );

    await this.mobilityProfileRepository.save(
      this.mobilityProfileRepository.create({
        userId: user.id,
        preferredModes: [],
        constraints: { pmr: false, personalBike: false },
        transportSubscriptions: [],
        homeLocationEncrypted: null,
        workLocationEncrypted: null,
        geolocationConsent: false,
        geolocationConsentAt: null,
      }),
    );

    await this.sendVerificationEmail(user);

    return { id: user.id, email: user.email };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const key = emailVerificationRedisKey(dto.token);
    const userId = await this.redis.get(key);
    if (!userId) {
      throw new UnauthorizedException(
        'Jeton de vérification invalide ou expiré.',
      );
    }

    await this.userRepository.update({ id: userId }, { emailVerified: true });
    await this.redis.del(key);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const email = dto.email.toLowerCase();
    const user = await this.userRepository.findOne({
      where: { tenantId: DEFAULT_TENANT_ID, email },
    });

    // Un utilisateur inexistant et un mot de passe erroné produisent la même erreur.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Veuillez vérifier votre e-mail avant de vous connecter.',
      );
    }

    return this.issueTokens(user);
  }

  async issueAccessToken(userId: string): Promise<{ accessToken: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }

    return { accessToken: this.signAccessToken(user) };
  }

  async logout(userId: string): Promise<void> {
    await this.redis.del(refreshTokenRedisKey(userId));
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.signAndStoreRefreshToken(user.id);
    return { accessToken, refreshToken };
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    const token = randomBytes(32).toString('hex');
    await this.redis.set(
      emailVerificationRedisKey(token),
      user.id,
      'EX',
      EMAIL_VERIFICATION_TTL_SECONDS,
    );

    // F1 : pas d'envoi d'e-mail réel (hors périmètre — §2). Le lien est journalisé en dev.
    const corsOrigin = this.configService.get<string>('CORS_ORIGIN');
    console.log(
      `[dev] Lien de vérification e-mail pour ${user.email} : ${corsOrigin}/verify-email?token=${token}`,
    );
  }

  private signAccessToken(user: User): string {
    const payload: AccessTokenPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: asJwtDuration(
        this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
      ),
    });
  }

  private async signAndStoreRefreshToken(userId: string): Promise<string> {
    const jti = randomUUID();
    const token = this.jwtService.sign(
      { sub: userId, jti },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: asJwtDuration(
          this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
        ),
      },
    );

    const decoded = this.jwtService.decode<{ exp: number }>(token);
    const ttlSeconds = decoded.exp - Math.floor(Date.now() / 1000);
    await this.redis.set(refreshTokenRedisKey(userId), jti, 'EX', ttlSeconds);

    return token;
  }
}
