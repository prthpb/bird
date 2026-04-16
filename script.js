const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");

const COLORS = {
  black: "#000000",
  white: "#ffffff"
};

const WORLD = {
  width: 360,
  height: 640
};

const bird = {
  x: 86,
  y: 300,
  size: 18,
  vy: 0,
  rotation: 0
};

const physics = {
  gravity: 1200,
  flapPower: -340,
  basePipeSpeed: 165,
  pipeSpeed: 165,
  pipeWidth: 58,
  pipeGap: 160,
  spawnInterval: 1.35,
  speedIncrease: 10
};

let pipes = [];
let score = 0;
let bestScore = Number(localStorage.getItem("flightBestScore") || 0);
let running = false;
let paused = false;
let gameOver = false;
let lastTime = 0;
let pipeSpawnTimer = 0;
let animationId = null;

let dpr = window.devicePixelRatio || 1;
let scaleX = 1;
let scaleY = 1;
let initialized = false;

bestScoreEl.textContent = bestScore;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  dpr = window.devicePixelRatio || 1;

  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));

  scaleX = rect.width / WORLD.width;
  scaleY = rect.height / WORLD.height;

  ctx.setTransform(dpr * scaleX, 0, 0, dpr * scaleY, 0, 0);

  if (initialized) {
    draw();
  } else {
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }
}

function resetGame() {
  bird.x = 86;
  bird.y = WORLD.height * 0.46;
  bird.vy = 0;
  bird.rotation = 0;

  pipes = [];
  score = 0;
  scoreEl.textContent = score;

  running = false;
  paused = false;
  gameOver = false;
  lastTime = 0;
  pipeSpawnTimer = 0;
  physics.pipeSpeed = physics.basePipeSpeed;

  overlay.classList.add("visible");
  overlayTitle.textContent = "Monochrome Flight";
  overlayText.textContent = "Press Space, click, or tap to fly.";
  startBtn.textContent = "Start Game";
  pauseBtn.textContent = "Pause";

  initialized = true;
  draw();
}

function startGame() {
  if (gameOver) {
    resetGame();
  }

  running = true;
  paused = false;
  overlay.classList.remove("visible");
  pauseBtn.textContent = "Pause";
  lastTime = performance.now();

  if (animationId) cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(loop);
}

function togglePause() {
  if (!running || gameOver) return;

  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";

  if (paused) {
    overlayTitle.textContent = "Paused";
    overlayText.textContent = "Press Resume or Space to continue.";
    overlay.classList.add("visible");
  } else {
    overlay.classList.remove("visible");
    lastTime = performance.now();
    animationId = requestAnimationFrame(loop);
  }
}

function restartGame() {
  resetGame();
  startGame();
  flap();
}

function flap() {
  if (gameOver) return;

  if (!running) {
    startGame();
  }

  if (paused) return;

  bird.vy = physics.flapPower;
  bird.rotation = -0.42;
}

function spawnPipe() {
  const marginBottom = 72;
  const minTop = 70;
  const maxTop = WORLD.height - physics.pipeGap - marginBottom;

  const topHeight = Math.floor(minTop + Math.random() * Math.max(1, maxTop - minTop));
  const bottomY = topHeight + physics.pipeGap;

  pipes.push({
    x: WORLD.width + 24,
    topHeight,
    bottomY,
    passed: false
  });
}

function updateBird(dt) {
  bird.vy += physics.gravity * dt;
  bird.y += bird.vy * dt;

  const targetRotation = Math.max(-0.55, Math.min(1.1, bird.vy / 480));
  bird.rotation += (targetRotation - bird.rotation) * Math.min(1, dt * 8);

  if (bird.y < 0) {
    bird.y = 0;
    bird.vy = 0;
  }

  if (bird.y + bird.size > WORLD.height - 18) {
    endGame();
  }
}

function updatePipes(dt) {
  const speed = physics.pipeSpeed;

  for (const pipe of pipes) {
    pipe.x -= speed * dt;
  }

  pipes = pipes.filter((pipe) => pipe.x + physics.pipeWidth > -20);

  for (const pipe of pipes) {
    const birdLeft = bird.x;
    const birdRight = bird.x + bird.size;
    const birdTop = bird.y;
    const birdBottom = bird.y + bird.size;

    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + physics.pipeWidth;

    const withinX = birdRight > pipeLeft && birdLeft < pipeRight;
    const hitTop = birdTop < pipe.topHeight;
    const hitBottom = birdBottom > pipe.bottomY;

    if (withinX && (hitTop || hitBottom)) {
      endGame();
      return;
    }

    if (!pipe.passed && pipe.x + physics.pipeWidth < bird.x) {
      pipe.passed = true;
      score += 1;
      scoreEl.textContent = score;

      if (score > bestScore) {
        bestScore = score;
        bestScoreEl.textContent = bestScore;
        localStorage.setItem("flightBestScore", String(bestScore));
      }

      if (score % 5 === 0) {
        physics.pipeSpeed += physics.speedIncrease;
      }
    }
  }
}

