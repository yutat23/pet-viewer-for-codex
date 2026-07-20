# Contributing

Contributions and bug reports are welcome.

## Development requirements

- Node.js 20 or later
- Visual Studio Code 1.90 or later
- Codex CLI for App Server integration testing

## Setup

```shell
npm install
npm run check
npm test
npm run compile
```

Open the repository in VS Code and press `F5` to start an Extension Development Host. Open the integrated Terminal in the new window to display the Pet Viewer.

To test a separate Codex home directory on Windows:

```powershell
$env:CODEX_HOME = "D:\path\to\codex-home"
code .
```

## Validation

Before submitting a change, run:

```shell
npm run vscode:prepublish
```

This performs the TypeScript check, the Vitest suite, and a production build.

## Project structure

```text
src/
├── codex/       Codex App Server and Hooks integrations
├── pet/         Pet discovery, loading, and state handling
├── webview/     Responsive sprite rendering and Webview messages
└── extension.ts Extension activation and VS Code commands
```

The bundled Hook receiver is in `scripts/codex-pet-hook.cjs`. Keep it dependency-free and fast because Codex waits for command Hooks to finish.

## Pull requests

- Keep changes focused.
- Add or update tests for behavior changes.
- Do not commit generated VSIX files or dependencies.
- Preserve existing user Hooks and settings during migrations.
