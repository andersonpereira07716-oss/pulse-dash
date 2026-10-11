const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = Math.min(window.innerWidth - 20, 400);
canvas.height = Math.min(window.innerHeight - 20, 600);

let gameState = 'MENU'; 
let gameMode = 'CLASSIC'; 
let score = 0;
let highScoreClassic = localStorage.getItem('pulse_high_classic') || 0;
let highScoreHardcore = localStorage.getItem('pulse_high_hardcore') || 0;
let totalGamesPlayed = parseInt(localStorage.getItem('pulse_total_games')) || 0;
let shakeTime = 0;

let hasShield = false;
let isBlitzActive = false; // Novo Power-up de Destruição
let slowMoTimer = 0;
let lives = 3;
let sessionOrbsCollected = 0;
let achievementPopup = '';
let achievementTimer = 0;

let currentThemeIndex = 0;
const themes = [
  { name: 'Neon Azul', player: '#38bdf8', bg: '#1e293b', hardcoreBg: '#1a0f12' },
  { name: 'Cyber Verde', player: '#4ade80', bg: '#064e3b', hardcoreBg: '#0f291e' },
  { name: 'Sunset Roxo', player: '#f472b6', bg: '#31103f', hardcoreBg: '#2a0f2b' }
];

let audioCtx = null;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
  try {
    initAudio();
    if (!audioCtx) return;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    let now = audioCtx.currentTime;

    if (type === 'coin') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'powerup') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(700, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now); osc.stop(now + 0.25);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(40, now + 0.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
    }
  } catch (e) {}
}

const player = {
  x: canvas.width / 2,
  y: canvas.height - 80,
  radius: 16,
  speed: 7,
  trail: []
};

let collectibles = [];
let hazards = [];
let powerups = [];
let particles = [];

const pauseBtn = { x: canvas.width - 45, y: 15, width: 30, height: 30 };
const themeBtn = { x: canvas.width - 90, y: 15, width: 35, height: 30 };

let keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') {
    if (gameState === 'MENU' || gameState === 'GAMEOVER') gameState = 'MENU';
    else if (gameState === 'PLAYING') gameState = 'PAUSED';
    else if (gameState === 'PAUSED') gameState = 'PLAYING';
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

canvas.addEventListener('touchstart', handleTouch);
canvas.addEventListener('click', handleTouch);

function handleTouch(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  if (gameState === 'PLAYING' || gameState === 'PAUSED') {
    if (x >= pauseBtn.x && x <= pauseBtn.x + pauseBtn.width && y >= pauseBtn.y && y <= pauseBtn.y + pauseBtn.height) {
      gameState = gameState === 'PLAYING' ? 'PAUSED' : 'PLAYING';
      return;
    }
    if (x >= themeBtn.x && x <= themeBtn.x + themeBtn.width && y >= themeBtn.y && y <= themeBtn.y + themeBtn.height) {
      currentThemeIndex = (currentThemeIndex + 1) % themes.length;
      return;
    }
  }

  if (gameState === 'MENU') {
    if (y > canvas.height / 2 - 95 && y < canvas.height / 2 - 45) {
      currentThemeIndex = (currentThemeIndex + 1) % themes.length;
      return;
    }
    if (y > canvas.height / 2 - 25 && y < canvas.height / 2 + 35) {
      gameMode = 'CLASSIC';
      startGame();
    } else if (y > canvas.height / 2 + 45 && y < canvas.height / 2 + 105) {
      gameMode = 'HARDCORE';
      startGame();
    }
    return;
  }

  if (gameState === 'GAMEOVER') {
    gameState = 'MENU';
    return;
  }

  if (gameState === 'PLAYING') player.x = x;
}

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (gameState === 'PLAYING') {
    const rect = canvas.getBoundingClientRect();
    player.x = e.touches[0].clientX - rect.left;
  }
});

function startGame() {
  score = 0;
  lives = gameMode === 'HARDCORE' ? 1 : 3;
  collectibles = [];
  hazards = [];
  powerups = [];
  particles = [];
  player.trail = [];
  hasShield = false;
  isBlitzActive = false;
  slowMoTimer = 0;
  sessionOrbsCollected = 0;
  totalGamesPlayed++;
  localStorage.setItem('pulse_total_games', totalGamesPlayed);
  player.x = canvas.width / 2;
  gameState = 'PLAYING';
}

function triggerShake(duration) { shakeTime = duration; }
function vibrateDevice(pattern) { if (navigator.vibrate) navigator.vibrate(pattern); }

function triggerAchievement(text) {
  achievementPopup = `🏆 Conquista: ${text}`;
  achievementTimer = 150; // Drenagem gradual na tela
}

function createParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      radius: Math.random() * 4 + 2,
      color,
      alpha: 1
    });
  }
}

