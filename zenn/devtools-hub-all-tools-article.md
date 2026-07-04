---
title: 開発者向け無料Webツールを78本作ったので全部紹介する
emoji: 🛠️
type: idea
topics: [web, css, javascript, frontend, 個人開発]
published: true
---

ブラウザで使える開発者向けの無料Webツールを78本作りました。

https://devtools-hub.vercel.app/

インストール不要・ログイン不要・完全無料です。カテゴリ別に全部紹介します。

---

## CSS系（15本）

### Box Shadow Generator
CSSの `box-shadow` をスライダーで生成。複数レイヤー対応。
https://devtools-hub.vercel.app/tools/box-shadow-generator

### CSS Text Shadow Generator
`text-shadow` をスライダーで生成。最大5レイヤーを重ねてグロー・ネオンエフェクトも作れる。4種プリセット付き。
https://devtools-hub.vercel.app/tools/text-shadow-generator

### CSS Filter Generator
brightness/contrast/blur など9種のCSSフィルターをスライダーで調整してコード生成。
https://devtools-hub.vercel.app/tools/css-filter-generator

### CSS Animation Builder
`@keyframes` をGUIで組み立て。duration/easing/delay をスライダー調整してリアルタイムプレビュー。
https://devtools-hub.vercel.app/tools/css-animation-builder

### CSS Grid Generator
columns/rows/gap/areas をGUI操作でCSS Grid生成。HTMLテンプレートも出力。
https://devtools-hub.vercel.app/tools/css-grid-generator

### CSS Flexbox Generator
flex-direction/wrap/justify-content など全プロパティ＋アイテム個別設定。プレビュー付き。
https://devtools-hub.vercel.app/tools/css-flexbox-generator

### CSS Transform Explorer
translate/rotate/scale/skew をスライダー操作。3Dモード・transform-origin 9点グリッド対応。
https://devtools-hub.vercel.app/tools/css-transform-explorer

### CSS Clip-Path Generator
polygon/circle/ellipse/inset をビジュアル操作で `clip-path` CSS生成。8種プリセット付き。
https://devtools-hub.vercel.app/tools/css-clip-path-generator

### CSS Mask Generator
6方向 `mask-image` グラデーション・最大3レイヤー・`-webkit-` 対応コード出力。
https://devtools-hub.vercel.app/tools/css-mask-generator

### CSS Pattern Generator
横・縦・斜めストライプ/グリッド/ドット/チェッカーを純CSSで生成。6パターン。
https://devtools-hub.vercel.app/tools/css-pattern-generator

### CSS Specificity Calculator
CSSセレクターの詳細度を (a,b,c) で計算。最大8本を並べて比較・ランキング表示。
https://devtools-hub.vercel.app/tools/css-specificity-calculator

### CSS Variable Inspector
CSSコードから `--変数名` を抽出。カラーピッカー・スライダーでリアルタイム編集。
https://devtools-hub.vercel.app/tools/css-variable-inspector

### CSS Stacking Inspector
z-index とスタッキングコンテキストをツリー表示。競合検出付き。
https://devtools-hub.vercel.app/tools/css-stacking-inspector

### Bezier Curve Editor
cubic-bezier の4制御点をドラッグ編集。プリセット付きで `transition`/`animation` コード生成。
https://devtools-hub.vercel.app/tools/bezier-curve-editor

### CSS Scroll Snap Generator
scroll-snap-type / align / padding を GUI で設定し、横・縦スクロールのスナップ動作をリアルタイムプレビュー。
https://devtools-hub.vercel.app/tools/css-scroll-snap-generator

---

## カラー系（7本）

### Color Deck
HEX/RGB/HSL/HSV/RGBA float 変換 + パレット保存。
https://devtools-hub.vercel.app/tools/color-deck

### Gradient Deck
linear/radial/conic グラデーションエディタ。
https://devtools-hub.vercel.app/tools/gradient-deck

### Color Palette Generator
ベースカラーから補色・類似色・トライアドなど5種のカラーハーモニーを自動生成。
https://devtools-hub.vercel.app/tools/color-palette-generator

### Color Shade Generator
Tints/Shades/Tones 3モード・5〜10ステップ。CSS変数・Tailwind形式で出力。
https://devtools-hub.vercel.app/tools/color-shade-generator

### Color Contrast Checker
WCAG 2.1 コントラスト比チェック。AA/AAA 判定付き。
https://devtools-hub.vercel.app/tools/color-contrast-checker

### Color Blindness Simulator
5種の色覚シミュレーション (Brettel行列)。WCAG コントラスト比判定付き。
https://devtools-hub.vercel.app/tools/color-blindness-simulator

### Color Token Generator
カラーパレットを CSS 変数・Tailwind・SCSS・JSON トークン形式で一括出力。パレットの保存・読み込み対応。
https://devtools-hub.vercel.app/tools/color-token-generator

---

## JSON・データ変換系（11本）

### JSON Studio
JSON フォーマット・バリデート・ソート・Minify。
https://devtools-hub.vercel.app/tools/json-studio

