/* ========================================
   O SEGREDO DA FLORESTA - LÓGICA DO JOGO
   ======================================== */

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = 240, H = 135;

const STAGES = ['FLORESTA', 'PÂNTANO', 'CAVERNA', 'REVELAÇÃO'];
let stage = 0, score = 0, hp = 3, frame = 0;
let gameState = 'menu'; // menu, howto, play, boss, win, dead, reveal
let keys = {};
let particles = [];
let fireballs = [];

// Jogador: apenas Chapeuzinho Vermelho
const player = {
  x: 30, y: 90, w: 10, h: 12, vx: 0, vy: 0,
  onGround: false, dir: 1, animFrame: 0,
  fireCooldown: 0, invincible: 0
};

let enemies = [];
let obstacles = [];
let platforms = [];
let boss = null;
let scrollX = 0;
let levelLen = 800;
let bossAppeared = false;
let revealTimer = 0;
let stageTimer = 0;
let msgTimer = 0;
let spawnTimer = 0;
let bgScroll = 0;

// Paletas de cores por fase
const palettes = [
  { sky: '#1a2a1a', ground: '#2d4a1e', groundTop: '#3a6b27', tree1: '#1e3d12', tree2: '#2d5a1e', fog: '#1a2a1aaa' },
  { sky: '#1a1a2a', ground: '#2a1f2a', groundTop: '#3d2b3d', tree1: '#151020', tree2: '#2a1a2a', fog: '#1a1a2aaa' },
  { sky: '#0a0a0a', ground: '#1a1410', groundTop: '#2a1e14', tree1: '#100c08', tree2: '#1a1208', fog: '#0a0a0aaa' },
  { sky: '#0a0a1a', ground: '#1a1a2a', groundTop: '#2a2a3a', tree1: '#0a0a20', tree2: '#1a1a30', fog: '#0a0a1aaa' }
];

function getPal() { return palettes[Math.min(stage, 3)]; }

/* ===================== INICIALIZAÇÃO DE FASE ===================== */
function initStage() {
  enemies = []; obstacles = []; platforms = []; fireballs = [];
  scrollX = 0; bossAppeared = false; boss = null;
  player.x = 30; player.y = 70; player.vx = 0; player.vy = 0;
  spawnTimer = 0; stageTimer = 0;
  levelLen = 800 + stage * 200;
  bgScroll = 0;

  for (let i = 0; i < 8 + stage * 2; i++) {
    let px = 120 + i * (70 + Math.random() * 40);
    let py = 60 + Math.random() * 40;
    let pw = 20 + Math.random() * 20;
    platforms.push({ x: px, y: py, w: pw });
  }

  for (let i = 0; i < 5 + stage * 3; i++) {
    let ox = 100 + i * (80 + Math.random() * 60);
    obstacles.push({ x: ox, type: Math.random() > 0.5 ? 'rock' : 'stump' });
  }

  for (let i = 0; i < 3 + stage; i++) {
    spawnEnemy(150 + i * 100);
  }
}

function spawnEnemy(x) {
  const types = ['wolf', 'spider', 'bat', 'mushroom'];
  const t = types[Math.floor(Math.random() * Math.min(2 + stage, 4))];
  enemies.push({
    x: x || scrollX + 260, y: 90, w: 10, h: 10,
    vx: -(0.3 + Math.random() * 0.3 + stage * 0.1),
    vy: 0, type: t, animFrame: 0, hp: 1 + (stage > 1 ? 1 : 0)
  });
}

function spawnParticle(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y, vx: (Math.random() - 0.5) * 2, vy: -(Math.random() * 2 + 0.5),
      life: 20 + Math.random() * 15, color, size: 2
    });
  }
}

