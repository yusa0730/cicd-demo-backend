import { Module } from '@nestjs/common';
import { DbVersionController } from './db-version.controller';
import { PrismaService } from '../common/shared/prisma/service';

@Module({
  controllers: [DbVersionController],
  providers: [PrismaService],
})
export class DbVersionModule {}