### JSON to TypeScript
JSONから TypeScript の `interface` 型定義を自動生成。ネスト・null・配列対応。
https://devtools-hub.vercel.app/tools/json-to-typescript

### JSON Path Tester
JSONPath 式をリアルタイムテスト。マッチ結果を即時表示。
https://devtools-hub.vercel.app/tools/json-path-tester

### YAML / JSON / TOML Converter
YAML/JSON/TOML の3方向リアルタイム相互変換。
https://devtools-hub.vercel.app/tools/yaml-json-converter

### HTML to JSX
HTMLを React/JSX に変換。`class→className`・`style` 文字列→オブジェクト・void 要素自己閉じ。
https://devtools-hub.vercel.app/tools/html-to-jsx

### Markdown Table Generator
GUIでMarkdownテーブルを作成。列/行追加・配置指定・CSVインポート対応。
https://devtools-hub.vercel.app/tools/markdown-table-generator

### JSON Schema Validator
JSON Schema と JSON を並べてリアルタイムバリデーション。日本語エラー表示付き。
https://devtools-hub.vercel.app/tools/json-schema-validator

### JSON ↔ CSV Converter
JSON 配列と CSV を双方向変換。RFC 4180 準拠・テーブルプレビュー付き。
https://devtools-hub.vercel.app/tools/json-csv-converter

### Mermaid Preview
Mermaid 記法でフローチャート・シーケンス・ER・ガントをリアルタイムプレビュー。SVG/PNG 保存対応。
https://devtools-hub.vercel.app/tools/mermaid-preview

### cURL to Code
cURL コマンドを Python requests・JS fetch・JS axios・Shell wget に自動変換。変換履歴 10 件保持。
https://devtools-hub.vercel.app/tools/curl-to-code

### SQL Formatter
SQL を自動整形（キーワード大文字化・インデント）または 1 行 Minify。MySQL / PostgreSQL / BigQuery 方言対応。
https://devtools-hub.vercel.app/tools/sql-formatter

---

## テキスト・文字列系（7本）

### Regex Studio
正規表現のリアルタイムテスター。マッチハイライト・置換プレビュー付き。
https://devtools-hub.vercel.app/tools/regex-studio

### Diff Viewer
2つのテキストの差分をUnified/Split表示。
https://devtools-hub.vercel.app/tools/diff-viewer

### Text Case Converter
camelCase/PascalCase/snake_case など8形式を相互変換。
https://devtools-hub.vercel.app/tools/text-case-converter

### Lorem Ipsum Generator
段落・単語・文字数でダミーテキストを生成。
https://devtools-hub.vercel.app/tools/lorem-ipsum-generator

### Character Counter
文字・単語・バイト数・読了時間・原稿用紙換算。
https://devtools-hub.vercel.app/tools/character-counter

### String Inspector
文字列を1文字ずつ分解。Unicodeコードポイント・UTF-8バイト数・文字種（7分類）を可視化。
https://devtools-hub.vercel.app/tools/string-inspector

### Text Layout Checker
フォントサイズ・行間・文字間隔をスライダー調整してプレビュー。
https://devtools-hub.vercel.app/tools/text-layout

---

## エンコード・変換系（11本）

### Base64 Studio
Base64 エンコード/デコード（テキスト・画像対応）。
https://devtools-hub.vercel.app/tools/base64-studio

### URL Encoder/Decoder
URLパーセントエンコード/デコード・クエリパラメータパース。
https://devtools-hub.vercel.app/tools/url-encoder

### HTML Entity Encoder
HTML特殊文字のエンティティ変換/復元。非ASCII文字対応。
https://devtools-hub.vercel.app/tools/html-entity-encoder

### Number Base Converter
2進/8進/10進/16進 相互変換 + ビットビューア。
https://devtools-hub.vercel.app/tools/number-base-converter

### Timestamp Converter
Unix タイムスタンプ ↔ 日時変換。タイムゾーン対応。
https://devtools-hub.vercel.app/tools/timestamp-converter

### CSS Unit Converter
px/rem/em/vw/vh/pt/cm/mm の相互変換。
https://devtools-hub.vercel.app/tools/css-unit-converter

### Aspect Ratio Calculator
幅・高さからアスペクト比を算出・逆算。プリセット付き。
https://devtools-hub.vercel.app/tools/aspect-ratio-calculator

### Typography Scale Generator
Modular Scale をベースサイズ×比率から計算。8プリセット・px/rem・CSS変数出力。
https://devtools-hub.vercel.app/tools/typography-scale-generator

### Date / Time Calculator
日付の差分計算・日数加算・営業日カウントの3モード。履歴 20 件・CSV エクスポート対応。
https://devtools-hub.vercel.app/tools/date-calculator

### URL Parser / Builder
URL を構成要素（protocol / host / pathname / query params / hash）に分解し、クエリパラメータを GUI で編集して再構築。
https://devtools-hub.vercel.app/tools/url-parser-builder

### Number Formatter
数値をカンマ区切り・通貨・SI 単位・指数表記など複数フォーマットで同時出力。ロケール切り替え対応。
https://devtools-hub.vercel.app/tools/number-formatter

---

## セキュリティ・認証系（3本）

