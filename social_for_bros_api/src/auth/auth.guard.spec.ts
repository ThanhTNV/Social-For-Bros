import { Test } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from 'src/session/session.service';
import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

const mockedJwtService = {
  verifyAsync: jest.fn(),
};
const mockedSessionService = {
  validateSession: jest.fn(),
};

const createMockRequest = (overrides: Partial<Request> = {}): Request => {
  return {
    headers: {},
    cookies: {},
    ...overrides,
  } as Request;
};

describe('AuthGuard', () => {
  let authGuard: AuthGuard;

  beforeEach(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: JwtService,
          useValue: mockedJwtService,
        },
        {
          provide: SessionService,
          useValue: mockedSessionService,
        },
      ],
    }).compile();

    authGuard = app.get<AuthGuard>(AuthGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (request: Request): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should validate and allow access with session token from header', async () => {
      const mockRequest = createMockRequest({
        headers: { 'x-session-token': 'valid_session_token' },
      });
      const mockSession = {
        id: 'session-id',
        userId: 'user123',
        user: { username: 'testuser' },
        isActive: true,
      };

      mockedSessionService.validateSession.mockResolvedValue(mockSession);

      const context = createMockExecutionContext(mockRequest);
      const result = await authGuard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest['user']).toEqual({
        sub: 'user123',
        username: 'testuser',
        sessionId: 'session-id',
      });
      expect(mockRequest['session']).toEqual(mockSession);
    });

    it('should validate and allow access with session token from cookie', async () => {
      const mockRequest = createMockRequest({
        cookies: { session_token: 'valid_session_token' },
      });
      const mockSession = {
        id: 'session-id',
        userId: 'user123',
        user: { username: 'testuser' },
        isActive: true,
      };

      mockedSessionService.validateSession.mockResolvedValue(mockSession);

      const context = createMockExecutionContext(mockRequest);
      const result = await authGuard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest['user']).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid session token', async () => {
      const mockRequest = createMockRequest({
        headers: { 'x-session-token': 'invalid_session_token' },
      });

      mockedSessionService.validateSession.mockResolvedValue(null);

      const context = createMockExecutionContext(mockRequest);

      await expect(authGuard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authGuard.canActivate(context)).rejects.toThrow(
        'Invalid or expired session',
      );
    });

    it('should validate and allow access with JWT token', async () => {
      const mockRequest = createMockRequest({
        headers: { authorization: 'Bearer valid_jwt_token' },
      });
      const mockPayload = { sub: 'user123', username: 'testuser' };

      mockedJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const context = createMockExecutionContext(mockRequest);
      const result = await authGuard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest['user']).toEqual(mockPayload);
      expect(mockedJwtService.verifyAsync).toHaveBeenCalledWith(
        'valid_jwt_token',
      );
    });

    it('should throw UnauthorizedException for invalid JWT token', async () => {
      const mockRequest = createMockRequest({
        headers: { authorization: 'Bearer invalid_jwt_token' },
      });

      mockedJwtService.verifyAsync.mockRejectedValue(
        new Error('Invalid token'),
      );

      const context = createMockExecutionContext(mockRequest);

      await expect(authGuard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authGuard.canActivate(context)).rejects.toThrow(
        'Invalid or expired JWT token',
      );
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      const mockRequest = createMockRequest();

      const context = createMockExecutionContext(mockRequest);

      await expect(authGuard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authGuard.canActivate(context)).rejects.toThrow(
        'No authentication token provided',
      );
    });

    it('should prioritize session token over JWT token', async () => {
      const mockRequest = createMockRequest({
        headers: {
          'x-session-token': 'valid_session_token',
          authorization: 'Bearer valid_jwt_token',
        },
      });
      const mockSession = {
        id: 'session-id',
        userId: 'user123',
        user: { username: 'testuser' },
        isActive: true,
      };

      mockedSessionService.validateSession.mockResolvedValue(mockSession);

      const context = createMockExecutionContext(mockRequest);
      const result = await authGuard.canActivate(context);

      expect(result).toBe(true);
      expect(mockedSessionService.validateSession).toHaveBeenCalled();
      expect(mockedJwtService.verifyAsync).not.toHaveBeenCalled();
    });
  });

  describe('extractSessionToken', () => {
    it('should extract session token from x-session-token header', () => {
      const mockRequest = createMockRequest({
        headers: { 'x-session-token': 'token_from_header' },
      });

      const token = authGuard['extractSessionToken'](mockRequest);

      expect(token).toBe('token_from_header');
    });

    it('should extract session token from array header', () => {
      const mockRequest = createMockRequest({
        headers: {
          'x-session-token': ['token_from_array'],
        },
      });

      const token = authGuard['extractSessionToken'](mockRequest);

      expect(token).toBe('token_from_array');
    });

    it('should extract session token from cookie', () => {
      const mockRequest = createMockRequest({
        cookies: { session_token: 'token_from_cookie' },
      });

      const token = authGuard['extractSessionToken'](mockRequest);

      expect(token).toBe('token_from_cookie');
    });

    it('should prioritize header over cookie', () => {
      const mockRequest = createMockRequest({
        headers: { 'x-session-token': 'token_from_header' },
        cookies: { session_token: 'token_from_cookie' },
      });

      const token = authGuard['extractSessionToken'](mockRequest);

      expect(token).toBe('token_from_header');
    });

    it('should return undefined when no token present', () => {
      const mockRequest = createMockRequest();

      const token = authGuard['extractSessionToken'](mockRequest);

      expect(token).toBeUndefined();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract Bearer token from authorization header', () => {
      const mockRequest = createMockRequest({
        headers: { authorization: 'Bearer my_jwt_token' },
      });

      const token = authGuard['extractTokenFromHeader'](mockRequest);

      expect(token).toBe('my_jwt_token');
    });

    it('should return undefined for non-Bearer token type', () => {
      const mockRequest = createMockRequest({
        headers: { authorization: 'Basic credentials' },
      });

      const token = authGuard['extractTokenFromHeader'](mockRequest);

      expect(token).toBeUndefined();
    });

    it('should return undefined when no authorization header', () => {
      const mockRequest = createMockRequest();

      const token = authGuard['extractTokenFromHeader'](mockRequest);

      expect(token).toBeUndefined();
    });

    it('should return undefined for malformed authorization header', () => {
      const mockRequest = createMockRequest({
        headers: { authorization: 'BearerTokenWithoutSpace' },
      });

      const token = authGuard['extractTokenFromHeader'](mockRequest);

      expect(token).toBeUndefined();
    });
  });
});