function shootFireball() {
  fireballs.push({
    x: player.x + (player.dir > 0 ? 9 : -2),
    y: player.y + 4,
    vx: 2.6 * player.dir,
    dir: player.dir,
    life: 90
  });
  spawnParticle(player.x + (player.dir > 0 ? 9 : -2), player.y + 4, '#ffaa00', 4);
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

/* ===================== DESENHO: FUNDO ===================== */
function drawBg() {
  const p = getPal();
  ctx.fillStyle = p.sky;
  ctx.fillRect(0, 0, W, H);

  if (stage > 0) {
    ctx.fillStyle = '#aaaacc';
    ctx.fillRect(200, 8, 6, 6);
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(201, 9, 4, 4);
  } else {
    ctx.fillStyle = '#ffee88';
    for (let i = 0; i < 12; i++) {
      let sx = (i * 37 + 10) % W;
      let sy = 5 + (i * 13) % 25;
      ctx.fillRect(sx, sy, 1, 1);
    }
  }

  ctx.fillStyle = p.tree1;
  for (let i = 0; i < 8; i++) {
    let tx = ((i * 40 - bgScroll * 0.3 + 800) % (W + 20)) - 10;
    drawTree(tx, 60, 10, 20);
  }

  ctx.fillStyle = p.ground;
  ctx.fillRect(0, 110, W, H - 110);
  ctx.fillStyle = p.groundTop;
  ctx.fillRect(0, 110, W, 3);

  ctx.fillStyle = p.groundTop;
  for (let i = 0; i < 12; i++) {
    let gx = ((i * 25 - scrollX * 0.8 + 1000) % (W + 10)) - 5;
    ctx.fillRect(gx, 107, 2, 3);
    ctx.fillRect(gx + 3, 108, 1, 2);
  }

  ctx.fillStyle = p.tree2;
  for (let i = 0; i < 5; i++) {
    let tx = ((i * 60 - bgScroll * 0.7 + 800) % (W + 30)) - 15;
    drawTree(tx, 75, 14, 30);
  }
}

function drawTree(x, y, w, h) {
  ctx.fillRect(x + w / 2 - 2, y + h * 0.6, 4, h * 0.4);
  ctx.fillRect(x, y, w, h * 0.4);
  ctx.fillRect(x + 2, y - h * 0.25, w - 4, h * 0.35);
}

function drawPlatforms() {
  platforms.forEach(p => {
    let sx = p.x - scrollX;
    if (sx < -30 || sx > W + 10) return;
    const pal = getPal();
    ctx.fillStyle = pal.groundTop;
    ctx.fillRect(sx, p.y, p.w, 5);
    ctx.fillStyle = pal.ground;
    ctx.fillRect(sx, p.y + 3, p.w, 4);
  });
}

function drawObstacles() {
  obstacles.forEach(o => {
    let sx = o.x - scrollX;
    if (sx < -10 || sx > W + 10) return;
    if (o.type === 'rock') {
      ctx.fillStyle = '#555566';
      ctx.fillRect(sx, 105, 8, 6);
      ctx.fillStyle = '#666677';
      ctx.fillRect(sx + 1, 104, 6, 2);
    } else {
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(sx + 1, 105, 6, 6);
      ctx.fillStyle = '#3a2010';
      ctx.fillRect(sx, 108, 8, 3);
    }
  });
}

/* ===================== DESENHO: INIMIGOS ===================== */
function drawEnemy(e) {
  let sx = e.x - scrollX;
  if (sx < -15 || sx > W + 15) return;
  let t = e.type, f = Math.floor(frame / 10) % 2;
  if (t === 'wolf') {
    ctx.fillStyle = '#887788';
    ctx.fillRect(sx, e.y - 2, 10, 7);
    ctx.fillStyle = '#998899';
    ctx.fillRect(sx + 1, e.y - 4, 5, 4);
    ctx.fillStyle = '#cc3333';
    ctx.fillRect(sx + 7, e.y - 1, 2, 1);
    ctx.fillStyle = '#665566';
    ctx.fillRect(sx + 1, e.y + 5, 2, 2 + f);
    ctx.fillRect(sx + 5, e.y + 5, 2, 2 + (1 - f));
  } else if (t === 'spider') {
    ctx.fillStyle = '#222244';
    ctx.fillRect(sx + 2, e.y, 6, 5);
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(sx + 3, e.y + 1, 1, 1);
    ctx.fillRect(sx + 6, e.y + 1, 1, 1);
    ctx.fillStyle = '#111133';
    ctx.fillRect(sx + f, e.y + 2, 2, 1);
    ctx.fillRect(sx + 8 - f, e.y + 2, 2, 1);
    ctx.fillRect(sx + 1, e.y + 3 + f, 1, 2);
    ctx.fillRect(sx + 8, e.y + 3 + f, 1, 2);
  } else if (t === 'bat') {
    e.y = 75 + Math.sin(frame * 0.05 + e.x) * 10;
    ctx.fillStyle = '#332244';
    ctx.fillRect(sx + 3, e.y + 1, 4, 4);
    ctx.fillStyle = '#221133';
    ctx.fillRect(sx, e.y + f, 3, 2);
    ctx.fillRect(sx + 7, e.y + f, 3, 2);
    ctx.fillStyle = '#ffaaaa';
    ctx.fillRect(sx + 4, e.y, 1, 1);
    ctx.fillRect(sx + 5, e.y, 1, 1);
  } else if (t === 'mushroom') {
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(sx + 1, e.y - 2, 8, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx + 2, e.y - 1, 2, 1);
    ctx.fillRect(sx + 6, e.y - 1, 2, 1);
    ctx.fillStyle = '#ddccaa';
    ctx.fillRect(sx + 2, e.y + 3, 6, 4);
    if (f) {
      ctx.fillStyle = '#bb1111';
      ctx.fillRect(sx, e.y + 1, 1, 3);
      ctx.fillRect(sx + 9, e.y + 1, 1, 3);
    }
  }
}

/* ===================== DESENHO: CHEFE ===================== */
function drawBoss() {
  if (!boss) return;
  let sx = boss.x - scrollX;
  let f = Math.floor(frame / 8) % 4;
  let shake = boss.hit ? 2 : 0;

  if (gameState === 'reveal') {
    ctx.fillStyle = '#9933aa';
    ctx.fillRect(sx - 5 + (Math.random() * shake * 2 - shake), boss.y - 25, 30, 40);
    ctx.fillStyle = '#cc66ff';
    ctx.fillRect(sx, boss.y - 35, 20, 18);
    ctx.fillStyle = '#ffddcc';
    ctx.fillRect(sx + 3, boss.y - 33, 14, 14);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(sx + 5, boss.y - 29, 3, 3);
    ctx.fillRect(sx + 12, boss.y - 29, 3, 3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(sx + 6, boss.y - 28, 2, 2);
    ctx.fillRect(sx + 13, boss.y - 28, 2, 2);
    ctx.fillStyle = '#333333';
    ctx.fillRect(sx + 4, boss.y - 28, 5, 4);
    ctx.fillRect(sx + 11, boss.y - 28, 5, 4);
    ctx.fillRect(sx + 9, boss.y - 27, 2, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx + 5, boss.y - 38, 10, 6);
    ctx.fillRect(sx + 7, boss.y - 40, 6, 3);

    let barW = Math.max(0, (boss.hp / boss.maxHp) * 60);
    ctx.fillStyle = '#440000';
    ctx.fillRect(sx - 5, boss.y - 45, 60, 5);
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(sx - 5, boss.y - 45, barW, 5);
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(sx - 5, boss.y - 45, barW, 2);
    return;
  }

  let bob = Math.sin(frame * 0.05) * 2;
  ctx.fillStyle = '#110022';
  ctx.fillRect(sx - 3, boss.y - 20 + bob, 26, 35);
  ctx.fillStyle = '#220033';
  ctx.fillRect(sx, boss.y - 28 + bob, 20, 14);
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(sx + 3, boss.y - 24 + bob, 4, 4);
  ctx.fillRect(sx + 13, boss.y - 24 + bob, 4, 4);
  ctx.fillStyle = '#110022';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(sx - 5 + i * 6 + Math.sin(frame * 0.1 + i) * 2, boss.y + 12, 4, 6 + f);
    ctx.fillRect(sx + 12 + i * 3 + Math.sin(frame * 0.1 + i) * 2, boss.y + 12, 4, 5 + f);
  }

  let barW = Math.max(0, (boss.hp / boss.maxHp) * 60);
  ctx.fillStyle = '#440000';
  ctx.fillRect(sx - 5, boss.y - 35, 60, 5);
  ctx.fillStyle = '#8800aa';
  ctx.fillRect(sx - 5, boss.y - 35, barW, 5);
  ctx.fillStyle = '#cc00ff';
  ctx.fillRect(sx - 5, boss.y - 35, barW, 2);

  ctx.fillStyle = '#cc00ff';
  ctx.font = '5px monospace';
  ctx.fillText('???', sx + 8, boss.y - 38);
}

/* ===================== DESENHO: CHAPEUZINHO ===================== */
function drawPlayer() {
  let f = Math.floor(frame / 8) % 2;
  let blink = player.invincible > 0 && frame % 4 < 2;
  if (blink) return;

  let sx = player.x;

  ctx.fillStyle = '#cc2222';
  ctx.fillRect(sx + 1, player.y + 3, 8, 7);
  ctx.fillStyle = '#dd3333';
  ctx.fillRect(sx, player.y + 7, 10, 3);
  ctx.fillStyle = '#ffddcc';
  ctx.fillRect(sx + 2, player.y - 3, 6, 6);
  ctx.fillStyle = '#cc2222';
  ctx.fillRect(sx + 1, player.y - 4, 8, 4);
  ctx.fillRect(sx + 3, player.y - 6, 4, 3);
  ctx.fillStyle = '#332211';
  ctx.fillRect(sx + 3, player.y - 1, 1, 1);
  ctx.fillRect(sx + 6, player.y - 1, 1, 1);
  ctx.fillStyle = '#ffddcc';
  ctx.fillRect(sx + 2, player.y + 10, 2, 2 + f);
  ctx.fillRect(sx + 6, player.y + 10, 2, 2 + (1 - f));

  // Cesta na mão (detalhe)
  ctx.fillStyle = '#8a5a2a';
  ctx.fillRect(sx + (player.dir > 0 ? -2 : 9), player.y + 6, 3, 3);
}

function drawFireballs() {
  fireballs.forEach(fb => {
    let sx = fb.x - scrollX;
    let glow = Math.floor(frame / 4) % 2;
    ctx.fillStyle = glow ? '#ffaa00' : '#ff5500';
    ctx.fillRect(sx - 2, fb.y - 2, 5, 5);
    ctx.fillStyle = '#ffee88';
    ctx.fillRect(sx - 1, fb.y - 1, 3, 3);
    // rastro
    ctx.fillStyle = 'rgba(255,120,0,0.4)';
    ctx.fillRect(sx - fb.dir * 4 - 1, fb.y, 3, 2);
  });
}

function drawParticles() {
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 35;
    ctx.fillRect(p.x - scrollX, p.y, p.size, p.size);
  });
  ctx.globalAlpha = 1;
}

