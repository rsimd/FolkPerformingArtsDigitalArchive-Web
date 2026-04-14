# 仕様書ディレクトリ

本ディレクトリにプロジェクトの仕様を置く。

| 文書 | ファイル | 内容 |
|------|-----------|------|
| 全体仕様 | [specifications.md](specifications.md) | 背景・目的、全機能の要件 ID、データモデル、非機能・技術方針、ロードマップ |
| サブエージェント・Git | [development-with-agents.md](development-with-agents.md) | **Issue 駆動**（[Qiita](https://qiita.com/NaaaRiii/items/2e302283f96d2b0ee501) 準拠）、**push 前**に `uv run pytest` と **`copilot`**、`gh` 確認、依頼テンプレート |
| エージェント別（短仕様） | [agents/README.md](agents/README.md) | `frontend-static` / `data-build` 等の責務境界 |
| ランディング・俯瞰地図 | [features/home-and-overview-map.md](features/home-and-overview-map.md) | F-TOP（ヒーロー、俯瞰、マーカー色、地域パネル status） |
| 一覧・発見・検索 | [features/list-and-discovery.md](features/list-and-discovery.md) | F-LIST、F-SEARCH |
| 寄稿・公開 | [features/crowdsourcing-and-publish.md](features/crowdsourcing-and-publish.md) | F-CON、`contributor_kind`、content_flags、GAS フロー |
| 地図・GeoJSON 寄稿 | [features/map-and-geojson-contribution.md](features/map-and-geojson-contribution.md) | F-GEO、maplibre-gl-draw、カテゴリ |
| Google Maps（オプション） | [features/google-maps.md](features/google-maps.md) | F-MAP |
| 個別芸能ページ | [features/performance-detail.md](features/performance-detail.md) | F-DET（provenance 必須含む） |
| オプション資産 | [features/optional-rich-media.md](features/optional-rich-media.md) | 御囃子・3D・外部ストレージ・同意（F-OPT） |
| アーカイブプレーヤー・同期 | [features/archive-player-and-sync.md](features/archive-player-and-sync.md) | F-SYNC、踊り段階、付録 JSON |
| 管理・運用 | [features/admin-operations.md](features/admin-operations.md) | F-ADM、PR ゲート |

個別仕様はステップバイステップの実装・詰め直し用である。用語・地理スコープ・ロードマップは全体仕様を参照する。要件 ID の定義が二文書で食い違う場合は **全体仕様（`specifications.md`）の変更履歴** を正とし、個別書を追随させる。

サブエージェントにタスクを切るときは **先に GitHub Issue を作成**し、[development-with-agents.md](development-with-agents.md) のテンプレ（事前確認・`Closes #`）に従う。該当する [agents/](agents/README.md) の `agent-*.md` を必読に指定する。
