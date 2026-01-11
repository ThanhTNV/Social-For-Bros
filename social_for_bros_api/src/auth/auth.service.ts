import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from 'src/session/session.service';

export type SignInPayload = {
  username: string;
  pass: string;
  userAgent?: string;
  ipAddress?: string;
};

export type SignInResponse = {
  access_token: string;
  session_token: string;
};

export type JwtPayload = {
  sub: string;
  username: string;
};

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private sessionService: SessionService,
  ) {}

  async signIn(signInPayload: SignInPayload): Promise<SignInResponse> {
    const user = await this.usersService.findOne(signInPayload.username);
    if (user?.password !== signInPayload.pass) {
      throw new UnauthorizedException();
    }

    // Create session in database
    const session = await this.sessionService.createSession({
      userId: user.id.toString(),
      userAgent: signInPayload.userAgent,
      ipAddress: signInPayload.ipAddress,
    });

    const payload = { sub: user.id, username: user.username };
    return {
      // 💡 Here the JWT secret key that's used for signing the payload
      // is the key that was passsed in the JwtModule
      access_token: await this.jwtService.signAsync(payload),
      session_token: session.token,
    };
  }

  async signOut(sessionToken: string): Promise<void> {
    await this.sessionService.invalidateSession(sessionToken);
  }

  async validateSession(sessionToken: string) {
    return this.sessionService.validateSession(sessionToken);
  }

  async refreshSession(sessionToken: string) {
    return this.sessionService.refreshSession(sessionToken);
  }
}
