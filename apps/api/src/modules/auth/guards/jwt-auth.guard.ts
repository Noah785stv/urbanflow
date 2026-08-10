import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Exige un JWT d'accès valide (§5.7 A01). Délègue à `JwtAccessStrategy`. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
