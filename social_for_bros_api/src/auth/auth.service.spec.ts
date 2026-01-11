import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from '../session/session.service';

describe('AuthService', () => {
  let authService: AuthService;
  const mockUsersService = {
    findOne: jest.fn(),
    createUser: jest.fn(),
  };
  const mockSessionService = {
    createSession: jest.fn(),
    invalidateSession: jest.fn(),
    validateSession: jest.fn(),
    refreshSession: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = app.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('should create session and return tokens for correct credentials', async () => {
      const mockUser = { id: 1, username: 'testuser', password: 'testpass' };
      const mockSession = {
        id: 'session-uuid',
        token: 'session_token_123',
        userId: '1',
        isActive: true,
      };
      const jwtToken = 'jwt_token_123';

      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockSessionService.createSession.mockResolvedValue(mockSession);
      mockJwtService.signAsync.mockResolvedValue(jwtToken);

      const result = await authService.signIn({
        username: 'testuser',
        pass: 'testpass',
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.1',
      });

      expect(mockUsersService.findOne).toHaveBeenCalledWith('testuser');
      expect(mockSessionService.createSession).toHaveBeenCalledWith({
        userId: '1',
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.1',
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: 1,
        username: 'testuser',
      });
      expect(result).toEqual({
        access_token: jwtToken,
        session_token: mockSession.token,
      });
    });

    it('should throw UnauthorizedException for incorrect credentials', async () => {
      mockUsersService.findOne.mockResolvedValue(null);
      await expect(
        authService.signIn({ username: 'wronguser', pass: 'wrongpass' }),
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      const mockUser = { id: 1, username: 'testuser', password: 'testpass' };
      mockUsersService.findOne.mockResolvedValue(mockUser);

      await expect(
        authService.signIn({ username: 'testuser', pass: 'wrongpass' }),
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('signOut', () => {
    it('should invalidate the session token', async () => {
      const sessionToken = 'valid_session_token';
      await authService.signOut(sessionToken);
      expect(mockSessionService.invalidateSession).toHaveBeenCalledWith(
        sessionToken,
      );
    });
  });

  describe('validateSession', () => {
    it('should return session for valid session token', async () => {
      const sessionToken = 'valid_session_token';
      const mockSession = { id: 'session1', userId: '1', isActive: true };
      mockSessionService.validateSession.mockResolvedValue(mockSession);
      const result = await authService.validateSession(sessionToken);
      expect(mockSessionService.validateSession).toHaveBeenCalledWith(
        sessionToken,
      );
      expect(result).toEqual(mockSession);
    });

    it('should return null for invalid session token', async () => {
      const sessionToken = 'invalid_session_token';
      mockSessionService.validateSession.mockResolvedValue(null);
      const result = await authService.validateSession(sessionToken);
      expect(result).toBeNull();
    });
  });

  describe('refreshSession', () => {
    it('should return refreshed session for valid session token', async () => {
      const sessionToken = 'valid_session_token';
      const mockSession = { id: 'session1', userId: '1', isActive: true };
      mockSessionService.refreshSession.mockResolvedValue(mockSession);
      const result = await authService.refreshSession(sessionToken);
      expect(result).toEqual(mockSession);
    });

    it('should return null for invalid session token', async () => {
      const sessionToken = 'invalid_session_token';
      mockSessionService.refreshSession.mockResolvedValue(null);
      const result = await authService.refreshSession(sessionToken);
      expect(result).toBeNull();
    });
  });
});
