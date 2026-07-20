import type * as vscode from "vscode";

export function getWebviewHtml(webview: vscode.Webview): string {
  const nonce = createNonce();
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <style nonce="${nonce}">
    :root { color-scheme: light dark; }
    html, body { width: 100%; height: 100%; }
    body { box-sizing: border-box; margin: 0; padding: 10px 12px 12px; overflow: hidden; color: var(--vscode-foreground); font-family: var(--vscode-font-family); }
    main { width: 100%; height: 100%; min-width: 0; min-height: 0; }
    #pet-content { box-sizing: border-box; width: 100%; height: 100%; min-width: 0; min-height: 0; display: grid; grid-template-rows: minmax(0, 1fr) auto; gap: 5px; }
    .stage { width: 100%; height: 100%; min-width: 0; min-height: 0; display: grid; place-items: center; overflow: hidden; border-radius: 6px; background: color-mix(in srgb, var(--vscode-editor-background) 88%, var(--vscode-foreground)); }
    .pet { width: auto; height: auto; max-width: calc(100% - 8px); max-height: calc(100% - 8px); image-rendering: pixelated; }
    .status { margin: 0; color: var(--vscode-descriptionForeground); text-align: center; }
    .empty { min-height: 180px; display: grid; place-content: center; gap: 8px; text-align: center; }
    code { word-break: break-all; font-family: var(--vscode-editor-font-family); }
    [hidden] { display: none !important; }
    @media (max-height: 210px) {
      body { padding-block: 4px; }
      #pet-content { grid-template-rows: minmax(0, 1fr); }
      .status { display: none; }
    }
  </style>
</head>
<body>
  <main data-vscode-context='{"webviewSection":"pet","preventDefaultContextMenuItems":true}'>
    <section id="pet-content" hidden>
      <div class="stage"><canvas id="pet" class="pet" role="img"></canvas></div>
      <p id="pet-status" class="status"></p>
    </section>
    <section id="empty-content" class="empty" hidden>
      <strong id="empty-title"></strong>
      <span>Expected:</span>
      <code id="pets-directory"></code>
    </section>
    <section id="error-content" class="empty" hidden><strong>Codex Pet could not be loaded.</strong><span id="error-message"></span></section>
  </main>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const petContent = document.getElementById('pet-content');
    const emptyContent = document.getElementById('empty-content');
    const errorContent = document.getElementById('error-content');
    const sprite = document.getElementById('pet');
    let timer;
    let imageGeneration = 0;
    let currentPet;

    function showOnly(element) {
      petContent.hidden = element !== petContent;
      emptyContent.hidden = element !== emptyContent;
      errorContent.hidden = element !== errorContent;
    }

    function stopAnimation() {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    }

    function showPet(pet) {
      stopAnimation();
      currentPet = pet;
      showOnly(petContent);
      sprite.setAttribute('aria-label', pet.name + ', ' + pet.state + ' animation');
      document.getElementById('pet-status').textContent = 'Status: ' + pet.state.charAt(0).toUpperCase() + pet.state.slice(1);
      const scale = Math.max(0.25, Math.min(3, pet.scale));
      const width = Math.max(1, Math.round(pet.frameWidth * scale));
      const height = Math.max(1, Math.round(pet.frameHeight * scale));
      sprite.width = width;
      sprite.height = height;

      const generation = ++imageGeneration;
      const sheet = new Image();
      sheet.addEventListener('load', () => {
        if (generation !== imageGeneration) return;
        const context = sprite.getContext('2d');
        if (!context) {
          showOnly(errorContent);
          document.getElementById('error-message').textContent = 'Canvas rendering is not available.';
          return;
        }
        context.imageSmoothingEnabled = false;
        let frame = 0;
        const render = () => {
          const column = pet.animation.startColumn + frame;
          context.clearRect(0, 0, width, height);
          context.drawImage(
            sheet,
            column * pet.frameWidth,
            pet.animation.row * pet.frameHeight,
            pet.frameWidth,
            pet.frameHeight,
            0,
            0,
            width,
            height
          );
          const durations = pet.animation.frameDurationsMs;
          const baseDelay = Array.isArray(durations) && durations[frame] ? durations[frame] : pet.animation.frameDurationMs;
          const delay = Math.max(16, baseDelay / Math.max(0.25, pet.animationSpeed));
          timer = window.setTimeout(() => {
            if (frame + 1 >= pet.animation.frameCount) {
              if (!pet.animation.loop) {
                vscode.postMessage({ type: 'animationComplete', state: pet.state });
                return;
              }
              frame = 0;
            } else {
              frame += 1;
            }
            render();
          }, delay);
        };
        render();
      });
      sheet.addEventListener('error', () => {
        if (generation !== imageGeneration) return;
        stopAnimation();
        showOnly(errorContent);
        document.getElementById('error-message').textContent = 'The sprite image could not be loaded from the Pet directory.';
      });
      sheet.src = pet.spriteUri;
    }

    window.addEventListener('message', ({ data }) => {
      if (!data || typeof data.type !== 'string') return;
      if (data.type === 'showPet') showPet(data.pet);
      if (data.type === 'showEmpty') {
        stopAnimation();
        currentPet = undefined;
        showOnly(emptyContent);
        document.getElementById('empty-title').textContent = data.directoryExists ? 'No Codex Pets were found.' : 'Codex Pet directory was not found.';
        document.getElementById('pets-directory').textContent = data.petsDirectory;
      }
      if (data.type === 'showDisabled') {
        stopAnimation();
        currentPet = undefined;
        showOnly(emptyContent);
        document.getElementById('empty-title').textContent = 'Codex Pet is disabled.';
        document.getElementById('pets-directory').textContent = 'Enable codexPet.enabled in Settings.';
      }
      if (data.type === 'showError') {
        stopAnimation();
        currentPet = undefined;
        showOnly(errorContent);
        document.getElementById('error-message').textContent = data.message;
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (!currentPet || !currentPet.pauseWhenHidden) return;
      if (document.hidden) stopAnimation();
      else showPet(currentPet);
    });
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}

function createNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 32 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}
