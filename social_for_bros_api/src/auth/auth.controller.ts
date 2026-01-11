import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import type { SignInPayload, SignInResponse } from './auth.service';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: SignInPayload): Promise<SignInResponse> {
    return this.authService.signIn(signInDto);
  }
}
