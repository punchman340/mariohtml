const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const marioImg = new Image(); marioImg.src = "mario.png";
const blockImg = new Image(); blockImg.src = "block.png";
const itemblockImg = new Image(); itemblockImg.src = "itemblock.png";
const mushroomImg = new Image(); mushroomImg.src = "mushroom.png";
const brickImg = new Image(); brickImg.src = "brick.png";
const goombaImg = new Image(); goombaImg.src = "goomba.png";

const FRAME = { STAND:0, RUN_START:1, RUN_END:3, TURN:4, JUMP:5 };

const mario = {
    x:40, y:240, vx:0, vy:0, width:28, height:30, dir:1,
    frame:0, frameTimer:0, turnTimer:0, onGround:false,
    maxSpeed:4, gravity:0.5, jumpPower:-13
};

let cameraX = 0;
const keys = {left:false, right:false, jump:false};

document.addEventListener("keydown", e=>{
    if(e.code==="ArrowLeft") keys.left=true;
    if(e.code==="ArrowRight") keys.right=true;
    if(e.code==="Space") keys.jump=true;
});
document.addEventListener("keyup", e=>{
    if(e.code==="ArrowLeft") keys.left=false;
    if(e.code==="ArrowRight") keys.right=false;
    if(e.code==="Space") keys.jump=false;
});

const blocks = [];
for(let i=0;i<200;i++) blocks.push({x:i*32,y:400,w:32,h:32,breakable:false,type:'normal'});
for(let i=0;i<200;i++) blocks.push({x:i*32,y:432,w:32,h:32,breakable:false,type:'normal'});
for(let i=0;i<200;i++) blocks.push({x:i*32,y:464,w:32,h:32,breakable:false,type:'normal'});
for(let i=12;i<17;i+=2) blocks.push({x:i*32,y:250,w:30,h:32,breakable:true,type:'brick'});
for(let i=0;i<44;i++) blocks.push({x:0,y:368-(i*32),w:32,h:32,breakable:false,type:'normal'});

const itemBlocks = [];
for(let i=13;i<16;i+=2) itemBlocks.push({x:i*32,y:250,w:32,h:32,frame:0,timer:0,used:false,type:'item'});
itemBlocks.push({x:9*32,y:250,w:32,h:32,frame:0,timer:0,used:false,type:'item'});
itemBlocks.push({x:14*32,y:120,w:32,h:32,frame:0,timer:0,used:false,type:'item'});

const items = [];
const debris = [];
const goombas = [];

function collide(a,b){
    const aw = a.w ?? a.width;
    const ah = a.h ?? a.height;
    const bw = b.w ?? b.width;
    const bh = b.h ?? b.height;
    return a.x < b.x + bw && a.x + aw > b.x && a.y < b.y + bh && a.y + ah > b.y;
}


function spawnGoomba(x,y){
    goombas.push({
        x, y, vx: -0.7, vy:0, w:32, h:32,
        frame:0, frameTimer:0, alive:true, squishTimer:0,
        big: false
    });
}

spawnGoomba(200, 368);
spawnGoomba(300, 368);
spawnGoomba(100,368);

function spawnMushroom(x,y){
    items.push({x,y,vx:1.2,vy:0,w:32,h:32,active:true,type:"mushroom"});
}

