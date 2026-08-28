import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessTokenPayload } from '../auth/types/access-token-payload.interface';
import { UpdateMobilityProfileDto } from './dto/update-mobility-profile.dto';
import { UserService } from './user.service';

/**
 * Contrôleur User & Profile (§6). L'identifiant utilisateur provient toujours
 * du JWT (`user.sub`), jamais d'un paramètre de route : un utilisateur ne
 * peut structurellement pas accéder au profil d'un autre (§5.7 A01).
 */
@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  getMe(@CurrentUser() user: AccessTokenPayload) {
    return this.userService.getProfile(user.sub);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateMobilityProfileDto,
  ) {
    return this.userService.updateProfile(user.sub, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(@CurrentUser() user: AccessTokenPayload): Promise<void> {
    await this.userService.deleteAccount(user.sub);
  }
}
