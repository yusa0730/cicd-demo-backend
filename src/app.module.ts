import { Module } from '@nestjs/common';
import { HealthCheckModule } from './health-check/health-check.module';
import { TodosModule } from './todos/todos.module';
import { DbVersionModule } from './db-version/db-version.module';

@Module({
  imports: [HealthCheckModule, TodosModule, DbVersionModule],
})
export class AppModule {}