function updateMario(delta){
    const ACC=0.15, DEC=0.1, SKID=0.25, MAX=mario.maxSpeed;
    let move=0;
    if(keys.left) move=-1;
    if(keys.right) move=1;

    if(move!==0){
        if(Math.sign(mario.vx)===move) mario.vx += move*ACC;
        else { mario.vx += move*SKID; if(mario.onGround){ mario.turnTimer=120; mario.frame=FRAME.TURN; } }
        if(mario.vx>MAX) mario.vx=MAX;
        if(mario.vx<-MAX) mario.vx=-MAX;
    } else {
        if(mario.vx>0){ mario.vx-=DEC; if(mario.vx<0) mario.vx=0; }
        if(mario.vx<0){ mario.vx+=DEC; if(mario.vx>0) mario.vx=0; }
    }

    if(move!==0) mario.dir=move;
    if(keys.jump && mario.onGround){ mario.vy=mario.jumpPower; mario.onGround=false; }

    mario.vy += mario.gravity;
    let nextX = mario.x + mario.vx;
    let nextY = mario.y + mario.vy;

    const allBlocks = blocks.concat(itemBlocks);

    mario.x = nextX;
    for(const b of allBlocks){
        if(collide({x:mario.x,y:mario.y,w:mario.width,h:mario.height},b)){
            if(mario.vx>0) mario.x = b.x - mario.width;
            else if(mario.vx<0) mario.x = b.x + b.w;
            mario.vx = 0;
        }
    }

    mario.y = nextY;
    mario.onGround = false;

    for(const b of allBlocks){
        if(collide({x:mario.x,y:mario.y,w:mario.width,h:mario.height},b)){
            if(mario.vy>0){
                mario.y = b.y - mario.height;
                mario.vy = 0;
                mario.onGround = true;
            } else if(mario.vy<0){
                if(b.type==='brick' && b.breakable){
                    for (let i = 0; i < 4; i++) {
                        debris.push({
                            x: b.x + (i % 2) * 8,
                            y: b.y + Math.floor(i / 2) * 8,
                            vx: (i % 2 === 0 ? -2 : 2),
                            vy: -4 - Math.random()*2,
                            w: 8, h: 8,
                            life: 1000
                        });
                    }
                    const idx = blocks.indexOf(b);
                    if(idx!==-1) blocks.splice(idx,1);
                } else if(b.type==='item' && !b.used){
                    b.used = true;
                    spawnMushroom(b.x,b.y-16);
                }

                mario.y = b.y + b.h;
                mario.vy = 0;
            }
            break;
        }
    }

    const speedRatio = Math.abs(mario.vx)/MAX;
    const runInterval = 250 - speedRatio*150;

    if(mario.turnTimer>0){
        mario.turnTimer -= delta;
        mario.frame = FRAME.TURN;
    } else if(!mario.onGround){
        mario.frame = FRAME.JUMP;
    } else if(Math.abs(mario.vx)>0.1){
        mario.frameTimer += delta;
        if(mario.frameTimer>runInterval){
            mario.frameTimer=0;
            mario.frame++;
            if(mario.frame>FRAME.RUN_END) mario.frame=FRAME.RUN_START;
        }
    } else mario.frame=FRAME.STAND;

    cameraX = mario.x - canvas.width/2 + 40;
    if(cameraX<0) cameraX=0;
}

function updateGoomba(delta){
    for(const g of goombas){
        if(!g.alive){
            g.squishTimer -= delta;
            continue;
        }

        g.vy += 0.4;  // 중력
        g.x += g.vx;

        // x축 충돌
        for(const b of blocks.concat(itemBlocks)){
            if(collide(g,b)){
                if(g.vx>0) g.x = b.x - g.w, g.vx=-0.5;
                else g.x = b.x + b.w, g.vx=0.5;
            }
        }

        g.y += g.vy;

        // y축 충돌 (바닥)
        g.onGround = false;
        for(const b of blocks.concat(itemBlocks)){
            if(collide(g,b)){
                if(g.vy>0){
                    g.y = b.y - g.h;
                    g.vy = 0;
                    g.onGround = true;
                } else if(g.vy<0){
                    g.y = b.y + b.h;
                    g.vy = 0;
                }
            }
        }

        // 마리오 충돌
        if(collide(mario, g)){
            const marioFeet = mario.y + mario.height;
            const goombaHead = g.y;
            const overlapX = mario.x + mario.width > g.x && mario.x < g.x + g.w;

            if(mario.vy > 0 && marioFeet >= goombaHead && mario.y < goombaHead && overlapX){
                g.alive = false;
                g.squishTimer = 300;
                g.frame = 2;
                mario.vy = -8;
            } else {
                // 옆면 충돌 처리 (마리오 죽음 등)
            }
        }

        g.frameTimer += delta;
        if(g.frameTimer>200){
            g.frameTimer=0;
            g.frame = g.alive ? (g.frame+1)%2 : 2;
        }
    }

    for(let i=goombas.length-1;i>=0;i--){
        if(!goombas[i].alive && goombas[i].squishTimer<=0)
            goombas.splice(i,1);
    }
}


