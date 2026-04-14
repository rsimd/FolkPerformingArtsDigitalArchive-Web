# サブエージェント用仕様（索引）

各ファイルは **そのエージェントが読むべき範囲・ブランチ接頭辞・禁止領域** を短く定義する。機能要件の正は常に [specifications.md](../specifications.md) と `features/` である。

**開発は GitHub Issue から始める**（ブランチ名に Issue 番号を含める、PR で `Closes #`）。**`git push` の前に** `uv run pytest` とターミナルの **`copilot`** によるレビューを必須とする。詳細は [development-with-agents.md](../development-with-agents.md) の **§2・§3・§4・§5** および [Qiita / Issue 駆動フロー](https://qiita.com/NaaaRiii/items/2e302283f96d2b0ee501) を参照する。

| ファイル | エージェント ID | ブランチ名の例（Issue #12 の場合） |
|----------|-----------------|-------------------|
| [agent-frontend-static.md](agent-frontend-static.md) | `frontend-static` | `feat/12-agent-frontend-<topic>` |
| [agent-data-build.md](agent-data-build.md) | `data-build` | `feat/12-agent-data-<topic>` |
| [agent-backend-tests.md](agent-backend-tests.md) | `backend-tests` | `feat/12-agent-backend-<topic>` |
| [agent-automation-ci.md](agent-automation-ci.md) | `automation-ci` | `feat/12-agent-ci-<topic>` |

Git の共通ルール・**開始時の `gh` 確認**・依頼テンプレは [development-with-agents.md](../development-with-agents.md) を参照する。
