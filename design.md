# VS Code用 Codex Pet 拡張機能の検討・実装依頼

## 目的

CodexデスクトップアプリやCodex CLIで表示される「Pet」を、Visual Studio Code上でも表示できる拡張機能を作りたい。

現状、CodexのVS Code拡張ではPetが表示されない。

CodexのPetデータは、ローカルの以下のようなディレクトリに保存されている。

```text
~/.codex/pets/
```

`CODEX_HOME`環境変数が設定されている場合は、以下を優先する。

```text
${CODEX_HOME}/pets/
```

このPetデータを読み込み、VS CodeのWebview上でスプライトアニメーションとして表示したい。

---

## 想定する全体構成

```text
VS Code Extension
├─ PetLoader
│  ├─ CODEX_HOMEの解決
│  ├─ petsディレクトリの列挙
│  ├─ Pet設定ファイルの読み込み
│  └─ スプライトシートの読み込み
│
├─ PetStateProvider
│  ├─ idle
│  ├─ running
│  ├─ waiting
│  ├─ review
│  └─ failed
│
├─ WebviewViewProvider
│  ├─ Petの表示
│  ├─ CSSスプライトアニメーション
│  └─ Pet選択UI
│
└─ CodexIntegration
   ├─ Codex App Server連携
   ├─ Codex Hooks連携
   └─ VS Code内の状態から推定するフォールバック
```

---

## まず実装したいMVP

最初の段階では、Codexの実行状態との連携は後回しにしてよい。

以下を実装する。

1. VS Codeのサイドバーに専用ビューを追加する
2. `.codex/pets`配下のPetを列挙する
3. Petを選択できるようにする
4. スプライトシートをWebview上に表示する
5. `idle`アニメーションを再生する
6. コマンドで状態を手動変更できるようにする
7. 選択中のPetをVS Codeの`globalState`に保存する
8. ファイル変更を監視し、Petの追加・更新を反映する

状態変更用のVS Codeコマンド例：

```text
codexPet.setIdle
codexPet.setRunning
codexPet.setWaiting
codexPet.setReview
codexPet.setFailed
codexPet.selectPet
codexPet.refreshPets
```

---

## Petディレクトリの解決

次の順序でCodexホームディレクトリを解決する。

```ts
import * as os from "node:os";
import * as path from "node:path";

export function getCodexHome(): string {
  return process.env.CODEX_HOME?.trim()
    ? process.env.CODEX_HOME
    : path.join(os.homedir(), ".codex");
}

export function getPetsDirectory(): string {
  return path.join(getCodexHome(), "pets");
}
```

環境変数が未設定の場合：

```text
Windows:
C:\Users\<user>\.codex\pets

macOS/Linux:
/home/<user>/.codex/pets
```

macOSでは通常、次の形式になる。

```text
/Users/<user>/.codex/pets
```

---

## Petデータの探索

Petディレクトリ直下の各サブディレクトリをPetとして扱う。

想定例：

```text
~/.codex/pets/
├─ cat/
│  ├─ pet.json
│  └─ spritesheet.webp
│
├─ robot/
│  ├─ pet.json
│  └─ spritesheet.webp
│
└─ custom-pet/
   ├─ pet.json
   └─ spritesheet.webp
```

ただし、実際のファイル名や設定構造が異なる可能性がある。

そのため、以下を実装前に調査すること。

* 実際のPetディレクトリ構造
* 設定ファイル名
* スプライト画像のファイル名
* スプライトシートの列数と行数
* 各行または各フレームが表す状態
* フレームレート情報が設定ファイルに含まれるか
* 複数画像に分かれているPetが存在するか
* 標準PetとカスタムPetで構造が異なるか

固定値を直接埋め込まず、設定ファイルから取得できる情報は設定ファイルを優先する。

---

## Petモデル

内部では、Petを以下のような型で扱いたい。

```ts
export type PetState =
  | "idle"
  | "running"
  | "waiting"
  | "review"
  | "failed";

export interface SpriteAnimation {
  row: number;
  startColumn: number;
  frameCount: number;
  frameDurationMs: number;
  loop: boolean;
}

export interface CodexPet {
  id: string;
  name: string;
  directoryPath: string;
  spriteSheetPath: string;

  columns: number;
  rows: number;

  frameWidth?: number;
  frameHeight?: number;

  animations: Partial<Record<PetState, SpriteAnimation>>;
}
```

設定ファイルに十分な情報がない場合は、既知のデフォルト値を使う。

