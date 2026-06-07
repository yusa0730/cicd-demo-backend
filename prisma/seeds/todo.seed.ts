import { PrismaClient } from "@prisma/client";

export const seedTodos = async (prisma: PrismaClient) => {
  const count = await prisma.todo.count();
  if (count > 0) {
    console.log("Todos already seeded, skipping.");
    return;
  }

  const todos = [
    { title: "Aurora のメジャーバージョンアップを計画する", description: "13.9 → 16.x へのアップグレード手順を整理する" },
    { title: "マイグレーションの動作確認", description: "prisma migrate deploy が正常に完了することを確認する" },
    { title: "ヘルスチェックエンドポイントを確認する", description: "GET /health-check が 200 を返すことを確認する" },
    { title: "ECS タスク定義の更新", description: "新しいイメージを使ったタスク定義リビジョンを登録する" },
    { title: "CloudWatch ログの確認", description: "アプリケーションログが /ecs/ecs-demo-dev/app に出力されていることを確認する" },
    { title: "SSM パラメータの整合性確認", description: "terraform apply 後に SSM の値が最新であることを確認する" },
    { title: "ECR イメージの棚卸し", description: "古いイメージにライフサイクルポリシーを適用してストレージコストを削減する" },
    { title: "Secrets Manager のローテーション設定", description: "DB パスワードの自動ローテーションを有効化する手順を整理する" },
    { title: "ALB アクセスログの有効化", description: "S3 バケットへのアクセスログ転送設定を追加する" },
    { title: "CI/CD パイプラインの動作確認", description: "develop ブランチへのマージから ECS デプロイ完了までのフローを確認する" },
  ];

  for (const data of todos) {
    await prisma.todo.create({ data });
  }

  console.log(`シードデータの挿入が完了しました。${todos.length} 件のTodoを追加しました。`);
};
