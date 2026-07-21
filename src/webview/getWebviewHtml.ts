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
    body { box-sizing: border-box; margin: 0; padding: 2px; overflow: hidden; color: var(--vscode-foreground); font-family: var(--vscode-font-family); }
    main { width: 100%; height: 100%; min-width: 0; min-height: 0; }
    #pet-content { box-sizing: border-box; width: 100%; height: 100%; min-width: 0; min-height: 0; display: grid; grid-template-rows: minmax(0, 1fr) auto; gap: 0; }
    .stage { position: relative; width: 100%; height: 100%; min-width: 0; min-height: 0; display: grid; place-items: center; overflow: hidden; border-radius: 4px; background: color-mix(in srgb, var(--vscode-editor-background) 88%, var(--vscode-foreground)); }
    .background { position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; image-rendering: pixelated; }
    .pet { position: relative; z-index: 1; width: auto; height: auto; max-width: 100%; max-height: 100%; image-rendering: pixelated; }
    .stage.has-background .pet { position: absolute; left: 50%; bottom: 5%; max-width: 92%; max-height: 90%; transform: translateX(-50%); filter: drop-shadow(0 2px 1px rgb(0 0 0 / 35%)); }
    .status { margin: 0; color: var(--vscode-descriptionForeground); font-size: 12px; line-height: 16px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .empty { min-height: 180px; display: grid; place-content: center; gap: 8px; text-align: center; }
    code { word-break: break-all; font-family: var(--vscode-editor-font-family); }
    [hidden] { display: none !important; }
    @media (max-height: 34px) {
      body { padding: 1px; }
      #pet-content { grid-template-rows: minmax(0, 1fr); }
      .status { display: none; }
    }
  </style>
</head>
<body>
  <main data-vscode-context='{"webviewSection":"pet","preventDefaultContextMenuItems":true}'>
    <section id="pet-content" hidden>
      <div id="pet-stage" class="stage"><canvas id="pet-background" class="background" aria-hidden="true" hidden></canvas><canvas id="pet" class="pet" role="img"></canvas></div>
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
    const stage = document.getElementById('pet-stage');
    const background = document.getElementById('pet-background');
    const sprite = document.getElementById('pet');
    let timer;
    let imageGeneration = 0;
    let backgroundFrame;
    let backgroundId;
    let backgroundStartedAt = 0;
    let backgroundLastDraw = 0;
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

    function stopBackgroundAnimation() {
      if (backgroundFrame !== undefined) {
        window.cancelAnimationFrame(backgroundFrame);
        backgroundFrame = undefined;
      }
    }

    function block(context, color, x, y, width, height) {
      context.fillStyle = color;
      context.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
    }

    function polygon(context, color, points) {
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(Math.round(points[0][0]), Math.round(points[0][1]));
      for (let index = 1; index < points.length; index += 1) {
        context.lineTo(Math.round(points[index][0]), Math.round(points[index][1]));
      }
      context.closePath();
      context.fill();
    }

    function disc(context, color, x, y, radius) {
      context.fillStyle = color;
      context.beginPath();
      context.arc(Math.round(x), Math.round(y), Math.max(1, Math.round(radius)), 0, Math.PI * 2);
      context.fill();
    }

    function cloud(context, x, y, scale, color) {
      block(context, color, x, y, 13 * scale, 3 * scale);
      block(context, color, x + 3 * scale, y - 3 * scale, 7 * scale, 6 * scale);
    }

    function sparkle(context, x, y, color, visible) {
      if (!visible) return;
      block(context, color, x, y, 1, 1);
      block(context, color, x - 1, y + 1, 3, 1);
      block(context, color, x, y + 2, 1, 1);
    }

    function drawBroadleafTree(context, x, baseY, treeHeight, lean, seconds, phase, trunkDark, trunkLight, leafDark, leafMid, leafLight) {
      const crownX=x+lean+Math.sin(seconds*.55+phase)*.6;const crownY=baseY-treeHeight;const trunkWidth=Math.max(2,treeHeight*.12);
      polygon(context,trunkDark,[[x-trunkWidth*.7,baseY],[x+trunkWidth*.7,baseY],[crownX+trunkWidth*.35,crownY+treeHeight*.3],[crownX-trunkWidth*.4,crownY+treeHeight*.28]]);
      polygon(context,trunkLight,[[x,baseY],[x+trunkWidth*.65,baseY],[crownX+trunkWidth*.3,crownY+treeHeight*.3],[crownX,crownY+treeHeight*.34]]);
      polygon(context,trunkDark,[[crownX,crownY+treeHeight*.42],[crownX-treeHeight*.25,crownY+treeHeight*.21],[crownX-treeHeight*.2,crownY+treeHeight*.18],[crownX+treeHeight*.04,crownY+treeHeight*.31]]);
      polygon(context,trunkDark,[[crownX,crownY+treeHeight*.38],[crownX+treeHeight*.23,crownY+treeHeight*.2],[crownX+treeHeight*.19,crownY+treeHeight*.17],[crownX-treeHeight*.03,crownY+treeHeight*.3]]);
      disc(context,leafDark,crownX-treeHeight*.2,crownY+treeHeight*.12,treeHeight*.24);disc(context,leafDark,crownX+treeHeight*.2,crownY+treeHeight*.13,treeHeight*.23);disc(context,leafDark,crownX,crownY,treeHeight*.27);
      disc(context,leafMid,crownX-treeHeight*.13,crownY-treeHeight*.02,treeHeight*.2);disc(context,leafMid,crownX+treeHeight*.13,crownY+treeHeight*.05,treeHeight*.2);disc(context,leafMid,crownX,crownY+treeHeight*.15,treeHeight*.21);
      disc(context,leafLight,crownX-treeHeight*.14,crownY-treeHeight*.08,treeHeight*.1);disc(context,leafLight,crownX+treeHeight*.08,crownY-treeHeight*.06,treeHeight*.09);
      block(context,leafLight,crownX+treeHeight*.22,crownY+treeHeight*.05,2,1);block(context,leafDark,crownX-treeHeight*.28,crownY+treeHeight*.18,2,1);
    }

    function drawPineTree(context, x, baseY, treeHeight, trunkColor, needleDark, needleMid, needleLight, snowColor) {
      block(context,trunkColor,x-1,baseY-treeHeight*.42,3,treeHeight*.42);
      polygon(context,needleDark,[[x,baseY-treeHeight],[x-treeHeight*.28,baseY-treeHeight*.42],[x+treeHeight*.28,baseY-treeHeight*.42]]);
      polygon(context,needleDark,[[x,baseY-treeHeight*.78],[x-treeHeight*.36,baseY-treeHeight*.2],[x+treeHeight*.36,baseY-treeHeight*.2]]);
      polygon(context,needleMid,[[x,baseY-treeHeight*.92],[x-treeHeight*.22,baseY-treeHeight*.48],[x+treeHeight*.08,baseY-treeHeight*.52]]);
      polygon(context,needleMid,[[x,baseY-treeHeight*.67],[x-treeHeight*.3,baseY-treeHeight*.25],[x+treeHeight*.14,baseY-treeHeight*.3]]);
      polygon(context,needleLight,[[x,baseY-treeHeight*.89],[x-treeHeight*.08,baseY-treeHeight*.58],[x+treeHeight*.05,baseY-treeHeight*.6]]);
      if(snowColor){polygon(context,snowColor,[[x,baseY-treeHeight],[x-treeHeight*.2,baseY-treeHeight*.59],[x-treeHeight*.04,baseY-treeHeight*.63],[x+treeHeight*.12,baseY-treeHeight*.58]]);polygon(context,snowColor,[[x,baseY-treeHeight*.75],[x-treeHeight*.29,baseY-treeHeight*.3],[x-treeHeight*.06,baseY-treeHeight*.35],[x+treeHeight*.19,baseY-treeHeight*.29]]);}
    }

    function drawCoral(context, x, baseY, coralHeight, lean, darkColor, midColor, tipColor) {
      const topX=x+lean;const topY=baseY-coralHeight;const width=Math.max(2,coralHeight*.12);
      polygon(context,darkColor,[[x-width,baseY],[x+width,baseY],[topX+width*.65,topY],[topX-width*.6,topY]]);
      polygon(context,midColor,[[x,baseY],[x+width,baseY],[topX+width*.55,topY],[topX,topY+coralHeight*.12]]);
      polygon(context,darkColor,[[x,baseY-coralHeight*.45],[x-coralHeight*.28,baseY-coralHeight*.72],[x-coralHeight*.23,baseY-coralHeight*.78],[x+width,baseY-coralHeight*.56]]);
      polygon(context,midColor,[[x,baseY-coralHeight*.31],[x+coralHeight*.3,baseY-coralHeight*.57],[x+coralHeight*.25,baseY-coralHeight*.64],[x-width,baseY-coralHeight*.43]]);
      block(context,tipColor,topX-1,topY-1,3,2);block(context,tipColor,x-coralHeight*.27-1,baseY-coralHeight*.79,3,2);block(context,tipColor,x+coralHeight*.24-1,baseY-coralHeight*.65,3,2);
    }

    function drawLeafyPlant(context, x, baseY, plantHeight, seconds, phase, potDark, potLight, leafDark, leafMid, leafLight) {
      const sway=Math.sin(seconds*.8+phase)*.5;const topY=baseY-plantHeight;
      polygon(context,potDark,[[x-plantHeight*.2,baseY-plantHeight*.28],[x+plantHeight*.2,baseY-plantHeight*.28],[x+plantHeight*.14,baseY],[x-plantHeight*.14,baseY]]);block(context,potLight,x-plantHeight*.13,baseY-plantHeight*.25,plantHeight*.26,2);
      block(context,leafDark,x,topY+plantHeight*.2,1,plantHeight*.55);
      disc(context,leafDark,x-plantHeight*.2+sway,topY+plantHeight*.28,plantHeight*.19);disc(context,leafDark,x+plantHeight*.2+sway,topY+plantHeight*.38,plantHeight*.2);
      disc(context,leafMid,x+sway,topY+plantHeight*.16,plantHeight*.22);disc(context,leafMid,x-plantHeight*.08+sway,topY+plantHeight*.48,plantHeight*.19);
      disc(context,leafLight,x-plantHeight*.07+sway,topY+plantHeight*.09,plantHeight*.09);block(context,leafLight,x+plantHeight*.17+sway,topY+plantHeight*.31,2,1);
    }

    function drawPetGrounding(context, width, height) {
      const darkScene=['night-camp','space','pro-office','night-city','server-room','arcade','rainy-cafe','terminal'].includes(backgroundId);
      const shadow=darkScene?'rgba(0,0,0,.38)':'rgba(42,42,38,.25)';const y=height*.91;
      block(context,shadow,width*.35,y,width*.3,2);block(context,shadow,width*.4,y-1,width*.2,1);block(context,'rgba(0,0,0,.1)',width*.3,y+2,width*.4,1);
    }

    function drawGrassland(context, width, height, seconds) {
      block(context, '#62c9ee', 0, 0, width, height);
      polygon(context, '#58a66a', [[0,height*.62],[0,height*.42],[width*.22,height*.25],[width*.4,height*.55],[width*.62,height*.3],[width,height*.58],[width,height*.7]]);
      polygon(context, '#79bd61', [[0,height*.64],[width*.22,height*.39],[width*.43,height*.61],[width*.65,height*.43],[width,height*.62],[width,height*.72],[0,height*.72]]);
      block(context, '#91cf48', 0, height*.6, width, height*.4);
      cloud(context, (seconds*1.2)%(width+20)-18, height*.14, .7, '#fff4d5');
      cloud(context, width-((seconds*.7+8)%(width+24)), height*.27, .55, '#eaf7df');
      const treeHeight=Math.min(width*.25,height*.4);drawBroadleafTree(context,2,height*.7,treeHeight,3,seconds,0,'#523827','#8c5b35','#23643b','#3d8c4c','#72b957');
      drawBroadleafTree(context,width-3,height*.71,treeHeight*.92,-3,seconds,2.3,'#523827','#8c5b35','#23643b','#3d8c4c','#72b957');
      for (let index=0; index<6; index+=1) block(context, index%2?'#ff8eaa':'#fff3a8', (index*19+7)%width, height*.76+(index%3)*4, 1, 1);
    }

    function drawOffice(context, width, height, seconds) {
      block(context, '#d99a66', 0, 0, width, height*.68); block(context, '#a85e3c', 0, height*.68, width, height*.32);
      block(context, '#6f4431', width*.37, height*.08, width*.28, height*.38); block(context, '#8ed1dd', width*.39, height*.11, width*.24, height*.31);
      block(context, '#6f4431', width*.5-1, height*.11, 2, height*.31); block(context, '#6f4431', width*.39, height*.25, width*.24, 2);
      block(context, '#70412d', 0, height*.47, width*.32, 4); block(context, '#70412d', width*.68, height*.47, width*.32, 4);
      block(context, '#403943', width*.06, height*.25, width*.19, height*.19); block(context, Math.sin(seconds*1.5)>0?'#9ce0ca':'#f4cb74', width*.08, height*.28, width*.15, height*.13);
      block(context, '#403943', width*.76, height*.28, width*.18, height*.16); block(context, '#83cbd3', width*.78, height*.31, width*.14, height*.1);
      drawLeafyPlant(context,width*.7,height*.57,Math.min(width*.12,height*.25),seconds,0,'#6b4432','#ba7046','#355f3d','#5b8f4a','#89b95f');
      for (let x=0;x<width;x+=11) block(context, '#c37a4c', x, height*.79, 8, 1);
    }

    function drawLivingRoom(context, width, height, seconds) {
      block(context, '#e3bb86', 0, 0, width, height*.66); block(context, '#a96d49', 0, height*.66, width, height*.34);
      block(context, '#f1d39f', width*.24, height*.72, width*.56, height*.24); block(context, '#e8b984', width*.27, height*.75, width*.5, height*.18);
      block(context, '#f0d6ad', 0, height*.37, width*.29, height*.3); block(context, '#dcb78b', 0, height*.54, width*.33, height*.17);
      block(context, '#7c9965', width*.04, height*.43, width*.09, height*.12); block(context, '#d88869', width*.16, height*.44, width*.1, height*.11);
      block(context, '#754936', width*.4, height*.08, width*.27, height*.36); block(context, '#f2a27c', width*.42, height*.11, width*.23, height*.3);
      block(context, '#754936', width*.53, height*.11, 2, height*.3); block(context, '#754936', width*.42, height*.25, width*.23, 2);
      block(context, '#85523a', width*.31, height*.34, 2, height*.25); block(context, 'rgba(255,213,138,'+(.72+Math.sin(seconds*2)*.12)+')', width*.27, height*.22, width*.1, height*.13);
      drawLeafyPlant(context,width*.9,height*.63,Math.min(width*.14,height*.28),seconds,1.4,'#87523d','#d08357','#426641','#6f9857','#9fbd72');
    }

    function drawBlueSky(context, width, height, seconds) {
      block(context, '#55bfea', 0, 0, width, height); block(context, '#f9efd4', 0, height*.72, width, height*.28);
      cloud(context, (seconds*.8)%(width+25)-20, height*.2, .8, '#fff8df'); cloud(context, width-((seconds*.55+12)%(width+28)), height*.39, .65, '#e8e6f5');
      cloud(context, -3, height*.62, 1.3, '#e8e6f5'); cloud(context, width-17, height*.59, 1.2, '#e8e6f5');
      for(let index=0;index<5;index+=1) sparkle(context,(index*23+7)%width,(index*11+5)%Math.max(7,height*.6),'#fff5bb',Math.sin(seconds*2+index)>0);
    }

    function drawUnderwater(context, width, height, seconds) {
      block(context, '#27b7cf', 0, 0, width, height); block(context, '#e8d18d', 0, height*.72, width, height*.28);
      polygon(context, 'rgba(130,231,219,.28)', [[width*.08,0],[width*.2,0],[width*.42,height*.72],[width*.31,height*.72]]);
      polygon(context, 'rgba(130,231,219,.22)', [[width*.55,0],[width*.65,0],[width*.58,height*.72],[width*.46,height*.72]]);
      polygon(context,'#2d7182',[[0,height],[0,height*.66],[width*.08,height*.61],[width*.16,height*.73],[width*.19,height]]);polygon(context,'#2d7182',[[width,height],[width,height*.64],[width*.91,height*.59],[width*.82,height*.73],[width*.8,height]]);
      for(let index=0;index<3;index+=1){drawCoral(context,2+index*5,height*.88,height*(.18+index*.04),index-1,index%2?'#a84d75':'#714c98',index%2?'#ed7180':'#a46db5','#ffc09c');drawCoral(context,width-2-index*5,height*.89,height*(.17+index*.045),1-index,index%2?'#714c98':'#a84d75',index%2?'#a46db5':'#ed7180','#ffd1a6');}
      for(let index=0;index<6;index+=1){const x=(index*17+9+Math.sin(seconds+index)*2)%width;const y=height-((seconds*(2+index*.25)+index*13)%(height+5));block(context,'#d8fff4',x,y,1,1);}
    }

    function drawNightCamp(context, width, height, seconds) {
      block(context, '#102750', 0, 0, width, height); polygon(context,'#253e68',[[0,height*.62],[width*.18,height*.29],[width*.34,height*.58],[width*.5,height*.23],[width*.72,height*.61],[width*.86,height*.35],[width,height*.6],[width,height*.72],[0,height*.72]]);
      block(context,'#304e3a',0,height*.62,width,height*.38);for(let index=0;index<9;index+=1)sparkle(context,(index*19+5)%width,(index*13+4)%Math.max(6,height*.53),'#dceaff',Math.sin(seconds*1.6+index)>-.2);
      const pineHeight=Math.min(width*.18,height*.38);for(let index=0;index<4;index+=1){drawPineTree(context,2+index*6,height*.69,pineHeight*(.72+index*.09),'#362f2b','#153629','#20503a','#346647');drawPineTree(context,width-2-index*6,height*.7,pineHeight*(.75+index*.08),'#362f2b','#153629','#20503a','#346647');}
      polygon(context,'#d58b4b',[[2,height*.78],[width*.19,height*.47],[width*.35,height*.78]]);polygon(context,'#704333',[[width*.11,height*.78],[width*.19,height*.59],[width*.27,height*.78]]);
      block(context,'#59402f',width*.78,height*.8,width*.18,2);polygon(context,'#ff8b32',[[width*.81,height*.8],[width*.87,height*(.62+Math.sin(seconds*5)*.02)],[width*.93,height*.8]]);polygon(context,'#ffd45f',[[width*.84,height*.8],[width*.88,height*.69],[width*.91,height*.8]]);
    }

    function drawSpace(context, width, height, seconds) {
      block(context,'#0b0f3e',0,0,width,height);polygon(context,'#30206a',[[0,height*.32],[width*.25,height*.12],[width*.48,height*.38],[width*.72,height*.08],[width,height*.25],[width,height*.38],[width*.7,height*.24],[width*.46,height*.5],[width*.2,height*.28],[0,height*.48]]);
      disc(context,'#e88bb6',width*.82,height*.25,Math.min(width,height)*.13);disc(context,'#7b4da3',width*.79,height*.22,Math.min(width,height)*.1);
      context.strokeStyle='#ffc878';context.lineWidth=2;context.beginPath();context.ellipse(width*.82,height*.25,Math.min(width,height)*.23,Math.min(width,height)*.06,-.25,0,Math.PI*2);context.stroke();
      for(let index=0;index<11;index+=1)sparkle(context,(index*23+7)%width,(index*17+6)%Math.max(7,height*.65),index%2?'#ffc27b':'#9be7ff',Math.sin(seconds*2+index)>-.1);
      block(context,'#545b89',0,height*.78,width,height*.22);block(context,'#8891bd',0,height*.78,width,3);for(let x=3;x<width;x+=13)block(context,'#252c62',x,height*.9,8,2);
    }

    function drawProOffice(context, width, height, seconds) {
      block(context,'#172535',0,0,width,height*.7);block(context,'#526275',0,height*.7,width,height*.3);
      block(context,'#304355',width*.34,height*.13,width*.32,height*.45);block(context,'#8bb2c1',width*.36,height*.16,width*.28,height*.39);
      polygon(context,'#6c7c8d',[[0,height],[width*.34,height*.58],[width*.66,height*.58],[width,height]]);for(let x=0;x<width;x+=12)block(context,'#7e8c9a',x,height*.84,7,1);
      block(context,'#9a6742',0,height*.51,width*.3,5);block(context,'#9a6742',width*.7,height*.51,width*.3,5);
      for(let index=0;index<3;index+=1){block(context,'#0b1b2b',2+index*7,height*.3,6,height*.2);block(context,Math.sin(seconds*2+index)>.1?'#2fcaf0':'#183f5d',3+index*7,height*.32,4,height*.15);block(context,'#0b1b2b',width-8-index*7,height*.3,6,height*.2);block(context,Math.sin(seconds*2+index+1)>.1?'#45ddaf':'#183f5d',width-7-index*7,height*.32,4,height*.15);}
      block(context,'#e5c37d',width*.18,height*.08,width*.22,2);block(context,'#e5c37d',width*.6,height*.08,width*.22,2);
    }

    function drawSunset(context, width, height, seconds) {
      block(context,'#a95b89',0,0,width,height*.2);block(context,'#e66f78',0,height*.2,width,height*.22);block(context,'#ff9b70',0,height*.42,width,height*.22);block(context,'#f8bd71',0,height*.64,width,height*.12);
      disc(context,'#fff1b4',width*.5,height*.53,Math.min(width,height)*.07);
      polygon(context,'#754974',[[0,height*.68],[width*.18,height*.43],[width*.36,height*.66],[width*.57,height*.39],[width*.78,height*.66],[width,height*.46],[width,height*.76],[0,height*.76]]);
      block(context,'#b85c72',0,height*.68,width,height*.14);for(let index=0;index<6;index+=1)block(context,index%2?'#f7a478':'#e77c82',width*.42+index*2,height*.7+index*2,Math.max(1,width*.16-index*4),1);
      block(context,'#5b5938',0,height*.8,width,height*.2);for(let index=0;index<5;index+=1)block(context,'#ffd77d',(index*29+seconds*.7)%width,height*.79+Math.sin(seconds+index)*2,1,1);
    }

    function drawNightCity(context, width, height, seconds) {
      block(context,'#090f38',0,0,width,height);const heights=[.45,.62,.52,.72,.48,.66,.56,.75,.5,.64];const buildingWidth=Math.ceil(width/heights.length)+1;
      for(let index=0;index<heights.length;index+=1){const x=index*buildingWidth;const top=height*(1-heights[index]);block(context,index%2?'#182454':'#20245f',x,top,buildingWidth-1,height-top*.5);for(let y=top+3;y<height*.66;y+=4){for(let wx=x+2;wx<x+buildingWidth-2;wx+=4){if((wx+y+index)%3!==0)block(context,Math.sin(seconds*2+wx+y)>.2?'#38d7ed':'#f06bd7',wx,y,1,1);}}}
      block(context,'#202a53',0,height*.67,width,height*.33);block(context,'#6370a0',0,height*.68,width,2);for(let x=0;x<width;x+=9)block(context,x%2?'#3b4d85':'#6e3e91',x,height*.87,6,1);
      block(context,'rgba(116,210,255,.5)',0,0,width,height*.7);for(let index=0;index<8;index+=1)block(context,'rgba(137,224,255,.55)',(index*17+seconds*6)%width,(index*11+seconds*9)%height,1,2);
    }

    function drawServerRoom(context, width, height, seconds) {
      block(context,'#071728',0,0,width,height);polygon(context,'#2d4762',[[width*.35,height*.46],[width*.65,height*.46],[width*.9,height],[width*.1,height]]);
      for(let side=0;side<2;side+=1){for(let rack=0;rack<3;rack+=1){const x=side===0?rack*7:width-7-rack*7;const rackWidth=6;block(context,'#29445f',x,0,rackWidth,height*.82);block(context,'#0b2034',x+1,2,rackWidth-2,height*.76);for(let y=4;y<height*.72;y+=4){block(context,'#183950',x+1,y,rackWidth-2,2);if(Math.sin(seconds*4+x+y)>0)block(context,(y/4)%3===0?'#58e46d':'#37cffa',x+2,y,1,1);}}}
      block(context,'#77dfff',width*.45,height*.08,width*.1,2);block(context,'#3ca8d1',width*.43,height*.36,width*.14,height*.11);for(let y=height*.55;y<height;y+=7)block(context,'#4e6880',width*.16,y,width*.68,1);
    }

    function drawTreehouse(context, width, height, seconds) {
      block(context,'#376f54',0,0,width,height);for(let index=0;index<8;index+=1)disc(context,index%2?'#2f6548':'#4b814e',(index*19)%width,(index*13)%Math.max(8,height*.38),8);
      block(context,'#684329',0,0,width*.13,height);block(context,'#684329',width*.87,0,width*.13,height);polygon(context,'#7b5130',[[0,height*.32],[width*.38,height*.18],[width*.42,height*.24],[0,height*.5]]);
      block(context,'#ad6f3c',width*.08,height*.56,width*.84,height*.44);for(let y=height*.59;y<height;y+=5)block(context,'#744527',width*.08,y,width*.84,1);
      block(context,'#734a2d',width*.34,height*.08,width*.33,height*.42);disc(context,'#9ad6bb',width*.52,height*.28,Math.min(width,height)*.12);block(context,'#734a2d',width*.51,height*.16,2,height*.24);block(context,'#734a2d',width*.41,height*.27,width*.22,2);
      block(context,'#70452a',width*.7,height*.22,width*.24,3);for(let index=0;index<4;index+=1)block(context,['#52715b','#9d5e43','#d0a25a','#385b67'][index],width*.72+index*4,height*.12+(index%2)*2,3,height*.1);
      for(let index=0;index<7;index+=1){const x=width*.1+index*width*.13;disc(context,Math.sin(seconds*2+index)>-.2?'#ffd46d':'#a87c42',x,height*.08,1.5);}
    }

    function drawAutumnForest(context, width, height, seconds) {
      block(context,'#e79a62',0,0,width,height*.48);block(context,'#80545c',0,height*.48,width,height*.18);block(context,'#5c4934',0,height*.6,width,height*.4);
      polygon(context,'#c98a52',[[width*.4,height],[width*.47,height*.55],[width*.55,height*.55],[width*.72,height],[width,height],[width,height*.78],[0,height*.78],[0,height]]);
      const autumnDark=['#812f32','#9e3f32','#a8552e'];const autumnMid=['#c74f3b','#df783f','#d98236'];const autumnLight=['#ed8d3f','#f0aa43','#f5bd58'];
      for(let side=0;side<2;side+=1){for(let index=0;index<3;index+=1){const x=side===0?2+index*9:width-2-index*9;drawBroadleafTree(context,x,height*.8,height*(.38+index*.035),side===0?2:-2,seconds,index+side*2,'#4b3028','#795038',autumnDark[index],autumnMid[index],autumnLight[index]);}}
      for(let index=0;index<11;index+=1){const x=(index*23+seconds*(1+index*.07))%(width+8)-4;const y=(index*11+seconds*(3+index*.14))%(height*.8);block(context,index%3===0?'#f3b64c':index%2?'#dc6a3e':'#a94a3c',x,y,2,1);}
      for(let index=0;index<8;index+=1)block(context,index%2?'#d7693b':'#efad45',(index*17+5)%width,height*.84+(index%4)*3,3,1);
    }

    function drawJapaneseFestival(context, width, height, seconds) {
      block(context,'#17234c',0,0,width,height*.7);block(context,'#3e3346',0,height*.7,width,height*.3);
      polygon(context,'#5e2638',[[width*.36,height*.64],[width*.5,height*.42],[width*.64,height*.64]]);block(context,'#8f3c3c',width*.45,height*.48,width*.1,height*.2);block(context,'#f0b45d',width*.49,height*.48,2,height*.2);
      for(let side=0;side<2;side+=1){const x=side===0?0:width*.76;block(context,'#6e3a2c',x,height*.45,width*.24,height*.4);polygon(context,side===0?'#cf5445':'#4f72a0',[[x,height*.47],[x+width*.26,height*.47],[x+width*.22,height*.38],[x+width*.04,height*.38]]);block(context,'#f0bf66',x+width*.04,height*.52,width*.16,height*.18);}
      context.strokeStyle='#6c4050';context.lineWidth=1;context.beginPath();context.moveTo(0,height*.2);context.quadraticCurveTo(width*.5,height*.32,width,height*.18);context.stroke();
      for(let index=0;index<9;index+=1){const x=index*width*.125;const y=height*(.2+.09*Math.sin(index*.8));block(context,Math.sin(seconds*2+index)>-.5?'#ffbc52':'#9d603c',x,y,3,4);}
      for(let burst=0;burst<2;burst+=1){const cx=width*(burst?.76:.23);const cy=height*(burst?.22:.16);const phase=Math.max(0,Math.sin(seconds*.8+burst*2));for(let ray=0;ray<8;ray+=1){const angle=ray*Math.PI/4;block(context,burst?'#82d9ef':'#f38aaa',cx+Math.cos(angle)*phase*7,cy+Math.sin(angle)*phase*7,1,1);}}
    }

    function drawPalm(context, x, baseY, palmHeight, lean, seconds, phase) {
      const crownX=x+lean;const crownY=baseY-palmHeight;const sway=Math.sin(seconds*.75+phase)*.07;
      polygon(context,'#4d3527',[[x-3,baseY],[x+3,baseY],[crownX+2,crownY],[crownX-2,crownY]]);
      polygon(context,'#9a6035',[[x-1,baseY],[x+2,baseY],[crownX+1,crownY],[crownX-1,crownY]]);
      for(let segment=1;segment<6;segment+=1){const ratio=segment/7;const segmentX=x+(crownX-x)*ratio;const segmentY=baseY-palmHeight*ratio;block(context,'#c18145',segmentX-1,segmentY,3,1);}
      const angles=[-2.9,-2.45,-2.05,-1.62,-1.2,-.78,-.34,.25,2.82];
      for(let index=0;index<angles.length;index+=1){const angle=angles[index]+sway*(index-4)/4;const length=palmHeight*((index===3||index===4) ? 0.46 : 0.38);const middleX=crownX+Math.cos(angle)*length*.52;const middleY=crownY+Math.sin(angle)*length*.36;const tipX=crownX+Math.cos(angle)*length;const tipY=crownY+Math.sin(angle)*length*.78;const color=index%3===0?'#175f3a':index%2?'#2f9652':'#49b864';polygon(context,color,[[crownX,crownY-1],[middleX-1,middleY-1],[tipX,tipY],[middleX+1,middleY+1],[crownX,crownY+1]]);}
      disc(context,'#4e3926',crownX-2,crownY+2,2);disc(context,'#6d4929',crownX+2,crownY+2,2);disc(context,'#8a5a30',crownX,crownY+4,1.5);
    }

    function drawTropicalBeach(context, width, height, seconds) {
      block(context,'#61c9ed',0,0,width,height*.46);block(context,'#1eabc0',0,height*.46,width,height*.25);block(context,'#49c9c1',0,height*.58,width,height*.13);block(context,'#efd190',0,height*.7,width,height*.3);
      disc(context,'#ffe17c',width*.72,height*.18,Math.min(width,height)*.08);
      for(let wave=0;wave<4;wave+=1){const offset=(seconds*(1+wave*.2)+wave*13)%18;for(let x=-18;x<width+18;x+=18)block(context,wave%2?'#d9fbec':'#f8f1cf',x+offset,height*.55+wave*4,10,1);}
      drawPalm(context,width*.08,height*.88,Math.min(width*.38,height*.6),width*.08,seconds,0);
      drawPalm(context,width*.94,height*.9,Math.min(width*.3,height*.5),-width*.05,seconds,2.4);
      for(let index=0;index<7;index+=1)block(context,index%2?'#d6ae70':'#fff0bb',(index*19+7)%width,height*.78+(index%3)*5,2,1);
    }

    function drawArcade(context, width, height, seconds) {
      block(context,'#16152f',0,0,width,height*.72);block(context,'#2b2443',0,height*.72,width,height*.28);
      block(context,'#542766',0,height*.09,width,3);block(context,'#1bbbd0',0,height*.14,width,2);
      for(let side=0;side<2;side+=1){for(let index=0;index<3;index+=1){const x=side===0?index*11:width-10-index*11;const cabinetColor=['#8f3da7','#2d72a8','#c24f6f'][index];block(context,cabinetColor,x,height*.25,9,height*.54);polygon(context,cabinetColor,[[x,height*.25],[x+9,height*.25],[x+8,height*.18],[x+1,height*.18]]);block(context,'#0b1830',x+1,height*.29,7,height*.2);block(context,Math.sin(seconds*3+index+side)>.1?'#53e7e1':'#f178cf',x+2,height*.31,5,height*.15);block(context,'#f2c659',x+2,height*.54,2,2);block(context,'#20223e',x+1,height*.61,7,height*.15);}}
      for(let y=height*.75;y<height;y+=6)block(context,'#523a70',0,y,width,1);for(let x=0;x<width;x+=10)polygon(context,'rgba(66,218,221,.22)',[[x,height*.73],[x+2,height*.73],[x+8,height],[x+5,height]]);
      for(let index=0;index<6;index+=1)sparkle(context,(index*21+seconds*2)%width,height*.08+(index%2)*5,index%2?'#f57bd6':'#53e6e0',Math.sin(seconds*4+index)>0);
    }

    function drawJapaneseRoom(context, width, height, seconds) {
      block(context,'#d9c49a',0,0,width,height*.64);block(context,'#b69158',0,height*.64,width,height*.36);
      for(let x=0;x<width;x+=Math.max(8,width*.2)){block(context,'#8e713e',x,height*.64,1,height*.36);block(context,'#d9bd75',x+1,height*.82,Math.max(7,width*.2-1),1);}
      for(let side=0;side<2;side+=1){const x=side===0?0:width*.72;block(context,'#735838',x,height*.06,width*.28,height*.56);block(context,'#f0e4c2',x+2,height*.09,width*.24,height*.5);for(let gx=1;gx<4;gx+=1)block(context,'#9d845a',x+gx*width*.06,height*.09,1,height*.5);for(let gy=1;gy<4;gy+=1)block(context,'#9d845a',x+2,height*(.09+gy*.125),width*.24,1);}
      block(context,'#6c4d32',width*.31,height*.04,width*.38,height*.55);block(context,'#8fc39b',width*.34,height*.08,width*.32,height*.47);polygon(context,'#497b54',[[width*.34,height*.52],[width*.46,height*.3],[width*.55,height*.48],[width*.65,height*.33],[width*.66,height*.55]]);
      block(context,'#75533a',width*.37,height*.49,width*.26,3);block(context,'#d5644e',width*.44,height*.7,width*.12,height*.07);
      const curtainShift=Math.sin(seconds*.7)*1.5;block(context,'rgba(255,245,196,.18)',width*.32+curtainShift,height*.08,width*.35,height*.5);
    }

    function drawRainyCafe(context, width, height, seconds) {
      block(context,'#49372f',0,0,width,height*.67);block(context,'#704a36',0,height*.67,width,height*.33);
      block(context,'#2c343d',width*.22,height*.06,width*.56,height*.53);block(context,'#68838c',width*.25,height*.09,width*.5,height*.47);block(context,'#2c343d',width*.49,height*.09,2,height*.47);
      for(let index=0;index<12;index+=1){const x=width*.25+(index*17+seconds*8)%(width*.5);const y=height*.09+(index*11+seconds*13)%(height*.46);block(context,'rgba(207,235,232,.58)',x,y,1,3);}
      block(context,'#3e2c29',0,height*.54,width*.23,4);block(context,'#3e2c29',width*.77,height*.54,width*.23,4);block(context,'#b9774f',width*.08,height*.72,width*.84,4);block(context,'#5b392d',width*.15,height*.76,3,height*.24);block(context,'#5b392d',width*.82,height*.76,3,height*.24);
      block(context,'#e5d2b4',width*.6,height*.65,5,5);block(context,'#9f6044',width*.61,height*.64,3,1);for(let index=0;index<2;index+=1){const steamX=width*.61+index*2+Math.sin(seconds+index);const steamY=height*.61-((seconds*2+index*3)%8);block(context,'rgba(245,232,210,.6)',steamX,steamY,1,3);}
      disc(context,'rgba(255,178,91,.18)',width*.12,height*.3,Math.min(width,height)*.2);block(context,'#f4b35f',width*.08,height*.19,width*.08,height*.08);
    }

    function drawSnowyCabin(context, width, height, seconds) {
      block(context,'#8ca9bf',0,0,width,height*.58);polygon(context,'#708ba2',[[0,height*.57],[width*.19,height*.28],[width*.36,height*.54],[width*.57,height*.22],[width*.78,height*.55],[width,height*.33],[width,height*.66],[0,height*.66]]);block(context,'#e8edf0',0,height*.57,width,height*.43);
      block(context,'#7a4d34',width*.2,height*.42,width*.6,height*.34);polygon(context,'#56382e',[[width*.14,height*.44],[width*.5,height*.2],[width*.86,height*.44]]);polygon(context,'#f4f4ef',[[width*.14,height*.41],[width*.5,height*.17],[width*.86,height*.41],[width*.81,height*.38],[width*.5,height*.23],[width*.19,height*.46]]);
      block(context,'#56382e',width*.45,height*.54,width*.1,height*.22);block(context,'#f3ad54',width*.27,height*.51,width*.12,height*.11);block(context,'#f3ad54',width*.62,height*.51,width*.12,height*.11);block(context,'#ffd983',width*.29,height*.53,width*.08,height*.07);block(context,'#ffd983',width*.64,height*.53,width*.08,height*.07);
      block(context,'#56382e',width*.67,height*.17,width*.06,height*.19);for(let puff=0;puff<4;puff+=1){const rise=(seconds*2+puff*5)%18;disc(context,'rgba(224,232,236,.65)',width*.7+Math.sin(seconds+puff)*2,height*.17-rise,2+puff*.4);}
      for(let side=0;side<2;side+=1){for(let tree=0;tree<3;tree+=1){const x=side===0?2+tree*8:width-2-tree*8;drawPineTree(context,x,height*.7,height*(.34+tree*.045),'#4c4138','#234744','#315d58','#4d756c','#f2f4ef');}}
      for(let index=0;index<15;index+=1){const x=(index*17+seconds*(1+index*.08))%(width+4)-2;const y=(index*13+seconds*(4+index*.11))%(height+4)-2;block(context,index%3===0?'#ffffff':'#d9e9ef',x,y,index%4===0?2:1,index%4===0?2:1);}
    }

    function drawTerminal(context, width, height, seconds) {
      block(context,'#07110e',0,0,width,height);block(context,'#14251e',0,0,width,4);block(context,'#264c3b',3,1,2,2);block(context,'#d0a84e',7,1,2,2);block(context,'#9e4e4e',11,1,2,2);
      const commandDuration=3.2;const commandIndex=Math.floor(seconds/commandDuration);const commandProgress=(seconds%commandDuration)/commandDuration;const lineHeight=4;const historyBottom=Math.max(18,Math.round(height*.58));
      for(let row=0;row<Math.ceil(historyBottom/lineHeight)-2;row+=1){const seed=(commandIndex-row+40)%13;const y=historyBottom-row*lineHeight;block(context,seed%3===0?'#67df93':'#3d9e78',3,y,1,1);block(context,'#315e4c',6,y,5+(seed*3)%Math.max(6,width*.22),1);block(context,seed%4===0?'#bb78df':'#67b2d0',width*.34,y,4+(seed*5)%Math.max(7,width*.28),1);if(seed%2===0)block(context,'#cdae58',width*.72,y,2+(seed%6),1);}
      const activeY=Math.min(height-5,historyBottom+lineHeight);const commandLengths=[24,31,19,36,28];const commandLength=Math.min(commandLengths[commandIndex%commandLengths.length],Math.max(8,width-10));const typed=Math.min(commandLength,Math.floor(commandProgress*commandLength*1.35));block(context,'#70e59a',3,activeY,2,1);
      for(let character=0;character<typed;character+=1){const x=7+character;const color=character<5?'#6dc2db':character<Math.floor(commandLength*.72)?'#c387df':'#e1bd63';if(character%6!==5)block(context,color,x,activeY,1,1);}
      if(commandProgress<.86&&Math.sin(seconds*8)>-.25)block(context,'#b2f5c8',7+typed,activeY,1,2);
      block(context,'rgba(3,8,6,.4)',width*.24,height*.68,width*.52,height*.27);block(context,'#153b2b',width*.27,height*.73,width*.46,height*.17);block(context,'#2f7f5e',width*.3,height*.77,width*.18,1);block(context,'#6ab7d4',width*.3,height*.82,width*.29,1);if(Math.sin(seconds*6)>0)block(context,'#b2f5c8',width*.61,height*.82,1,2);
    }

    function drawLuxuryDetails(context, width, height, seconds) {
      if (backgroundId === 'grassland') {
        for(let index=0;index<9;index+=1){const x=(index*17+3)%width;block(context,index%3===0?'#286f43':'#4b963d',x,height*.88-(index%3),1,5+(index%4));}
        for(let index=0;index<8;index+=1){const x=(index*29+11)%width;block(context,index%2?'#ff8cb1':'#fff2a1',x,height*.72+(index%4)*3,2,1);block(context,'#377f43',x,height*.73+(index%4)*3,1,3);}
        block(context,'rgba(238,255,198,.18)',0,height*.57,width,2);
      } else if (backgroundId === 'office') {
        block(context,'#67402e',width*.7,height*.08,width*.27,3);for(let index=0;index<5;index+=1)block(context,['#44685c','#86503d','#c19b54'][index%3],width*.72+index*4,height*.1,3,height*.14+(index%2)*2);
        block(context,'#433b3d',width*.13,height*.61,width*.08,height*.2);block(context,'#433b3d',width*.79,height*.61,width*.08,height*.2);
        for(let x=0;x<width;x+=12){block(context,'#7f4d38',x,height*.81,1,height*.19);block(context,'#d28a55',x+1,height*.81,8,1);}
        block(context,'#f1e0c0',width*.28,height*.48,3,4);block(context,'#734a36',width*.29,height*.47,2,1);
      } else if (backgroundId === 'living-room') {
        block(context,'#b77b50',width*.05,height*.09,width*.13,height*.19);block(context,'#f2d6a0',width*.07,height*.12,width*.09,height*.13);polygon(context,'#7fa06a',[[width*.08,height*.23],[width*.115,height*.15],[width*.15,height*.23]]);
        block(context,'#9d6746',width*.75,height*.49,width*.13,3);block(context,'#9d6746',width*.77,height*.52,2,height*.14);block(context,'#e5b878',width*.77,height*.44,width*.09,5);
        block(context,'#d59a6d',width*.27,height*.74,width*.5,1);block(context,'#f7e1b3',width*.29,height*.77,width*.46,1);
        for(let index=0;index<5;index+=1)block(context,'rgba(255,241,186,.7)',(index*23+seconds*.7)%width,height*.28+index*7+Math.sin(seconds+index)*2,1,1);
      } else if (backgroundId === 'blue-sky') {
        block(context,'#8fdcf1',0,height*.44,width,height*.04);block(context,'#c9ecf0',0,height*.62,width,height*.04);
        for(let index=0;index<7;index+=1){const x=(index*21+seconds*.35)%width;disc(context,index%2?'#fff7d9':'#dcdff5',x,height*.79+(index%3)*3,3+(index%2));}
        polygon(context,'#d4d8ed',[[0,height],[0,height*.84],[width*.1,height*.79],[width*.2,height],[width*.8,height],[width*.9,height*.8],[width,height*.86],[width,height]]);
      } else if (backgroundId === 'underwater') {
        for(let index=0;index<7;index+=1){const x=(index*19+seconds*(1+index*.08))%(width+8)-4;const y=height*.28+(index%4)*6;block(context,'#176b8b',x,y,4,1);polygon(context,'#176b8b',[[x,y],[x-2,y-1],[x-2,y+2]]);}
        for(let index=0;index<10;index+=1)block(context,index%2?'#d0b773':'#f2dda0',(index*17+4)%width,height*.78+(index%4)*4,1,1);
        disc(context,'#486c83',width*.08,height*.82,5);disc(context,'#365b74',width*.92,height*.85,6);
        block(context,'rgba(178,255,241,.2)',0,height*.09,width,1);
      } else if (backgroundId === 'night-camp') {
        block(context,'#16385a',width*.27,height*.55,width*.47,height*.08);for(let index=0;index<7;index+=1){const x=(index*17+2)%width;block(context,index%2?'#3d6741':'#294e34',x,height*.85-(index%3),1,5+(index%4));block(context,'#193b2b',x-1,height*.9-(index%3),3,1);}
        disc(context,'rgba(255,154,57,.16)',width*.87,height*.75,Math.min(width,height)*.16);block(context,'#f7c45d',width*.17,height*.64,2,3);
        for(let index=0;index<5;index+=1){const x=width*.86+Math.sin(seconds*3+index)*3;const y=height*.68-((seconds*(3+index)+index*4)%Math.max(5,height*.17));block(context,'#ffc45e',x,y,1,1);}
      } else if (backgroundId === 'space') {
        disc(context,'#a89bd8',width*.17,height*.19,Math.min(width,height)*.08);disc(context,'#6a5598',width*.15,height*.18,Math.min(width,height)*.055);
        for(let index=0;index<5;index+=1)block(context,['#ffb36d','#e77db2','#9d74d8'][index%3],width*.75,height*.17+index*2,width*.13,1);
        block(context,'#222858',0,height*.83,width,height*.04);for(let x=4;x<width;x+=14){block(context,'#55dcff',x,height*.91,5,1);block(context,'#ffae54',x+7,height*.91,2,1);}
        polygon(context,'rgba(74,190,255,.18)',[[width*.05,height*.08],[width*.52,height*.36],[width*.49,height*.41],[width*.01,height*.18]]);
      } else if (backgroundId === 'pro-office') {
        block(context,'#0b1c2b',width*.43,height*.2,width*.14,height*.13);block(context,'#2bd2dc',width*.45,height*.22,width*.1,height*.08);
        for(let index=0;index<4;index+=1){block(context,'#18283a',width*.73+index*3,height*.11,2,height*.27);if(Math.sin(seconds*3+index)>0)block(context,index%2?'#4ee277':'#36cfff',width*.74+index*3,height*.14+index*4,1,1);}
        drawLeafyPlant(context,width*.67,height*.58,Math.min(width*.1,height*.18),seconds,2,'#5d4639','#a16d4b','#264c37','#477554','#6b9969');
        for(let index=0;index<6;index+=1)polygon(context,'rgba(193,218,230,.15)',[[width*.34+index*width*.055,height*.58],[width*.39+index*width*.045,height],[width*.42+index*width*.04,height],[width*.36+index*width*.055,height*.58]]);
      } else if (backgroundId === 'sunset') {
        for(let index=0;index<5;index+=1){const x=(index*27+seconds*.45)%(width+18)-12;cloud(context,x,height*.13+index*4,.35,index%2?'#d55e77':'#f58b78');}
        for(let index=0;index<8;index+=1)block(context,index%2?'#ffb277':'#e8837c',width*.39+index*3,height*.7+index*2,Math.max(1,width*.2-index*5),1);
        for(let index=0;index<3;index+=1){drawPineTree(context,2+index*7,height*.94,height*(.2+index*.035),'#332f28','#293a31','#344c38','#4f5d40');drawPineTree(context,width-2-index*7,height*.94,height*(.21+index*.03),'#332f28','#293a31','#344c38','#4f5d40');}
        block(context,'rgba(255,226,156,.16)',0,height*.48,width,height*.06);
      } else if (backgroundId === 'night-city') {
        disc(context,'#d9d7ff',width*.14,height*.12,3);disc(context,'#0d1642',width*.15,height*.11,3);
        block(context,'#111932',0,height*.58,width,height*.03);for(let index=0;index<8;index+=1){block(context,'#1f2b50',index*14,height*.5-(index%3)*4,9,height*.1+(index%3)*4);block(context,index%2?'#2ee1f0':'#f064da',index*14+2,height*.53-(index%3)*4,1,1);}
        for(let index=0;index<7;index+=1)block(context,index%2?'rgba(43,215,238,.45)':'rgba(231,76,210,.4)',(index*19+5)%width,height*.72+(index%4)*6,5,1);
        block(context,'#0b122a',0,height*.94,width,height*.06);
      } else if (backgroundId === 'server-room') {
        for(let index=0;index<4;index+=1)block(context,'#a8e7ff',width*.38+index*width*.08,height*.07,5,2);
        block(context,'#1d3650',width*.42,height*.28,width*.16,height*.19);block(context,'#55dfff',width*.44,height*.31,width*.12,height*.13);
        for(let index=0;index<7;index+=1){polygon(context,'#54708a',[[width*.18+index*width*.09,height],[width*.39+index*width*.035,height*.48],[width*.4+index*width*.035,height*.48],[width*.2+index*width*.09,height]]);}
        for(let index=0;index<8;index+=1){if(Math.sin(seconds*4+index)>0){block(context,index%3===0?'#ffd25d':'#53ee87',width*(index%2?.91:.08),height*.18+index*5,1,1);}}
      } else if (backgroundId === 'treehouse') {
        polygon(context,'#5d3923',[[0,height*.18],[width*.32,height*.04],[width*.5,height*.08],[width*.18,height*.28]]);polygon(context,'#5d3923',[[width,height*.12],[width*.68,height*.02],[width*.52,height*.11],[width*.85,height*.27]]);
        block(context,'#d09a56',width*.17,height*.63,width*.23,2);for(let index=0;index<5;index+=1)block(context,['#4c725b','#97563d','#c99550'][index%3],width*.19+index*4,height*.52+(index%2),3,height*.1);
        block(context,'#4f7a4e',width*.68,height*.66,width*.19,height*.12);block(context,'#76513a',width*.67,height*.76,width*.21,2);
        for(let index=0;index<8;index+=1){const x=(index*17+seconds*.4)%width;const y=height*.24+(index*9)%Math.max(7,height*.47);block(context,'rgba(255,224,134,.7)',x,y,1,1);}
      } else if (backgroundId === 'autumn-forest') {
        for(let index=0;index<8;index+=1){const x=(index*13+4)%width;polygon(context,index%2?'#593f2e':'#77432f',[[x-1,height],[x+2,height],[x+1,height*.85-(index%3)*2],[x,height*.85-(index%3)*2]]);disc(context,index%3===0?'#d85c3c':'#e99b43',x-2,height*.84-(index%3)*3,2.5);disc(context,index%2?'#efad45':'#bd4b3a',x+2,height*.86-(index%3)*3,2.5);}
        block(context,'rgba(255,190,104,.15)',0,height*.35,width,height*.2);
      } else if (backgroundId === 'japanese-festival') {
        for(let index=0;index<6;index+=1){disc(context,'rgba(255,173,70,.15)',width*(.06+index*.18),height*(.24+(index%2)*.07),5);block(context,'#edc16c',width*(.06+index*.18),height*(.24+(index%2)*.07),2,3);}
        for(let x=0;x<width;x+=8)block(context,'#55404a',x,height*.86,5,1);
      } else if (backgroundId === 'tropical-beach') {
        cloud(context,(seconds*.45)%(width+20)-18,height*.13,.5,'#eff8dd');cloud(context,width-((seconds*.3+7)%(width+20)),height*.27,.38,'#e5f3dc');
        for(let index=0;index<7;index+=1){const x=(index*23+3)%width;block(context,index%2?'#e9b875':'#fff0b5',x,height*.86+(index%3)*3,2,1);}
      } else if (backgroundId === 'arcade') {
        for(let index=0;index<8;index+=1){block(context,index%2?'rgba(67,226,226,.42)':'rgba(240,100,211,.4)',(index*17+5)%width,height*.79+(index%4)*5,6,1);}
        block(context,'rgba(119,75,181,.2)',width*.34,height*.17,width*.32,height*.65);
      } else if (backgroundId === 'japanese-room') {
        block(context,'#8a5a3b',width*.38,height*.71,width*.24,3);block(context,'#8a5a3b',width*.41,height*.74,2,height*.13);block(context,'#8a5a3b',width*.57,height*.74,2,height*.13);
        block(context,'#d8c7a3',width*.48,height*.68,4,3);block(context,'#6c8c62',width*.49,height*.67,2,1);for(let index=0;index<4;index+=1)block(context,'rgba(255,245,197,.45)',width*.35+index*9,height*.17+index*5,1,height*.18);
      } else if (backgroundId === 'rainy-cafe') {
        block(context,'#8a573c',width*.02,height*.38,width*.17,2);for(let index=0;index<4;index+=1){block(context,['#d69458','#c17052','#e8b974','#935344'][index],width*.04+index*4,height*.33+(index%2),3,5);}
        for(let index=0;index<6;index+=1)block(context,index%2?'rgba(120,190,205,.3)':'rgba(237,160,92,.25)',(index*17+4)%width,height*.84+(index%3)*4,5,1);
      } else if (backgroundId === 'snowy-cabin') {
        disc(context,'rgba(255,190,86,.16)',width*.33,height*.56,Math.min(width,height)*.14);disc(context,'rgba(255,190,86,.16)',width*.68,height*.56,Math.min(width,height)*.14);
        for(let index=0;index<7;index+=1){const x=(index*19+4)%width;disc(context,index%2?'#dbe6e9':'#f5f7f4',x,height*.88+(index%3)*4,4+(index%2));}
        block(context,'rgba(211,235,242,.25)',0,height*.55,width,2);
      } else if (backgroundId === 'terminal') {
        block(context,'rgba(66,224,139,.06)',0,0,width,height);for(let y=5;y<height;y+=4)block(context,'rgba(34,92,67,.16)',0,y,width,1);
        block(context,'#276047',1,1,width-2,1);block(context,'#15382a',1,height-2,width-2,1);
      }
      block(context,'rgba(8,12,24,.18)',0,0,2,height);block(context,'rgba(8,12,24,.18)',width-2,0,2,height);block(context,'rgba(8,12,24,.12)',0,height-2,width,2);
    }

    function drawBackgroundScene(context, width, height, elapsed) {
      const seconds=elapsed/1000;
      if(backgroundId==='grassland')drawGrassland(context,width,height,seconds);else if(backgroundId==='office')drawOffice(context,width,height,seconds);else if(backgroundId==='living-room')drawLivingRoom(context,width,height,seconds);else if(backgroundId==='blue-sky')drawBlueSky(context,width,height,seconds);else if(backgroundId==='underwater')drawUnderwater(context,width,height,seconds);else if(backgroundId==='night-camp')drawNightCamp(context,width,height,seconds);else if(backgroundId==='space')drawSpace(context,width,height,seconds);else if(backgroundId==='pro-office')drawProOffice(context,width,height,seconds);else if(backgroundId==='sunset')drawSunset(context,width,height,seconds);else if(backgroundId==='night-city')drawNightCity(context,width,height,seconds);else if(backgroundId==='server-room')drawServerRoom(context,width,height,seconds);else if(backgroundId==='treehouse')drawTreehouse(context,width,height,seconds);else if(backgroundId==='autumn-forest')drawAutumnForest(context,width,height,seconds);else if(backgroundId==='japanese-festival')drawJapaneseFestival(context,width,height,seconds);else if(backgroundId==='tropical-beach')drawTropicalBeach(context,width,height,seconds);else if(backgroundId==='arcade')drawArcade(context,width,height,seconds);else if(backgroundId==='japanese-room')drawJapaneseRoom(context,width,height,seconds);else if(backgroundId==='rainy-cafe')drawRainyCafe(context,width,height,seconds);else if(backgroundId==='snowy-cabin')drawSnowyCabin(context,width,height,seconds);else if(backgroundId==='terminal')drawTerminal(context,width,height,seconds);
      drawLuxuryDetails(context,width,height,seconds);drawPetGrounding(context,width,height);
    }

    function renderBackground(timestamp) {
      if (!backgroundId || background.hidden || document.hidden) return;
      if (timestamp - backgroundLastDraw >= 80) {
        backgroundLastDraw = timestamp;
        const pixelSize = stage.clientWidth < 160 || stage.clientHeight < 120 ? 2 : 3;
        const width = Math.max(1, Math.ceil(stage.clientWidth / pixelSize));
        const height = Math.max(1, Math.ceil(stage.clientHeight / pixelSize));
        if (background.width !== width || background.height !== height) {
          background.width = width;
          background.height = height;
        }
        const context = background.getContext('2d');
        if (context) {
          context.imageSmoothingEnabled = false;
          context.clearRect(0, 0, width, height);
          const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          drawBackgroundScene(context, width, height, reducedMotion ? 0 : timestamp - backgroundStartedAt);
        }
      }
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) backgroundFrame = window.requestAnimationFrame(renderBackground);
      else backgroundFrame = undefined;
    }

    function configureBackground(pet) {
      const hasBackground = typeof pet.backgroundId === 'string' && pet.backgroundId.length > 0;
      background.hidden = !hasBackground;
      stage.classList.toggle('has-background', hasBackground);
      if (!hasBackground) {
        backgroundId = undefined;
        stopBackgroundAnimation();
        return;
      }
      if (backgroundId !== pet.backgroundId) backgroundStartedAt = performance.now();
      backgroundId = pet.backgroundId;
      backgroundLastDraw = 0;
      if (backgroundFrame === undefined) backgroundFrame = window.requestAnimationFrame(renderBackground);
    }

    function showPet(pet) {
      stopAnimation();
      currentPet = pet;
      showOnly(petContent);
      sprite.setAttribute('aria-label', pet.name + ', ' + pet.state + ' animation');
      configureBackground(pet);
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
        stopBackgroundAnimation();
        currentPet = undefined;
        showOnly(emptyContent);
        document.getElementById('empty-title').textContent = data.directoryExists ? 'No Codex Pets were found.' : 'Codex Pet directory was not found.';
        document.getElementById('pets-directory').textContent = data.petsDirectory;
      }
      if (data.type === 'showDisabled') {
        stopAnimation();
        stopBackgroundAnimation();
        currentPet = undefined;
        showOnly(emptyContent);
        document.getElementById('empty-title').textContent = 'Codex Pet is disabled.';
        document.getElementById('pets-directory').textContent = 'Enable codexPet.enabled in Settings.';
      }
      if (data.type === 'showError') {
        stopAnimation();
        stopBackgroundAnimation();
        currentPet = undefined;
        showOnly(errorContent);
        document.getElementById('error-message').textContent = data.message;
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (!currentPet || !currentPet.pauseWhenHidden) return;
      if (document.hidden) {
        stopAnimation();
        stopBackgroundAnimation();
      }
      else showPet(currentPet);
    });
    new ResizeObserver(() => {
      if (!backgroundId || background.hidden) return;
      backgroundLastDraw = 0;
      if (backgroundFrame === undefined) backgroundFrame = window.requestAnimationFrame(renderBackground);
    }).observe(stage);
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}

function createNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 32 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}