function update(dt) {
  pipeSpawnTimer += dt;

  if (pipeSpawnTimer >= physics.spawnInterval) {
    spawnPipe();
    pipeSpawnTimer = 0;
  }

  updateBird(dt);
  updatePipes(dt);
}

function drawBackground() {
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.fillStyle = "rgba(0,0,0,0.08)";
  const step = 18;

  for (let x = 0; x < WORLD.width; x += step) {
    ctx.fillRect(x, 0, 1, WORLD.height);
  }

  for (let y = 0; y < WORLD.height; y += step) {
    ctx.fillRect(0, y, WORLD.width, 1);
  }

  ctx.fillStyle = COLORS.black;
  ctx.fillRect(0, WORLD.height - 18, WORLD.width, 18);

  ctx.fillStyle = COLORS.white;
  ctx.fillRect(0, WORLD.height - 18, WORLD.width, 2);

  ctx.strokeStyle = COLORS.black;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, WORLD.width - 2, WORLD.height - 20);
}

function drawPipe(pipe) {
  const x = pipe.x;
  const w = physics.pipeWidth;
  const topH = pipe.topHeight;
  const bottomY = pipe.bottomY;
  const capH = 14;

  ctx.fillStyle = COLORS.black;
  ctx.fillRect(x, 0, w, topH);
  ctx.fillRect(x, bottomY, w, WORLD.height - bottomY - 18);

  ctx.fillRect(x - 2, topH - capH, w + 4, capH);
  ctx.fillRect(x - 2, bottomY, w + 4, capH);

  ctx.fillStyle = COLORS.white;
  ctx.fillRect(x + 6, 6, w - 12, 2);
  ctx.fillRect(x + 6, bottomY + 4, w - 12, 2);
  ctx.fillRect(x + 10, topH - 8, 6, 3);
  ctx.fillRect(x + 10, bottomY + 4, 6, 3);
}

function drawBird() {
  const x = bird.x;
  const y = bird.y;
  const s = bird.size;

  ctx.save();
  ctx.translate(x + s / 2, y + s / 2);
  ctx.rotate(bird.rotation);
  ctx.translate(-s / 2, -s / 2);

  ctx.fillStyle = COLORS.black;

  const px = [
    [4, 4, 10, 4],
    [2, 8, 14, 4],
    [4, 12, 10, 4],
    [6, 0, 4, 4],
    [8, 16, 2, 2]
  ];

  for (const [dx, dy, w, h] of px) {
    ctx.fillRect(dx, dy, w, h);
  }

  ctx.fillStyle = COLORS.white;
  ctx.fillRect(12, 6, 2, 2);

  ctx.restore();
}

function draw() {
  drawBackground();

  for (const pipe of pipes) {
    drawPipe(pipe);
  }

  drawBird();
}

function endGame() {
  running = false;
  paused = false;
  gameOver = true;
  pauseBtn.textContent = "Pause";

  overlayTitle.textContent = "Game Over";
  overlayText.textContent = `Final score: ${score}. Press Restart to try again.`;
  overlay.classList.add("visible");
  startBtn.textContent = "Play Again";

  if (animationId) cancelAnimationFrame(animationId);
  draw();
}

function loop(timestamp) {
  if (!running || paused || gameOver) return;

  const dt = Math.min(0.032, (timestamp - lastTime) / 1000);
  lastTime = timestamp;

  update(dt);
  draw();

  if (!gameOver) {
    animationId = requestAnimationFrame(loop);
  }
}

function handlePointerAction() {
  if (gameOver) {
    restartGame();
    return;
  }

  if (!running) {
    startGame();
    flap();
    return;
  }

  if (paused) return;

  flap();
}

function handleKeydown(event) {
  const key = event.key.toLowerCase();

  if (key === " " || key === "spacebar") {
    event.preventDefault();

    if (!running && !gameOver) {
      startGame();
      flap();
    } else if (gameOver) {
      restartGame();
    } else {
      handlePointerAction();
    }
  }
}

startBtn.addEventListener("click", () => {
  if (gameOver) {
    restartGame();
  } else {
    startGame();
    flap();
  }
});

pauseBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", restartGame);
canvas.addEventListener("pointerdown", handlePointerAction);
document.addEventListener("keydown", handleKeydown);
window.addEventListener("resize", resizeCanvas);

resizeCanvas();
resetGame();