function drawHUD() {
  let hpStr = '';
  for (let i = 0; i < 3; i++) hpStr += (i < hp ? '♥' : '♡');
  document.getElementById('hp').textContent = hpStr;
  document.getElementById('stage').textContent = STAGES[Math.min(stage, 3)];
  document.getElementById('sc').textContent = 'PTS: ' + score;
}

/* ===================== ATUALIZAÇÃO / FÍSICA ===================== */
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

  if (gameState === 'reveal') {
    revealTimer++;
    if (boss) {
      boss.x += (W / 2 + scrollX - boss.x + 10) * 0.05;
      boss.y = 85;
      if (revealTimer % 80 === 0 && boss.hp > 0) {
        spawnParticle(boss.x, boss.y, '#aa00ff', 8);
      }
    }
    return;
  }

  stageTimer++;

  // Movimento
  if (keys['ArrowLeft'] || keys['a']) { player.vx = -1.5; player.dir = -1; }
  else if (keys['ArrowRight'] || keys['d']) { player.vx = 1.5; player.dir = 1; }
  else player.vx *= 0.7;

  // Pulo
  if ((keys['z'] || keys['Z'] || keys[' ']) && player.onGround) {
    player.vy = -3.5; player.onGround = false;
    spawnParticle(player.x + 5, player.y + 12, '#88cc44', 4);
  }

  // Bola de fogo
  if (player.fireCooldown > 0) player.fireCooldown--;
  if ((keys['x'] || keys['X']) && player.fireCooldown <= 0) {
    shootFireball();
    player.fireCooldown = 20;
  }

  player.vy += 0.2;
  player.x += player.vx;
  player.y += player.vy;

  const groundY = 98;
  if (player.y >= groundY) { player.y = groundY; player.vy = 0; player.onGround = true; }

  platforms.forEach(p => {
    let sx = p.x - scrollX;
    if (player.x + 8 > sx && player.x < sx + p.w &&
        player.y + 12 >= p.y && player.y + 12 <= p.y + 8 && player.vy >= 0) {
      player.y = p.y - 12; player.vy = 0; player.onGround = true;
    }
  });

  if (player.x < 5) player.x = 5;

  if (player.x > W * 0.5 && scrollX < levelLen - W) {
    let advance = player.x - W * 0.5;
    scrollX += advance * 0.08;
    player.x -= advance * 0.08;
  }

  if (player.invincible <= 0) {
    obstacles.forEach(o => {
      let sx = o.x - scrollX;
      if (player.x + 8 > sx && player.x < sx + 8 && player.y + 12 > 105 && player.y < 112) {
        takeDamage();
        player.vx = -2 * player.dir;
        player.vy = -2;
      }
    });
  }

  spawnTimer++;
  if (spawnTimer > 200 - stage * 20) {
    spawnTimer = 0;
    spawnEnemy();
  }

  // Atualizar bolas de fogo
  fireballs = fireballs.filter(fb => {
    fb.x += fb.vx;
    fb.life--;
    let sx = fb.x - scrollX;
    if (sx < -10 || sx > W + 10 || fb.life <= 0) return false;

    // Colisão com inimigos
    let hit = false;
    enemies.forEach(e => {
      if (!hit && Math.abs(fb.x - e.x) < 8 && Math.abs(fb.y - e.y) < 8) {
        e.hp--;
        hit = true;
        spawnParticle(e.x, e.y, '#ff8800', 8);
        score += 10;
        if (e.hp <= 0) {
          spawnParticle(e.x, e.y, '#ffaa00', 12);
          score += 40;
          e.dead = true;
        }
      }
    });

    // Colisão com chefe
    if (boss && !hit && Math.abs(fb.x - boss.x - 10) < 16 && Math.abs(fb.y - boss.y + 10) < 22) {
      boss.hp -= 1;
      boss.hit = true;
      score += 5;
      spawnParticle(boss.x + 10, boss.y, '#cc00ff', 5);
      setTimeout(() => { if (boss) boss.hit = false; }, 100);
      hit = true;
    }

    return !hit;
  });

  enemies = enemies.filter(e => {
    let sx = e.x - scrollX;
    if (sx < -40 || e.dead) return false;

    if (e.type === 'bat') {
      e.x += e.vx;
    } else {
      e.x += e.vx;
      e.vy += 0.2;
      e.y += e.vy;
      if (e.y >= 90) { e.y = 90; e.vy = 0; }
    }

    if (sx < 10) e.vx = Math.abs(e.vx);

    if (player.invincible <= 0) {
      if (Math.abs(player.x + 5 - e.x - 5) < 12 && Math.abs(player.y + 6 - e.y - 5) < 12) {
        takeDamage();
      }
    }
    return true;
  });

  if (player.invincible > 0) player.invincible--;

  // Chefe aparece
  if (scrollX > levelLen - W - 50 && !bossAppeared) {
    bossAppeared = true;
    showMsg('⚠ Uma sombra misteriosa se aproxima...', 120);
    boss = {
      x: scrollX + W + 30, y: 80,
      w: 25, h: 40,
      hp: 20 + stage * 10, maxHp: 20 + stage * 10,
      vx: -(0.4 + stage * 0.1), hit: false
    };
    gameState = 'boss';
  }

  if (gameState === 'boss' && boss) {
    boss.x += boss.vx + Math.sin(frame * 0.02) * 0.5;
    let bsx = boss.x - scrollX;
    if (bsx < 20) boss.vx = Math.abs(boss.vx) * 0.5;
    if (bsx > W - 30) boss.vx = -Math.abs(boss.vx) * 0.5;

    if (frame % (60 - stage * 5) === 0) {
      spawnParticle(boss.x + 10, boss.y, '#8800ff', 6);
    }

    if (player.invincible <= 0 && boss.x - scrollX < W) {
      let bsx2 = boss.x - scrollX;
      if (Math.abs(player.x + 5 - bsx2 - 12) < 20 && Math.abs(player.y + 6 - boss.y - 15) < 25) {
        takeDamage();
      }
    }

    if (boss.hp <= 0) {
      if (stage < 2) {
        spawnParticle(boss.x + 10, boss.y, '#ffaa00', 20);
        spawnParticle(boss.x + 10, boss.y, '#ffffff', 20);
        score += 200;
        boss = null;
        stage++;
        gameState = 'play';
        showMsg('✓ Monstro derrotado!\n\nNovos perigos aguardam...', 160);
        setTimeout(() => initStage(), 2000);
      } else {
        gameState = 'reveal';
        revealTimer = 0;
        boss.hp = boss.maxHp;
        showMsg('⚡ O SEGREDO REVELADO ⚡\n\nO monstro misterioso... é a VOVÓ!\n\nEla queria proteger a floresta\nde todos os visitantes!', 280);
        setTimeout(() => {
          document.getElementById('msg').style.display = 'none';
          document.getElementById('msg').textContent = '🏆 PARABÉNS! 🏆\n\nVocê descobriu o segredo!\n\nPontuação: ' + score + '\n\nPressione Z para jogar novamente';
          document.getElementById('msg').style.display = 'block';
          gameState = 'win';
        }, 5000);
      }
    }
  }
}

