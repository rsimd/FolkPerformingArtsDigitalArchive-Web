# 芸能アーカイブマップ・プロトタイプ

郷土芸能・民俗芸能・伝統芸能を、次の3モードで表示するデスクトップ向け地図プロトタイプです。

- 芸能・文化財: 公的カタログの芸能と指定等の記録
- 公演・映像: イベントシリーズ、各年の開催回、動画、2000〜2026年の芸能暦、出張計画
- 保存会・団体: 全国調査のYouTubeチャンネルと団体Web・SNS

位置を確定できないレコードも除外せず、一覧・検索・詳細に収録します。地図には座標または代表点を決められたレコードだけを表示します。イベントシリーズの親は概念レコードとして検索・詳細に収録しますが、各開催回との地図件数の二重計上を避けるためGeoJSONには含めません。

## 起動

```bash
cd prototype-map
pnpm install
pnpm dev
```

本番ビルドは `pnpm build`、ビルド結果の確認は `pnpm preview` です。

## データ更新

画面はExcelや既存JSONLを直接importしません。`public/datasets/current.json` が示す公開用データセットを、`MapDataProvider` 契約を通じて実行時に取得します。

現在のデータセットは `public/datasets/2026-07-30-full/` です。データを更新するときは、新しいバージョンディレクトリに `manifest.json`、各モードの全件レコードJSON、地図用GeoJSON、分割した詳細JSONを生成し、最後に `current.json` の参照先を変更します。Reactの表示コードを変更する必要はありません。

生成スクリプトはプロジェクト直下の `scripts/build_map_prototype_dataset.mjs` です。Excelの読み出しは `scripts/extract_map_excel_source.mjs` が担当します。同一 `video_id` の行は1動画へ統合し、各ブックの元列は詳細データに保持します。旧版・作業コピーは最新版へ置換済みとして重複加算しません。

継続開催されるイベントは、親 `event_series` と子 `video_event` のIDで相互参照します。回次付き名称を優先し、年次型は十分な長さの同一名称に限定したうえで、地域・会場・チャンネルの一致を必須とします。同じ回次の複数動画は1開催回へ統合しますが、回次のない年次型は同じ年でも別公演を自動統合しません。

検証は次のコマンドで実行します。

```bash
node scripts/validate_map_prototype_dataset.mjs
```
