import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from 'database/entities/user.entity';
import { SessionEntity } from 'database/entities/session.entity';

// Set JWT secret before any imports
process.env.JWT_SECRET = 'test-secret-key-for-e2e-tests';

// Mock auth constants to ensure JWT secret is available
jest.mock('../src/auth/constants', () => ({
  jwtConstants: {
    secret: 'test-secret-key-for-e2e-tests',
    expiresInSeconds: 60,
  },
  sessionConstants: {
    expiresInDays: 7,
  },
}));

jest.mock('../database/database.configuration', () => {
  return {
    databaseConfig: {
      type: 'postgres',
      url: 'postgresql://myuser:mysecretpassword@localhost:5432/my_learning_db',
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: false,
    },
  };
});

import { AppModule } from './../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  const mockUser: UserEntity = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    password: 'testpass',
  };

  const mockSession: SessionEntity = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    userId: mockUser.id,
    user: mockUser,
    token: 'mock-session-token',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  };

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockSessionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock user repository to return a user for login
    mockUserRepository.findOne.mockResolvedValue(mockUser);

    // Mock session repository to create and save session
    mockSessionRepository.create.mockReturnValue(mockSession);
    mockSessionRepository.save.mockResolvedValue(mockSession);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getRepositoryToken(UserEntity))
      .useValue(mockUserRepository)
      .overrideProvider(getRepositoryToken(SessionEntity))
      .useValue(mockSessionRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('/auth/login (POST)', () => {
    it('should return access token and session token on successful login', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          pass: 'testpass',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('session_token');
          expect(mockUserRepository.findOne).toHaveBeenCalledWith({
            where: { username: 'testuser' },
          });
        });
    });

    it('should return 401 for invalid credentials', () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          pass: 'wrongpass',
        })
        .expect(401);
    });

    it('should return 401 for wrong password', () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        password: 'differentpass',
      });

      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          pass: 'wrongpass',
        })
        .expect(401);
    });
  });
});
