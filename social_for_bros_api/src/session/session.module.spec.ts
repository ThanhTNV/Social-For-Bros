import { ValueProvider } from '@nestjs/common';
import { SessionModule } from './session.module';

describe('SessionModule', () => {
  it('should be defined', () => {
    const sessionModule = new SessionModule();
    expect(sessionModule).toBeDefined();
  });

  it('should register with default expiresInDays', () => {
    const dynamicModule = SessionModule.register({});
    const provider = dynamicModule.providers?.find(
      (p: ValueProvider<number>) => p.provide === 'SESSION_EXPIRES_IN_DAYS',
    ) as ValueProvider<number> | undefined;
    expect(provider?.useValue).toBe(7);
  });

  it('should register with custom expiresInDays', () => {
    const dynamicModule = SessionModule.register({ expiresInDays: 14 });
    const provider = dynamicModule.providers?.find(
      (p: ValueProvider<number>) => p.provide === 'SESSION_EXPIRES_IN_DAYS',
    ) as ValueProvider<number> | undefined;
    expect(provider?.useValue).toBe(14);
  });
});
