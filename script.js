/* ========================================
   O SEGREDO DA FLORESTA - v3.0
   ======================================== */

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = 240, H = 135;

const STAGES = ['FLORESTA', 'PÂNTANO', 'CAVERNA', 'REVELAÇÃO'];
let stage = 0, score = 0, hp = 3, frame = 0;
let gameState = 'menu';
let keys = {};
let particles = [];
let fireballs = [];
let bossProjectiles = []; // projéteis do chefe

const player = {
  x: 30, y: 90, w: 10, h: 12, vx: 0, vy: 0,
  onGround: false, dir: 1,
  fireCooldown: 0, invincible: 0
};

let enemies = [];
let platforms = [];
let boss = null;
let scrollX = 0;
let levelLen = 800;
let bossAppeared = false;
let revealTimer = 0;
let revealPhase = 0; // 0=sombra se rasgando, 1=vovó aparece, 2=final
let stageTimer = 0;
let msgTimer = 0;
let spawnTimer = 0;
let bgScroll = 0;
let bossArenaX = 0;
let bossIntroTimer = 0;
let screenShake = 0;
let lightningTimer = 0;
let grandmaAnim = 0; // animação dedicada da vovó

const palettes = [
  { sky: '#1a2a1a', ground: '#2d4a1e', groundTop: '#3a6b27', tree1: '#1e3d12', tree2: '#2d5a1e', fog: '#1a2a1aaa', accent: '#44ff44' },
  { sky: '#1a1a2a', ground: '#2a1f2a', groundTop: '#3d2b3d', tree1: '#151020', tree2: '#2a1a2a', fog: '#1a1a2aaa', accent: '#aa44ff' },
  { sky: '#080808', ground: '#1a1410', groundTop: '#2a1e14', tree1: '#100c08', tree2: '#1a1208', fog: '#080808aa', accent: '#ff8844' },
  { sky: '#0a0a1a', ground: '#1a1a2a', groundTop: '#2a2a3a', tree1: '#0a0a20', tree2: '#1a1a30', fog: '#0a0a1aaa', accent: '#ffee44' }
];

function getPal() { return palettes[Math.min(stage, 3)]; }

/* ===================== INICIALIZAÇÃO DE FASE ===================== */
function initStage() {
  enemies = []; platforms = []; fireballs = []; bossProjectiles = [];
  scrollX = 0; bossAppeared = false; boss = null;
  player.x = 30; player.y = 70; player.vx = 0; player.vy = 0;
  spawnTimer = 0; stageTimer = 0;
  levelLen = 1200 + stage * 300;
  bgScroll = 0; lightningTimer = 0;

  // Plataformas variadas para mais aventura
  for (let i = 0; i < 12 + stage * 2; i++) {
    let px = 130 + i * (80 + Math.random() * 50);
    let py = 50 + Math.random() * 50;
    let pw = 20 + Math.random() * 25;
    platforms.push({ x: px, y: py, w: pw });
  }

  // Poucos inimigos, bem espaçados
  const count = 3 + stage;
  for (let i = 0; i < count; i++) {
    spawnEnemy(250 + i * Math.floor(levelLen / (count + 1)));
  }
}

function spawnEnemy(x) {
  const types = [
    ['wolf', 'bat'],
    ['wolf', 'spider', 'bat'],
    ['spider', 'bat', 'mushroom', 'wolf']
  ];
  const pool = types[Math.min(stage, 2)];
  const t = pool[Math.floor(Math.random() * pool.length)];
  enemies.push({
    x: x || scrollX + 260, y: 90, w: 10, h: 10,
    vx: -(0.22 + Math.random() * 0.22 + stage * 0.07),
    vy: 0, type: t, hp: 1 + (stage > 1 ? 1 : 0), dead: false
  });
}

function spawnParticle(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y, vx: (Math.random() - 0.5) * 2.5,
      vy: -(Math.random() * 2.2 + 0.4),
      life: 22 + Math.random() * 16, color, size: 2
    });
  }
}

function shootFireball() {
  const ox = player.dir > 0 ? 10 : -4;
  fireballs.push({
    x: player.x + ox,
    y: player.y + 4,
    vx: 3.0 * player.dir,
    dir: player.dir,
    life: 110
  });
  spawnParticle(player.x + ox, player.y + 4, '#ffaa00', 4);
}

/* ===================== MENSAGENS ===================== */
function showMsg(txt, dur) {
  const el = document.getElementById('msg');
  el.style.display = 'block';
  el.textContent = txt;
  msgTimer = dur || 180;
}
function hideMsg() {
  document.getElementById('msg').style.display = 'none';
}

