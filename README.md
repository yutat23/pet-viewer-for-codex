# Pet Viewer for Codex

Bring your locally installed Codex pets into Visual Studio Code. The pet appears beside the integrated Terminal, scales to fit the available space, and can react to Codex activity.

> Pet Viewer for Codex is an unofficial third-party extension. It is not affiliated with or endorsed by OpenAI.

OpenAI and Codex are trademarks of OpenAI. This project does not use the OpenAI logo or official product artwork.

## Features

- Displays pets from `CODEX_HOME/pets` or `~/.codex/pets`
- Opens beside the integrated Terminal by default
- Resizes responsively with the VS Code panel
- Supports PNG, WebP, and GIF sprite sheets
- Animates `idle`, `running`, `waiting`, `review`, and `failed` states
- Remembers the selected pet
- Reloads pets when their manifest or sprite sheet changes
- Shows the active pet and state in the status bar
- Provides manual, managed App Server, and Codex Hooks integration modes
- Aggregates activity from multiple Codex sessions and workspace folders

Pets are not bundled with this extension. Install at least one compatible pet before using the viewer.

## Requirements

- Visual Studio Code 1.90 or later
- A compatible pet installed under your Codex home directory
- Codex CLI on `PATH` when using App Server integration
- Codex Hooks support when using Hooks integration

## Installation

Install the extension from the Visual Studio Code Marketplace or run:

```shell
code --install-extension yutat23.pet-viewer-for-codex
```

To install a downloaded VSIX:

1. Open the Command Palette.
2. Run `Extensions: Install from VSIX...`.
3. Select the `.vsix` file.

## Getting started

1. Install a pet under `~/.codex/pets/<pet-id>` or `%USERPROFILE%\.codex\pets\<pet-id>`.
2. Open a folder or workspace in VS Code.
3. Open the integrated Terminal. The **Pet Viewer** appears in the same panel.
4. Right-click inside the Pet Viewer and select **Change Pet**.

You can drag the divider between the Terminal and Pet Viewer to resize the panes. VS Code remembers the layout. The outer pane width cannot be set by an extension, but the pet image size can be adjusted with `codexPet.scale`.

If `CODEX_HOME` is set, the extension uses `$CODEX_HOME/pets` instead of the default `~/.codex/pets` directory. You can also override the location with `codexPet.petDirectory`.

## Automatic state updates

The default integration mode is `manual`. Choose an integration mode in VS Code Settings under **Pet Viewer for Codex: Integration Mode**.

| Mode | Best for | Behavior |
| --- | --- | --- |
| `manual` | Testing and custom workflows | State changes only through commands |
| `hooks` | The official Codex IDE extension | Receives lifecycle events from trusted Codex Hooks |
| `appServer` | A separate managed Codex session | Starts and observes an App Server process owned by this extension |

### Codex Hooks integration

Hooks are the recommended mode when you want the pet to follow activity from the official Codex IDE extension.

1. Run `Pet Viewer for Codex: Install Codex Hooks Integration` from the Command Palette.
2. In Codex, run `/hooks`.
3. Review and trust the command added by Pet Viewer for Codex.
4. Start a new Codex session if the current session does not pick up the new Hook configuration.

The install command preserves existing entries in `CODEX_HOME/hooks.json`, installs a small receiver script under `CODEX_HOME/codex-pet/bin`, and changes `codexPet.integrationMode` to `hooks`.

Hook events map to pet states as follows:

```text
SessionStart       -> idle
UserPromptSubmit   -> running
PermissionRequest  -> waiting
PostToolUse        -> running
Stop               -> review -> idle
```

Events are matched to VS Code windows by workspace path. When multiple Codex sessions are active, the visible state uses this priority:

```text
failed > waiting > running > review > idle
```

To remove the integration, run `Pet Viewer for Codex: Uninstall Codex Hooks Integration`. Only the handlers installed by this extension are removed.

