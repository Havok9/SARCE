/* ============================================================
   graph.js — graphe de connexions entre modules (style Obsidian)
   Simulation de forces légère sur <canvas>, cliquable.
   ============================================================ */

const Graph = (() => {

  /* Crée un graphe dans `container`.
     nodes : [{id, label, color, size, dim}]
     links : [[idA, idB], ...]
     onClick(id) : navigation */
  function create(container, nodes, links, onClick){
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let W = 0, H = 0;

    function resize(){
      W = container.clientWidth; H = container.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    /* état des nœuds : position initiale en cercle + aléa */
    const N = nodes.map((n, i) => {
      const a = (i / nodes.length) * Math.PI * 2;
      return Object.assign({
        x: W/2 + Math.cos(a) * Math.min(W,H)*0.32 + (Math.random()*30-15),
        y: H/2 + Math.sin(a) * Math.min(W,H)*0.32 + (Math.random()*30-15),
        vx: 0, vy: 0,
      }, n);
    });
    const byId = {};
    N.forEach(n => byId[n.id] = n);
    const L = links.filter(l => byId[l[0]] && byId[l[1]]);

    let hovered = null, dragging = null, raf = null, ticks = 0;

    function step(){
      ticks++;
      /* répulsion */
      for (let i = 0; i < N.length; i++){
        for (let j = i+1; j < N.length; j++){
          const a = N[i], b = N[j];
          let dx = a.x-b.x, dy = a.y-b.y;
          let d2 = dx*dx + dy*dy || 1;
          if (d2 < 40000){
            const f = 1400 / d2;
            const d = Math.sqrt(d2);
            dx /= d; dy /= d;
            a.vx += dx*f; a.vy += dy*f;
            b.vx -= dx*f; b.vy -= dy*f;
          }
        }
      }
      /* attraction des liens */
      L.forEach(l => {
        const a = byId[l[0]], b = byId[l[1]];
        const dx = b.x-a.x, dy = b.y-a.y;
        const d = Math.sqrt(dx*dx+dy*dy) || 1;
        const f = (d - 90) * 0.004;
        a.vx += dx/d*f*d*0.02; a.vy += dy/d*f*d*0.02;
        b.vx -= dx/d*f*d*0.02; b.vy -= dy/d*f*d*0.02;
      });
      /* gravité vers le centre + friction + bornes */
      N.forEach(n => {
        n.vx += (W/2 - n.x) * 0.0035;
        n.vy += (H/2 - n.y) * 0.0035;
        n.vx *= 0.82; n.vy *= 0.82;
        if (n !== dragging){ n.x += n.vx; n.y += n.vy; }
        n.x = Math.max(24, Math.min(W-24, n.x));
        n.y = Math.max(20, Math.min(H-20, n.y));
      });
    }

    function draw(){
      ctx.clearRect(0, 0, W, H);
      /* liens */
      ctx.lineWidth = 1;
      L.forEach(l => {
        const a = byId[l[0]], b = byId[l[1]];
        const hi = hovered && (hovered === a || hovered === b);
        ctx.strokeStyle = hi ? 'rgba(230,126,34,.55)' : 'rgba(120,120,170,.22)';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
      /* nœuds */
      N.forEach(n => {
        const r = n.size || 6;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI*2);
        ctx.fillStyle = n.dim ? 'rgba(98,98,138,.5)' : n.color;
        ctx.fill();
        if (n === hovered){
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#e67e22';
          ctx.stroke();
        }
        /* libellé */
        ctx.font = (n === hovered ? '600 ' : '') + '10.5px "IBM Plex Mono", monospace';
        ctx.fillStyle = n === hovered ? '#e8e9f3' : (n.dim ? 'rgba(154,154,184,.5)' : 'rgba(200,200,225,.8)');
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + r + 13);
      });
    }

    function loop(){
      if (ticks < 400 || dragging) step();
      draw();
      raf = requestAnimationFrame(loop);
    }
    loop();

    /* interactions */
    function pick(ev){
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
      return N.find(n => {
        const dx = n.x-x, dy = n.y-y;
        return dx*dx + dy*dy < Math.pow((n.size||6)+8, 2);
      }) || null;
    }
    canvas.addEventListener('mousemove', ev => {
      if (dragging){
        const rect = canvas.getBoundingClientRect();
        dragging.x = ev.clientX-rect.left; dragging.y = ev.clientY-rect.top;
        ticks = 0;
        return;
      }
      hovered = pick(ev);
      canvas.style.cursor = hovered ? 'pointer' : 'grab';
    });
    canvas.addEventListener('mousedown', ev => { dragging = pick(ev); });
    window.addEventListener('mouseup', () => { dragging = null; });
    canvas.addEventListener('click', ev => {
      const n = pick(ev);
      if (n && onClick) onClick(n.id);
    });
    canvas.addEventListener('mouseleave', () => { hovered = null; });

    const obs = new ResizeObserver(() => { resize(); ticks = 0; });
    obs.observe(container);

    /* nettoyage quand la vue change */
    return () => { cancelAnimationFrame(raf); obs.disconnect(); };
  }

  return { create };
})();
