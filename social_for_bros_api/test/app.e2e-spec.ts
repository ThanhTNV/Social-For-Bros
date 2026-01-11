import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from './../src/app.module';
import { UserEntity } from 'database/entities/user.entity';
import { SessionEntity } from 'database/entities/session.entity';

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

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getRepositoryToken(UserEntity))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(SessionEntity))
      .useValue(mockRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
