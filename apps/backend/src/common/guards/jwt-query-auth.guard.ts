import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard de la strategie jwt-query (token en query param) — utilise
 * uniquement par l'endpoint du releve PDF. Voir jwt-query.strategy.ts.
 */
@Injectable()
export class JwtQueryAuthGuard extends AuthGuard('jwt-query') {}
