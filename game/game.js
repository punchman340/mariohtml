const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const marioImg = new Image(); marioImg.src = "mario.png";
const blockImg = new Image(); blockImg.src = "block.png";
const itemblockImg = new Image(); itemblockImg.src = "itemblock.png";
const mushroomImg = new Image(); mushroomImg.src = "mushroom.png";
const brickImg = new Image(); brickImg.src = "brick.png";

const FRAME = { STAND:0, RUN_START:1, RUN_END:3, TURN:4, JUMP:5 };

const mario = {
    x:30,y:240,vx:0,vy:0,width:28,height:30,dir:1,
    frame:0,frameTimer:0,turnTimer:0,onGround:false,
    maxSpeed:4,gravity:0.5,jumpPower:-13
};

let cameraX = 0;
const keys = {left:false,right:false,jump:false};

document.addEventListener("keydown",e=>{
    if(e.code==="ArrowLeft")keys.left=true;
    if(e.code==="ArrowRight")keys.right=true;
    if(e.code==="Space")keys.jump=true;
});
document.addEventListener("keyup",e=>{
    if(e.code==="ArrowLeft")keys.left=false;
    if(e.code==="ArrowRight")keys.right=false;
    if(e.code==="Space")keys.jump=false;
});

const blocks = [];
for(let i=0;i<200;i++) blocks.push({x:i*32,y:400,w:32,h:32,breakable:false,type:'normal'});
for(let i=0;i<200;i++) blocks.push({x:i*32,y:432,w:32,h:32,breakable:false,type:'normal'});
for(let i=0;i<200;i++) blocks.push({x:i*32,y:464,w:32,h:32,breakable:false,type:'normal'});
for(let i=12;i<17;i+=2) blocks.push({x:i*32,y:250,w:30,h:32,breakable:true,type:'brick'});

const itemBlocks = [];
for(let i=13;i<16;i+=2) itemBlocks.push({x:i*32,y:250,w:32,h:32,frame:0,timer:0,used:false,type:'item'});
itemBlocks.push({x:9*32,y:250,w:32,h:32,frame:0,timer:0,used:false,type:'item'});
itemBlocks.push({x:14*32,y:120,w:32,h:32,frame:0,timer:0,used:false,type:'item'});

const items = [];

function collide(a,b){
    return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; 
}

function spawnMushroom(x,y){
    items.push({x,y,vx:1.2,vy:0,w:16,h:16,active:true,type:"mushroom"});
}

function updateMario(delta){
    const ACC=0.15,DEC=0.1,SKID=0.25,MAX=mario.maxSpeed;
    let move=0;
    if(keys.left) move=-1;
    if(keys.right) move=1;

    if(move!==0){
        if(Math.sign(mario.vx)===move) mario.vx += move*ACC;
        else { mario.vx += move*SKID; if(mario.onGround){ mario.turnTimer=120; mario.frame=FRAME.TURN; } }
        if(mario.vx>MAX) mario.vx=MAX;
        if(mario.vx<-MAX) mario.vx=-MAX;
    } else {
        if(mario.vx>0){ mario.vx-=DEC; if(mario.vx<0)mario.vx=0; }
        if(mario.vx<0){ mario.vx+=DEC; if(mario.vx>0)mario.vx=0; }
    }

    if(move!==0) mario.dir=move;
    if(keys.jump && mario.onGround){ mario.vy=mario.jumpPower; mario.onGround=false; }

    mario.vy += mario.gravity;
    let nextX = mario.x + mario.vx;
    let nextY = mario.y + mario.vy;

    const allBlocks = blocks.concat(itemBlocks);

    // X축 충돌
    mario.x = nextX;
    for(const b of allBlocks){
        if(collide({x:mario.x,y:mario.y,w:mario.width,h:mario.height},b)){
            if(mario.vx>0) mario.x = b.x - mario.width;
            else if(mario.vx<0) mario.x = b.x + b.w;
            mario.vx = 0;
        }
    }

    // Y축 이동
    mario.y = nextY;
    mario.onGround = false;

    for(const b of allBlocks){
        if(collide({x:mario.x,y:mario.y,w:mario.width,h:mario.height},b)){
            if(mario.vy>0){ // 착지
                mario.y = b.y - mario.height;
                mario.vy = 0;
                mario.onGround = true;
            } else if(mario.vy<0){ // 머리 박기
                if(b.type==='item' && !b.used){
                    b.used = true;
                    spawnMushroom(b.x,b.y-16);
                } else if(b.type==='brick' && b.breakable){
                    const index = blocks.indexOf(b);
                    if(index!==-1) blocks.splice(index,1);
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

function updateItemBlocks(delta){
    for(const b of itemBlocks){
        if(!b.used){
            b.timer += delta;
            if(b.timer>360){
                b.timer = 0;
                b.frame = (b.frame+1)%3;
            }
        } else b.frame = 3;
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
        if(collide(mario,it)) it.active=false;
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

function drawMario(){
    const sx = mario.x - cameraX;
    if(mario.dir === -1){
        ctx.save();
        ctx.scale(-1,1);
        ctx.drawImage(marioImg,mario.frame*16,0,16,32,-sx-32,mario.y,32,64);
        ctx.restore();
    } else ctx.drawImage(marioImg,mario.frame*16,0,16,32,sx,mario.y,32,64);
}

function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(const b of blocks){
        if(b.type==='normal') ctx.drawImage(blockImg,b.x-cameraX,b.y,32,32);
        else if(b.type==='brick') ctx.drawImage(brickImg,b.x-cameraX,b.y,32,32);
    }
    drawItemBlocks();
    drawItems();
    drawMario();
}

let last=0;
function loop(t){
    const delta = t - last;
    last = t;
    updateMario(delta);
    updateItemBlocks(delta);
    updateItems(delta);
    draw();
    requestAnimationFrame(loop);
}

marioImg.onload = () => requestAnimationFrame(loop);