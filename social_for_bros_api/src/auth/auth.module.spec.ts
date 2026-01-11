import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { UserEntity } from 'database/entities/user.entity';
import { SessionEntity } from 'database/entities/session.entity';
import { SessionService } from 'src/session/session.service';

describe('AuthModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(getRepositoryToken(UserEntity))
      .useValue({})
      .overrideProvider(getRepositoryToken(SessionEntity))
      .useValue({})
      .overrideProvider(SessionService)
      .useValue({})
      .overrideProvider('SESSION_EXPIRES_IN_DAYS')
      .useValue({})
      .compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have AuthService as a provider', () => {
    const authService = module.get<AuthService>(AuthService);
    expect(authService).toBeDefined();
    expect(authService).toBeInstanceOf(AuthService);
  });

  it('should have AuthGuard as a provider', () => {
    const authGuard = module.get<AuthGuard>(AuthGuard);
    expect(authGuard).toBeDefined();
    expect(authGuard).toBeInstanceOf(AuthGuard);
  });

  it('should have AuthController as a controller', () => {
    const authController = module.get<AuthController>(AuthController);
    expect(authController).toBeDefined();
    expect(authController).toBeInstanceOf(AuthController);
  });

  it('should export AuthGuard', () => {
    const authGuard = module.get<AuthGuard>(AuthGuard);
    expect(authGuard).toBeDefined();
  });
});