function updateItemBlocks(delta){
    for(const b of itemBlocks){
        if(!b.used){
            b.timer += delta;
            if(b.timer>360){
                b.timer=0;
                b.frame=(b.frame+1)%3;
            }
        } else b.frame=3;
    }
}

function updateItems(delta){
    for(const it of items){
        if(!it.active) continue;
        it.vy += 0.4;
        it.x += it.vx;
        it.y += it.vy;

        for(const b of blocks.concat(itemBlocks)){
            if(collide(it,b)){
                if(it.vx>0) it.x = b.x - it.w, it.vx*=-1;
                else if(it.vx<0) it.x = b.x + b.w, it.vx*=-1;
            }
        }
        for(const b of blocks.concat(itemBlocks)){
            if(collide(it,b)){
                if(it.vy>0) it.y = b.y - it.h, it.vy=0;
            }
        }

        if(collide(it, mario)){
            it.active=false;

            // 모든 굼바 중 하나 선택해 버섯 먹이기
            const targetGoomba = goombas[Math.floor(Math.random()*goombas.length)];
            if(targetGoomba && targetGoomba.alive) {
                targetGoomba.big = true;
                // y 위치 조정해서 땅에 붙이기
                targetGoomba.y -= targetGoomba.h; 
                targetGoomba.h *= 2;
                targetGoomba.w *= 2;
            }
        }


        for(const g of goombas){
            if(it.active && collide(g,it)){
                it.active = false;

                g.w *= 2;
                g.h *= 2;
                g.y -= g.h/2;
            }
        }
    }
}


function updateDebris(delta){
    for(const d of debris){
        d.vy += 0.3;
        d.x += d.vx;
        d.y += d.vy;
        d.life -= delta;
    }
    for(let i=debris.length-1;i>=0;i--){
        if(debris[i].life<=0) debris.splice(i,1);
    }
}

function drawItemBlocks(){
    for(const b of itemBlocks)
        ctx.drawImage(itemblockImg,b.frame*16,0,16,16,b.x-cameraX,b.y,32,32);
}

function drawItems(){
    for(const it of items)
        if(it.active)
            ctx.drawImage(mushroomImg,0,0,16,16,it.x-cameraX,it.y,32,32);
}

function drawDebris(){
    for(const d of debris){
        const i = ((d.x%16)<8?0:1)+((d.y%16)<8?0:2);
        const sx = 16 + (i % 2) * 8;
        const sy = (i<2?0:8);
        ctx.drawImage(brickImg, sx, sy, 8, 8, d.x-cameraX, d.y, 16, 16);
    }
}

function drawMario(){
    const sx = mario.x - cameraX;
    if(mario.dir===-1){
        ctx.save();
        ctx.scale(-1,1);
        ctx.drawImage(marioImg, mario.frame*16,0,16,32, -sx-32, mario.y,32,64);
        ctx.restore();
    } else ctx.drawImage(marioImg, mario.frame*16,0,16,32, sx, mario.y,32,64);
}

function drawGoomba(){
    for(const g of goombas){
        let f = g.frame;
        let drawW = g.w;
        let drawH = g.h;
        let drawY = g.y;

        if(g.big){
            drawW = g.w;
            drawH = g.h;
            drawY = g.y; // 이미 updateItems에서 조정했으므로 그대로 사용
        }

        ctx.drawImage(goombaImg, f*16, 0, 16, 16, g.x-cameraX, drawY, drawW, drawH);
    }
}


function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    for(const b of blocks){
        if(b.type==='normal') ctx.drawImage(blockImg, b.x-cameraX, b.y,32,32);
        else if(b.type==='brick') ctx.drawImage(brickImg,0,0,16,16,b.x-cameraX,b.y,32,32);
    }

    drawItemBlocks();
    drawItems();
    drawDebris();
    drawMario();
    drawGoomba();
}

let last=0;
function loop(t){
    const delta = t-last;
    last=t;

    updateMario(delta);
    updateItemBlocks(delta);
    updateItems(delta);
    updateDebris(delta);
    updateGoomba(delta);
    draw();
    requestAnimationFrame(loop);
}

marioImg.onload = ()=>requestAnimationFrame(loop);
