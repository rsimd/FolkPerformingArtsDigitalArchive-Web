# サブエージェント仕様: data-build（データとビルド生成）

## 担当範囲

- `places.json`（および将来分割する JSON）の**スキーマ拡張**とサンプル整備
- **`data/by_region/*.json` のビルド生成**（採用時。親文書 §4.6）
- **`search_index.json` のビルド生成**（F-SEARCH、**F-SEARCH-03** の除外ルールを実装する）
- **`content_flags` の算出**（F-TOP のマーカー色・パネル status と一致）
- `home_slideshow_manifest.json` 等の生成スクリプト（導入時）
- `boundary` / `map_category` フィールドの検証（F-GEO と整合）

## 必読

- [specifications.md](../specifications.md) … §4 データモデル、F-TOP / F-SEARCH、§11 実装順序
- [crowdsourcing-and-publish.md](../features/crowdsourcing-and-publish.md)
- [home-and-overview-map.md](../features/home-and-overview-map.md) … 地域集約
- [map-and-geojson-contribution.md](../features/map-and-geojson-contribution.md)
- [list-and-discovery.md](../features/list-and-discovery.md) … F-SEARCH-03
- [optional-rich-media.md](../features/optional-rich-media.md) … オプションブロックの形

## Git

- **Issue を先に作成**し、[development-with-agents.md](../development-with-agents.md) §3 で `gh` を確認する
- ブランチ: **`feat/<Issue番号>-agent-data-<topic>`**（`main` から）
- PR 本文に **`Closes #<Issue番号>`** を含める
- `frontend-static` が依存するフィールドを変える場合は **PR 本文で契約を明記**する

## 変更してよいパス（目安）

- `data/`、`scripts/`（ビルド用 Python 等）、`pyproject.toml` の dev 依存（要レビュー）

## 触れないこと（原則）

- `templates/` / `static/` の見た目ロジックを大量に書き換えない（UI 変更は `frontend-static`）

## 完了の定義

- 生成物のパスと再現手順（`uv run ...` 等）が README または PR に記載されている
- 親文書の `content_flags` 定義と矛盾しない
- [development-with-agents.md](../development-with-agents.md) **§5**（push 前の `uv run pytest` と `copilot`）を満たす
