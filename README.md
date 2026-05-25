# app-repo

ECS on Fargate へのアプリケーションデプロイを管理するリポジトリです。
インフラ（VPC / ECS / RDS / ALB）は [cicd-demo-terraform](../terraform-repo) が管理します。

## ブランチ構成と昇格フロー

```
feature/xxx
    ↓ PR
develop  →  dev  環境にデプロイ
    ↓ PR
stg      →  stg  環境にデプロイ
    ↓ PR
prod     →  prod 環境にデプロイ
```

- `develop` / `stg` / `prod` への push をトリガーに自動デプロイが起動します
- **全環境で Required reviewers による承認が必要**です（後述）
- prod は GitHub Environment の承認ゲートが追加の保護として機能します

---

## デプロイ手順

### 通常のデプロイ（dev）

```
1. feature ブランチを develop へ PR → CODEOWNERS がレビュー・承認
2. develop へ merge
3. GitHub Actions が deploy workflow を起動
4. GitHub が「dev 環境へのデプロイ」として承認者に通知
5. yusa0730 が GitHub UI で承認（Review deployments）
6. 以下が自動実行される:
   a. SSM Parameter Store からインフラ情報を取得
   b. Docker イメージをビルドして ECR に push
   c. DB migration を ECS one-off task として実行
   d. ECS service を新しいイメージで更新（ローリングデプロイ）
   e. ALB のヘルスチェックを使ったスモークテスト
```

### stg / prod への昇格

```
develop → stg:
  develop ブランチから stg ブランチへ PR → レビュー・承認 → merge → stg デプロイ

stg → prod:
  stg ブランチから prod ブランチへ PR → レビュー・承認 → merge → prod デプロイ
```

### 承認の操作方法

デプロイが起動すると GitHub が承認者へ通知します。

```
GitHub の通知メール / ブラウザ通知
    ↓
リポジトリ → Actions → 該当ワークフロー実行
    ↓
「Review deployments」ボタンをクリック
    ↓
チェックボックスで環境を選択 → 「Approve and deploy」
```

---

## デプロイの内部動作

### 1. SSM Parameter Store からインフラ情報を取得

```bash
aws ssm get-parameter --name "$PREFIX/$1" --with-decryption --query Parameter.Value --output text
```

`terraform-repo` が `terraform apply` 時に以下のパラメータを書き込みます。
app-repo はこれらを読み取って ECR URL や ECS クラスター名などを動的に解決します。

| SSM パラメータ | 内容 |
|---|---|
| `ecr-repository-url` | Docker イメージの push 先 |
| `ecs-cluster-name` | デプロイ先 ECS クラスター |
| `ecs-service-name` | 更新対象 ECS サービス |
| `task-definition-family` | タスク定義のファミリー名 |
| `ecs-subnet-ids` | migration task 実行サブネット（private） |
| `ecs-security-group-id` | migration task のセキュリティグループ |
| `alb-dns-name` | スモークテストの接続先 |

> SSM パラメータは `SecureString` 型（KMS 暗号化）です。`--with-decryption` なしでは
> 暗号化テキストが返り、後続ステップが失敗します。

### 2. ECR へ Docker イメージを push

```bash
IMAGE_URI="${ECR_REPOSITORY_URL}:${GITHUB_SHA}"
docker build -t "$IMAGE_URI" .
docker push "$IMAGE_URI"
```

イメージタグは `GITHUB_SHA`（コミットハッシュ）です。

### 3. DB migration を ECS one-off task として実行

```bash
aws ecs run-task \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[...],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides":[{"name":"app","command":["npm","run","migrate"]}]}'
```

- migration が失敗した場合（exit code != 0）、後続の ECS service デプロイは実行されません
- `assignPublicIp=DISABLED` を使用します。private subnet から NAT Gateway 経由で
  ECR / CloudWatch / Secrets Manager へアクセスします

### 4. ECS service をローリングデプロイ

```bash
aws ecs describe-task-definition --task-definition "$TASK_DEF_FAMILY" --query taskDefinition > task-definition.json
# イメージのみ差し替えた新リビジョンを登録してデプロイ
```

- Terraform が管理するタスク定義の**ベース設定はそのまま**保持し、イメージのみ差し替えます
- ECS service の `ignore_changes = [task_definition]` により、次回の `terraform apply` で
  Terraform 管理のリビジョンに巻き戻ることはありません

### 5. スモークテスト

```bash
curl -s -o /dev/null -w "%{http_code}" "http://${ALB_DNS_NAME}/health"
```

5 回リトライし、HTTP 200 が返れば成功です。

---

## GitHub Environment の設定

### Required reviewers の仕組み

GitHub の Environment Protection Rules を使って、**全環境のデプロイに必須承認者**を設定しています。

**設定場所:**
```
リポジトリ → Settings → Environments → [環境名] → Environment protection rules
→ Required reviewers
```

**設定内容（現在）:**

| Environment | Required reviewers |
|---|---|
| `dev` | `yusa0730` |
| `stg` | `yusa0730` |
| `prod` | `yusa0730` |

**どのように機能するか:**

```yaml
# deploy.yml
jobs:
  deploy:
    environment: ${{ needs.resolve-environment.outputs.environment }}
```

`environment:` を指定したジョブは、そのジョブが実行を開始する前に
GitHub が Required reviewers へ承認を要求します。
承認されるまでジョブは `waiting` 状態で停止します。

**API で設定した場合の相当コマンド:**

```bash
# Required reviewers を API で設定する例
curl -X PUT \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/{owner}/{repo}/environments/{environment_name} \
  -d '{"reviewers":[{"type":"User","id":<user_id>}]}'
```

> GitHub の Environment protection は `.github/workflows/*.yml` ファイルには書けません。
> リポジトリの Settings 画面または REST API で設定します。

---

## Secrets / Variables

### GitHub Environments の Secret

各環境（dev / stg / prod）に以下を設定します。

| Secret 名 | 用途 |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | ECR push・ECS deploy・SSM 読み取り用 IAM Role ARN |

IAM Role は [cicd-demo-terraform-bootstrap](../terraform-bootstrap) で管理します。

### Repository Variables（任意）

| Variable 名 | デフォルト | 用途 |
|---|---|---|
| `AWS_REGION` | `ap-northeast-1` | AWS リージョン |
| `SSM_PREFIX` | — | SSM パラメータのプレフィックス（例: `/ecs-demo/dev`） |
