import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { JwtPayload } from './jwt.strategy';

/**
 * Variante "jwt-query" de la strategie JWT : extrait le token du query
 * param `token` au lieu du header Authorization. Reservee au lien du
 * releve PDF (ecran 69) : expo-web-browser ouvre une URL dans le
 * navigateur du systeme et ne peut pas poser de header Authorization.
 *
 * La strategie standard (header Bearer) reste la seule acceptee partout
 * ailleurs. Le token reste le JWT d'acces classique (TTL court).
 */
@Injectable()
export class JwtQueryStrategy extends PassportStrategy(Strategy, 'jwt-query') {
  constructor() {
    super({
      jwtFromRequest: (req: Request) => (req.query.token as string | undefined) ?? '',
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'change-me-access',
    });
  }

  async validate(payload: JwtPayload) {
    return payload;
  }
}
