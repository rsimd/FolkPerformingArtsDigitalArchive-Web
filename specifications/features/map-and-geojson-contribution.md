# 仕様: 地図・GeoJSON 寄稿（境界・カテゴリ・Draw）

## 文書メタデータ

| 項目 | 値 |
|------|------|
| 親文書 | [specifications.md](../specifications.md) |
| 本書の役割 | 公開地図とは別軸の**寄稿者向け**境界入力、カテゴリ列挙、GAS 側 GeoJSON 検証、既存暫定矩形との関係 |
| 版数 | 0.1.0 |
| 最終更新日 | 2026-04-14 |

### 変更履歴

| 版数 | 日付 | 変更内容 |
|------|------|------|
| 0.1.0 | 2026-04-14 | 初版。全体仕様 F-GEO の切り出し（低コスト寄稿計画 §4 相当） |

---

## 1. 要件（親文書と同一 ID）

| 要件 ID | 説明 |
|---------|------|
| F-GEO-01 | **寄稿用ミニツール**: GitHub Pages 上の**静的ページ**として、MapLibre GL JS と **maplibre-gl-draw**（または同等のポリゴン編集ライブラリ）で Polygon / MultiPolygon を描画できる |
| F-GEO-02 | 完成した GeoJSON を**クリップボードへコピー**または**ファイルダウンロード**し、フォームの「範囲 GeoJSON」欄に貼付できる |
| F-GEO-03 | **オートメーション（GAS 等）**は、コミット前に GeoJSON を JSON としてパースし、**型**（`FeatureCollection` 等の許容形）、**座標数上限**、任意で **bbox 上限**を検証する。不正なら Issue のみまたは差し戻しとする |
| F-GEO-04 | エントリまたは地域関連データに **`map_category`（列挙）** を持てる。JSON では英語スネークケース（例: `kenbu`, `kagura`, `shishi_shika`, `other`）、UI 表示は**日本語ラベルマップ**で解決する。MapLibre の**データ駆動スタイル**（`filter` または `match`）でカテゴリ別表示・一括表示切替に使う |
| F-GEO-05 | **`boundary` 未指定**のエントリに対し README 等で暫定矩形を置いている場合、**本物の Polygon が来たら**それを正とする（暫定矩形はフォールバックのみ）。複数ソースの衝突時は **PR で人間が解決**し、仕様上は「`boundary` があれば代表点より優先してヒット領域に使う」を原則とする |

## 2. 公開トップの俯瞰地図との役割分担

- **俯瞰・発見**（F-TOP、市町村境界・クラスタ等）: [home-and-overview-map.md](home-and-overview-map.md)
- **本書**: 寄稿者が**自分で範囲を描く**ための UI と、**カテゴリ**のデータ契約、**サーバなし**での検証境界

公開サイトの「探索用」地図と、寄稿用ページの URL は分離してよい（例: `/contribute/geo.html` 等。実装フェーズでパス確定）。

## 3. 技術的制約

- Draw ページも **OpenFreeMap＋MapLibre** を第一とし、Google Maps の Draw に依存しない（F-MAP 採用時も本フローは MapLibre でよい）。
- GAS から Draw ページを直接操作しない。人間が GeoJSON をフォームへ渡す。

## 4. 関連文書

- [crowdsourcing-and-publish.md](crowdsourcing-and-publish.md)（F-CON、ブランチ命名）
- [home-and-overview-map.md](home-and-overview-map.md)（ヒット領域 `(a)(b)(c)`）
- [google-maps.md](google-maps.md)（F-MAP は閲覧オプション）
- 親文書 §4.2 `FolkPerformance` の `boundary` / `map_category` 欄

## 5. 実装フェーズで詰める項目

- 座標数上限の具体値と S 字曲線の簡略化の要否
- 同一エントリに複数ポリゴンを許すか（MultiPolygon のみか）