function spawnEntities() {
  if (Math.random() < 0.03) {
    collectibles.push({ x: Math.random() * (canvas.width - 30) + 15, y: -15, radius: 10, speed: 3 + Math.random() * 2 });
  }

  // Novo Power-up Blitz (Cometa Destruidor) e os anteriores
  if (gameMode === 'CLASSIC' && Math.random() < 0.005) {
    let types = ['SHIELD', 'SLOW', 'BLITZ'];
    powerups.push({ 
      x: Math.random() * (canvas.width - 30) + 15, 
      y: -15, 
      radius: 12, 
      type: types[Math.floor(Math.random() * types.length)], 
      speed: 2.5 
    });
  }

  let speedMultiplier = slowMoTimer > 0 ? 0.5 : 1;
  let levelSpeedBonus = Math.floor(score / 50) * 0.5;
  let hardcoreMultiplier = gameMode === 'HARDCORE' ? 1.3 : 1.0;
  const spawnRate = Math.max(0.015, (0.04 - score * 0.0005)) * hardcoreMultiplier;
  
  if (Math.random() < spawnRate) {
    hazards.push({ x: Math.random() * (canvas.width - 30) + 15, y: -20, size: 22, speed: (4 + levelSpeedBonus + Math.min(score * 0.15, 6)) * speedMultiplier * hardcoreMultiplier });
  }
}

function update() {
  if (gameState !== 'PLAYING') return;

  if (slowMoTimer > 0) slowMoTimer--;
  if (achievementTimer > 0) achievementTimer--;

  if (keys['ArrowLeft'] || keys['KeyA']) player.x -= player.speed;
  if (keys['ArrowRight'] || keys['KeyD']) player.x += player.speed;

  player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));

  player.trail.push({ x: player.x, y: player.y });
  if (player.trail.length > 8) player.trail.shift();

  spawnEntities();

  for (let i = collectibles.length - 1; i >= 0; i--) {
    let c = collectibles[i];
    c.y += c.speed;
    let dist = Math.hypot(player.x - c.x, player.y - c.y);
    if (dist < player.radius + c.radius) {
      score += gameMode === 'HARDCORE' ? 20 : 10;
      sessionOrbsCollected++;
      
      if (sessionOrbsCollected === 10) triggerAchievement("Coletor Iniciante (10 Orbes)");
      if (sessionOrbsCollected === 25) triggerAchievement("Mestre dos Desvios (25 Orbes)");

      createParticles(c.x, c.y, '#facc15', 12);
      vibrateDevice(30);
      playSound('coin');
      collectibles.splice(i, 1);
      continue;
    }
    if (c.y > canvas.height + 20) collectibles.splice(i, 1);
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    let p = powerups[i];
    p.y += p.speed;
    let dist = Math.hypot(player.x - p.x, player.y - p.y);
    if (dist < player.radius + p.radius) {
      if (p.type === 'SHIELD') {
        hasShield = true;
        createParticles(p.x, p.y, '#38bdf8', 20);
      } else if (p.type === 'SLOW') {
        slowMoTimer = 180;
        createParticles(p.x, p.y, '#c084fc', 20);
      } else if (p.type === 'BLITZ') {
        isBlitzActive = true;
        setTimeout(() => { isBlitzActive = false; }, 4000); // 4 segundos de invencibilidade total e destruição
        createParticles(p.x, p.y, '#f97316', 25);
        triggerAchievement("Modo Cometa Ativo!");
      }
      vibrateDevice([40, 30, 40]);
      playSound('powerup');
      powerups.splice(i, 1);
      continue;
    }
    if (p.y > canvas.height + 20) powerups.splice(i, 1);
  }

  for (let i = hazards.length - 1; i >= 0; i--) {
    let h = hazards[i];
    h.y += h.speed;

    let dist = Math.hypot(player.x - h.x, player.y - h.y);
    if (dist < player.radius + h.size / 2) {
      if (isBlitzActive) {
        // Destrói o obstáculo instantaneamente com o poder Blitz
        createParticles(h.x, h.y, '#f97316', 20);
        vibrateDevice(50);
        hazards.splice(i, 1);
        score += 5;
        continue;
      }

      if (hasShield) {
        hasShield = false;
        triggerShake(10);
        createParticles(h.x, h.y, '#38bdf8', 25);
        vibrateDevice(70);
        playSound('hit');
        hazards.splice(i, 1);
      } else {
        lives--;
        triggerShake(15);
        createParticles(player.x, player.y, '#ef4444', 25);
        vibrateDevice([100, 50, 100]);
        playSound('hit');
        hazards.splice(i, 1);

        if (lives <= 0) {
          if (gameMode === 'CLASSIC' && score > highScoreClassic) {
            highScoreClassic = score;
            localStorage.setItem('pulse_high_classic', highScoreClassic);
          } else if (gameMode === 'HARDCORE' && score > highScoreHardcore) {
            highScoreHardcore = score;
            localStorage.setItem('pulse_high_hardcore', highScoreHardcore);
          }
          gameState = 'GAMEOVER';
        }
      }
    }

    if (h.y > canvas.height + 20) hazards.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.03;
    if (p.alpha <= 0) particles.splice(i, 1);
  }
}