### Managed App Server integration

Set `codexPet.integrationMode` to `appServer` to let the extension start:

```text
codex app-server --listen stdio://
```

This mode observes only the App Server process managed by Pet Viewer for Codex. It does not observe the separate App Server connection owned by the official Codex extension. Use Hooks mode for official IDE-extension sessions.

## Commands

Open the Command Palette and search for **Pet Viewer for Codex**.

- `Change Pet`
- `Refresh Pets`
- `Open Pets Directory`
- `Open Pet Preview`
- `Set State: Idle`
- `Set State: Running`
- `Set State: Waiting`
- `Set State: Review`
- `Set State: Failed`
- `Install Codex Hooks Integration`
- `Uninstall Codex Hooks Integration`
- `Open Codex Hooks Configuration`
- `Start Managed App Server`
- `Stop Managed App Server`
- `Restart Managed App Server`

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `codexPet.enabled` | `true` | Enables the Pet Viewer |
| `codexPet.petDirectory` | empty | Overrides the default pets directory |
| `codexPet.scale` | `0.75` | Pet image size multiplier from 0.25 to 3 |
| `codexPet.animationSpeed` | `1` | Animation speed multiplier from 0.25 to 3 |
| `codexPet.pauseWhenHidden` | `true` | Pauses animation while the view is hidden |
| `codexPet.watchPetDirectory` | `true` | Reloads pets after file changes |
| `codexPet.integrationMode` | `manual` | Selects `manual`, `hooks`, or `appServer` integration |
| `codexPet.appServer.executable` | `codex` | Codex CLI executable used by App Server mode |
| `codexPet.appServer.autoStart` | `true` | Starts the managed App Server automatically |

## Pet format

A minimal pet contains a manifest and sprite sheet:

```text
~/.codex/pets/my-pet/
├── pet.json
└── spritesheet.webp
```

```json
{
  "id": "my-pet",
  "displayName": "My Pet",
  "spriteVersionNumber": 2,
  "spritesheetPath": "spritesheet.webp"
}
```

Known default layouts are 8 columns by 9 rows for sprite version 1 and 8 columns by 11 rows for sprite version 2. The default state rows are:

| State | Row |
| --- | ---: |
| `idle` | 0 |
| `failed` | 5 |
| `waiting` | 6 |
| `running` | 7 |
| `review` | 8 |

Custom layouts can provide `columns`, `rows`, `frameWidth`, `frameHeight`, and `animations` in `pet.json`.

## Troubleshooting

### No pet is displayed

- Run `Pet Viewer for Codex: Open Pets Directory` and verify that a pet folder exists.
- Check that `pet.json` is valid JSON.
- Check that `spritesheetPath` points to a PNG, WebP, or GIF inside the pet directory.
- Open **Output: Pet Viewer for Codex** for load errors.

### The pet does not react to Codex

- Confirm that `codexPet.integrationMode` is set to `hooks`.
- Run `/hooks` in Codex and confirm that the Pet Viewer command is trusted.
- Reinstall the Hooks integration if the extension location changed after an update.
- Start a new Codex session after changing Hook configuration.

### The pet is too large or too small

Adjust `codexPet.scale`. The image will still shrink automatically when the pane is smaller than the requested scale.

## Privacy and security

- No telemetry is collected.
- Pet files, Hook events, and workspace information are not sent to an extension-owned server.
- App Server mode communicates with the configured local Codex CLI process over standard input and output.
- Webview resources are restricted to the extension and resolved pet directories.
- Pet manifests cannot load sprite sheets from outside their own directory.
- Hook configuration is changed only after an explicit install or uninstall command.
- Existing third-party Hooks are preserved.
- Hook input is validated, and events outside the open workspace are ignored.

Codex itself may communicate with OpenAI according to your Codex configuration and the applicable OpenAI terms.

## Contributing

Development instructions are available in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT License](LICENSE)
