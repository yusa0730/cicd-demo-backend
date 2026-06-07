import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/shared/prisma/service';
import { CreateTodoDto } from './dto/create-todo.dto';

@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.todo.findMany({ orderBy: { id: 'desc' } });
  }

  create(dto: CreateTodoDto) {
    return this.prisma.todo.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
      },
    });
  }
}
