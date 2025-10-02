import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import crypto from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private sha256(text: string) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  async validateAndIssue(
    email: string,
    password: string,
  ): Promise<string | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const hash = this.sha256(password);
    if (hash !== user.password_hash) return null;
    const payload = { sub: user.id, email: user.email, name: user.name };
    return this.jwt.signAsync(payload);
  }
}
