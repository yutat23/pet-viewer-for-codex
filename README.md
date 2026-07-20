# Codex Pet Viewer for VS Code

ローカルにインストールされた Codex Pet を、Visual Studio Code のTerminal右ペインに表示する非公式拡張です。

> This is an unofficial third-party extension. It is not affiliated with or endorsed by OpenAI.

## Phase 5 でできること

- Terminalと同じPanel内の右ペインに「Codex Pet」ビューを開く
- `CODEX_HOME/pets`（未設定時は `~/.codex/pets`）直下の Pet を検出する
- 表示領域の右クリックメニューまたは `Codex Pet: Change Pet` コマンドで Pet を選ぶ
- PNG / WebP / GIF のスプライトシートを Webview に安全に表示する
- `idle`、`running`、`waiting`、`review`、`failed` のアニメーションをコマンドで切り替える
- 選択中の Pet をVS Codeの`globalState`へ保存する
- Petディレクトリを監視し、追加・削除・manifest／画像更新を自動反映する
- ビューのRefresh／Petsディレクトリを開く操作
- Status Barへの選択Petと現在状態の表示
- 「Codex Pet」Output Channelへの検出、エラー、ファイル変更、状態変更ログ
- Pet表示倍率・アニメーション速度・非表示時停止の設定
- Editor Groupで開くPetプレビュー
- Codex App Serverの起動・停止・再起動
- App Serverのturn開始、承認待ち、完了、失敗イベントをPet状態へ反映
- Codex Hooksを通じて公式Codex拡張を含むCodexセッションの状態を反映
- マルチルートワークスペースと複数Codexセッションの状態を集約

### 状態変更コマンド

- `Codex Pet: Set State: Idle`
- `Codex Pet: Set State: Running`
- `Codex Pet: Set State: Waiting`
- `Codex Pet: Set State: Review`
- `Codex Pet: Set State: Failed`
- `Codex Pet: Refresh Pets`
- `Codex Pet: Open Pets Directory`
- `Codex Pet: Open Pet Preview`
- `Codex Pet: Start Managed App Server`
- `Codex Pet: Stop Managed App Server`
- `Codex Pet: Restart Managed App Server`
- `Codex Pet: Install Codex Hooks Integration`
- `Codex Pet: Uninstall Codex Hooks Integration`
- `Codex Pet: Open Codex Hooks Configuration`

### 設定

| 設定 | 既定値 | 内容 |
| --- | --- | --- |
| `codexPet.enabled` | `true` | Pet表示の有効化 |
| `codexPet.petDirectory` | 空 | `CODEX_HOME/pets`を上書き |
| `codexPet.scale` | `0.75` | Pet表示倍率（0.25–3） |
| `codexPet.animationSpeed` | `1` | 再生速度倍率（0.25–3） |
| `codexPet.pauseWhenHidden` | `true` | 非表示時にアニメーションを停止 |
| `codexPet.watchPetDirectory` | `true` | Petファイル変更を監視 |
| `codexPet.integrationMode` | `manual` | `manual`、`appServer`、`hooks` |
| `codexPet.appServer.executable` | `codex` | Codex CLI実行ファイル |
| `codexPet.appServer.autoStart` | `true` | App Serverモードで自動起動 |

### App Server連携の範囲

`integrationMode`を`appServer`へ変更すると、この拡張が管理する`codex app-server --listen stdio://`を起動し、JSONL通知を状態へ変換します。

```text
turn/started                         -> running
*/requestApproval                    -> waiting
turn/completed (completed)           -> review -> idle
turn/completed (failed), error       -> failed -> idle
turn/completed (interrupted)         -> idle
```

公式Codex VS Code拡張が独自に起動しているApp Serverのイベントを、別拡張から監視できる保証はありません。本機能が反映するのは、この拡張が管理するApp Server接続で発生したイベントです。公式拡張利用時は次のHooks連携を使います。

### Codex Hooks連携

1. コマンドパレットから `Codex Pet: Install Codex Hooks Integration` を実行します。
2. Codexで `/hooks` を実行し、追加されたCodex PetのコマンドHookを確認して信頼します。
3. `codexPet.integrationMode` が `hooks` になっていることを確認します（インストールコマンドが自動設定します）。

