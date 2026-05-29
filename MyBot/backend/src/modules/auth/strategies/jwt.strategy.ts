import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, JwtPayloadRaw } from '../interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.jwt.secret', 'default-secret'),
    });
  }

  /**
   * Called by Passport after token verification.
   * Converts raw string userId back to bigint.
   */
  validate(payload: JwtPayloadRaw): JwtPayload {
    return {
      userId: BigInt(payload.userId),
      role: payload.role,
    };
  }
}
