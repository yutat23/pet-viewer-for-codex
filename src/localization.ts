import type { PetState } from "./pet/types.js";

export type AppLocale = "en" | "ja";

export interface UiStrings {
  locale: AppLocale;
  languageTag: string;
  appName: string;
  translateError(message: string): string;
  previewTitle: string;
  statusLoading: string;
  statusNoPet: string;
  statusShowPet(petName: string, state: string): string;
  stateLabels: Record<PetState, string>;
  quickPick: {
    petTitle: string;
    petPlaceholder: string;
    backgroundTitle: string;
    backgroundPlaceholder: string;
    speedTitle: string;
    speedPlaceholder: string;
    sizeTitle: string;
    sizePlaceholder: string;
  };
  size: {
    autoLabel: string;
    autoDescription: string;
    fixedDescription(value: number): string;
  };
  customBackground: {
    selectImageTitle: string;
    selectImageOpenLabel: string;
    opacityTitle: string;
    opacityPlaceholder: string;
    opacityDescription(value: number): string;
    invalid(error: string): string;
    loadFailed: string;
  };
  notifications: {
    noPets: string;
    noPet: string;
    missingAnimation(petName: string, state: string): string;
    appServerConnected: string;
    appServerConnectionFailed: string;
    hooksReceiverFailed: string;
    hooksRemoved: string;
    hooksInstallFailed(error: string): string;
    hooksRemoveFailed(error: string): string;
    reloadRequired: string;
    reload: string;
  };
  hooks: {
    enable: string;
    cancel: string;
    openConfiguration: string;
    confirmTitle: string;
    confirmMessage(hooksPath: string, scriptPath: string): string;
    installedMessage: string;
    helpMessage: string;
    notConfiguredTitle: string;
    notConfiguredBody: string;
    awaitingTrustTitle: string;
    awaitingTrustBody: string;
    activeTitle: string;
    activeBody: string;
    showHelp: string;
  };
  webview: {
    expected: string;
    loadFailed: string;
    statusPrefix: string;
    animationAria(petName: string, state: string): string;
    canvasUnavailable: string;
    spriteLoadFailed: string;
    noPets: string;
    directoryMissing: string;
    disabled: string;
    enableSetting: string;
  };
  backgroundDescriptions: Record<string, readonly [string, string]>;
  speedDescriptions: Record<string, string>;
}

