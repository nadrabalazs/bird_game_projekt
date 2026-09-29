const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const highScoreLabel = document.getElementById('highScoreLabel');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const cabinet = document.querySelector('.cabinet');

fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    cabinet.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
});
document.addEventListener('fullscreenchange', () => {
  fullscreenBtn.textContent = document.fullscreenElement ? '⛶ Kilépés' : '⛶ Teljes képernyő';
});

// ---- Játék állapot (state) ----
const GAME_STATE = { MENU: 'menu', PLAYING: 'playing', GAMEOVER: 'gameover' };
let state = GAME_STATE.MENU;

// ---- Nehézségi fokozatok ----
const DIFFICULTIES = {
  easy:       { label: 'Könnyű',      gap: 195, speedBase: 2.0, speedRamp: 0.03, speedCap: 1.5 },
  medium:     { label: 'Közepes',     gap: 160, speedBase: 2.5, speedRamp: 0.05, speedCap: 2.5 },
  hard:       { label: 'Nehéz',       gap: 128, speedBase: 3.2, speedRamp: 0.08, speedCap: 3.3 },
  impossible: { label: 'Lehetetlen',  gap: 100, speedBase: 4.2, speedRamp: 0.12, speedCap: 4.8 }
};
let selectedDifficulty = 'medium';

// ---- Konstansok ----
const GRAVITY = 0.45;
const FLAP_STRENGTH = -8;
const PIPE_WIDTH = 58;
const PIPE_CAP_HEIGHT = 18;
const PIPE_SPACING = 220;
const GROUND_HEIGHT = 60;
// ---- Madár ----
const bird = {
  x: 90,
  y: canvas.height / 2,
  radius: 14,
  velocity: 0,
  rotation: 0,
  wingPhase: 0
};
// ---- Csövek ----
let pipes = [];
let score = 0;
let highScores = JSON.parse(localStorage.getItem('madarasHighScores') || '{}');
let frame = 0;

function updateHighScoreLabel() {
  const diff = DIFFICULTIES[selectedDifficulty];
  const hs = highScores[selectedDifficulty] || 0;
  highScoreLabel.textContent = 'Legjobb (' + diff.label + '): ' + hs;
}
updateHighScoreLabel();

function resetGame() {
  bird.y = canvas.height / 2;
  bird.velocity = 0;
  pipes = [];
  score = 0;
  frame = 0;
  spawnPipe();
}

function spawnPipe() {
  const diff = DIFFICULTIES[selectedDifficulty];
  const minTop = 60;
  const maxTop = canvas.height - GROUND_HEIGHT - diff.gap - 60;
  const topHeight = Math.random() * (maxTop - minTop) + minTop;
  pipes.push({
    x: canvas.width,
    top: topHeight,
    bottom: topHeight + diff.gap,
    passed: false
  });
}

function currentPipeSpeed() {
  const diff = DIFFICULTIES[selectedDifficulty];
  return diff.speedBase + Math.min(score * diff.speedRamp, diff.speedCap);
}
// ---- Menü gombok (canvas-on rajzolt) ----
const menuButtons = []; // {key, x, y, w, h} - draw() tölti fel minden képkockán

function startGame() {
  state = GAME_STATE.PLAYING;
  resetGame();
  bird.velocity = FLAP_STRENGTH;
}
// ---- Input ----
function getCanvasPos(evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
  const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

function handlePointer(evt) {
  evt.preventDefault();
  const pos = getCanvasPos(evt);

  if (state === GAME_STATE.MENU) {
    for (const btn of menuButtons) {
      if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
        selectedDifficulty = btn.key;
        updateHighScoreLabel();
        startGame();
        return;
      }
    }
    return; // menüben gombon kívüli kattintás nem indít
  }

  if (state === GAME_STATE.PLAYING) {
    bird.velocity = FLAP_STRENGTH;
    bird.wingPhase = 0;
  } else if (state === GAME_STATE.GAMEOVER) {
    state = GAME_STATE.MENU;
  }
}

document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  e.preventDefault();
  if (state === GAME_STATE.MENU) startGame();
  else if (state === GAME_STATE.PLAYING) { bird.velocity = FLAP_STRENGTH; bird.wingPhase = 0; }
  else if (state === GAME_STATE.GAMEOVER) state = GAME_STATE.MENU;
});
canvas.addEventListener('mousedown', handlePointer);
canvas.addEventListener('touchstart', handlePointer);
function update() {
  frame++;
  if (state !== GAME_STATE.PLAYING) return;

  bird.velocity += GRAVITY;
  bird.y += bird.velocity;
  bird.rotation = Math.max(-25, Math.min(90, bird.velocity * 4));
  bird.wingPhase += 0.3;

  const speed = currentPipeSpeed();

  for (const pipe of pipes) {
    pipe.x -= speed;
    if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
      pipe.passed = true;
      score++;
    }
  }

  pipes = pipes.filter(p => p.x + PIPE_WIDTH > 0);
  if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - PIPE_SPACING) {
    spawnPipe();
  }

  checkCollisions();
}

function checkCollisions() {
  if (bird.y + bird.radius > canvas.height - GROUND_HEIGHT || bird.y - bird.radius < 0) {
    gameOver();
    return;
  }
  for (const pipe of pipes) {
    const withinX = bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + PIPE_WIDTH;
    if (withinX) {
      const hitsTop = bird.y - bird.radius < pipe.top;
      const hitsBottom = bird.y + bird.radius > pipe.bottom;
      if (hitsTop || hitsBottom) {
        gameOver();
        return;
      }
    }
  }
}

