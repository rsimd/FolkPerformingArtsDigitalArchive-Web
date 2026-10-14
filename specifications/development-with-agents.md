# サブエージェント分担と Git ブランチ開発

## 文書メタデータ

| 項目 | 値 |
|------|------|
| 親文書 | [specifications.md](specifications.md) |
| 版数 | 0.3.1 |
| 最終更新日 | 2026-04-14 |

### 変更履歴

| 版数 | 日付 | 変更内容 |
|------|------|----------|
| 0.3.1 | 2026-04-14 | **push 前**に `uv run pytest` と **`copilot`**（GitHub Copilot CLI）によるレビューを必須化 |
| 0.3.0 | 2026-04-14 | **Issue 駆動開発を必須化**（Qiita 参照）。エージェント開始時の `gh` / `git` 確認手順を追加。節番号を整理 |
| 0.2.0 | 2026-04-14 | 寄稿自動化ブランチ `contributions/...` と開発ブランチの併存、F-GEO・実装順序 |
| 0.1.0 | 2026-04-14 | 初版 |

---

## 1. 目的

並列で実装を進めるため、**サブエージェント（AI セッションや人間の担当者の単位）**ごとに責務と読む仕様を固定し、**GitHub 上の Issue → ブランチ → PR → マージ**で変更を完結させる。マージは **PR レビュー**（人手または別セッション）を前提とする。

本リポジトリでは、個人・小規模チームでも有効な **Issue 駆動フロー**を採用する。根拠と手順の例は次を参照する（**実装着手は Issue 作成または既存 Issue への紐付けから行う**）。