const english: UiStrings = {
  locale: "en",
  languageTag: "en",
  appName: "Pet Viewer for Codex",
  translateError: (message) => message,
  previewTitle: "Pet Viewer for Codex Preview",
  statusLoading: "Pet Viewer for Codex is loading",
  statusNoPet: "No Codex Pet is currently available",
  statusShowPet: (petName, state) => `Show ${petName} in the PET view (${state})`,
  stateLabels: {
    idle: "Idle",
    running: "Running",
    waiting: "Waiting",
    review: "Review",
    failed: "Failed"
  },
  quickPick: {
    petTitle: "Select a Codex Pet",
    petPlaceholder: "Choose the Pet shown in the panel",
    backgroundTitle: "Change Pet Background",
    backgroundPlaceholder: "Choose a background for the PET view",
    speedTitle: "Change Pet Animation Speed",
    speedPlaceholder: "Choose an animation speed",
    sizeTitle: "Change Pet Size",
    sizePlaceholder: "Choose automatic sizing or a fixed scale"
  },
  size: {
    autoLabel: "Auto",
    autoDescription: "Fit the Pet to the available display area",
    fixedDescription: (value) => `Display at ${Math.round(value * 100)}% unless the panel is smaller`
  },
  customBackground: {
    selectImageTitle: "Select a Custom Pet Background",
    selectImageOpenLabel: "Use as Pet Background",
    opacityTitle: "Change Custom Background Opacity",
    opacityPlaceholder: "Choose the custom image opacity",
    opacityDescription: (value) => `${Math.round(value * 100)}% opaque`,
    invalid: (error) => `The custom background could not be used: ${error}`,
    loadFailed: "The custom background image could not be loaded."
  },
  notifications: {
    noPets: "No Codex Pets were found.",
    noPet: "No Codex Pet is available.",
    missingAnimation: (petName, state) => `${petName} does not define a ${state} animation.`,
    appServerConnected: "Pet Viewer for Codex: App Server connected",
    appServerConnectionFailed: "Pet Viewer for Codex could not connect to the managed App Server. See its output channel.",
    hooksReceiverFailed: "Pet Viewer for Codex could not start the Hooks receiver. See its output channel.",
    hooksRemoved: "Pet Viewer for Codex Hooks removed.",
    hooksInstallFailed: (error) => `Pet Viewer for Codex Hooks installation failed: ${error}`,
    hooksRemoveFailed: (error) => `Pet Viewer for Codex Hooks removal failed: ${error}`,
    reloadRequired: "Reload the VS Code window to apply the new Codex Pet directory.",
    reload: "Reload"
  },
  hooks: {
    enable: "Enable integration",
    cancel: "Cancel",
    openConfiguration: "Open hooks.json",
    confirmTitle: "Enable Codex Hooks integration?",
    confirmMessage: (hooksPath, scriptPath) =>
      `Pet Viewer for Codex will update:\n\n• ${hooksPath}\n• ${scriptPath}\n\nIt will preserve existing hooks, add lifecycle commands for this extension, install the receiver script, and switch the global integration mode to Hooks.\n\nCodex will not run the new commands until you separately open /hooks in Codex, review the exact command, and trust it. Pet Viewer cannot perform or bypass that trust step.`,
    installedMessage: "Hooks were configured. In Codex, open /hooks, review the Pet Viewer command, and trust it. This view will remain in a waiting state until an event is received.",
    helpMessage: "In Codex, open /hooks. Review the Pet Viewer command that runs codex-pet/bin/hook.cjs, then choose Trust. Changed hook definitions must be trusted again.",
    notConfiguredTitle: "Codex activity is not connected",
    notConfiguredBody: "Enable Hooks integration to let this Pet react to Codex activity.",
    awaitingTrustTitle: "Waiting for Hooks trust or the first event",
    awaitingTrustBody: "Open /hooks in Codex, review the Pet Viewer command, and trust it. This notice clears after the first event is received; trust is never granted automatically.",
    activeTitle: "Connected to Codex Hooks",
    activeBody: "Pet Viewer is receiving Codex lifecycle events.",
    showHelp: "How to trust the hook"
  },
  webview: {
    expected: "Expected:",
    loadFailed: "Codex Pet could not be loaded.",
    statusPrefix: "Status:",
    animationAria: (petName, state) => `${petName}, ${state} animation`,
    canvasUnavailable: "Canvas rendering is not available.",
    spriteLoadFailed: "The sprite image could not be loaded from the Pet directory.",
    noPets: "No Codex Pets were found.",
    directoryMissing: "Codex Pet directory was not found.",
    disabled: "Codex Pet is disabled.",
    enableSetting: "Enable codexPet.enabled in Settings."
  },
  backgroundDescriptions: {
    none: ["None", "Use the VS Code theme background"],
    custom: ["Custom Image", "Use one local PNG, WebP, or GIF image"],
    arcade: ["Arcade", "Colorful cabinets and glowing game screens"],
    "autumn-forest": ["Autumn Forest", "A golden path beneath colorful leaves"],
    "blue-sky": ["Blue Sky", "A dreamy platform above the clouds"],
    office: ["Cozy Office", "Warm desk, books, and morning light"],
    "pro-office": ["Engineering Office", "A fully equipped modern software studio"],
    grassland: ["Grassland", "Sunny meadow and distant hills"],
    "japanese-festival": ["Japanese Festival", "Lanterns, food stalls, and distant fireworks"],
    "japanese-room": ["Japanese Room", "Tatami, shoji screens, and a garden view"],
    "living-room": ["Living Room", "Soft rug and a comfortable window seat"],
    "night-camp": ["Night Camp", "Stars, mountains, and a warm campfire"],
    "night-city": ["Night City", "A neon skyline above a rain-wet rooftop"],
    space: ["Outer Space", "A ringed planet beyond a space platform"],
    "rainy-cafe": ["Rainy Café", "Warm coffee beside a rain-streaked window"],
    treehouse: ["Secret Treehouse", "A warm hideaway high in the forest canopy"],
    "server-room": ["Server Room", "Cool server racks and blinking status lights"],
    "snowy-cabin": ["Snowy Cabin", "A warm cabin surrounded by falling snow"],
    sunset: ["Sunset Overlook", "Golden light over mountains and a lake"],
    terminal: ["Terminal", "Commands typed live in a programmer's terminal"],
    "tropical-beach": ["Tropical Beach", "Palm trees, white sand, and rolling waves"],
    underwater: ["Underwater", "A bright coral garden beneath the sea"]
  },
  speedDescriptions: {
    "0.25": "Very slow",
    "0.5": "Slow",
    "0.75": "Relaxed",
    "1": "Normal",
    "1.25": "Fast",
    "1.5": "Faster",
    "2": "Very fast",
    "3": "Maximum"
  }
};