/* ===================== FUNDO ===================== */
function drawBg() {
  const p = getPal();
  ctx.fillStyle = p.sky;
  ctx.fillRect(0, 0, W, H);

  // Lua / estrelas
  if (stage === 0) {
    ctx.fillStyle = '#ffee88';
    for (let i = 0; i < 14; i++) {
      ctx.fillRect((i * 37 + 10) % W, 4 + (i * 11) % 22, 1, 1);
    }
    ctx.fillStyle = '#ffffcc';
    ctx.fillRect(188, 7, 8, 8);
    ctx.fillStyle = p.sky;
    ctx.fillRect(189, 8, 5, 5);
  } else {
    ctx.fillStyle = '#ccccee';
    ctx.fillRect(188, 7, 9, 9);
    ctx.fillStyle = p.sky;
    ctx.fillRect(190, 9, 5, 5);
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = `rgba(200,200,255,${0.4 + (i%3)*0.2})`;
      ctx.fillRect((i * 29 + 5) % W, 3 + (i * 17) % 30, 1, 1);
    }
  }

  // Raio atmosférico na caverna (fase 2)
  if (stage === 2) {
    lightningTimer++;
    if (lightningTimer % 190 < 4) {
      ctx.fillStyle = 'rgba(220,220,255,0.18)';
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Árvores fundo (parallax lento)
  ctx.fillStyle = p.tree1;
  for (let i = 0; i < 9; i++) {
    let tx = ((i * 42 - bgScroll * 0.25 + 1200) % (W + 24)) - 12;
    drawTree(tx, 58, 11, 22);
  }

  // Chão
  ctx.fillStyle = p.ground;
  ctx.fillRect(0, 110, W, H - 110);
  ctx.fillStyle = p.groundTop;
  ctx.fillRect(0, 110, W, 3);

  // Grama
  ctx.fillStyle = p.groundTop;
  for (let i = 0; i < 14; i++) {
    let gx = ((i * 22 - bgScroll * 0.8 + 1200) % (W + 10)) - 5;
    ctx.fillRect(gx, 107, 2, 3);
    ctx.fillRect(gx + 3, 108, 1, 2);
  }

  // Árvores frente (parallax rápido)
  ctx.fillStyle = p.tree2;
  for (let i = 0; i < 6; i++) {
    let tx = ((i * 55 - bgScroll * 0.65 + 1200) % (W + 32)) - 16;
    drawTree(tx, 72, 15, 32);
  }
}

function drawTree(x, y, w, h) {
  ctx.fillRect(x + w / 2 - 2, y + h * 0.58, 4, h * 0.42);
  ctx.fillRect(x, y, w, h * 0.42);
  ctx.fillRect(x + 2, y - h * 0.28, w - 4, h * 0.36);
}

/* ===================== PLATAFORMAS ===================== */
function drawPlatforms() {
  platforms.forEach(p => {
    let sx = p.x - scrollX;
    if (sx < -30 || sx > W + 10) return;
    const pal = getPal();
    ctx.fillStyle = pal.groundTop;
    ctx.fillRect(sx, p.y, p.w, 5);
    ctx.fillStyle = pal.ground;
    ctx.fillRect(sx, p.y + 3, p.w, 5);
    // Musgo/detalhe
    ctx.fillStyle = pal.tree1;
    ctx.fillRect(sx + 2, p.y, 3, 1);
    ctx.fillRect(sx + p.w - 5, p.y, 3, 1);
  });
}

/* ===================== INIMIGOS ===================== */
function drawEnemy(e) {
  let sx = e.x - scrollX;
  if (sx < -15 || sx > W + 15) return;
  let f = Math.floor(frame / 10) % 2;

  if (e.type === 'wolf') {
    ctx.fillStyle = '#887788';
    ctx.fillRect(sx, e.y - 2, 10, 7);
    ctx.fillStyle = '#aaaacc';
    ctx.fillRect(sx + 1, e.y - 5, 5, 4);
    ctx.fillStyle = '#cc3333';
    ctx.fillRect(sx + 7, e.y - 1, 2, 1);
    ctx.fillStyle = '#665566';
    ctx.fillRect(sx + 1, e.y + 5, 2, 2 + f);
    ctx.fillRect(sx + 5, e.y + 5, 2, 2 + (1 - f));
    ctx.fillStyle = '#ffaaaa';
    ctx.fillRect(sx + 7, e.y - 4, 1, 1);
    ctx.fillRect(sx + 9, e.y - 4, 1, 1);
  } else if (e.type === 'spider') {
    ctx.fillStyle = '#222244';
    ctx.fillRect(sx + 2, e.y, 7, 6);
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(sx + 3, e.y + 1, 2, 2);
    ctx.fillRect(sx + 6, e.y + 1, 2, 2);
    ctx.fillStyle = '#111133';
    ctx.fillRect(sx + f, e.y + 3, 2, 1);
    ctx.fillRect(sx + 9 - f, e.y + 3, 2, 1);
    ctx.fillRect(sx + 1, e.y + 4 + f, 1, 3);
    ctx.fillRect(sx + 9, e.y + 4 + f, 1, 3);
  } else if (e.type === 'bat') {
    e.y = 74 + Math.sin(frame * 0.06 + e.x * 0.01) * 11;
    ctx.fillStyle = '#332244';
    ctx.fillRect(sx + 3, e.y + 1, 5, 5);
    ctx.fillStyle = '#221133';
    ctx.fillRect(sx, e.y + f, 3, 2);
    ctx.fillRect(sx + 8, e.y + f, 3, 2);
    ctx.fillStyle = '#ffaaaa';
    ctx.fillRect(sx + 4, e.y, 1, 1);
    ctx.fillRect(sx + 6, e.y, 1, 1);
  } else if (e.type === 'mushroom') {
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(sx + 1, e.y - 2, 9, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx + 2, e.y - 1, 2, 1);
    ctx.fillRect(sx + 7, e.y - 1, 2, 1);
    ctx.fillStyle = '#ddccaa';
    ctx.fillRect(sx + 2, e.y + 3, 7, 5);
    if (f) {
      ctx.fillStyle = '#aa1111';
      ctx.fillRect(sx - 1, e.y + 1, 2, 3);
      ctx.fillRect(sx + 10, e.y + 1, 2, 3);
    }
  }
}

/* ===================== BOSS: SOMBRA MISTERIOSA ===================== */
function drawBossShadow() {
  if (!boss) return;
  const sx = boss.x - scrollX;
  const groundY = boss.y;
  const f8 = Math.floor(frame / 8) % 4;
  const bob = Math.sin(frame * 0.06) * 3;
  const pulse = (Math.sin(frame * 0.13) + 1) / 2;
  const shake = boss.hit ? (Math.random() - 0.5) * 4 : 0;

  // Aura externa pulsante
  ctx.fillStyle = `rgba(130,0,200,${0.07 + pulse * 0.09})`;
  for (let r = 28; r > 0; r -= 7) {
    ctx.beginPath();
    ctx.arc(sx + 10, groundY - 8 + bob, r + pulse * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sombra no chão
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(sx - 4, groundY + 16, 28, 4);

  // Tentáculos da capa (7 tentáculos animados)
  ctx.fillStyle = '#0a0015';
  for (let i = 0; i < 7; i++) {
    let tOff = Math.sin(frame * 0.08 + i * 0.9) * 4;
    let tLen = 7 + f8 + (i % 3) * 2;
    let tx = sx - 4 + i * 5 + tOff;
    ctx.fillRect(tx, groundY + 10 + bob, 3, tLen);
    // ponta do tentáculo
    ctx.fillStyle = '#1a002a';
    ctx.fillRect(tx, groundY + 10 + tLen + bob, 2, 2);
    ctx.fillStyle = '#0a0015';
  }

  // Corpo / capa principal (com shake no hit)
  ctx.fillStyle = '#12001f';
  ctx.fillRect(sx - 2 + shake, groundY - 22 + bob, 24, 34);
  ctx.fillStyle = '#1e0035';
  ctx.fillRect(sx + shake, groundY - 20 + bob, 20, 28);

  // Capuz pontudo
  ctx.fillStyle = '#180028';
  ctx.fillRect(sx + 2, groundY - 32 + bob, 16, 14);
  ctx.fillRect(sx + 5, groundY - 37 + bob, 10, 7);
  ctx.fillRect(sx + 7, groundY - 40 + bob, 6, 5);

  // Olhos (piscam ritmicamente)
  const blinkFrame = Math.floor(frame / 40) % 10 === 0;
  ctx.fillStyle = blinkFrame ? '#220000' : '#ff0000';
  ctx.fillRect(sx + 3, groundY - 26 + bob, 5, blinkFrame ? 1 : 5);
  ctx.fillRect(sx + 12, groundY - 26 + bob, 5, blinkFrame ? 1 : 5);
  if (!blinkFrame) {
    ctx.fillStyle = '#ff8888';
    ctx.fillRect(sx + 4, groundY - 25 + bob, 2, 2);
    ctx.fillRect(sx + 13, groundY - 25 + bob, 2, 2);
  }

  // Garras espectrais ao atacar
  if (frame % 80 < 18) {
    ctx.fillStyle = '#2a0040';
    ctx.fillRect(sx - 10, groundY - 10 + bob, 8, 2);
    ctx.fillRect(sx - 11, groundY - 8 + bob, 5, 2);
    ctx.fillRect(sx - 10, groundY - 6 + bob, 4, 2);
    ctx.fillRect(sx + 22, groundY - 10 + bob, 8, 2);
    ctx.fillRect(sx + 24, groundY - 8 + bob, 5, 2);
    ctx.fillRect(sx + 24, groundY - 6 + bob, 4, 2);
  }

  // Orbes orbitando (4 orbes)
  for (let i = 0; i < 4; i++) {
    const ang = frame * 0.045 + i * 1.57;
    const r = 18 + Math.sin(frame * 0.08 + i) * 3;
    const ox = sx + 10 + Math.cos(ang) * r;
    const oy = groundY - 10 + bob + Math.sin(ang) * r * 0.5;
    ctx.fillStyle = `rgba(220,0,255,${0.5 + pulse * 0.4})`;
    ctx.fillRect(ox - 1, oy - 1, 3, 3);
    ctx.fillStyle = `rgba(255,150,255,${0.3 + pulse * 0.3})`;
    ctx.fillRect(ox, oy, 1, 1);
  }

  // Barra de vida
  const barW = Math.max(0, (boss.hp / boss.maxHp) * 72);
  ctx.fillStyle = '#2a002a';
  ctx.fillRect(sx - 10, groundY - 48 + bob, 72, 7);
  ctx.fillStyle = '#880099';
  ctx.fillRect(sx - 10, groundY - 48 + bob, barW, 7);
  ctx.fillStyle = '#dd44ff';
  ctx.fillRect(sx - 10, groundY - 48 + bob, barW, 2);
  ctx.strokeStyle = '#cc88ff';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(sx - 10, groundY - 48 + bob, 72, 7);
  ctx.fillStyle = '#dd88ff';
  ctx.font = '6px monospace';
  ctx.fillText('???', sx + 22, groundY - 51 + bob);
}

/* ===================== BOSS: VOVÓ REVELADA (animação rica) ===================== */
function drawBossGrandma() {
  if (!boss) return;
  grandmaAnim++;
  const sx = boss.x - scrollX;
  const groundY = boss.y;
  const pulse = (Math.sin(grandmaAnim * 0.1) + 1) / 2;
  const bob = Math.sin(grandmaAnim * 0.07) * 3;
  const angryShake = revealPhase === 1 && grandmaAnim < 80
    ? (Math.random() - 0.5) * 5 : 0;

  // Aura da vovó (fase 1: roxa-furiosa, fase 2: dourada-gentil)
  const auraColor = revealPhase === 1
    ? `rgba(180,0,220,${0.08 + pulse * 0.1})`
    : `rgba(255,200,0,${0.05 + pulse * 0.07})`;
  ctx.fillStyle = auraColor;
  ctx.beginPath();
  ctx.arc(sx + 10, groundY - 15 + bob, 26 + pulse * 4, 0, Math.PI * 2);
  ctx.fill();

  // Saia / corpo (avental florido)
  ctx.fillStyle = '#7744aa';
  ctx.fillRect(sx - 4 + angryShake, groundY - 20 + bob, 28, 38);
  ctx.fillStyle = '#9955cc';
  ctx.fillRect(sx - 2 + angryShake, groundY - 18 + bob, 24, 30);

  // Avental branco com flores
  ctx.fillStyle = '#eeeedd';
  ctx.fillRect(sx + 2, groundY - 12 + bob, 16, 22);
  // Flores no avental
  if (revealPhase === 2) {
    ctx.fillStyle = '#ffaacc';
    ctx.fillRect(sx + 4, groundY - 6 + bob, 3, 3);
    ctx.fillRect(sx + 10, groundY - 2 + bob, 3, 3);
    ctx.fillStyle = '#ffeeaa';
    ctx.fillRect(sx + 5, groundY - 5 + bob, 1, 1);
    ctx.fillRect(sx + 11, groundY - 1 + bob, 1, 1);
  }

  // Braços (com bengala)
  ctx.fillStyle = '#cc99ee';
  ctx.fillRect(sx - 7 + angryShake, groundY - 14 + bob, 5, 3);
  ctx.fillRect(sx + 22 + angryShake, groundY - 14 + bob, 5, 3);
  // Bengala
  ctx.fillStyle = '#8a5a2a';
  ctx.fillRect(sx + 27, groundY - 14 + bob, 2, 18);
  ctx.fillRect(sx + 24, groundY - 14 + bob, 5, 2);

  // Cabeça
  ctx.fillStyle = '#ffddcc';
  ctx.fillRect(sx + 2 + angryShake, groundY - 34 + bob, 16, 16);

  // Cabelo / coque branco
  ctx.fillStyle = '#eeeeee';
  ctx.fillRect(sx + 1, groundY - 40 + bob, 18, 8);
  ctx.fillRect(sx + 4, groundY - 44 + bob, 12, 6);
  ctx.fillRect(sx + 6, groundY - 46 + bob, 8, 4);
  ctx.fillStyle = '#dddddd';
  ctx.fillRect(sx + 3, groundY - 40 + bob, 14, 2);

  // Óculos
  ctx.fillStyle = '#333333';
  ctx.fillRect(sx + 3, groundY - 30 + bob, 5, 4);
  ctx.fillRect(sx + 12, groundY - 30 + bob, 5, 4);
  ctx.fillRect(sx + 8, groundY - 29 + bob, 4, 1);
  ctx.fillRect(sx + 2, groundY - 29 + bob, 2, 1);
  ctx.fillRect(sx + 17, groundY - 29 + bob, 2, 1);

  // Olhos (brilhantes na fase 1 = raivosos vermelhos, fase 2 = gentis)
  if (revealPhase === 1 && grandmaAnim < 120) {
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(sx + 4, groundY - 29 + bob, 3, 3);
    ctx.fillRect(sx + 13, groundY - 29 + bob, 3, 3);
  } else {
    ctx.fillStyle = '#4444aa';
    ctx.fillRect(sx + 4, groundY - 29 + bob, 3, 2);
    ctx.fillRect(sx + 13, groundY - 29 + bob, 3, 2);
  }

  // Boca: raivosa (fase 1) ou sorrindo (fase 2)
  ctx.fillStyle = '#884444';
  if (revealPhase === 1 && grandmaAnim < 120) {
    // Boca aberta / raivosa
    ctx.fillRect(sx + 5, groundY - 22 + bob, 10, 3);
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(sx + 6, groundY - 21 + bob, 8, 2);
  } else {
    // Sorriso gentil
    ctx.fillRect(sx + 5, groundY - 22 + bob, 3, 1);
    ctx.fillRect(sx + 12, groundY - 22 + bob, 3, 1);
    ctx.fillRect(sx + 7, groundY - 21 + bob, 6, 1);
  }

  // Rugas (charme de vovó)
  ctx.fillStyle = '#ccaa99';
  ctx.fillRect(sx + 3, groundY - 27 + bob, 1, 2);
  ctx.fillRect(sx + 16, groundY - 27 + bob, 1, 2);

  // Barra de vida só na fase de combate (revealPhase 0 = ainda em batalha, não existe aqui)
  if (boss.hp < boss.maxHp && revealPhase === 1) {
    const barW = Math.max(0, (boss.hp / boss.maxHp) * 72);
    ctx.fillStyle = '#440000';
    ctx.fillRect(sx - 10, groundY - 55 + bob, 72, 7);
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(sx - 10, groundY - 55 + bob, barW, 7);
    ctx.fillStyle = '#ff6666';
    ctx.fillRect(sx - 10, groundY - 55 + bob, barW, 2);
    ctx.fillStyle = '#ffcccc';
    ctx.font = '6px monospace';
    ctx.fillText('VOVÓ', sx + 16, groundY - 58 + bob);
  }

  // Fase 2: partículas de flores / paz
  if (revealPhase === 2 && grandmaAnim % 18 === 0) {
    spawnParticle(boss.x + 10, boss.y - 20, '#ffaacc', 3);
    spawnParticle(boss.x + 10, boss.y - 20, '#ffeeaa', 2);
  }
}

/* ===================== EFEITO DE TRANSFORMAÇÃO ===================== */
function drawRevealTransform() {
  if (revealTimer < 4 || !boss) return;
  const sx = boss.x - scrollX;
  const groundY = boss.y;
  const t = revealTimer / 70; // 0..1
  const shake = (Math.random() - 0.5) * (8 - t * 6);

  // Raios de luz saindo do centro
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + frame * 0.02;
    const len = 10 + t * 25;
    const alpha = (1 - t) * 0.6;
    ctx.fillStyle = `rgba(200,100,255,${alpha})`;
    ctx.fillRect(
      sx + 10 + Math.cos(ang) * 12,
      groundY - 10 + Math.sin(ang) * 10,
      Math.max(1, len * 0.3), Math.max(1, len * 0.3)
    );
  }

  // Sobreposição parcial: sombra se dissolvendo e vovó emergindo
  ctx.globalAlpha = 1 - t;
  drawBossShadow_static(sx, groundY, shake);
  ctx.globalAlpha = t;
  drawBossGrandma();
  ctx.globalAlpha = 1;
}

// Versão estática do boss sombra (sem atualizar state)
function drawBossShadow_static(sx, groundY, shake) {
  ctx.fillStyle = '#12001f';
  ctx.fillRect(sx - 2 + shake, groundY - 22, 24, 34);
  ctx.fillStyle = '#1e0035';
  ctx.fillRect(sx + shake, groundY - 20, 20, 28);
  ctx.fillStyle = '#180028';
  ctx.fillRect(sx + 2, groundY - 32, 16, 14);
  ctx.fillRect(sx + 5, groundY - 37, 10, 7);
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(sx + 3, groundY - 26, 5, 5);
  ctx.fillRect(sx + 12, groundY - 26, 5, 5);
}

/* ===================== CHAPEUZINHO ===================== */
function drawPlayer() {
  const blink = player.invincible > 0 && frame % 4 < 2;
  if (blink) return;
  const f = Math.floor(frame / 8) % 2;
  const sx = player.x;

  // Corpo / capa vermelha
  ctx.fillStyle = '#cc2222';
  ctx.fillRect(sx + 1, player.y + 3, 8, 7);
  ctx.fillStyle = '#dd3333';
  ctx.fillRect(sx, player.y + 7, 10, 3);

  // Detalhe da capa (borda escura)
  ctx.fillStyle = '#991111';
  ctx.fillRect(sx, player.y + 9, 10, 1);

  // Rosto
  ctx.fillStyle = '#ffddcc';
  ctx.fillRect(sx + 2, player.y - 3, 6, 6);

  // Capuz
  ctx.fillStyle = '#cc2222';
  ctx.fillRect(sx + 1, player.y - 4, 8, 4);
  ctx.fillRect(sx + 3, player.y - 6, 4, 3);

  // Olhos
  ctx.fillStyle = '#332211';
  ctx.fillRect(sx + 3, player.y - 1, 1, 1);
  ctx.fillRect(sx + 6, player.y - 1, 1, 1);

  // Pernas
  ctx.fillStyle = '#ffddcc';
  ctx.fillRect(sx + 2, player.y + 10, 2, 2 + f);
  ctx.fillRect(sx + 6, player.y + 10, 2, 2 + (1 - f));

  // Cesta
  ctx.fillStyle = '#8a5a2a';
  ctx.fillRect(sx + (player.dir > 0 ? -2 : 9), player.y + 5, 3, 4);
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(sx + (player.dir > 0 ? -2 : 9), player.y + 5, 3, 1);
}

/* ===================== BOLAS DE FOGO ===================== */
function drawFireballs() {
  fireballs.forEach(fb => {
    const sx = fb.x - scrollX;
    const glow = Math.floor(frame / 3) % 2;
    // Rastro
    ctx.fillStyle = 'rgba(255,100,0,0.35)';
    ctx.fillRect(sx - fb.dir * 6, fb.y, 4, 2);
    ctx.fillStyle = 'rgba(255,150,0,0.5)';
    ctx.fillRect(sx - fb.dir * 3, fb.y - 1, 3, 3);
    // Núcleo
    ctx.fillStyle = glow ? '#ffaa00' : '#ff5500';
    ctx.fillRect(sx - 2, fb.y - 2, 6, 6);
    ctx.fillStyle = '#ffee88';
    ctx.fillRect(sx - 1, fb.y - 1, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx, fb.y, 2, 2);
  });
}

/* ===================== PROJÉTEIS DO BOSS ===================== */
function drawBossProjectiles() {
  bossProjectiles.forEach(p => {
    const sx = p.x - scrollX;
    const glow = Math.floor(frame / 4) % 2;
    ctx.fillStyle = glow ? '#aa00ff' : '#6600cc';
    ctx.fillRect(sx - 3, p.y - 3, 7, 7);
    ctx.fillStyle = '#dd66ff';
    ctx.fillRect(sx - 1, p.y - 1, 3, 3);
  });
}

/* ===================== PARTÍCULAS ===================== */
function drawParticles() {
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 38;
    ctx.fillRect(p.x - scrollX, p.y, p.size, p.size);
  });
  ctx.globalAlpha = 1;
}

