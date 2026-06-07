import { PrismaClient } from "@prisma/client";
import { seedTodos } from "./seeds/todo.seed";

const prisma = new PrismaClient();

async function main() {
  await seedTodos(prisma);

  console.log("シードデータの挿入が完了しました。");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