const japanese: UiStrings = {
  ...english,
  locale: "ja",
  languageTag: "ja",
  appName: "Codex ペットビューアー",
  translateError: (message) => translateJapaneseError(message),
  previewTitle: "Codex ペットビューアー プレビュー",
  statusLoading: "Codex ペットビューアーを読み込んでいます",
  statusNoPet: "利用できる Codex ペットがありません",
  statusShowPet: (petName, state) => `PET ビューに ${petName} を表示（${state}）`,
  stateLabels: {
    idle: "待機",
    running: "実行中",
    waiting: "許可待ち",
    review: "確認中",
    failed: "失敗"
  },
  quickPick: {
    petTitle: "Codex ペットを選択",
    petPlaceholder: "パネルに表示するペットを選んでください",
    backgroundTitle: "ペットの背景を変更",
    backgroundPlaceholder: "PET ビューの背景を選んでください",
    speedTitle: "ペットのアニメーション速度を変更",
    speedPlaceholder: "アニメーション速度を選んでください",
    sizeTitle: "ペットのサイズを変更",
    sizePlaceholder: "自動調整または固定倍率を選んでください"
  },
  size: {
    autoLabel: "自動",
    autoDescription: "利用可能な表示領域にペットを合わせます",
    fixedDescription: (value) => `パネルが小さい場合を除き ${Math.round(value * 100)}% で表示します`
  },
  customBackground: {
    selectImageTitle: "カスタムペット背景を選択",
    selectImageOpenLabel: "ペットの背景に使用",
    opacityTitle: "カスタム背景の透明度を変更",
    opacityPlaceholder: "カスタム画像の不透明度を選んでください",
    opacityDescription: (value) => `不透明度 ${Math.round(value * 100)}%`,
    invalid: (error) => `カスタム背景を使用できません: ${error}`,
    loadFailed: "カスタム背景画像を読み込めませんでした。"
  },
  notifications: {
    noPets: "Codex ペットが見つかりませんでした。",
    noPet: "利用できる Codex ペットがありません。",
    missingAnimation: (petName, state) => `${petName} には「${state}」アニメーションが定義されていません。`,
    appServerConnected: "Codex ペットビューアー: App Server に接続しました",
    appServerConnectionFailed: "管理対象 App Server に接続できませんでした。出力チャンネルを確認してください。",
    hooksReceiverFailed: "Hooks 受信機を開始できませんでした。出力チャンネルを確認してください。",
    hooksRemoved: "Codex Hooks 連携を削除しました。",
    hooksInstallFailed: (error) => `Codex Hooks 連携のインストールに失敗しました: ${error}`,
    hooksRemoveFailed: (error) => `Codex Hooks 連携の削除に失敗しました: ${error}`,
    reloadRequired: "新しい Codex ペットディレクトリを反映するには VS Code ウィンドウを再読み込みしてください。",
    reload: "再読み込み"
  },
  hooks: {
    enable: "連携を有効にする",
    cancel: "キャンセル",
    openConfiguration: "hooks.json を開く",
    confirmTitle: "Codex Hooks 連携を有効にしますか？",
    confirmMessage: (hooksPath, scriptPath) =>
      `Codex ペットビューアーは次の場所を変更します:\n\n• ${hooksPath}\n• ${scriptPath}\n\n既存のフックを保持したまま、この拡張用のライフサイクルコマンドと受信スクリプトを追加し、グローバルの連携モードを Hooks に切り替えます。\n\n追加したコマンドを実行するには、Codex で別途 /hooks を開き、正確なコマンド内容を確認して信頼する必要があります。ペットビューアーがこの信頼操作を自動化・回避することはありません。`,
    installedMessage: "Hooks の設定を追加しました。Codex で /hooks を開き、ペットビューアーのコマンドを確認して信頼してください。イベントを受信するまで、このビューは待機状態を表示します。",
    helpMessage: "Codex で /hooks を開き、codex-pet/bin/hook.cjs を実行するペットビューアーのコマンドを確認して「信頼」を選んでください。フック定義が変更された場合は再度信頼が必要です。",
    notConfiguredTitle: "Codex の動作と連携していません",
    notConfiguredBody: "Hooks 連携を有効にすると、このペットが Codex の動作に反応します。",
    awaitingTrustTitle: "Hooks の信頼または最初のイベントを待っています",
    awaitingTrustBody: "Codex で /hooks を開き、ペットビューアーのコマンドを確認して信頼してください。この案内は最初のイベント受信後に消えます。信頼操作が自動で行われることはありません。",
    activeTitle: "Codex Hooks と連携中",
    activeBody: "Codex のライフサイクルイベントを受信しています。",
    showHelp: "フックを信頼する方法"
  },
  webview: {
    expected: "想定される場所:",
    loadFailed: "Codex ペットを読み込めませんでした。",
    statusPrefix: "状態:",
    animationAria: (petName, state) => `${petName}、${state}のアニメーション`,
    canvasUnavailable: "Canvas を利用できません。",
    spriteLoadFailed: "ペットディレクトリからスプライト画像を読み込めませんでした。",
    noPets: "Codex ペットが見つかりませんでした。",
    directoryMissing: "Codex ペットディレクトリが見つかりませんでした。",
    disabled: "Codex ペットは無効です。",
    enableSetting: "設定で codexPet.enabled を有効にしてください。"
  },
  backgroundDescriptions: {
    none: ["なし", "VS Code テーマの背景を使用します"],
    custom: ["カスタム画像", "ローカルの PNG、WebP、GIF 画像を1枚使用します"],
    arcade: ["ゲームセンター", "色鮮やかな筐体と光るゲーム画面"],
    "autumn-forest": ["秋の森", "色づく木々の下に続く黄金色の小道"],
    "blue-sky": ["青空", "雲の上に浮かぶ夢のような足場"],
    office: ["居心地のよいオフィス", "机と本、朝の光に包まれた空間"],
    "pro-office": ["開発オフィス", "設備の整ったモダンなソフトウェア開発室"],
    grassland: ["草原", "明るい草原と遠くの丘"],
    "japanese-festival": ["日本の祭り", "提灯、屋台、遠くの花火"],
    "japanese-room": ["和室", "畳と障子、庭の眺め"],
    "living-room": ["リビングルーム", "柔らかなラグと快適な窓辺"],
    "night-camp": ["夜のキャンプ", "星空、山、暖かな焚き火"],
    "night-city": ["夜の街", "雨に濡れた屋上の向こうのネオン街"],
    space: ["宇宙", "宇宙の足場の向こうに見える環のある惑星"],
    "rainy-cafe": ["雨のカフェ", "雨模様の窓辺と温かなコーヒー"],
    treehouse: ["秘密のツリーハウス", "森の高い場所にある暖かな隠れ家"],
    "server-room": ["サーバールーム", "ランプが点滅する涼しいサーバールーム"],
    "snowy-cabin": ["雪の山小屋", "降る雪に囲まれた暖かな山小屋"],
    sunset: ["夕日の展望台", "山と湖を照らす黄金色の夕日"],
    terminal: ["ターミナル", "コマンドが次々と入力される端末"],
    "tropical-beach": ["南国のビーチ", "ヤシの木、白い砂浜、寄せる波"],
    underwater: ["海中", "海中に広がる明るいサンゴ礁"]
  },
  speedDescriptions: {
    "0.25": "とても遅い",
    "0.5": "遅い",
    "0.75": "ゆっくり",
    "1": "標準",
    "1.25": "速い",
    "1.5": "より速い",
    "2": "とても速い",
    "3": "最高速"
  }
};

