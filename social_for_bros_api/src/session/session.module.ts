import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionEntity } from 'database/entities/session.entity';
import { SessionService } from './session.service';

@Module({
  providers: [SessionService],
})
export class SessionModule {
  static register({
    expiresInDays = 7,
  }: {
    expiresInDays?: number;
  }): DynamicModule {
    return {
      module: SessionModule,
      imports: [TypeOrmModule.forFeature([SessionEntity])],
      providers: [
        {
          provide: 'SESSION_EXPIRES_IN_DAYS',
          useValue: expiresInDays,
        },
        SessionService,
      ],
      exports: [SessionService],
    };
  }
}