function gameOver() {
  if (state !== GAME_STATE.PLAYING) return;
  state = GAME_STATE.GAMEOVER;
  const best = highScores[selectedDifficulty] || 0;
  if (score > best) {
    highScores[selectedDifficulty] = score;
    localStorage.setItem('madarasHighScores', JSON.stringify(highScores));
    updateHighScoreLabel();
  }
}

// ---- Render ----
function draw() {
  drawBackground();

  if (state === GAME_STATE.MENU) {
    drawGround();
    drawMenu();
  } else {
    drawPipes();
    drawBird();
    drawGround();
    drawScore();
    if (state === GAME_STATE.GAMEOVER) drawGameOver();
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#241147');
  sky.addColorStop(0.45, '#4a2660');
  sky.addColorStop(0.75, '#8a4966');
  sky.addColorStop(1, '#e0794f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sunY = canvas.height * 0.62;
  const glow = ctx.createRadialGradient(canvas.width / 2, sunY, 10, canvas.width / 2, sunY, 130);
  glow.addColorStop(0, 'rgba(255,207,86,0.55)');
  glow.addColorStop(1, 'rgba(255,207,86,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, sunY, 42, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(27,19,48,0.55)';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height - GROUND_HEIGHT);
  ctx.quadraticCurveTo(canvas.width * 0.25, canvas.height - GROUND_HEIGHT - 70, canvas.width * 0.5, canvas.height - GROUND_HEIGHT - 20);
  ctx.quadraticCurveTo(canvas.width * 0.75, canvas.height - GROUND_HEIGHT + 20, canvas.width, canvas.height - GROUND_HEIGHT - 40);
  ctx.lineTo(canvas.width, canvas.height - GROUND_HEIGHT);
  ctx.closePath();
  ctx.fill();
}
function drawPipes() {
  for (const pipe of pipes) {
    drawPipeSegment(pipe.x, 0, PIPE_WIDTH, pipe.top, true);
    drawPipeSegment(pipe.x, pipe.bottom, PIPE_WIDTH, canvas.height - pipe.bottom - GROUND_HEIGHT, false);
  }
}

function drawPipeSegment(x, y, w, h, isTop) {
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, '#7a4420');
  grad.addColorStop(0.15, '#c97a35');
  grad.addColorStop(0.5, '#a85d1f');
  grad.addColorStop(1, '#6b3818');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  const capY = isTop ? y + h - PIPE_CAP_HEIGHT : y;
  ctx.fillStyle = '#d9822b';
  ctx.fillRect(x - 4, capY, w + 8, PIPE_CAP_HEIGHT);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 4, capY, w + 8, PIPE_CAP_HEIGHT);
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation * Math.PI / 180);

  const wingLift = Math.sin(bird.wingPhase) * 5;

  ctx.fillStyle = '#e8a93c';
  ctx.beginPath();
  ctx.ellipse(-3, 2 + wingLift * 0.3, 9, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffcf56';
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1b1330';
  ctx.beginPath();
  ctx.arc(5, -4, 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff7b54';
  ctx.beginPath();
  ctx.moveTo(bird.radius - 2, 0);
  ctx.lineTo(bird.radius + 10, -3);
  ctx.lineTo(bird.radius + 10, 4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawGround() {
  ctx.fillStyle = '#2a1b3d';
  ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
  ctx.fillStyle = '#ffcf56';
  ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, 3);
}

function drawScore() {
  ctx.fillStyle = 'rgba(27,19,48,0.4)';
  ctx.font = "700 36px 'Baloo 2', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(score, canvas.width / 2 + 2, 54 + 2);
  ctx.fillStyle = '#fdf3e7';
  ctx.fillText(score, canvas.width / 2, 54);
}

function drawMenu() {
  ctx.fillStyle = 'rgba(20,10,35,0.45)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fdf3e7';
  ctx.font = "700 24px 'Baloo 2', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText('Repülj neki!', canvas.width / 2, canvas.height / 2 - 160);

  ctx.font = "400 13px 'Inter', sans-serif";
  ctx.fillStyle = '#cbb9d8';
  ctx.fillText('Válassz nehézséget', canvas.width / 2, canvas.height / 2 - 134);

  // előnézeti madár
  ctx.fillStyle = '#ffcf56';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2 - 195, 13, 0, Math.PI * 2);
  ctx.fill();

  // nehézségi gombok
  menuButtons.length = 0;
  const keys = ['easy', 'medium', 'hard', 'impossible'];
  const btnW = 200, btnH = 42, gap = 12;
  const startY = canvas.height / 2 - 100;

  keys.forEach((key, i) => {
    const x = canvas.width / 2 - btnW / 2;
    const y = startY + i * (btnH + gap);
    const isSelected = key === selectedDifficulty;
    const diff = DIFFICULTIES[key];

    ctx.fillStyle = isSelected ? 'rgba(255,207,86,0.18)' : 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = isSelected ? '#ffcf56' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = isSelected ? 2 : 1;
    roundRect(x, y, btnW, btnH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isSelected ? '#ffcf56' : '#fdf3e7';
    ctx.font = "700 16px 'Baloo 2', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(diff.label, canvas.width / 2, y + btnH / 2 + 5);

    menuButtons.push({ key, x, y, w: btnW, h: btnH });
  });
}