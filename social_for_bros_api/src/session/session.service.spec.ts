import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SessionEntity } from 'database/entities/session.entity';
import { LessThan } from 'typeorm';
import { UserEntity } from 'database/entities/user.entity';

jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mocked_token_hex'),
  }),
}));

const MOCK_DATE = new Date('2026-01-11T10:00:00.000Z');

describe('SessionService', () => {
  let sessionService: SessionService;
  const mockSessionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockUser: UserEntity = {
    id: 'user123',
    username: 'testuser',
    password: 'testpass',
  };

  const expectedExpiresAt = new Date(
    MOCK_DATE.getTime() + 7 * 24 * 60 * 60 * 1000,
  ); // 7 days after mock date

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_DATE);

    const app: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: 'SESSION_EXPIRES_IN_DAYS', useValue: 7 },
        {
          provide: getRepositoryToken(SessionEntity),
          useValue: mockSessionRepository,
        },
      ],
    }).compile();

    sessionService = app.get<SessionService>(SessionService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createSession', () => {
    it('should create and save a new session', async () => {
      const userId = 'user123';
      const userAgent = 'Mozilla/5.0';
      const ipAddress = '192.168.1.1';

      const mockSession: SessionEntity = {
        id: 'session-uuid',
        userId,
        token: 'mocked_token_hex',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent,
        ipAddress,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
      };

      mockSessionRepository.create.mockReturnValue(mockSession);
      mockSessionRepository.save.mockResolvedValue(mockSession);

      const result = await sessionService.createSession({
        userId,
        userAgent,
        ipAddress,
      });

      expect(mockSessionRepository.create).toHaveBeenCalledWith({
        userId,
        token: 'mocked_token_hex',
        expiresAt: expectedExpiresAt,
        userAgent,
        ipAddress,
        isActive: true,
      });
      expect(mockSessionRepository.save).toHaveBeenCalledWith(mockSession);
      expect(result).toEqual(mockSession);
    });

    it('should create session without optional fields', async () => {
      const userId = 'user123';

      const mockSession: SessionEntity = {
        id: 'session-uuid',
        userId,
        token: 'mocked_token_hex',
        expiresAt: expectedExpiresAt,
        userAgent: '',
        ipAddress: '',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
      };

      mockSessionRepository.create.mockReturnValue(mockSession);
      mockSessionRepository.save.mockResolvedValue(mockSession);

      const result = await sessionService.createSession({ userId });

      expect(result).toEqual(mockSession);
    });
  });

  describe('findByToken', () => {
    it('should find an active session by token', async () => {
      const token = 'test_token';
      const mockSession: SessionEntity = {
        id: 'session-uuid',
        userId: 'user123',
        token,
        expiresAt: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
        userAgent: '',
        ipAddress: '',
      };

      mockSessionRepository.findOne.mockResolvedValue(mockSession);

      const result = await sessionService.findByToken(token);

      expect(mockSessionRepository.findOne).toHaveBeenCalledWith({
        where: { token, isActive: true },
        relations: ['user'],
      });
      expect(result).toEqual(mockSession);
    });

    it('should return null when session not found', async () => {
      mockSessionRepository.findOne.mockResolvedValue(null);

      const result = await sessionService.findByToken('nonexistent_token');

      expect(result).toBeNull();
    });
  });

  describe('validateSession', () => {
    it('should return session when valid and not expired', async () => {
      const token = 'valid_token';
      const futureDate = new Date(MOCK_DATE.getTime() + 24 * 60 * 60 * 1000); // tomorrow
      const mockSession: SessionEntity = {
        id: 'session-uuid',
        userId: 'user123',
        token,
        expiresAt: futureDate,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
        userAgent: '',
        ipAddress: '',
      };

      mockSessionRepository.findOne.mockResolvedValue(mockSession);

      const result = await sessionService.validateSession(token);

      expect(result).toEqual(mockSession);
    });

    it('should return null and invalidate session when expired', async () => {
      const token = 'expired_token';
      const pastDate = new Date(MOCK_DATE.getTime() - 24 * 60 * 60 * 1000); // yesterday
      const mockSession: SessionEntity = {
        id: 'session-uuid',
        userId: 'user123',
        token,
        expiresAt: pastDate,
        isActive: true,
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
        user: mockUser,
        userAgent: '',
        ipAddress: '',
      };

      mockSessionRepository.findOne.mockResolvedValue(mockSession);
      mockSessionRepository.update.mockResolvedValue(undefined);

      const result = await sessionService.validateSession(token);

      expect(mockSessionRepository.update).toHaveBeenCalledWith(
        { token },
        { isActive: false },
      );
      expect(result).toBeNull();
    });

    it('should return null when session not found', async () => {
      mockSessionRepository.findOne.mockResolvedValue(null);

      const result = await sessionService.validateSession('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('invalidateSession', () => {
    it('should mark session as inactive', async () => {
      const token = 'test_token';
      mockSessionRepository.update.mockResolvedValue(undefined);

      await sessionService.invalidateSession(token);

      expect(mockSessionRepository.update).toHaveBeenCalledWith(
        { token },
        { isActive: false },
      );
    });
  });

  describe('invalidateAllUserSessions', () => {
    it('should mark all user sessions as inactive', async () => {
      const userId = 'user123';
      mockSessionRepository.update.mockResolvedValue(undefined);

      await sessionService.invalidateAllUserSessions(userId);

      expect(mockSessionRepository.update).toHaveBeenCalledWith(
        { userId },
        { isActive: false },
      );
    });
  });

  describe('deleteSession', () => {
    it('should delete session by token', async () => {
      const token = 'test_token';
      mockSessionRepository.delete.mockResolvedValue(undefined);

      await sessionService.deleteSession(token);

      expect(mockSessionRepository.delete).toHaveBeenCalledWith({ token });
    });
  });

  describe('deleteExpiredSessions', () => {
    it('should delete all expired sessions', async () => {
      mockSessionRepository.delete.mockResolvedValue(undefined);

      await sessionService.deleteExpiredSessions();

      expect(mockSessionRepository.delete).toHaveBeenCalledWith({
        expiresAt: LessThan(MOCK_DATE),
      });
    });
  });

  describe('refreshSession', () => {
    it('should refresh session expiration date', async () => {
      const token = 'test_token';
      const mockSession: SessionEntity = {
        id: 'session-uuid',
        userId: 'user123',
        token,
        expiresAt: MOCK_DATE,
        isActive: true,
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
        user: mockUser,
        userAgent: '',
        ipAddress: '',
      };

      const refreshedSession = { ...mockSession };
      refreshedSession.expiresAt = new Date(
        MOCK_DATE.getTime() + 7 * 24 * 60 * 60 * 1000,
      );

      mockSessionRepository.findOne.mockResolvedValue(mockSession);
      mockSessionRepository.save.mockResolvedValue(refreshedSession);

      const result = await sessionService.refreshSession(token);

      expect(mockSessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          token,
          expiresAt: expectedExpiresAt,
        }),
      );
      expect(result).toEqual(refreshedSession);
    });

    it('should return null when session not found', async () => {
      mockSessionRepository.findOne.mockResolvedValue(null);

      const result = await sessionService.refreshSession('nonexistent');

      expect(result).toBeNull();
      expect(mockSessionRepository.save).not.toHaveBeenCalled();
    });
  });
});
