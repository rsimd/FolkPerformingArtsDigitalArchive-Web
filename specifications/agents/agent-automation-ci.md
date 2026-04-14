# サブエージェント仕様: automation-ci（CI・寄稿自動化の枠）

## 担当範囲

- **GitHub Actions** のワークフロー（静的ビルド、テスト、将来の Pages デプロイ）
- **PR / Issue テンプレ**、ブランチ保護に関する**ドキュメント化**
- **Google Apps Script** 等の連携はコードがリポジトリ外の場合、手順・設定項目を Markdown で記録する
- 寄稿用 PR のブランチ命名 **`contributions/<timestamp>-<slug>`**（F-CON-06）をドキュメント化する

## 必読

- [specifications.md](../specifications.md) … F-CON、F-ADM、§11 実装順序
- [admin-operations.md](../features/admin-operations.md)
- [crowdsourcing-and-publish.md](../features/crowdsourcing-and-publish.md)
- [map-and-geojson-contribution.md](../features/map-and-geojson-contribution.md) … GAS 側 GeoJSON 検証

## Git

- **Issue を先に作成**し、[development-with-agents.md](../development-with-agents.md) §3 で `gh` を確認する
- ブランチ: **`feat/<Issue番号>-agent-ci-<topic>`**（`main` から）
- PR 本文に **`Closes #<Issue番号>`** を含める

## 変更してよいパス（目安）

- `.github/`、ルートの CI 関連ドキュメント（ユーザーが明示した場合のみ）

## 触れないこと（原則）

- シークレット値そのものをリポジトリにコミットしない
- アプリのビジネスロジックを大量に `frontend-static` に侵食しない

## 完了の定義

- ワークフローがフォーク PR でも安全に動くか検討し、必要なら `pull_request` 用と `push main` 用を分ける方針を PR に書く
- [development-with-agents.md](../development-with-agents.md) **§5**（push 前の `uv run pytest` と `copilot`）を満たす
