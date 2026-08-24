import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncryptionModule } from '../../common/crypto/encryption.module';
import { AuthModule } from '../auth/auth.module';
import { CarbonModule } from '../carbon/carbon.module';
import { MobilityProfile } from './entities/mobility-profile.entity';
import { User } from './entities/user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';

/** Module User & Profile (§5.1) — profil de mobilité (F1). */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, MobilityProfile]),
    EncryptionModule,
    AuthModule,
    CarbonModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