ただし、デフォルト値を使用したことが分かるようにログを出す。

---

## スプライト表示方式

画像をフレームごとに切り出して別ファイルとして保存する必要はない。

Webview上で、CSSの以下を使用して表示する。

```css
.pet {
  background-repeat: no-repeat;
  image-rendering: pixelated;
}
```

スプライトシートを背景画像に設定し、`background-position`を一定間隔で変更する。

概念例：

```ts
function getBackgroundPosition(
  column: number,
  row: number,
  columns: number,
  rows: number
): string {
  const x = columns <= 1
    ? 0
    : (column / (columns - 1)) * 100;

  const y = rows <= 1
    ? 0
    : (row / (rows - 1)) * 100;

  return `${x}% ${y}%`;
}
```

Webview側では、状態ごとにアニメーション情報を受け取る。

```ts
interface SetPetStateMessage {
  type: "setPetState";
  state: PetState;
  animation: SpriteAnimation;
}
```

アニメーション例：

```ts
let currentFrame = 0;
let timer: number | undefined;

function playAnimation(animation: SpriteAnimation): void {
  if (timer !== undefined) {
    window.clearInterval(timer);
  }

  currentFrame = 0;
  renderFrame(animation);

  timer = window.setInterval(() => {
    currentFrame += 1;

    if (currentFrame >= animation.frameCount) {
      if (animation.loop) {
        currentFrame = 0;
      } else {
        window.clearInterval(timer);
        timer = undefined;
        return;
      }
    }

    renderFrame(animation);
  }, animation.frameDurationMs);
}
```

---

## Webviewでローカル画像を表示する方法

Webviewからローカルファイルを直接`file://`で参照しない。

VS Codeの`Webview.asWebviewUri()`を使用する。

また、`localResourceRoots`をPetディレクトリに設定する。

概念例：

```ts
const petsDirectoryUri = vscode.Uri.file(getPetsDirectory());

const viewOptions = {
  webviewOptions: {
    retainContextWhenHidden: true
  }
};
```

Webview生成時：

```ts
webview.options = {
  enableScripts: true,
  localResourceRoots: [
    extensionUri,
    petsDirectoryUri
  ]
};

const spriteUri = webview.asWebviewUri(
  vscode.Uri.file(pet.spriteSheetPath)
);
```

Content Security Policyも設定する。

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
    default-src 'none';
    img-src {{webviewSource}} https: data:;
    style-src {{webviewSource}} 'unsafe-inline';
    script-src 'nonce-{{nonce}}';
  "
/>
```

可能な限り`unsafe-inline`を避け、安全なCSPを構成する。

---

## UI案

VS CodeのActivity Barに以下のビューを追加する。

```text
Codex Pet
```

ビュー内の構成：

```text
┌──────────────────────┐
│ Pet: Cat          ▼  │
│                      │
│        [PET]         │
│                      │
│ Status: Running      │
│                      │
│ [Change Pet]         │
│ [Refresh]            │
└──────────────────────┘
```

Pet選択は以下のどちらでもよい。

* Webview内のセレクトボックス
* `vscode.window.showQuickPick()`

MVPでは`showQuickPick()`を優先してよい。

---

## ファイル監視

Petディレクトリを監視し、以下の変更を検知したい。

* Petディレクトリの追加
* Petディレクトリの削除
* 設定ファイルの変更
* スプライトシートの変更

VS Codeの`FileSystemWatcher`を使用する。

```ts
const watcher = vscode.workspace.createFileSystemWatcher(
  new vscode.RelativePattern(
    vscode.Uri.file(getPetsDirectory()),
    "**/*"
  )
);
```

変更時にはPet一覧を再読み込みし、Webviewへ通知する。

短時間に複数回イベントが発生する可能性があるため、デバウンス処理を入れる。

---

## エラー処理

以下を考慮する。

### Petディレクトリが存在しない

Webview上に次のようなメッセージを表示する。

```text
Codex Pet directory was not found.

Expected:
<resolved CODEX_HOME>/pets
```

VS Codeコマンドとして、Petディレクトリを開く機能も用意する。

```text
codexPet.openPetsDirectory
```

### 設定ファイルが壊れている

* 該当Petだけ読み込み対象外にする
* Output Channelへエラーを出す
* 他のPetは正常に表示する

### スプライト画像が存在しない

* 該当Petを読み込み対象外にする
* またはプレースホルダーを表示する

### 対応していない形式

最初は以下を対象にする。

```text
.png
.webp
.gif
```

ただしGIFはスプライト制御が不要な可能性があるため、別扱いでもよい。

---

## ログ

専用のOutput Channelを作る。

```ts
const outputChannel =
  vscode.window.createOutputChannel("Codex Pet");