- NaaaRiii, 「GitHub Issue駆動で回す開発フロー」, Qiita, 2025-08-10. See [https://qiita.com/NaaaRiii/items/2e302283f96d2b0ee501](https://qiita.com/NaaaRiii/items/2e302283f96d2b0ee501)

---

## 2. Issue 駆動開発（必須ルール）

Qiita 記事の **「Issue → ブランチ → PR → マージ → クリーンアップ」** に従う。コミットのみ・Issue なしの直接実装は**原則禁止**とする（緊急ホットフィックスのみ人間判断で例外可。その場合も事後に Issue を補う）。

### 2.1 ワークフロー（エージェント・人間共通）

| 順序 | 行うこと |
|------|----------|
| 1 | **Issue を作成する**（または作業開始時点で存在する Issue を 1 件指定する）。本文に目的・受け入れ条件・関連要件 ID を書く |
| 2 | **`main` を最新化**したうえで、**Issue 番号を含むブランチ**を切る（§4） |
| 3 | 実装・コミット。コミットメッセージに **`(#<Issue番号>)`** を付けることを推奨する |
| 4 | **`git push` する直前（push するたび）**に **§5 の品質ゲート**を必ず実施する（テスト + Copilot） |
| 5 | **`git push`** でリモートにブランチを載せる |
| 6 | 機能がまとまったら **PR を `main` 向けに作成**する。本文に **`Closes #<Issue番号>`**（または `Fixes`）を入れ、マージ時に Issue を自動クローズしてよい |
| 7 | レビュー後マージ。**マージ済みブランチ**はローカル・リモートから削除して整理する（記事のクリーンアップ相当） |

### 2.2 Issue 本文に含めるべき項目（推奨）

- 実装内容の箇条書き
- 受け入れ条件（チェックリスト）
- 必読の `specifications/` ファイル
- 触れてよいパス（エージェント向け）

### 2.3 寄稿自動化ブランチとの関係

**寄稿自動化（GAS）**が作る `contributions/<timestamp>-<slug>`（F-CON-06）は、本節の Issue 駆動**開発ブランチとは別系統**である。混同しないこと。

---

## 3. エージェント開始時の環境確認（必須・最初に実行）

**いかなる実装・ブランチ作成の前に**、担当エージェント（LLM）は次を確認する。人間がセッションを切る場合も同様である。

### 3.1 確認コマンド

```bash
command -v git && git --version
command -v gh && gh --version
gh auth status
```

### 3.2 結果に応じた動作

| 状況 | エージェントの動作 |
|------|---------------------|
| `git` がない | パッケージマネージャでインストールを試みる。権限・環境で不可なら、**人間向けにインストール手順**（OS 別）を会話に出力してから停止する |
| `gh` がない | **macOS**: `brew install gh` の実行を試みる。不可なら [GitHub CLI 公式インストール](https://cli.github.com/) を人間に案内する。**Linux**: ディストリビューションに応じた公式手順を案内する |
| `gh auth status` が未ログイン | `gh auth login` を実行するよう提案する。エージェントが対話できない場合は、**人間に `gh auth login` を実行してもらう**よう明示する |
| いずれも成功 | Issue 作成（または既存 Issue 取得）に進んでよい |

### 3.3 Issue・PR 操作の例（CLI）

記事に倣う。実際の番号は置き換える。

```bash
gh issue create --title "（要約）" --body "## 実装内容\n...\n\n## 受け入れ条件\n- [ ] ..."

git fetch origin && git switch main && git pull origin main
git switch -c feat/15-agent-frontend-landing

# 作業後
gh pr create --title "..." --body "Closes #15\n\n- 変更点..."
```

GUI のみの環境では、同等の操作を GitHub Web 上で行えばよい。その場合も **Issue が先**であることは変えない。

---

## 4. Git ブランチ方針

| ルール | 内容 |
|--------|------|
| 保護ブランチ | `main` は直接 push しない。**PR 経由**で `internal-test` にマージし、人間のレビュー後に `internal-test` → `main` で正式ローンチする |
| **Issue 番号** | 開発ブランチ名に **GitHub Issue 番号を必ず含める**。例: `feat/23-agent-frontend-landing`、`feature/23-static-search`（[Qiita 記事](https://qiita.com/NaaaRiii/items/2e302283f96d2b0ee501) の `feature/15-user-account-deletion` と同型） |
| エージェント接頭辞 | 上記に加え、担当領域が分かる接頭辞を推奨: `feat/<番号>-agent-frontend-<topic>`、`feat/<番号>-agent-data-<topic>` 等 |
| 起点 | 原則 **`internal-test` の最新**からブランチを切る |
| 寿命 | **1 Issue（または 1 目的）あたり 1 ブランチ＝1 PR** を原則とする |
| 同期 | 作業前に `git fetch` と `git merge origin/main`（または `rebase`）でコンフリクトを早期に解消する |

**寄稿自動化（GAS）のブランチ** `contributions/<timestamp>-<slug>`（F-CON-06）と、**Issue 駆動の開発ブランチ**は別系統である。

---

## 5. Push 前の必須チェック（テスト・GitHub Copilot）

**`git push` を実行する前に毎回**（初回 push・追記コミット後の再 push を問わず）次を実施する。エージェントも人間も同様である。

### 5.1 テスト（必須）

- 本リポジトリでは **`uv run pytest`** を正とする（プロジェクトが Python＋pytest を前提とする範囲）。
- 変更がテスト対象外（ドキュメントのみ等）のときは、PR 本文に **「pytest 対象外の理由」** を 1 行以上書く。

### 5.2 GitHub Copilot によるコードレビュー（必須）

- ターミナルで **`copilot`** コマンドを起動し、**push 前に**変更内容について Copilot のレビュー（指摘の確認・必要なら修正）を行う。
- `copilot` が存在しない場合は `command -v copilot` で確認し、**GitHub Copilot CLI** の導入手順に従ってインストールを試みる。エージェントがインストールできない環境では、**人間に公式ドキュメントに基づくセットアップ**を依頼してから push しない（概要は [About GitHub Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli)）。

### 5.3 エージェント向けチェックリスト（push 直前）

```text
- [ ] uv run pytest が成功した（または対象外理由を PR に記載済み）
- [ ] copilot を起動しレビューを実施した（指摘があれば対応または PR でエスカレーション）
- [ ] その後 git push する
```

---

## 6. サブエージェントに任せる範囲（一覧）

詳細は [agents/README.md](agents/README.md) と各 **`agents/agent-*.md`** に書く。

| エージェント ID | 主な任務 | 主に触るパス（目安） | 必読の機能仕様 |
|-----------------|----------|----------------------|----------------|
| `frontend-static` | 静的 HTML/CSS/JS、MapLibre UI、ランディング・検索 UI、寄稿用 Draw ページ | `templates/`、`static/`、`docs/`（生成物を置く場合） | F-TOP、F-LIST、F-SEARCH、F-GEO、[home-and-overview-map.md](features/home-and-overview-map.md)、[list-and-discovery.md](features/list-and-discovery.md)、[map-and-geojson-contribution.md](features/map-and-geojson-contribution.md) |
| `data-build` | `places.json` 拡張、`by_region` 集約、`search_index.json` 生成、`content_flags` 算出、スキーマ整合 | `data/`、`scripts/`（新設可） | 親文書 §4、[crowdsourcing-and-publish.md](features/crowdsourcing-and-publish.md)、[map-and-geojson-contribution.md](features/map-and-geojson-contribution.md) |
| `backend-tests` | FastAPI ルート、ローカル API、pytest | `app/`、`tests/` | 親文書 §5（開発時）、非機能 §6 |
| `automation-ci` | GitHub Actions、PR テンプレ、フォーム連携の雛形 | `.github/`、ドキュメントのみの場合あり | F-CON、[admin-operations.md](features/admin-operations.md) |

**境界**: 同一 PR で `frontend-static` と `data-build` の**両方にまたがる大変更**は避け、JSON 契約（フィールド名）だけ先に合意してから実装する。

---

## 7. サブエージェントへの指示テンプレート

依頼文に次を**コピペ用ブロック**として含める。

```text
## 事前確認（必須）
- [ ] `git --version` / `gh --version` / `gh auth status` を実行し、Issue・PR 操作可能であること
- [ ] 不可の場合はインストールを試み、だめなら人間へ手順を出して停止すること

## Issue（必須）
- 新規: `gh issue create` で作成してから着手。既存: Issue #（番号）に紐付ける
- Issue 本文: 実装内容・受け入れ条件・必読仕様・変更許可パス

## Git
- ブランチ: feat/<Issue番号>-agent-<id>-<topic>（例: feat/12-agent-frontend-search）
- main から作成。**git push の前に** §5（`uv run pytest` + `copilot`）を実施する
- PR は main 向け。本文に Closes #<Issue番号>

## 必読仕様
- specifications/specifications.md（版数: x.y.z）
- specifications/agents/agent-<id>.md
- （該当するもの）specifications/features/...

## 変更許可範囲
- 触ってよい: （パス列挙）
- 触れない: （例: 別エージェント担当ディレクトリ、.env シークレット）

## 完了条件
- [ ] 受け入れ条件（Issue 本文）を満たす
- [ ] 挙動（要件 ID に対応）
- [ ] **push 前**: `uv run pytest` 成功、または対象外理由を PR に記載
- [ ] **push 前**: ターミナルで `copilot` を起動しレビュー実施
- [ ] PR 説明に変更要約・要件 ID・Closes # を記載
- [ ] マージ後、作業ブランチの削除（記事のクリーンアップ）
```

---

## 8. 人間（統合者）の役割

- **Issue の優先度付け**と、エージェントに渡す Issue の選定
- ブランチ保護と **PR マージの最終判断**
- エージェント間の **JSON / API 契約**の裁定
- 仕様書の版上げと変更履歴の記録
- **`gh` 未導入・未認証**の環境では、§3 の人間向け手順を実行する

---

## 9. 実装の推奨順序

人間または統合者がスプリントを切るときは、親文書 **§11 実装推奨順序**を参照する。各ステップは**それぞれ Issue を分ける**ことを推奨する。

---

## 10. 関連リンク

- エージェント別の短い仕様: [agents/README.md](agents/README.md)
- 機能別の正: [README.md](README.md) の表
- Issue 駆動の考え方・コマンド例: [Qiita / GitHub Issue駆動で回す開発フロー](https://qiita.com/NaaaRiii/items/2e302283f96d2b0ee501)