function render() {
  ctx.save();

  if (shakeTime > 0) {
    ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    shakeTime--;
  }

  let currentTheme = themes[currentThemeIndex];
  ctx.fillStyle = gameMode === 'HARDCORE' ? currentTheme.hardcoreBg : currentTheme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  player.trail.forEach((t, index) => {
    ctx.fillStyle = isBlitzActive ? '#f97316' : currentTheme.player;
    ctx.globalAlpha = index / player.trail.length * 0.4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, player.radius * (index / player.trail.length), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1.0;

  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  if (gameState === 'PLAYING' || gameState === 'PAUSED') {
    ctx.fillStyle = isBlitzActive ? '#f97316' : currentTheme.player;
    ctx.shadowBlur = hasShield || isBlitzActive ? 25 : 12;
    ctx.shadowColor = isBlitzActive ? '#f97316' : (hasShield ? '#ffffff' : currentTheme.player);
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    if (hasShield) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    collectibles.forEach(c => {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    if (gameMode === 'CLASSIC') {
      powerups.forEach(p => {
        ctx.fillStyle = p.type === 'SHIELD' ? '#38bdf8' : (p.type === 'SLOW' ? '#c084fc' : '#f97316');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    hazards.forEach(h => {
      ctx.fillStyle = gameMode === 'HARDCORE' ? '#ff2255' : '#ef4444';
      ctx.fillRect(h.x - h.size / 2, h.y - h.size / 2, h.size, h.size);
    });

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`PONTOS: ${score}`, 15, 35);
    
    if (gameMode === 'CLASSIC') {
      ctx.font = '16px sans-serif';
      ctx.fillText('❤️ '.repeat(lives), 15, 60);
      if (slowMoTimer > 0) ctx.fillText('⚡ SLOW-MO', 15, 85);
      if (isBlitzActive) {
        ctx.fillStyle = '#f97316';
        ctx.fillText('🔥 COMETA BLITZ ATIVO', 15, 110);
      }
    } else {
      ctx.fillStyle = '#ff2255';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('🔥 HARDCORE', 15, 60);
    }

    // Popup de Conquista na Tela
    if (achievementTimer > 0) {
      ctx.fillStyle = 'rgba(249, 115, 22, 0.9)';
      ctx.fillRect(canvas.width / 2 - 140, 70, 280, 35);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(achievementPopup, canvas.width / 2, 92);
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = '#334155';
    ctx.fillRect(themeBtn.x, themeBtn.y, themeBtn.width, themeBtn.height);
    ctx.fillStyle = currentTheme.player;
    ctx.beginPath();
    ctx.arc(themeBtn.x + 17, themeBtn.y + 15, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.fillRect(pauseBtn.x, pauseBtn.y, pauseBtn.width, pauseBtn.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(pauseBtn.x + 8, pauseBtn.y + 7, 4, 16);
    ctx.fillRect(pauseBtn.x + 18, pauseBtn.y + 7, 4, 16);

    if (gameState === 'PAUSED') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('JOGO PAUSADO', canvas.width / 2, canvas.height / 2);
      ctx.font = '16px sans-serif';
      ctx.fillText('Toque para continuar', canvas.width / 2, canvas.height / 2 + 40);
      ctx.textAlign = 'left';
    }
  } else if (gameState === 'MENU') {
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('PULSE DASH', canvas.width / 2, canvas.height / 2 - 120);

    ctx.fillStyle = '#334155';
    ctx.fillRect(canvas.width / 2 - 130, canvas.height / 2 - 100, 260, 40);
    ctx.fillStyle = currentTheme.player;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`🎨 Tema: ${currentTheme.name}`, canvas.width / 2, canvas.height / 2 - 75);

    ctx.fillStyle = '#334155';
    ctx.fillRect(canvas.width / 2 - 130, canvas.height / 2 - 45, 260, 55);
    ctx.fillStyle = currentTheme.player;
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('JOGAR CLÁSSICO', canvas.width / 2, canvas.height / 2 - 12);

    ctx.fillStyle = '#334155';
    ctx.fillRect(canvas.width / 2 - 130, canvas.height / 2 + 20, 260, 55);
    ctx.fillStyle = '#ff2255';
    ctx.fillText('🔥 MODO HARDCORE', canvas.width / 2, canvas.height / 2 + 53);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Partidas Jogadas: ${totalGamesPlayed} | Clássico: ${highScoreClassic} | Hardcore: ${highScoreHardcore}`, canvas.width / 2, canvas.height / 2 + 105);
    ctx.textAlign = 'left';

  } else if (gameState === 'GAMEOVER') {
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Pontuação Final: ${score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText(`Recorde (${gameMode}): ${gameMode === 'CLASSIC' ? highScoreClassic : highScoreHardcore}`, canvas.width / 2, canvas.height / 2 + 30);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Toque para ir ao Menu', canvas.width / 2, canvas.height / 2 + 80);
    ctx.textAlign = 'left';
  }

  ctx.restore();
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

gameLoop();
