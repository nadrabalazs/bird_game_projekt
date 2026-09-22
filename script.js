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