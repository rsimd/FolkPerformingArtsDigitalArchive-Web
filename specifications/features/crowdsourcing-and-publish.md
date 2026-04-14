# 仕様: 寄稿・公開パイプライン

## 文書メタデータ

| 項目 | 値 |
|------|------|
| 親文書 | [specifications.md](../specifications.md) |
| 本書の役割 | フォーム寄稿、投稿者属性、GAS→GitHub PR/Issue、GitHub Pages 反映、ビルド成果物、**セキュリティと自動化の具体** |
| 版数 | 0.2.0 |
| 最終更新日 | 2026-04-14 |

### 変更履歴

| 版数 | 日付 | 変更内容 |
|------|------|----------|
| 0.2.0 | 2026-04-14 | GAS 推奨フロー、ブランチ命名、代替手段、セキュリティ、Microsoft 列を追記 |
| 0.1.0 | 2026-04-14 | 初版。全体仕様 F-CON の切り出し |

---

## 1. 要件（親文書と同一 ID）

| 要件 ID | 説明 |
|---------|------|
| F-CON-01 | Google Form / Microsoft Forms でテキスト・YouTube・写真 URL・GeoJSON 等を受け付ける |
| F-CON-02 | **`contributor_kind`**（`preservation_group` / `municipal_staff` / `general_public` / `researcher` / `other`）と **`contributor_title_ja`**（任意）を記入させる |
| F-CON-03 | GAS 等で GitHub **PR・Issue** を生成（fine-grained PAT、最小権限） |
| F-CON-04 | 管理者 **PR レビュー**後マージ → **GitHub Pages** に反映 |
| F-CON-05 | 大容量バイナリは **オブジェクトストレージ**へ。Git にはマニフェストのみ |
| F-CON-06 | 自動化がコミットするブランチ名は **`contributions/<timestamp>-<slug>`** を推奨する（親文書 §3.4） |

## 2. contributor_kind（JSON 値）

| 値 | 表示ラベル（例） |
|----|------------------|
| preservation_group | 民俗芸能保存団体 |
| municipal_staff | 地方自治体職員 |
| general_public | 一般情報提供者 |
| researcher | 研究者 |
| other | その他（Issue で確認してもよい） |

## 3. content_flags（ビルド生成）

親文書の `FolkPerformance.content_flags` と一致させる論理フラグ。例:

- `has_detail_page`: 静的詳細 HTML が存在
- `has_video`: 本編または紹介用の YouTube／アーカイブ URL 等
- `has_3d_motion`: `optional_media_3d` にモーションが含まれる（同意済み）

## 4. 自動化方式の比較（実装選定用）

| 方式 | 長所 | 短所 |
|------|------|------|
| **Google Apps Script（推奨）** | Form/スプレッドシート連携が容易。GitHub REST API でブランチ・コミット・PR・Issue が可能 | fine-grained PAT を Script Properties に格納する運用・ローテーションが必要 |
| **GitHub Actions のみ** | シークレットを GitHub に集約できる | Form から直接 Actions を叩けない。**別トリガ**（手動 `workflow_dispatch`、定期ポーリング用の**公開エンドポイント**は避ける）が必要で単体では完結しにくい |
| **Microsoft Forms + Power Automate** | M365 契約がある場合に自然 | 無料枠・コネクタ制約の確認が必要 |

## 5. 推奨フロー（GAS 第一候補）

1. Form 送信 → スプレッドシート行追加（または `onFormSubmit`）
2. GAS が JSON 断片を生成し、**`contributor_kind` / `contributor_title_ja` を必ず含める**（F-CON-02）
3. GitHub API で `data/...` 等にファイル追加のコミットを **`contributions/<timestamp>-<slug>`** ブランチへプッシュ（F-CON-06）
4. **PR 作成** → **Issue 作成**（テンプレにチェックリスト・フォーム回答リンク・差分サマリ・投稿者属性）
5. 管理者は **PR をレビュー**し、マージで Pages に反映

**3D 巨大ファイル**: GAS から GitHub に直送しない。メタデータ＋ストレージ上のオブジェクトキーまでに留め、アップロードは人間がコンソール等で行う Phase 0 でもよい（[optional-rich-media.md](optional-rich-media.md)）。

## 6. セキュリティ（必須レベル）

- PAT は **単一リポジトリ**・**contents / pull_requests** 等の**最小権限**（fine-grained）。`workflow` は不要なら付与しない
- **ブランチ保護**（`main` に必須レビュー）
- GAS 側: **URL ホワイトリスト**（許可ドメインのみ）、**JSON サイズ上限**、GeoJSON は [map-and-geojson-contribution.md](map-and-geojson-contribution.md) の F-GEO-03 に従い検証する

## 7. 公開サイトでの出典表示

エントリまたは寄稿ブロックに **「出典: {ラベル} — {肩書き}」** のように表示可能とする。管理者レビューでは `contributor_kind` に応じたチェックリスト（例: 一般寄稿は裏取り強化）を Issue テンプレに差し込める。

**公開 JSON の肩書き**: `contributor_title_ja` に氏名・所属のフル表記が入りうる。公開範囲は親文書 Open Questions 13 と [admin-operations.md](admin-operations.md) で決め、**フォームで説明**する。

## 8. フェーズ方針（必須レーンと任意レーン）

- **Phase 開始（必須レーン）**: YouTube リンク、写真 URL、テキスト、地図 GeoJSON、許諾。これだけで PR が成立する
- **Phase 後追い（任意レーン）**: 演者 3D、動画由来モーション、LiDAR は専用ワークフロー。**御囃子オプション**は容量が小さいため一般フォームの任意欄から URL を受け取り PR に含めてもよい（楽譜の著作権は PR で必ず確認）

## 9. 関連文書

- [admin-operations.md](admin-operations.md)
- [optional-rich-media.md](optional-rich-media.md)
- [home-and-overview-map.md](home-and-overview-map.md)
- [map-and-geojson-contribution.md](map-and-geojson-contribution.md)

## 10. 実装フェーズで詰める項目

- PAT のローテーション手順
- Microsoft Forms 採用時の Power Automate 差分
- 悪意寄稿の緩和策の採否（親文書 Open Questions 14）