function takeDamage() {
  if (player.invincible > 0) return;
  hp--;
  player.invincible = 80;
  player.vy = -2;
  spawnParticle(player.x + 5, player.y, '#ff4444', 10);
  if (hp <= 0) {
    gameState = 'dead';
    showMsg('💀 Fim de jogo!\n\nO monstro venceu...\n\nPressione Z para tentar novamente', 9999);
  }
}

/* ===================== RENDERIZAÇÃO ===================== */
function render() {
  ctx.clearRect(0, 0, W, H);
  drawBg();
  drawPlatforms();
  drawObstacles();
  drawParticles();
  drawFireballs();
  enemies.forEach(e => drawEnemy(e));
  if (boss) drawBoss();
  drawPlayer();

  const p = getPal();
  ctx.fillStyle = p.fog;
  ctx.fillRect(0, 0, 30, H);
  ctx.fillRect(W - 30, 0, 30, H);

  drawHUD();
}

function gameLoop() {
  update();
  if (gameState !== 'menu' && gameState !== 'howto') render();
  requestAnimationFrame(gameLoop);
}

/* ===================== CONTROLE DE TELAS ===================== */
const menuScreen = document.getElementById('menuScreen');
const howToScreen = document.getElementById('howToScreen');
const gameTitle = document.getElementById('title');
const ui = document.getElementById('ui');
const mobileControls = document.getElementById('mobileControls');
const controlsHint = document.getElementById('controlsHint');

