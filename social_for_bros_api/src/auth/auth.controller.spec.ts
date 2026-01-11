import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService, SignInPayload } from './auth.service';

const mockedAuthService = {
  signIn: jest.fn(),
};

describe('AuthController', () => {
  let authController: AuthController;

  beforeEach(async () => {
    const app = await Test.createTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: mockedAuthService,
        },
      ],
      controllers: [AuthController],
    }).compile();

    authController = app.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('should call AuthService.signIn and return tokens', async () => {
      const signInDto: SignInPayload = {
        username: 'testuser',
        pass: 'testpass',
      };
      const mockTokens = {
        jwtToken: 'jwt_token_123',
        sessionToken: 'session_token_123',
      };
      mockedAuthService.signIn.mockResolvedValue(mockTokens);
      const result = await authController.signIn(signInDto);

      expect(mockedAuthService.signIn).toHaveBeenCalledWith(signInDto);
      expect(result).toEqual(mockTokens);
    });

    it('should propagate errors from AuthService.signIn', async () => {
      const signInDto: SignInPayload = {
        username: 'testuser',
        pass: 'wrongpass',
      };
      const mockError = new Error('Invalid credentials');
      mockedAuthService.signIn.mockRejectedValue(mockError);
      await expect(authController.signIn(signInDto)).rejects.toThrow(mockError);
      expect(mockedAuthService.signIn).toHaveBeenCalledWith(signInDto);
    });
  });
});
