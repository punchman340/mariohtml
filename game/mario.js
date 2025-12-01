const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

const sprite = new Image();
sprite.src = "mario.png";

// 스프라이트 정보
const frameWidth = 16;
const frameHeight = 32;
const frameCount = 5;

let currentFrame = 0;
let frameTimer = 0;
const frameInterval = 150;

function update(delta) {
    frameTimer += delta;

    if (frameTimer > frameInterval) {
        frameTimer = 0;
        currentFrame = (currentFrame + 1) % frameCount;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
        sprite,
        currentFrame * frameWidth,
        0,
        frameWidth,
        frameHeight,
        Math.floor(100),         // 정수 좌표 유지
        Math.floor(100),
        frameWidth * 3,
        frameHeight * 3
    );
}

let lastTime = 0;

function gameLoop(timestamp) {
    const delta = timestamp - lastTime;
    lastTime = timestamp;

    update(delta);
    draw();

    requestAnimationFrame(gameLoop);
}

sprite.onload = () => {
    requestAnimationFrame(gameLoop);
};
