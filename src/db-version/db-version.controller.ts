import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../common/shared/prisma/service';

@Controller('db-version')
export class DbVersionController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const result = await this.prisma.$queryRaw<{ version: string }[]>`SELECT version()`;
    return { version: result[0].version };
  }
}