export function selectLocale(language: string): AppLocale {
  return language.toLowerCase().startsWith("en") ? "en" : "ja";
}

export function getStrings(language: string): UiStrings {
  return selectLocale(language) === "en" ? english : japanese;
}

function translateJapaneseError(message: string): string {
  const exact: Record<string, string> = {
    "Existing hooks.json must contain a JSON object.": "既存の hooks.json は JSON オブジェクトである必要があります。",
    "pet.json was not found.": "pet.json が見つかりません。",
    "Configured frame dimensions do not match the sprite image dimensions.": "設定したフレーム寸法がスプライト画像の寸法と一致しません。",
    "spritesheetPath must stay inside the Pet directory.": "spritesheetPath はペットディレクトリ内を指す必要があります。",
    "Sprite image must be a PNG, WebP, or GIF file.": "スプライト画像は PNG、WebP、GIF のいずれかである必要があります。",
    "No supported sprite image was found.": "対応するスプライト画像が見つかりません。",
    "Sprite image must stay inside the Pet directory, including through symbolic links.": "シンボリックリンクを含め、スプライト画像はペットディレクトリ内に置く必要があります。",
    "Idle animation points outside the sprite layout.": "待機アニメーションがスプライトレイアウトの範囲外を指しています。",
    "Unable to infer sprite columns; add columns or frameWidth to pet.json.": "スプライトの列数を判定できません。pet.json に columns または frameWidth を追加してください。",
    "Unable to infer sprite rows; add rows or frameHeight to pet.json.": "スプライトの行数を判定できません。pet.json に rows または frameHeight を追加してください。",
    "Unsupported or malformed sprite image. Expected PNG, WebP, or GIF.": "未対応または不正なスプライト画像です。PNG、WebP、GIF を使用してください。",
    "Custom background must be a PNG, WebP, or GIF file.": "カスタム背景は PNG、WebP、GIF のいずれかである必要があります。",
    "Custom background must be a file.": "カスタム背景にはファイルを指定してください。",
    "Custom background must be between 1 byte and 20 MB.": "カスタム背景は1バイト以上20 MB以下である必要があります。",
    "Custom background image is invalid or malformed.": "カスタム背景画像が不正または破損しています。"
  };
  if (exact[message]) return exact[message];
  if (message.startsWith("Existing hooks.json is not valid JSON:")) {
    return `既存の hooks.json が正しい JSON ではありません:${message.slice(message.indexOf(":") + 1)}`;
  }
  if (message.startsWith("pet.json could not be read:")) {
    return `pet.json を読み込めませんでした:${message.slice(message.indexOf(":") + 1)}`;
  }
  if (/^Invalid \w+ image dimensions\.$/.test(message)) {
    return `画像の寸法が不正です（${message.slice(8, message.indexOf(" image"))}）。`;
  }
  return message;
}
