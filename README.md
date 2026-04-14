> This project was created by the AI code editor **Cursor**.
> Specification documents in `specifications/` are maintained with AI assistance (the editor LLM may vary by session).
> When implementing or delegating work, use [specifications.md](specifications/specifications.md) and linked feature specs (requirement IDs such as F-TOP, F-CON) as the source of truth. For parallel AI sessions, see [development-with-agents.md](specifications/development-with-agents.md) and [agents/](specifications/agents/README.md) for branch naming and scope boundaries.
> Feature-level specs are listed in [specifications/README.md](specifications/README.md).

# FolkPerformingArtsDigitalArchive-Web

東北地域の伝統芸能の保存を目的とし、まずは岩手県を対象として民俗芸能の記録・閲覧・学習支援を進める Web アプリケーションのリポジトリです。第一目標として、OpenFreeMap と MapLibre GL JS 上に地区・村落単位のピンを置き、その地点で想定・記録される民俗芸能を一覧表示する**民俗芸能地図**を実装しています。

## 民俗芸能地図（MVP）

- トップ URL（`/`）で地図 UI を表示します。
- `GET /api/places` が `data/places.json` の内容を返します。ピンは地区・村落などの単位（`unit_type`）ごとに配置します。
- 地区・村落は赤枠のポリゴンで表示し、枠内をクリックすると右側パネルにメタ情報と `performances` の一覧を表示します（`boundary` 未指定の地点は代表座標まわりの暫定矩形になります）。
- 表示データはサンプルです。座標は代表点の例示であり、調査に基づき `places.json` を差し替えてください。

### 必要な環境

- Python 3.11 以上（開発では 3.12 系で確認済みです）
- [uv](https://github.com/astral-sh/uv)（パッケージ管理・実行に使用します）

### OpenFreeMap / MapLibre GL JS の前提

1. 地図表示は MapLibre GL JS と OpenFreeMap のスタイル URL（`https://tiles.openfreemap.org/styles/liberty`）を利用します。
2. 現在の実装では API キーは不要です。See [.env.example](.env.example) for current environment settings.
3. OpenStreetMap 系データを利用するため、クレジット表示と利用規約を確認します。See [OpenFreeMap](https://openfreemap.org/) and [OpenStreetMap Copyright](https://www.openstreetmap.org/copyright).

### 起動方法

```bash
# リポジトリのルートに移動します
cd FolkPerformingArtsDigitalArchive-Web

# 依存関係をインストールします
uv sync --group dev

# 開発サーバを起動します（ホットリロード）
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

ブラウザで `http://127.0.0.1:8000/` を開きます。

### テスト実行

```bash
uv run pytest
```

## 本リポジトリの位置づけ

- 東北の伝統芸能を保存する前提のうえ、当面は岩手県を先行対象とした民俗芸能の来歴、保存団体、御囃子・口上・舞踊の意味、台本、楽譜などを整理して公開する方針を [specifications.md](specifications/specifications.md) に定義します。機能単位の個別仕様は [specifications/README.md](specifications/README.md) を参照します。
- 実装を依頼する際は、仕様書の**版数**と**要件 ID**（例: F-TOP、F-CON）を指示に含めると齟齬が減ります。サブエージェントに分割する場合は [development-with-agents.md](specifications/development-with-agents.md) と [agents/](specifications/agents/README.md) に従い、**専用ブランチ**で作業させてください。
- 将来的には個別芸能ページやアーカイブ映像との連携を追加する予定です。

## ライセンス

### ソフトウェア

本リポジトリのソースコード（`app/`, `static/`, `templates/`, `scripts/`, `tests/` 等）は **MIT License** とします。詳しくは [LICENSE](LICENSE) を参照してください。

### コンテンツデータ

`data/` 配下のデータファイル（`places.json`, `search_index.json`, `by_region/` 等）および、投稿された写真・楽譜・口述資料・映像・GeoJSON 等（以下「コンテンツ」）は、MIT License の対象外です。

コンテンツの著作権はそれぞれの著作者・情報提供者に帰属します。コンテンツの**無断複製・再配布・転用**を禁じます。利用を希望する場合は、サイト上の問い合わせ方法に従って許諾を得てください。