### JWT Decoder
JWT のヘッダー/ペイロード/署名デコード。有効期限表示付き。
https://devtools-hub.vercel.app/tools/jwt-decoder

### Hash Studio
MD5/SHA-1/SHA-256/SHA-512 ハッシュ生成・検証。
https://devtools-hub.vercel.app/tools/hash-studio

### Password Generator
文字種・長さ指定でパスワード生成。強度メーター付き。
https://devtools-hub.vercel.app/tools/password-generator

---

## 画像・グラフィック系（8本）

### WebP Studio
PNG/JPG → WebP/AVIF 一括変換。
https://devtools-hub.vercel.app/tools/webp-studio

### アイコン一括リサイズ
画像を 16〜512px の各サイズに一括リサイズ。ZIP 出力。
https://devtools-hub.vercel.app/tools/resize-image

### SVG Viewer
SVGコードをリアルタイムプレビュー。viewBox/色解析・ズーム・PNG書き出し。
https://devtools-hub.vercel.app/tools/svg-viewer

### Image Color Extractor
画像から k-means で主要カラーパレット抽出。HEX/RGB/HSL・CSV/JSON 出力。
https://devtools-hub.vercel.app/tools/image-color-extractor

### Pixel Art Palette
ブラウザでピクセルアート描画。パレット管理・PNG書き出し。
https://devtools-hub.vercel.app/tools/pixel-art-palette

### MockupBuilder
アプリストア用スクリーンショット生成。
https://devtools-hub.vercel.app/tools/mockup-builder

### Favicon Generator
絵文字・テキストから 16/32/64px の favicon PNG を即生成。背景色・文字色カスタマイズ対応。
https://devtools-hub.vercel.app/tools/favicon-generator

### Placeholder Image Generator
幅・高さ・背景色・テキストを指定してプレースホルダー画像をリアルタイム生成。Data URL・HTML img タグ形式でコピー。
https://devtools-hub.vercel.app/tools/placeholder-image-generator

---

## その他の開発ツール（16本）

### QR コード
テキスト/URL → QRコード生成。PNG/SVG ダウンロード。
https://devtools-hub.vercel.app/tools/qr-code

### UUID ジェネレーター
UUID v4/v1/v7 生成。一括出力対応。
https://devtools-hub.vercel.app/tools/uuid-generator

### CRON 式ビルダー
cron をビジュアル組み立て。日本語解説と次回実行時刻を表示。
https://devtools-hub.vercel.app/tools/cron-builder

### Keyboard Event Tester
key/code/keyCode/charCode・修飾キーなど KeyboardEvent プロパティをリアルタイム表示。
https://devtools-hub.vercel.app/tools/keyboard-event-tester

### Markdown Preview
Markdownリアルタイムプレビュー。目次自動生成付き。
https://devtools-hub.vercel.app/tools/markdown-preview

### OG Tag Preview
URLのOGPメタタグ取得。Twitter Card/Facebook/Slack 3種プレビュー・CSV出力。
https://devtools-hub.vercel.app/tools/og-tag-preview

### Meta Tag Generator
基本/OGP/Twitter Card 3タブ。文字数カウンター・Google検索/SNSカードプレビュー付き。
https://devtools-hub.vercel.app/tools/meta-tag-generator

### HTTP Status Reference
HTTPステータスコードを番号/キーワードで検索。全57種・カテゴリ別カラーコーディング。
https://devtools-hub.vercel.app/tools/http-status-reference

### Color Format Converter
HEX/RGB/HSL/CMYK 相互変換。
https://devtools-hub.vercel.app/tools/color-format-converter

### Border Radius Generator
px/% 単位・一括/個別モード・shorthand/longhand で `border-radius` 生成。
https://devtools-hub.vercel.app/tools/border-radius-generator

### Sheet Studio
スプライトシートのパック & スライス。
https://devtools-hub.vercel.app/tools/sheet-studio

### AI Prompt Manager
AI画像生成プロンプトの管理・自動組み立て。
https://devtools-hub.vercel.app/tools/ai-prompt-manager

### Text Deck
スニペットランチャー。定型文・コードスニペットを管理して即呼び出し。
https://devtools-hub.vercel.app/tools/text-deck

### IP / CIDR Calculator
CIDR 記法（例: 192.168.1.0/24）からネットワークアドレス・ブロードキャスト・サブネットマスク・IP レンジを即計算。2 進数表示付き。
https://devtools-hub.vercel.app/tools/cidr-calculator

### .env File Parser
.env ファイルの内容をペーストするだけで key/value を表形式で一覧表示。値マスク・JSON 変換・.env 形式でのコピーに対応。
https://devtools-hub.vercel.app/tools/env-file-parser

### HTTP Headers Reference
主要 HTTP ヘッダー 46 種の用途・構文・使用例をまとめたリファレンス。リクエスト/レスポンス/セキュリティでフィルタリング・全文検索対応。
https://devtools-hub.vercel.app/tools/http-headers-reference

---

## まとめ

全78本、すべて無料・インストール不要です。

https://devtools-hub.vercel.app/

新しいツールも継続的に追加しています。「こんなツールがあったら便利」という要望があればコメントください。
