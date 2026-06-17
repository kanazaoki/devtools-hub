export interface Tool {
  slug: string
  name: string
  tagline: string
  description: string
  tags: string[]
  boothUrl: string
  hasWebVersion: boolean
  features: string[]
  desktopFeatures: string[]
}

export const tools: Tool[] = [
  {
    slug: 'base64-studio',
    name: 'base64-studio',
    tagline: 'Base64 エンコード & デコード',
    description:
      'テキストや画像を Base64 に変換。Standard / URL-safe 切り替え・Data URI 形式での出力に対応。Base64 文字列を貼り付けるだけで元のテキスト・画像に自動復元。',
    tags: ['開発者向け', 'テキスト', 'エンコード'],
    boothUrl: 'https://knkk.booth.pm/items/8516143',
    hasWebVersion: true,
    features: [
      'テキスト → Base64 リアルタイム変換',
      '画像ドロップ → Base64 / Data URI 変換',
      'Base64 → テキスト・画像へ自動デコード',
      'Standard / URL-safe Base64 切り替え',
      'Pure Base64 / Data URI 形式の出力切り替え',
    ],
    desktopFeatures: [
      'Swap ⇄（エンコード出力 → デコード入力に転送）',
      '画像デコード結果を PNG としてファイル保存',
      'キーボードショートカット（Ctrl+E/D・Ctrl+Shift+C）',
      '入力・出力のバイト数をリアルタイム表示',
    ],
  },
  {
    slug: 'json-studio',
    name: 'JSON Studio',
    tagline: 'JSON フォーマッター & バリデーター',
    description:
      'JSON を貼り付けるだけでリアルタイム整形・構文エラー検出。シンタックスハイライト・キーのアルファベット順ソート・Minify に対応。開発者の日常作業をすばやくこなせる JSON ツール。',
    tags: ['JSON', '開発者向け', 'フォーマッター'],
    boothUrl: 'https://knkk.booth.pm/items/8515118',
    hasWebVersion: true,
    features: [
      'JSON 貼り付けでリアルタイム整形',
      '構文エラーのリアルタイム検出',
      'シンタックスハイライト（キー・文字列・数値・真偽値）',
      'インデント幅選択（2 / 4 / タブ）',
      'キーのアルファベット順ソート・Minify',
    ],
    desktopFeatures: [
      'YAML モード（JSON → YAML 変換表示）',
      'Diff モード（2つの JSON の差分比較）',
      '折りたたみ（オブジェクト・配列を▶クリックで折りたたみ）',
      '出力内検索（Ctrl+F）',
      '入力履歴（最大10件）',
    ],
  },
  {
    slug: 'color-deck',
    name: 'color-deck',
    tagline: 'カラーコード変換 & パレット保存',
    description:
      'HEX・RGB・CSS rgba()・RGBA float・HSV・HSL をリアルタイムに相互変換。スポイト機能・アルファスライダー・お気に入りパレット（最大8色）付き。開発・デザイン作業中いつでも手元に置けるカラーツール。',
    tags: ['カラー', 'デザイン', '開発者向け'],
    boothUrl: 'https://knkk.booth.pm/items/8488574',
    hasWebVersion: true,
    features: [
      'HEX / RGB / CSS rgba() / RGBA float / HSV / HSL をリアルタイム変換',
      'カラーピッカー & スポイト機能',
      'アルファスライダー（透明度調整）',
      'ワンクリックコピー',
      'お気に入りパレット（最大8色、ブラウザに自動保存）',
    ],
    desktopFeatures: [
      'グローバルホットキー（Ctrl+Alt+C）でどこからでも瞬時に起動',
      'システムトレイに常駐・タスクバー右下から呼び出し',
      '常に最前面（Always on Top）表示',
      'パレットをファイルに保存・件数無制限',
    ],
  },
  {
    slug: 'gradient-deck',
    name: 'Gradient Deck',
    tagline: 'グラデーションエディタ',
    description:
      'linear / radial / conic グラデーションをリアルタイムで編集。CSS・JSON 形式でコードをワンクリックコピー。内蔵プリセット集付き。UI デザイナー・フロントエンドエンジニア・ゲーム開発者向け。',
    tags: ['カラー', 'デザイン', 'CSS'],
    boothUrl: 'https://knkk.booth.pm/items/8466853',
    hasWebVersion: true,
    features: [
      'linear / radial / conic グラデーション対応',
      'カラーストップの追加・削除・位置調整',
      'リアルタイムプレビュー',
      'CSS / JSON 形式でコードコピー',
      '内蔵プリセット集',
    ],
    desktopFeatures: [
      'グラデーションプリセットをファイルに永続保存・読み込み',
      'システムトレイに常駐',
      '常に最前面（Always on Top）表示',
    ],
  },
  {
    slug: 'text-layout',
    name: 'Text Layout Checker',
    tagline: 'テキスト表示確認ツール',
    description:
      'フォントサイズ・行間・文字間隔・最大横幅をスライダーで調整し、テキストのレンダリングをリアルタイム確認。決定したパラメータを CSS / JSON 形式でコピーしてゲームエンジンや Web プロジェクトにそのまま貼り付けられる。',
    tags: ['テキスト', 'ゲーム開発', 'UI'],
    boothUrl: 'https://knkk.booth.pm/items/8457828',
    hasWebVersion: true,
    features: [
      'フォントサイズ・行間・文字間隔・最大横幅をスライダー調整',
      'リアルタイムプレビュー',
      '最大横幅の境界ライン表示',
      'CSS / JSON 形式でパラメータをコピー',
      'プレビュー背景テーマ切り替え',
    ],
    desktopFeatures: [
      'PC にインストール済みのフォント（TTF/OTF/WOFF）をそのまま適用',
      'ゲーム・アプリの背景画像を重ねてリアルタイム確認',
      '現在の表示を PNG スナップショットとして保存',
      '2つの設定を左右並列表示する A/B 比較モード',
      'Undo（Ctrl+Z）で1段階戻す',
    ],
  },
  {
    slug: 'text-deck',
    name: 'text-deck',
    tagline: 'スニペットランチャー',
    description:
      '定型文・コードスニペット・よく使うテキストをカード型で管理。タグ・カテゴリでフィルタリングし、ワンクリックでクリップボードにコピー。ブラウザに自動保存されるので、次回もそのまま使える。',
    tags: ['テキスト', '効率化', '開発者向け'],
    boothUrl: 'https://knkk.booth.pm/items/8457296',
    hasWebVersion: true,
    features: [
      'スニペットの追加・編集・削除',
      'タイトル・本文でキーワード検索',
      'タグでフィルタリング',
      'ワンクリックでクリップボードにコピー',
      'ブラウザに自動保存（localStorage）',
    ],
    desktopFeatures: [
      'グローバルホットキー（Ctrl+Shift+D）でどこからでも瞬時に起動',
      'システムトレイに常駐・常に最前面表示',
      'スニペットをファイルに保存（件数無制限）',
      'ドラッグ＆ドロップでスニペットの順序を変更',
    ],
  },
  {
    slug: 'ai-prompt-manager',
    name: 'AI Prompt Manager',
    tagline: 'AIプロンプト管理ツール',
    description:
      'AI 画像生成向けプロンプトをカテゴリ & タグで管理。日本語タイトル ↔ 英語タグ対応。前提・顔・服・背景などのカテゴリからタグをチェックするだけで英語プロンプトを自動組み立て。',
    tags: ['AI', '画像生成', 'クリエイター向け'],
    boothUrl: 'https://knkk.booth.pm/items/8448296',
    hasWebVersion: true,
    features: [
      '前提・顔・服・背景など4カテゴリで管理',
      '日本語タイトル ↔ 英語タグ対応',
      'チェックボックスでタグを選択',
      '選択したタグから英語プロンプトを自動生成',
      'カスタムタグの追加（ブラウザに保存）',
    ],
    desktopFeatures: [
      'タグデータをローカル DB（SQLite）に保存（容量無制限）',
    ],
  },
  {
    slug: 'webp-studio',
    name: 'WebP Studio',
    tagline: 'PNG/JPG → WebP/AVIF 一括変換',
    description:
      'PNG・JPG 画像を WebP または AVIF 形式に一括変換。品質スライダー・変換前後比較プレビュー・ファイルサイズ削減率表示付き。ドラッグ & ドロップで複数ファイルを一度に変換し、ZIP でまとめてダウンロード。',
    tags: ['画像', '変換', '最適化'],
    boothUrl: 'https://knkk.booth.pm/items/8447752',
    hasWebVersion: true,
    features: [
      'PNG / JPG → WebP / AVIF 変換',
      '品質スライダー（0〜100）',
      '変換前後の比較プレビュー',
      'ファイルサイズ削減率の表示',
      'ZIP まとめダウンロード',
    ],
    desktopFeatures: [
      'AVIF 形式での出力',
      'フォルダを監視して新規画像を自動変換',
      '変換と同時にリサイズ（カスタム解像度指定）',
      'EXIF メタデータを削除して軽量化',
      '変換設定をプリセットとして保存・呼び出し',
      'Windows の右クリックメニューに統合',
    ],
  },
  {
    slug: 'mockup-builder',
    name: 'MockupBuilder',
    tagline: 'アプリストア用スクショ生成ツール',
    description:
      'ゲーム・アプリのスクリーンショットをドロップするだけで、App Store / Google Play 対応のモックアップを自動生成。キャッチコピーを追加して PNG でダウンロード。',
    tags: ['画像', 'マーケティング', 'ゲーム開発'],
    boothUrl: 'https://knkk.booth.pm/items/8441710',
    hasWebVersion: true,
    features: [
      'スクリーンショットをドロップするだけで生成',
      'キャッチコピーの追加・フォントサイズ調整',
      'App Store / Google Play 向けの縦長比率',
      'PNG でダウンロード',
    ],
    desktopFeatures: [
      'Notch / パンチホールなど複数フレームタイプに対応',
      'iPhone 6.7 / 6.5 / 5.5インチ + Android など全サイズを一括 ZIP 生成',
    ],
  },
  {
    slug: 'sheet-studio',
    name: 'Sheet Studio',
    tagline: 'スプライトシートのパック & スライス',
    description:
      '複数の画像を1枚のスプライトシートに自動配置する Packer と、1枚の画像を複数のスプライトに分割する Slicer を搭載。ゲーム開発者・アニメーション制作者向けの画像管理ツール。',
    tags: ['画像', 'ゲーム開発', 'スプライト'],
    boothUrl: 'https://knkk.booth.pm/items/8507305',
    hasWebVersion: true,
    features: [
      '複数画像を1枚のスプライトシートに自動パック',
      'パディング・2のべき乗サイズ・透明トリムのオプション',
      'PNG + JSON（座標メタデータ）でダウンロード',
      '分割数 / セルサイズ指定でスプライトをスライス',
      'スライス結果を ZIP で一括ダウンロード',
    ],
    desktopFeatures: [
      'ドラッグで画像の並び順を変更',
      'アニメーションプレビュー（FPS 調整付き）',
      '手動モード：キャンバス上でドラッグして任意範囲を切り抜き',
      'Undo（Ctrl+Z）で50ステップ履歴',
      'クリップボードから直接画像をペースト（Ctrl+V）',
    ],
  },
  {
    slug: 'regex-studio',
    name: 'Regex Studio',
    tagline: '正規表現リアルタイムテスター',
    description:
      '正規表現パターンを入力するとマッチ箇所がリアルタイムでハイライト表示される開発者向けツール。フラグ切り替え・キャプチャグループ確認・置換プレビューに対応。ブラウザだけで完結するのでインストール不要。',
    tags: ['開発者向け', 'テキスト', '正規表現'],
    boothUrl: 'https://knkk.booth.pm/items/8517333',
    hasWebVersion: true,
    features: [
      'パターン入力と同時にリアルタイムマッチング',
      'マッチ箇所のハイライト表示',
      'フラグ切り替え（g / i / m / s）',
      '構文エラーの即時通知',
      'マッチ詳細パネル（文字列・位置・キャプチャグループ）',
      '置換モード（置換結果プレビュー）',
    ],
    desktopFeatures: [
      'パターン履歴（直近10件を自動保存）',
      'パターンをクリップボードにコピー',
    ],
  },
  {
    slug: 'resize-image',
    name: 'アイコン一括リサイズ',
    tagline: 'アイコン画像を各サイズに一括リサイズ',
    description:
      '画像ファイルをドロップすると iOS・Android・Windows・Web が要求するサイズ（16〜512px）に一括リサイズ。複数画像を一度に処理し、ZIP でまとめてダウンロード。',
    tags: ['画像', 'リサイズ', 'アイコン'],
    boothUrl: 'https://knkk.booth.pm/items/8433323',
    hasWebVersion: true,
    features: [
      '16 / 32 / 48 / 64 / 128 / 256 / 512px に一括リサイズ',
      '複数画像を同時処理',
      'ZIP まとめダウンロード',
      'PNG 形式で出力',
    ],
    desktopFeatures: [
      'ICO / ICNS 形式での出力（Windows・macOS アプリ配布に必要）',
      '背景色カスタマイズ（カラーピッカー・使用色履歴）',
      'iOS / Android フレーム形状でプレビュー確認',
      'フォルダ内の画像をまとめて一括処理',
    ],
  },
]

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug)
}