インストールは既存の`CODEX_HOME/hooks.json`を読み、既存Hookを残したままCodex Pet用の`SessionStart`、`UserPromptSubmit`、`PermissionRequest`、`PostToolUse`、`Stop`を追加します。受信スクリプトは`CODEX_HOME/codex-pet/bin/hook.cjs`へ配置されます。アンインストールコマンドはCodex Petと完全一致するハンドラーだけを除去します。

```text
SessionStart                         -> idle
UserPromptSubmit                    -> running
PermissionRequest                   -> waiting
PostToolUse                         -> running
Stop                                -> review -> idle
```

Hooksは`session_id`と`cwd`を含む小さなイベントファイルを`CODEX_HOME/codex-pet/events`へ書きます。各VS Codeウィンドウは、開いているワークスペース配下の`cwd`だけを消費します。複数セッションがある場合は`failed > waiting > running > review > idle`の優先度で表示状態を集約します。

Codexの信頼モデルに従い、拡張はHookの信頼を迂回しません。インストール後やHook定義が変わった場合は、Codexの`/hooks`で内容を再確認してください。Hooksの公式仕様は[Codex Hooks documentation](https://learn.chatgpt.com/docs/hooks)を参照してください。

## ローカル形式の調査結果

2026-07-21 に開発環境の `C:\Users\<user>\.codex\pets` を確認しました。

```text
pets/
└─ pingu/
   ├─ pet.json
   └─ spritesheet.webp
```

確認できた manifest の主な値は `id`、`displayName`、`description`、`spriteVersionNumber: 2`、`spritesheetPath`、`kind` です。画像は実測 `1536 x 2288` で、v2 の 8 列 x 11 行、1 フレーム `192 x 208` に一致しました。`idle` は row 0、column 0-5 の6フレームです。

この環境の `pets` ディレクトリではカスタム Pet だけが確認でき、標準 Pet は確認できませんでした。本拡張は公式拡張の内部ファイルや非公開 API を探索せず、ユーザーの `pets` ディレクトリだけを読みます。

ローダーは `pet.json` に `columns`、`rows`、`frameWidth`、`frameHeight`、`animations` があればそれらを優先します。不足時だけ、画像ヘッダーから取得した実寸と `spriteVersionNumber` の既知レイアウトを使って補完します。スプライトパスが Pet ディレクトリ外を指す manifest は拒否します。

## 開発実行

必要条件:

- Node.js 20 以降
- VS Code 1.90 以降

```powershell
npm install
npm run check
npm test
npm run compile
```

その後、このフォルダーを VS Code で開き、`F5` を押して Extension Development Host を起動します。新しいウィンドウでTerminalを開くと、同じPanelの右側に「Codex Pet」が表示されます。Terminalとの境界はドラッグでリサイズでき、VS Codeがワークスペースごとの配置を記憶します。VS Codeの公開APIではペイン自体の初期ピクセル幅は指定できません。Pet画像の大きさは`codexPet.scale`（0.25–3）で指定でき、狭いペインでは縦横比を維持して自動縮小します。低い領域では状態ラベルを自動的に省略します。Petの変更は表示領域を右クリックして「Change Pet」を選びます。Status BarのPet状態をクリックしてビューへフォーカスすることもできます。

`CODEX_HOME` を使う場合は、Extension Development Host を起動する VS Code プロセスに環境変数を設定します。

```powershell
$env:CODEX_HOME = "D:\path\to\codex-home"
code .
```

## Pet の最小構成

```text
~/.codex/pets/my-pet/
├─ pet.json
└─ spritesheet.webp
```

```json
{
  "id": "my-pet",
  "displayName": "My Pet",
  "spriteVersionNumber": 2,
  "spritesheetPath": "spritesheet.webp"
}
```

既知デフォルトは v1 が 8 x 9、v2 が 8 x 11です。状態行は`idle: 0`、`failed: 5`、`waiting: 6`、`running: 7`、`review: 8`を使用します。独自レイアウトでは manifest に寸法と各`animations`を指定してください。

## セキュリティ

- Webview は `file://` を使わず `Webview.asWebviewUri()` を使用します。
- `localResourceRoots` は拡張ディレクトリと解決済み Pet ディレクトリに限定します。
- Webview は nonce 付き Content Security Policy を設定します。
- Webview からのメッセージ型を検証し、Pet manifest の文字列を HTML として挿入しません。
- Pet ディレクトリ外を指すスプライトパスを拒否します。
- Hooks設定は明示コマンドでのみ変更し、既存のHookを保持します。
- Hook受信データはイベント名と必須フィールドを検証し、ワークスペース外のイベントを無視します。
