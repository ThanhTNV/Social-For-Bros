import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from './auth.service';
import { SessionService } from 'src/session/session.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Try to extract session token first (X-Session-Token header)
    const sessionToken = this.extractSessionToken(request);
    if (sessionToken) {
      return this.validateSessionToken(request, sessionToken);
    }

    // Fallback to JWT validation
    const jwtToken = this.extractTokenFromHeader(request);
    if (!jwtToken) {
      throw new UnauthorizedException('No authentication token provided');
    }

    return this.validateJwtToken(request, jwtToken);
  }

  private async validateSessionToken(
    request: Request,
    sessionToken: string,
  ): Promise<boolean> {
    const session = await this.sessionService.validateSession(sessionToken);

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Attach user information from session to request
    request['user'] = {
      sub: session.userId,
      username: session.user.username,
      sessionId: session.id,
    };
    request['session'] = session;

    return true;
  }

  private async validateJwtToken(
    request: Request,
    jwtToken: string,
  ): Promise<boolean> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(jwtToken);
      request['user'] = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired JWT token');
    }
  }

  private extractSessionToken(request: Request): string | undefined {
    // Check for session token in custom header
    const sessionHeader = request.headers['x-session-token'];
    if (sessionHeader) {
      return Array.isArray(sessionHeader) ? sessionHeader[0] : sessionHeader;
    }

    const cookies = request.cookies as Record<string, string>;

    // Check for session token in cookie
    const sessionCookie = cookies['session_token'];
    if (sessionCookie) {
      return sessionCookie;
    }

    return undefined;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
