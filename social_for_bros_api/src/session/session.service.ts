import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionEntity } from 'database/entities/session.entity';
import { Repository, LessThan } from 'typeorm';
import { randomBytes } from 'crypto';

export type CreateSessionParams = {
  userId: string;
  userAgent?: string;
  ipAddress?: string;
};

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    @Inject('SESSION_EXPIRES_IN_DAYS')
    private readonly expiresInDays: number,
  ) {}

  async createSession({
    userId,
    userAgent,
    ipAddress,
  }: CreateSessionParams): Promise<SessionEntity> {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.expiresInDays);

    const session = this.sessionRepository.create({
      userId,
      token,
      expiresAt,
      userAgent,
      ipAddress,
      isActive: true,
    });

    return this.sessionRepository.save(session);
  }

  async findByToken(token: string): Promise<SessionEntity | null> {
    return this.sessionRepository.findOne({
      where: { token, isActive: true },
      relations: ['user'],
    });
  }

  async validateSession(token: string): Promise<SessionEntity | null> {
    const session = await this.findByToken(token);

    if (!session) {
      return null;
    }

    if (new Date() > session.expiresAt) {
      await this.invalidateSession(token);
      return null;
    }

    return session;
  }

  async invalidateSession(token: string): Promise<void> {
    await this.sessionRepository.update({ token }, { isActive: false });
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    await this.sessionRepository.update({ userId }, { isActive: false });
  }

  async deleteSession(token: string): Promise<void> {
    await this.sessionRepository.delete({ token });
  }

  async deleteExpiredSessions(): Promise<void> {
    await this.sessionRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  async refreshSession(token: string): Promise<SessionEntity | null> {
    const session = await this.findByToken(token);

    if (!session) {
      return null;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.expiresInDays);

    session.expiresAt = expiresAt;
    return this.sessionRepository.save(session);
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }
}