```

以下をログに出す。

* 解決された`CODEX_HOME`
* Petディレクトリ
* 発見したPet数
* 読み込めなかったPet
* 使用したスプライト設定
* ファイル変更
* 状態変更

ユーザーのホームディレクトリ全体や、不要な個人情報はログに出さない。

---

## Codex App Serverについて

Codex App Serverは、CodexのGUIとは独立したローカルバックエンドとして扱える。

Codexデスクトップアプリを起動しなくても、自作クライアントからCodexのスレッドやターンを操作できる。

ただし、以下に注意する。

* `codex app-server`プロセス自体は起動する必要がある
* App ServerはPet画像を配信するためのAPIではない
* Pet画像は`.codex/pets`から直接読み込む
* App ServerはCodexの実行状態を取得するために利用する
* 自作拡張が起動したApp Serverのイベントは取得できる
* 公式Codex VS Code拡張が内部で起動しているApp Serverを、別の拡張から直接監視できるとは限らない
* 公式拡張の内部実装やストレージを直接読む設計は避ける

想定する対応付け：

```text
Codex event             Pet state
----------------------------------
turn started            running
approval requested      waiting
turn completed          review
turn failed             failed
no active turn          idle
```

App Server連携はMVP完成後に実装する。

---

## Codex Hooks連携の検討

公式Codex拡張の状態を直接取得できない場合、Codex Hooksから状態を受け取る方式を検討する。

概念構成：

```text
Codex
  ↓ Hook event
Hook script
  ↓ JSON
localhost / named pipe / temporary file
  ↓
