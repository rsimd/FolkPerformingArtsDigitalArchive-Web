# サブエージェント仕様: backend-tests（API とテスト）

## 担当範囲

- [app/main.py](../../app/main.py) を中心とした **FastAPI**（開発・ローカル検証用）
- **`tests/`** の追加・修正、`uv run pytest` の維持

## 必読

- [specifications.md](../specifications.md) … §5、非機能 §6
- フロントが期待する API 契約（`GET /api/places` 等）は `frontend-static` 担当と共有する

## Git

- **Issue を先に作成**し、[development-with-agents.md](../development-with-agents.md) §3 で `gh` を確認する
- ブランチ: **`feat/<Issue番号>-agent-backend-<topic>`**（`main` から）
- PR 本文に **`Closes #<Issue番号>`** を含める

## 変更してよいパス（目安）

- `app/`、`tests/`

## 触れないこと（原則）

- 静的サイト本番用の `docs/` デプロイ設定を単独で決め打ちしない（`automation-ci` と協議）

## 完了の定義

- 追加・変更に対する pytest が通る
- 破壊的 API 変更がある場合は PR に明記し、フロント担当へ通知する前提を書く
- [development-with-agents.md](../development-with-agents.md) **§5**（push 前の `uv run pytest` と `copilot`）を満たす
