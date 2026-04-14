# サブエージェント仕様: frontend-static（静的 UI）

## 担当範囲

- トップのランディング（F-TOP）、一覧・検索 UI（F-LIST / F-SEARCH）、個別ページの**静的テンプレートとクライアント JS**
- MapLibre＋OpenFreeMap の閲覧 UI（俯瞰、凡例、地域パネル、マーカー色）
- **寄稿用 Draw ページ**（F-GEO、maplibre-gl-draw 等）

## 必読

- [specifications.md](../specifications.md) … F-TOP、F-LIST、F-SEARCH、F-DET、F-GEO の UI 部分
- [home-and-overview-map.md](../features/home-and-overview-map.md)
- [list-and-discovery.md](../features/list-and-discovery.md)
- [map-and-geojson-contribution.md](../features/map-and-geojson-contribution.md)
- [performance-detail.md](../features/performance-detail.md) … レイアウト・provenance 表示枠

## Git

- **Issue を先に作成**（または既存 Issue に紐付け）、[development-with-agents.md](../development-with-agents.md) §3 で `gh` を確認する
- ブランチ: **`feat/<Issue番号>-agent-frontend-<topic>`**（`main` から）。例: `feat/12-agent-frontend-landing`
- PR 本文に **`Closes #<Issue番号>`** を含める
- 他エージェントの担当: `data/places.json` の**大規模な中身変更**は原則別 PR。UI が必要とする**フィールド契約**は PR 本文またはコメントで `data-build` と合意する

## 変更してよいパス（目安）

- `templates/`、`static/`、将来の `docs/` 用静的資産
- フロント専用の小さな設定ファイル

## 触れないこと（原則）

- GAS スクリプト、`.github/workflows/` の本番シークレット
- データ正本の独自スキーマ変更を単独で確定しない（`data-build` と協議）

## 完了の定義

- 指定された要件 ID に対応した UI が動作する
- `prefers-reduced-motion` 等、仕様に書かれたアクセシビリティ項目を満たす努力を PR に記載する
- [development-with-agents.md](../development-with-agents.md) **§5**（push 前の `uv run pytest` と `copilot`）を満たす