VS Code Codex Pet extension
```

候補イベント：

```text
SessionStart
UserPromptSubmit
PermissionRequest
PostToolUse
Stop
```

ただし、以下を調査・検証してから実装する。

* HooksがCodex IDE拡張でも実行されるか
* Hook設定がCLIとIDEで共通か
* Hookが受け取れるイベント内容
* セッション開始・終了を正確に判定できるか
* localhost通信が必要か
* 一時ファイルで十分か
* 複数VS Codeウィンドウをどう識別するか

初期実装ではHooks連携を必須にしない。

---

## フォールバック状態検知

Codexとの直接連携ができない場合でも、以下を使ってPetを動かせるようにする。

* ターミナルで`codex`プロセスが起動したとき
* タスク実行中
* テスト実行中
* Git操作中
* ファイル保存時
* エディター操作時

ただし、Codexの状態と誤認させない。

例えば表示を分ける。

```text
Codex status: Running
```

と

```text
Workspace activity: Running
```

は別物として扱う。

---

## 公式拡張との依存関係

この拡張は、公式Codex拡張の内部コード、非公開コマンド、内部ストレージ、Webview DOMに依存しない設計にする。

以下は禁止または非推奨とする。

* 公式Codex拡張のインストールディレクトリを直接解析する
* 公式拡張の内部JavaScriptをMonkey Patchする
* 非公開コマンドIDに強く依存する
* 公式拡張のWebviewをDOM操作する
* 公式拡張の内部データベースを直接更新する
* 標準入出力を横取りする
* 起動済みApp Serverへ無理やり接続する

公開APIが追加された場合のみ、正式な連携機能を追加する。

---

## セキュリティ

以下を守る。

* Petディレクトリ外の任意ファイルをWebviewへ公開しない
* `localResourceRoots`を限定する
* Webviewメッセージを検証する
* Pet設定ファイルの値を無条件にHTMLへ挿入しない
* パストラバーサルを防止する
* 外部コマンドを実行するときは引数を検証する
* App Serverのポートを外部ネットワークへ公開しない
* localhostサーバーを使う場合は認証トークンを利用する
* Hookから受信したJSONを信頼しすぎない
* Pet名をHTMLエスケープする

Pet設定内にスクリプトやHTMLが含まれていても実行しない。

---

## ライセンスと配布

公式Codex Petの画像を拡張機能へコピーして同梱しない。

拡張機能は、ユーザーのローカル環境に存在するPetデータを読み込む。

Marketplace公開時には以下をREADMEへ記載する。

```text
This is an unofficial third-party extension.
It is not affiliated with or endorsed by OpenAI.
```

また、OpenAIやCodexの公式ロゴを拡張機能の独自ロゴとして使わない。

拡張名候補：

```text
Codex Pet Viewer
Codex Activity Pet
Agent Pet for VS Code
Coding Companion for Codex
```

---

## 実装フェーズ

### Phase 1

* VS Code拡張の雛形作成
* Activity Barへのビュー追加
* Webview表示
* Petディレクトリ解決
* Pet一覧の読み込み
* Pet選択
* スプライト表示
* idleアニメーション

### Phase 2

* 手動状態変更コマンド
* 状態別アニメーション
* 選択状態の保存
* ファイル監視
* エラー表示
* Output Channel

### Phase 3

* Pet設定形式の自動判定
* 複数スプライト形式対応
* サイズ変更
* アニメーション速度変更
* Petプレビュー
* 設定画面

### Phase 4

* Codex App Server連携
* ターン開始・完了の取得
* 承認待ち状態
* エラー状態
* App Serverプロセス管理

### Phase 5

* Codex Hooks連携
* 公式Codex拡張利用時の状態反映
* 複数ワークスペース対応
* 複数Codexセッション対応

---

## 設定項目案

`package.json`の`contributes.configuration`に以下を追加する。

```json
{
  "codexPet.enabled": true,
  "codexPet.petDirectory": "",
  "codexPet.selectedPet": "",
  "codexPet.scale": 1,
  "codexPet.animationSpeed": 1,
  "codexPet.pauseWhenHidden": true,
  "codexPet.watchPetDirectory": true,
  "codexPet.integrationMode": "manual"
}
```

`integrationMode`候補：

```text
manual
appServer
hooks
workspaceActivity
```

初期値は`manual`とする。

---

## 推奨技術

```text
Language: TypeScript
Runtime: Node.js
UI: VS Code Webview View
Bundler: esbuild
Testing: Vitest または Node.js test runner
Lint: ESLint
Formatting: Prettier
```

Webview側とExtension Host側の型を共有できる構成にする。

例：

```text
src/
├─ extension.ts
├─ commands/
├─ pet/
│  ├─ PetLoader.ts
│  ├─ PetRepository.ts
│  ├─ PetStateMachine.ts
│  └─ types.ts
├─ codex/
│  ├─ CodexAppServerClient.ts
│  ├─ CodexHookReceiver.ts
│  └─ types.ts
├─ webview/
│  ├─ PetViewProvider.ts
│  ├─ messages.ts
│  └─ getWebviewHtml.ts
└─ utils/
```

Webview用コード：

```text
webview-src/
├─ main.ts
├─ petRenderer.ts
├─ state.ts
└─ styles.css
```

---

## テスト対象

最低限、以下をテストする。

### PetLoader

* `CODEX_HOME`あり
* `CODEX_HOME`なし
* petsディレクトリなし
* Petが0件
* 正常なPet
* 設定ファイル破損
* 画像なし
* 不正なパス
* Unicodeを含むPet名

### Sprite計算

* 1列
* 1行
* 複数列
* 複数行
* 最初のフレーム
* 最後のフレーム
* 不正な列番号
* 不正な行番号

### PetStateMachine

* idleからrunning
* runningからwaiting
* waitingからrunning
* runningからreview
* runningからfailed
* 非ループアニメーション終了後のidle遷移

### Webviewメッセージ

* 正常なメッセージ
* 不明なtype
* 不正なstate
* 不正なPet ID
* Webview破棄後の送信

---

## 最初に行ってほしいこと

1. 現在のリポジトリ構造を確認する
2. 既存のVS Code拡張コードがある場合は、その設計を尊重する
3. ローカル環境の`.codex/pets`構造を調査する
4. Pet設定ファイルとスプライト画像の実際の形式を確認する
5. 調査結果を簡潔に報告する
6. MVPの実装計画を作る
7. Phase 1から実装する
8. ビルドとテストを実行する
9. READMEへ実行方法を書く

不明点があっても、まずローカルファイルと既存コードを調査し、合理的な仮定を置いて実装を進める。

Petのフォーマットを推測だけで固定しないこと。

---

## MVPの完了条件

以下が満たされれば、最初のMVPは完了とする。

* VS CodeのActivity BarにCodex Petビューが表示される
* `.codex/pets`配下のPetを検出できる
* Petを選択できる
* 選択したPetのスプライトが表示される
* idleアニメーションが再生される
* コマンドで状態を変更できる
* VS Code再起動後も選択したPetが維持される
* Petファイル更新後に再読み込みできる
* Petが存在しない場合に適切な案内が表示される
* 公式Codex拡張の非公開内部実装に依存していない