/* ===================== HUD ===================== */
function drawHUD() {
  let hpStr = '';
  for (let i = 0; i < 3; i++) hpStr += (i < hp ? '♥' : '♡');
  document.getElementById('hp').textContent = hpStr;
  document.getElementById('stage').textContent = STAGES[Math.min(stage, 3)];
  document.getElementById('sc').textContent = 'PTS: ' + score;
}

/* ===================== UPDATE ===================== */
function update() {
  frame++;
  bgScroll += 0.5;

  particles = particles.filter(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
    return p.life > 0;
  });

  if (msgTimer > 0) { msgTimer--; if (msgTimer === 0) hideMsg(); }
  if (gameState === 'menu' || gameState === 'howto') return;
  if (gameState === 'dead' || gameState === 'win') return;

  /* ----- ESTADO: REVEAL ----- */
  if (gameState === 'reveal') {
    revealTimer++;
    if (revealPhase === 0 && revealTimer >= 70) {
      revealPhase = 1;
      screenShake = 14;
      grandmaAnim = 0;
    }
    if (revealPhase === 1 && revealTimer >= 180) {
      revealPhase = 2;
    }
    if (screenShake > 0) screenShake -= 0.4;
    if (boss) {
      const targetX = scrollX + W / 2 - 10;
      boss.x += (targetX - boss.x) * 0.05;
      boss.y = 80;
    }
    return;
  }

  stageTimer++;

  /* ----- MOVIMENTO DA CHAPEUZINHO ----- */
  if (keys['ArrowLeft'] || keys['a']) { player.vx = -1.5; player.dir = -1; }
  else if (keys['ArrowRight'] || keys['d']) { player.vx = 1.5; player.dir = 1; }
  else player.vx *= 0.72;

  // Pulo
  if ((keys['z'] || keys['Z'] || keys[' ']) && player.onGround) {
    player.vy = -3.5;
    player.onGround = false;
    spawnParticle(player.x + 5, player.y + 12, '#88cc44', 4);
  }

  // Fogo — funciona em QUALQUER estado (play OU boss)
  if (player.fireCooldown > 0) player.fireCooldown--;
  if ((keys['x'] || keys['X']) && player.fireCooldown <= 0) {
    shootFireball();
    player.fireCooldown = 18;
  }

  player.vy += 0.2;
  player.x += player.vx;
  player.y += player.vy;

  const groundY = 98;
  if (player.y >= groundY) { player.y = groundY; player.vy = 0; player.onGround = true; }

  platforms.forEach(p => {
    const sx = p.x - scrollX;
    if (player.x + 8 > sx && player.x < sx + p.w &&
        player.y + 12 >= p.y && player.y + 12 <= p.y + 8 && player.vy >= 0) {
      player.y = p.y - 12; player.vy = 0; player.onGround = true;
    }
  });

  /* ----- CÂMERA: trava na arena durante boss ----- */
  if (gameState === 'play') {
    if (player.x > W * 0.5 && scrollX < levelLen - W) {
      const advance = player.x - W * 0.5;
      scrollX += advance * 0.08;
      player.x -= advance * 0.08;
    }
    if (player.x < 5) player.x = 5;
  } else if (gameState === 'boss') {
    if (player.x < bossArenaX + 8) player.x = bossArenaX + 8;
    if (player.x > bossArenaX + W - 18) player.x = bossArenaX + W - 18;
  }

  /* ----- BOLAS DE FOGO: colisão ----- */
  fireballs = fireballs.filter(fb => {
    fb.x += fb.vx;
    fb.life--;
    const fbScreenX = fb.x - scrollX;
    if (fbScreenX < -12 || fbScreenX > W + 12 || fb.life <= 0) return false;

    let hit = false;

    // Colisão com inimigos
    enemies.forEach(e => {
      if (hit || e.dead) return;
      if (Math.abs(fb.x - (e.x + 5)) < 10 && Math.abs(fb.y - (e.y + 5)) < 10) {
        e.hp--; hit = true;
        spawnParticle(e.x + 5, e.y, '#ff8800', 8);
        score += 10;
        if (e.hp <= 0) {
          spawnParticle(e.x + 5, e.y, '#ffaa00', 12);
          score += 40; e.dead = true;
        }
      }
    });

    // ===== COLISÃO COM BOSS =====
    // Usamos coordenada ABSOLUTA do boss vs coordenada ABSOLUTA da fireball
    // (ambos em coordenadas de mundo, não de tela)
    if (boss && !hit && gameState === 'boss') {
      const bossWorldCenterX = boss.x + 10; // boss.x é coordenada de mundo
      const bossWorldCenterY = boss.y - 10;
      if (Math.abs(fb.x - bossWorldCenterX) < 20 && Math.abs(fb.y - bossWorldCenterY) < 28) {
        boss.hp--;
        boss.hit = true;
        boss.hitTimer = 10;
        score += 5;
        spawnParticle(boss.x + 10, boss.y - 10, '#cc00ff', 7);
        hit = true;
      }
    }

    return !hit;
  });

  /* ----- INIMIGOS ----- */
  if (gameState === 'play') {
    spawnTimer++;
    if (spawnTimer > 300 - stage * 25) {
      spawnTimer = 0;
      spawnEnemy();
    }

    enemies = enemies.filter(e => {
      if (e.dead) return false;
      const sx = e.x - scrollX;
      if (sx < -50) return false;

      if (e.type === 'bat') {
        e.x += e.vx;
      } else {
        e.x += e.vx; e.vy += 0.2; e.y += e.vy;
        if (e.y >= 90) { e.y = 90; e.vy = 0; }
      }
      if (sx < 12) e.vx = Math.abs(e.vx);

      if (player.invincible <= 0) {
        if (Math.abs(player.x + 5 - e.x - 5) < 11 && Math.abs(player.y + 6 - e.y - 5) < 11) {
          takeDamage();
        }
      }
      return true;
    });
  }

  if (player.invincible > 0) player.invincible--;
  if (boss && boss.hitTimer > 0) { boss.hitTimer--; if (boss.hitTimer === 0) boss.hit = false; }

  /* ----- PROJÉTEIS DO BOSS ----- */
  bossProjectiles = bossProjectiles.filter(p => {
    p.x += p.vx; p.y += p.vy; p.life--;
    const sx = p.x - scrollX;
    if (sx < -10 || sx > W + 10 || p.life <= 0) return false;
    if (player.invincible <= 0 &&
        Math.abs(player.x + 5 - p.x) < 9 && Math.abs(player.y + 5 - p.y) < 9) {
      takeDamage(); return false;
    }
    return true;
  });

  /* ----- BOSS APARECE ----- */
  if (gameState === 'play' && scrollX > levelLen - W - 60 && !bossAppeared) {
    bossAppeared = true;
    bossArenaX = scrollX;
    bossIntroTimer = 0;
    screenShake = 6;
    showMsg('⚠ Uma sombra misteriosa\nse aproxima...', 130);
    boss = {
      x: scrollX + W * 0.68, // coordenada de MUNDO
      y: 80,
      w: 25, h: 40,
      hp: 24 + stage * 10, maxHp: 24 + stage * 10,
      vx: -(0.28 + stage * 0.07),
      hit: false, hitTimer: 0
    };
    gameState = 'boss';
  }

  /* ----- LÓGICA DO BOSS ----- */
  if (gameState === 'boss' && boss) {
    bossIntroTimer++;

    // Movimento oscilante dentro da arena (coordenadas de MUNDO)
    boss.x += boss.vx + Math.sin(frame * 0.022) * 0.5;
    const arenaLeft  = bossArenaX + 25;
    const arenaRight = bossArenaX + W - 28;
    if (boss.x < arenaLeft)  { boss.x = arenaLeft;  boss.vx =  Math.abs(boss.vx); }
    if (boss.x > arenaRight) { boss.x = arenaRight; boss.vx = -Math.abs(boss.vx); }

    // Boss lança projéteis após introdução
    if (bossIntroTimer > 50 && frame % (70 - stage * 6) === 0) {
      const angle = Math.atan2(
        (player.y + 6) - boss.y,
        (player.x + 5) - (boss.x + 10)
      );
      bossProjectiles.push({
        x: boss.x + 10, y: boss.y,
        vx: Math.cos(angle) * 1.6,
        vy: Math.sin(angle) * 1.2,
        life: 120
      });
    }

    // Boss toca o jogador
    if (player.invincible <= 0 && bossIntroTimer > 40) {
      const bossScreenX = boss.x - scrollX;
      const playerScreenX = player.x;
      if (Math.abs(playerScreenX + 5 - bossScreenX - 10) < 18 &&
          Math.abs(player.y + 6 - boss.y - 5) < 24) {
        takeDamage();
      }
    }

    /* ----- BOSS DERROTADO ----- */
    if (boss.hp <= 0) {
      if (stage < 2) {
        spawnParticle(boss.x + 10, boss.y, '#ffaa00', 26);
        spawnParticle(boss.x + 10, boss.y, '#ffffff', 18);
        score += 200;
        boss = null;
        bossProjectiles = [];
        stage++;
        gameState = 'play';
        showMsg('✓ Monstro derrotado!\n\nNovos perigos aguardam na floresta...', 160);
        setTimeout(() => initStage(), 2000);
      } else {
        // REVELAÇÃO FINAL
        bossProjectiles = [];
        gameState = 'reveal';
        revealTimer = 0;
        revealPhase = 0;
        grandmaAnim = 0;
        screenShake = 10;
        boss.hp = 0;

        spawnParticle(boss.x + 10, boss.y - 10, '#ffffff', 20);
        spawnParticle(boss.x + 10, boss.y - 10, '#cc00ff', 16);

        setTimeout(() => showMsg('⚡ A sombra começa a\nse desfazer...', 70), 400);
        setTimeout(() => { screenShake = 18; spawnParticle(boss ? boss.x + 10 : 120, 80, '#ffffff', 30); }, 1200);
        setTimeout(() => showMsg('O SEGREDO DA FLORESTA\nESTÁ PRESTES A SER\nREVELADO...', 90), 1800);
        setTimeout(() => showMsg('O monstro misterioso...\n\n...é a VOVÓ! 👵', 120), 3200);
        setTimeout(() => showMsg('Ela virou guardiã da floresta\npara protegê-la dos\nvisitantes descuidados!', 150), 5000);
        setTimeout(() => showMsg('Mas vendo a coragem\nda Chapeuzinho...\n\nEla sorri e acena. 😊', 150), 7200);
        setTimeout(() => {
          hideMsg();
          const el = document.getElementById('msg');
          el.textContent = '🏆 PARABÉNS! 🏆\n\nVocê descobriu o segredo\nda floresta!\n\nPontuação: ' + score + '\n\n[ Z para jogar novamente ]';
          el.style.display = 'block';
          gameState = 'win';
        }, 9500);
      }
    }
  }
}

