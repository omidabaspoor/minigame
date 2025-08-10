(function(){
  // Canvas setup
  const cvs = document.getElementById('gameCanvas');
  const ctx = cvs.getContext('2d');

  // make canvas high-DPI friendly
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const w = Math.min(window.innerWidth * 0.96, 720);
    cvs.style.width = w + 'px';
    cvs.style.height = w + 'px';
    cvs.width = Math.floor(w * ratio);
    cvs.height = Math.floor(w * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // game state
  let player = { x: cvs.width/2/ (window.devicePixelRatio || 1), y: cvs.height/ (window.devicePixelRatio || 1) - 80, w: 68, h: 36 };
  let pointerX = player.x;
  let score = 0;
  let lives = 3;
  let items = [];
  let particles = [];
  let lastSpawn = 0;
  let spawnInterval = 900; // ms
  let lastTime = performance.now();
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');

  // icons as simple shapes for perf
  function drawCup(x,y,w,h, tilt){
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(tilt||0);
    // cup body
    ctx.fillStyle = '#6b3f2b';
    roundRect(ctx,-w/2,-h/2,w,h,8);
    ctx.fill();
    // saucer
    ctx.beginPath();
    ctx.ellipse(0, h/2+6, w*0.7, 8, 0, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(59,41,33,0.9)';
    ctx.fill();
    ctx.restore();
  }

  function drawBean(x,y,r,rot){
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(rot||0);
    ctx.fillStyle = '#a66d4f';
    ctx.beginPath();
    ctx.ellipse(0,0,r*0.7,r,0,0,Math.PI*2);
    ctx.fill();
    // seam
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r*0.2,-r*0.6);
    ctx.quadraticCurveTo(0,0,-r*0.2,r*0.6);
    ctx.stroke();
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // spawn items
  function spawnItem() {
    const lane = Math.random();
    items.push({
      x: 40 + Math.random() * (cvs.width/ (window.devicePixelRatio || 1) - 80),
      y: -20,
      r: 18 + Math.random() * 18,
      vy: 1.6 + Math.random() * 2.4,
      rot: Math.random()*Math.PI,
      type: Math.random() < 0.09 ? 'star' : 'bean' // star = power
    });
  }

  // particle fx
  function makeParticles(x,y,count){
    for(let i=0;i<count;i++){
      particles.push({x,y, vx:(Math.random()-0.5)*3, vy:(Math.random()-0.8)*-3, life: 50 + Math.random()*40, size:2+Math.random()*3});
    }
  }

  function update(dt){
    // spawn
    lastSpawn += dt;
    if(lastSpawn > spawnInterval){ lastSpawn = 0; spawnItem(); }

    // pointer smoothing
    player.x += (pointerX - player.x) * 0.18;

    // update items
    for(let i=items.length-1;i>=0;i--){
      const it = items[i];
      it.y += it.vy * (dt/16);
      it.rot += 0.06 * (dt/16);
      // off screen
      if(it.y - it.r > cvs.height/ (window.devicePixelRatio || 1)){
        items.splice(i,1);
        lives -=1; updateHUD();
        makeParticles(player.x, player.y-10, 8);
        if(lives <= 0) endGame();
        continue;
      }
      // collision with cup (simple AABB+radius)
      const cupTop = player.y - player.h/2;
      if(it.y + it.r > cupTop && Math.abs(it.x - player.x) < player.w/2 + it.r){
        // caught
        if(it.type === 'bean'){
          score += 10;
          spawnInterval = Math.max(400, spawnInterval - 8); // speed up slowly
          makeParticles(it.x, it.y, 12);
        } else {
          // power: bonus
          score += 40;
          makeParticles(it.x, it.y, 30);
          // small modal reward if high score
          if(score >= 200){ showModal('کد تخفیف: COFFEE20'); }
        }
        items.splice(i,1);
        updateHUD();
      }
    }

    // particles
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      p.x += p.vx * (dt/16);
      p.y += p.vy * (dt/16);
      p.vy += 0.08 * (dt/16);
      p.life -= (dt/16);
      if(p.life <=0) particles.splice(i,1);
    }
  }

  function draw(){
    // clear with gentle gradient
    const W = cvs.width/ (window.devicePixelRatio || 1);
    const H = cvs.height/ (window.devicePixelRatio || 1);
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#fffaf6'); g.addColorStop(1,'#efe6db');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // floating background beans
    for(let i=0;i<10;i++){
      const bx = 20 + (i*73)%W; const by = (i*47)%H * 0.05 + 20;
      ctx.globalAlpha = 0.06;
      drawBean(bx,by,18, (i/10)+performance.now()*0.0002);
      ctx.globalAlpha = 1;
    }

    // items
    for(const it of items){
      if(it.type === 'bean') drawBean(it.x, it.y, it.r, it.rot);
      else {
        // star power: draw shining star
        ctx.save(); ctx.translate(it.x,it.y); ctx.rotate(it.rot);
        ctx.beginPath(); for(let s=0;s<5;s++){ ctx.lineTo(0, -it.r); ctx.rotate(Math.PI/5); ctx.lineTo(0, -it.r*0.45); ctx.rotate(Math.PI/5);} ctx.closePath();
        ctx.fillStyle = '#ffd166'; ctx.fill(); ctx.restore();
      }
    }

    // cup
    drawCup(player.x, player.y, player.w, player.h, Math.sin(performance.now()*0.003 + player.x)*0.03);

    // particles
    for(const p of particles){
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size,0,Math.PI*2); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
    }

    // subtle overlay shadow
    ctx.fillStyle = 'rgba(0,0,0,0.04)'; ctx.fillRect(0,H-80,W,80);
  }

  function loop(ts){
    const dt = ts - lastTime; lastTime = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // controls
  let touching = false;
  function posFromEvent(e){
    const rect = cvs.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    return Math.max(30, Math.min(rect.width-30, x));
  }
  cvs.addEventListener('pointerdown', (e)=>{ touching = true; pointerX = posFromEvent(e); });
  window.addEventListener('pointermove', (e)=>{ if(touching){ pointerX = posFromEvent(e); } });
  window.addEventListener('pointerup', ()=>{ touching = false; });

  // buttons
  document.getElementById('leftBtn').addEventListener('click', ()=>{ pointerX = Math.max(30, pointerX - 50); });
  document.getElementById('rightBtn').addEventListener('click', ()=>{ pointerX = Math.min(cvs.width - 30, pointerX + 50); });

  // keyboard
  window.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowLeft') pointerX -= 40;
    if(e.key === 'ArrowRight') pointerX += 40;
  });

  function updateHUD(){ scoreEl.textContent = score; livesEl.textContent = lives; }

  function endGame(){
    showModal('بازی تمام شد. امتیاز: ' + score + '\nکد: COFFEE10');
    // reset
    score = 0; lives = 3; items = []; particles = []; spawnInterval = 900; updateHUD();
  }

  // modal
  const modal = document.getElementById('modal');
  const prizeText = document.getElementById('prizeText');
  document.getElementById('closeModal').addEventListener('click', ()=>{ modal.classList.add('hidden'); });
  function showModal(text){ prizeText.innerHTML = text; modal.classList.remove('hidden'); }

  // initialize pointerX
  pointerX = cvs.width/ (window.devicePixelRatio || 1)/2;
  player.x = pointerX;

})();