function showMenu() {
  gameState = 'menu';
  menuScreen.classList.remove('hidden');
  howToScreen.classList.add('hidden');
  gameTitle.classList.add('hidden');
  canvas.classList.add('hidden');
  ui.classList.add('hidden');
  mobileControls.classList.add('hidden');
  controlsHint.classList.add('hidden');
  hideMsg();
}

function startGame() {
  hp = 3; score = 0; stage = 0; frame = 0; scrollX = 0;
  particles = []; fireballs = [];
  gameState = 'play';
  menuScreen.classList.add('hidden');
  howToScreen.classList.add('hidden');
  gameTitle.classList.remove('hidden');
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

/* ===================== INPUT: TECLADO ===================== */
document.addEventListener('keydown', e => {
  keys[e.key] = true;

  if ((gameState === 'dead' || gameState === 'win') && (e.key === 'z' || e.key === 'Z')) {
    startGame();
  }
  if (gameState === 'play' || gameState === 'boss') e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

/* ===================== INPUT: TOUCH (ANDROID / MOBILE) ===================== */
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

// Toque na mensagem de game over / vitória reinicia o jogo
document.getElementById('msg').addEventListener('click', () => {
  if (gameState === 'dead' || gameState === 'win') startGame();
});
document.getElementById('msg').addEventListener('touchstart', (ev) => {
  if (gameState === 'dead' || gameState === 'win') { ev.preventDefault(); startGame(); }
}, { passive: false });

// Previne o scroll da página durante o jogo no mobile
document.body.addEventListener('touchmove', e => {
  if (gameState !== 'menu' && gameState !== 'howto') e.preventDefault();
}, { passive: false });

/* ===================== INÍCIO ===================== */
showMenu();
gameLoop();
