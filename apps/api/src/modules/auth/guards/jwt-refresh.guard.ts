import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Exige un refresh token valide et non révoqué. Délègue à `JwtRefreshStrategy`. */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
