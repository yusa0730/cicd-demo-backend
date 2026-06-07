import { PrismaClient } from "@prisma/client";

export const seedTodos = async (prisma: PrismaClient) => {
  const count = await prisma.todo.count();
  if (count > 0) {
    console.log("Todos already seeded, skipping.");
    return;
  }

  const todos = [
    { title: "Aurora のメジャーバージョンアップを計画する", description: "13.20 → 16.x へのアップグレード手順を整理する" },
    { title: "マイグレーションの動作確認", description: "prisma migrate deploy が正常に完了することを確認する" },
    { title: "ヘルスチェックエンドポイントを確認する", description: "GET /health が 200 を返すことを確認する" },
  ];

  for (const data of todos) {
    await prisma.todo.create({ data });
  }

  console.log(`シードデータの挿入が完了しました。${todos.length} 件のTodoを追加しました。`);
};