function takeDamage() {
  if (player.invincible > 0) return;
  hp--;
  player.invincible = 85;
  player.vy = -2;
  screenShake = 4;
  spawnParticle(player.x + 5, player.y, '#ff4444', 12);
  if (hp <= 0) {
    gameState = 'dead';
    showMsg('💀 Fim de jogo!\n\nO monstro venceu...\n\n[ Z para tentar novamente ]', 9999);
  }
}

/* ===================== RENDER ===================== */
function render() {
  ctx.save();
  if (screenShake > 0) {
    ctx.translate(
      (Math.random() - 0.5) * screenShake,
      (Math.random() - 0.5) * screenShake
    );
  }

  ctx.clearRect(-10, -10, W + 20, H + 20);
  drawBg();
  drawPlatforms();
  drawParticles();
  drawFireballs();
  drawBossProjectiles();

  // Inimigos só na fase de exploração
  if (gameState === 'play') {
    enemies.forEach(e => drawEnemy(e));
  }

  // Boss: qual estado desenhar?
  if (gameState === 'boss' && boss) {
    drawBossShadow();
  } else if (gameState === 'reveal' && boss) {
    if (revealPhase === 0) {
      drawRevealTransform(); // transição animada
    } else {
      drawBossGrandma(); // vovó totalmente revelada
    }
  } else if (gameState === 'win' && boss) {
    drawBossGrandma(); // vovó sorrindo na tela de vitória
  }

  drawPlayer();

  // Névoa lateral
  const p = getPal();
  ctx.fillStyle = p.fog;
  ctx.fillRect(0, 0, 32, H);
  ctx.fillRect(W - 32, 0, 32, H);

  // Flash branco no momento da quebra (reveal phase 0 → 1)
  if (gameState === 'reveal' && revealPhase === 0 && revealTimer >= 68 && revealTimer < 75) {
    ctx.fillStyle = `rgba(255,255,255,${0.7 - (revealTimer - 68) * 0.1})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();
  drawHUD();
}

function gameLoop() {
  update();
  if (gameState !== 'menu' && gameState !== 'howto') render();
  requestAnimationFrame(gameLoop);
}

/* ===================== TELAS ===================== */
const menuScreen = document.getElementById('menuScreen');
const howToScreen = document.getElementById('howToScreen');
const gameTitleEl = document.getElementById('title');
const ui = document.getElementById('ui');
const mobileControls = document.getElementById('mobileControls');
const controlsHint = document.getElementById('controlsHint');

function showMenu() {
  gameState = 'menu';
  menuScreen.classList.remove('hidden');
  howToScreen.classList.add('hidden');
  gameTitleEl.classList.add('hidden');
  canvas.classList.add('hidden');
  ui.classList.add('hidden');
  mobileControls.classList.add('hidden');
  controlsHint.classList.add('hidden');
  hideMsg();
}

function startGame() {
  hp = 3; score = 0; stage = 0; frame = 0;
  scrollX = 0; screenShake = 0;
  particles = []; fireballs = []; bossProjectiles = [];
  revealTimer = 0; revealPhase = 0; grandmaAnim = 0;
  gameState = 'play';
  menuScreen.classList.add('hidden');
  howToScreen.classList.add('hidden');
  gameTitleEl.classList.remove('hidden');
  canvas.classList.remove('hidden');
  ui.classList.remove('hidden');
  controlsHint.classList.remove('hidden');
  if (isTouchDevice) mobileControls.classList.remove('hidden');
  hideMsg();
  initStage();
}

document.getElementById('playBtn').addEventListener('click', startGame);
document.getElementById('howToBtn').addEventListener('click', () => {
  gameState = 'howto';
  menuScreen.classList.add('hidden');
  howToScreen.classList.remove('hidden');
});
document.getElementById('backBtn').addEventListener('click', showMenu);

/* ===================== TECLADO ===================== */
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if ((gameState === 'dead' || gameState === 'win') && (e.key === 'z' || e.key === 'Z')) {
    startGame();
  }
  if (['ArrowLeft','ArrowRight','ArrowUp',' ','z','Z','x','X'].includes(e.key)) {
    e.preventDefault();
  }
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

/* ===================== TOUCH / ANDROID ===================== */
const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

function bindHold(id, key) {
  const el = document.getElementById(id);
  const press = ev => { ev.preventDefault(); keys[key] = true; };
  const release = ev => { ev.preventDefault(); keys[key] = false; };
  el.addEventListener('touchstart', press, { passive: false });
  el.addEventListener('touchend', release, { passive: false });
  el.addEventListener('touchcancel', release, { passive: false });
  el.addEventListener('mousedown', press);
  el.addEventListener('mouseup', release);
  el.addEventListener('mouseleave', release);
}

bindHold('btnLeft', 'ArrowLeft');
bindHold('btnRight', 'ArrowRight');
bindHold('btnJump', 'z');
bindHold('btnFire', 'x');

document.getElementById('msg').addEventListener('click', () => {
  if (gameState === 'dead' || gameState === 'win') startGame();
});
document.getElementById('msg').addEventListener('touchstart', ev => {
  if (gameState === 'dead' || gameState === 'win') { ev.preventDefault(); startGame(); }
}, { passive: false });

document.body.addEventListener('touchmove', e => {
  if (gameState !== 'menu' && gameState !== 'howto') e.preventDefault();
}, { passive: false });

/* ===================== INÍCIO ===================== */
showMenu();
gameLoop();
