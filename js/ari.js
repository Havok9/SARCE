/* ============================================================
   ari.js — Console ARI interactive (portage vanilla de la
   console pédagogique : schéma annoté, circuit d'air animé,
   calculateur d'autonomie Boyle-Mariotte).
   Données : data/ari-data.js (window.ARI_DATA / ARI_CIRCUIT)
   ============================================================ */

const AriConsole = (() => {
  const DATA = () => window.ARI_DATA || [];
  let tab = 'schema', sel = null, zone = null;

  /* ---------- SVG du schéma (viewBox 1400x900), style volumétrique ---------- */
  const DEFS = `
  <defs>
    <linearGradient id="axY" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f0cf49"/><stop offset="45%" stop-color="#c39a2e"/><stop offset="100%" stop-color="#8a6a1a"/></linearGradient>
    <radialGradient id="axG" cx="35%" cy="28%" r="85%"><stop offset="0" stop-color="#5a6488"/><stop offset="100%" stop-color="#1a1a32"/></radialGradient>
    <linearGradient id="axE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#32324f"/><stop offset="100%" stop-color="#181830"/></linearGradient>
    <linearGradient id="axT" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#20203c"/><stop offset="100%" stop-color="#101024"/></linearGradient>
    <linearGradient id="axR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c74a3a"/><stop offset="100%" stop-color="#7e2418"/></linearGradient>
    <linearGradient id="axO" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f39c4a"/><stop offset="100%" stop-color="#a85a10"/></linearGradient>
    <filter id="axS" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="7" stdDeviation="11" flood-color="#000" flood-opacity="0.5"/></filter>
    <marker id="axAo" markerUnits="userSpaceOnUse" markerWidth="18" markerHeight="18" refX="11" refY="9" orient="auto"><path d="M0 1 L18 9 L0 17 Z" fill="#e67e22"/></marker>
    <marker id="axAb" markerUnits="userSpaceOnUse" markerWidth="18" markerHeight="18" refX="11" refY="9" orient="auto"><path d="M0 1 L18 9 L0 17 Z" fill="#4B8FE0"/></marker>
    <marker id="axAg" markerUnits="userSpaceOnUse" markerWidth="16" markerHeight="16" refX="10" refY="8" orient="auto"><path d="M0 1 L16 8 L0 15 Z" fill="#8a94b8"/></marker>
  </defs>`;

  /* flexibles animés : HP gris pointillé, MP orange, BP bleu */
  const HOSES = `
  <g fill="none" stroke-linecap="round">
    <!-- HP robinet -> détendeur -->
    <path d="M845 455 Q848 300 890 250" stroke="#8a94b8" stroke-width="5" stroke-dasharray="8 8"/>
    <path d="M845 455 Q848 300 890 250" stroke="#c8d0e8" stroke-width="5" stroke-dasharray="2 22" style="animation:flowdash 1.4s linear infinite;"/>
    <!-- HP -> bodyguard -->
    <path d="M860 480 Q960 470 1055 420" stroke="#8a94b8" stroke-width="4" stroke-dasharray="7 8"/>
    <path d="M860 480 Q960 470 1055 420" stroke="#c8d0e8" stroke-width="4" stroke-dasharray="2 20" style="animation:flowdash 1.6s linear infinite;"/>
    <!-- HP -> sifflet -->
    <path d="M840 490 Q700 600 605 665" stroke="#8a94b8" stroke-width="4" stroke-dasharray="7 8"/>
    <path d="M840 490 Q700 600 605 665" stroke="#c8d0e8" stroke-width="4" stroke-dasharray="2 20" style="animation:flowdash 1.7s linear infinite;"/>
    <!-- MP détendeur -> SAD -->
    <path d="M880 200 Q660 220 530 258" stroke="#e67e22" stroke-width="6" marker-end="url(#axAo)" stroke-dasharray="14 18" style="animation:flowdash .9s linear infinite;"/>
    <!-- MP détendeur -> prise aux -->
    <path d="M930 235 Q1080 330 1100 505" stroke="#e67e22" stroke-width="5" stroke-dasharray="12 16" style="animation:flowdash 1.1s linear infinite;"/>
    <!-- BP SAD -> masque -->
    <path d="M510 245 Q580 200 640 175" stroke="#4B8FE0" stroke-width="6" marker-end="url(#axAb)" stroke-dasharray="12 16" style="animation:flowdash .8s linear infinite;"/>
    <!-- MP option prise aux -> cagoule -->
    <path d="M1055 540 Q600 640 260 260" stroke="#e67e22" stroke-width="3.5" opacity=".55" stroke-dasharray="8 14" style="animation:flowdash 1.4s linear infinite;"/>
  </g>`;

  function schemaSVG(){
    return `<svg viewBox="0 0 1400 900">${DEFS}
    <!-- ================== DOSSARD + HARNAIS (03) ================== -->
    <ellipse cx="690" cy="660" rx="130" ry="14" fill="#000" opacity=".35"/>
    <rect x="600" y="330" width="170" height="310" rx="26" fill="url(#axE)" stroke="#68689a" stroke-width="4" filter="url(#axS)"/>
    <rect x="614" y="344" width="18" height="280" rx="9" fill="#ffffff" opacity=".05"/>
    <g stroke="#41416a" stroke-width="16" fill="none" stroke-linecap="round">
      <path d="M620 350 Q560 420 575 560"/><path d="M750 350 Q810 420 795 560"/>
    </g>
    <rect x="590" y="590" width="190" height="30" rx="12" fill="#41416a"/>
    <rect x="655" y="588" width="60" height="34" rx="8" fill="url(#axG)" stroke="#8a94b8" stroke-width="3"/>
    <!-- ================== BOUTEILLE (01) + ROBINET (02) ================== -->
    <ellipse cx="905" cy="510" rx="80" ry="11" fill="#000" opacity=".4"/>
    <rect x="855" y="290" width="100" height="215" rx="46" fill="url(#axY)" stroke="#6a5210" stroke-width="4" filter="url(#axS)"/>
    <rect x="872" y="308" width="16" height="180" rx="8" fill="#ffffff" opacity=".25"/>
    <rect x="855" y="452" width="100" height="53" rx="18" fill="#1a1a1a" opacity=".85"/>
    <rect x="868" y="330" width="74" height="52" rx="4" fill="#f5f2e8"/>
    <text x="905" y="352" text-anchor="middle" font-family="Chakra Petch" font-weight="700" font-size="20" fill="#111">7 L</text>
    <text x="905" y="373" text-anchor="middle" font-family="IBM Plex Mono" font-size="13" fill="#333">300 BAR</text>
    <rect x="893" y="252" width="24" height="42" rx="6" fill="url(#axG)" stroke="#8a94b8" stroke-width="3"/>
    <circle cx="935" cy="262" r="15" fill="none" stroke="#8a94b8" stroke-width="6"/>
    <!-- ================== DÉTENDEUR HP (04) ================== -->
    <circle cx="905" cy="200" r="42" fill="url(#axG)" stroke="#8a94b8" stroke-width="4" filter="url(#axS)"/>
    <circle cx="905" cy="200" r="18" fill="#12122a" stroke="#8a94b8" stroke-width="3"/>
    <path d="M878 172 A42 42 0 0 1 932 176" fill="none" stroke="#c8d4ea" stroke-width="3" opacity=".5" stroke-linecap="round"/>
    <!-- ================== MASQUE (06) ================== -->
    <ellipse cx="680" cy="160" rx="80" ry="105" fill="#202038" stroke="#68689a" stroke-width="4" filter="url(#axS)"/>
    <ellipse cx="680" cy="135" rx="58" ry="62" fill="#4B8FE0" opacity=".22" stroke="#4B8FE0" stroke-width="2.5"/>
    <ellipse cx="662" cy="115" rx="18" ry="26" fill="#ffffff" opacity=".12"/>
    <ellipse cx="680" cy="228" rx="26" ry="20" fill="url(#axG)" stroke="#8a94b8" stroke-width="3"/>
    <g stroke="#41416a" stroke-width="7" fill="none" stroke-linecap="round"><path d="M604 130 Q560 120 540 130"/><path d="M756 130 Q800 120 820 130"/><path d="M610 210 Q570 230 550 226"/><path d="M750 210 Q790 230 810 226"/></g>
    <!-- ================== SAD (05) ================== -->
    <circle cx="480" cy="265" r="46" fill="url(#axG)" stroke="#8a94b8" stroke-width="4" filter="url(#axS)"/>
    <circle cx="480" cy="265" r="20" fill="#c0392b" stroke="#7e2418" stroke-width="3"/>
    <circle cx="473" cy="257" r="6" fill="#ffffff" opacity=".3"/>
    <rect x="510" y="252" width="30" height="26" rx="6" fill="#41416a"/>
    <!-- ================== BODYGUARD (07) ================== -->
    <rect x="1035" y="300" width="80" height="130" rx="14" fill="url(#axE)" stroke="#e67e22" stroke-width="3.5" filter="url(#axS)"/>
    <rect x="1047" y="316" width="56" height="44" rx="5" fill="#12240f"/>
    <text x="1075" y="345" text-anchor="middle" font-family="IBM Plex Mono" font-size="17" fill="#7ec36a">297</text>
    <circle cx="1075" cy="392" r="16" fill="#c0392b" stroke="#7e2418" stroke-width="3"/>
    <rect x="1058" y="416" width="34" height="8" rx="4" fill="#41416a"/>
    <!-- ================== SIFFLET HP (08) ================== -->
    <g transform="translate(575 668)">
      <rect x="-24" y="-10" width="48" height="24" rx="10" fill="url(#axG)" stroke="#8a94b8" stroke-width="3" filter="url(#axS)"/>
      <circle cx="30" cy="2" r="12" fill="none" stroke="#8a94b8" stroke-width="4"/>
      <g stroke="#e67e22" stroke-width="3" stroke-linecap="round" opacity=".8"><path d="M48 -8 q10 10 0 20"/><path d="M58 -14 q16 16 0 32"/></g>
    </g>
    <!-- ================== PRISE AUX (09) ================== -->
    <path d="M1100 520 Q1140 540 1180 535" stroke="#41416a" stroke-width="10" fill="none" stroke-linecap="round"/>
    <rect x="1180" y="518" width="46" height="34" rx="8" fill="url(#axG)" stroke="#e67e22" stroke-width="3" filter="url(#axS)"/>
    <circle cx="1226" cy="535" r="10" fill="#12122a" stroke="#8a94b8" stroke-width="3"/>
    <!-- ================== CAGOULE ÉVAC (10) ================== -->
    <path d="M110 250 Q100 140 175 125 Q255 135 245 250 Q180 275 110 250 Z" fill="url(#axO)" stroke="#8a4a10" stroke-width="4" filter="url(#axS)"/>
    <ellipse cx="175" cy="185" rx="38" ry="42" fill="#1a1a2e" opacity=".75" stroke="#8a4a10" stroke-width="3"/>
    <path d="M120 255 Q175 280 240 255" stroke="#e8c33a" stroke-width="5" fill="none" stroke-dasharray="8 6"/>
    <!-- ================== RHINO EVAC (13) ================== -->
    <rect x="105" y="360" width="120" height="34" rx="10" fill="url(#axR)" stroke="#5a1c12" stroke-width="3" filter="url(#axS)"/>
    <rect x="118" y="368" width="94" height="6" rx="3" fill="#e8e9f3" opacity=".7"/>
    <rect x="140" y="405" width="52" height="80" rx="14" fill="url(#axG)" stroke="#8a94b8" stroke-width="3" filter="url(#axS)"/>
    <rect x="154" y="420" width="24" height="30" rx="4" fill="#12122a" stroke="#565686" stroke-width="2"/>
    <path d="M166 485 q-14 30 8 48" stroke="#b0b0cc" stroke-width="5" fill="none" stroke-linecap="round"/>
    <!-- ================== LP (11) ================== -->
    <g transform="translate(210 800)">
      <ellipse rx="62" ry="40" fill="none" stroke="#b0b0cc" stroke-width="7"/>
      <ellipse rx="44" ry="27" fill="none" stroke="#9a9ab8" stroke-width="6"/>
      <ellipse rx="26" ry="15" fill="none" stroke="#b0b0cc" stroke-width="6"/>
      <rect x="52" y="-14" width="22" height="34" rx="10" fill="none" stroke="#8a94b8" stroke-width="6"/>
    </g>
    <!-- ================== LIGNE GUIDE (12) ================== -->
    <g transform="translate(492 800)">
      <circle r="58" fill="#12122a" stroke="#68689a" stroke-width="4" filter="url(#axS)"/>
      <circle r="40" fill="none" stroke="#41416a" stroke-width="7"/>
      <circle r="22" fill="none" stroke="#41416a" stroke-width="6"/>
      <circle r="8" fill="url(#axG)" stroke="#8a94b8" stroke-width="3"/>
      <g fill="#e67e22"><circle cx="70" cy="-18" r="6"/><circle cx="84" cy="-8" r="6"/><circle cx="98" cy="2" r="6"/></g>
      <path d="M58 -6 Q90 8 112 6" stroke="#9a9ab8" stroke-width="5" fill="none"/>
    </g>
    <!-- ================== TABLEAU DE CONTRÔLE (14) ================== -->
    <rect x="1120" y="630" width="195" height="255" rx="10" fill="url(#axT)" stroke="#5a6488" stroke-width="4" filter="url(#axS)"/>
    <g fill="#13233a" stroke="#4a5474" stroke-width="2">
      <rect x="1140" y="652" width="70" height="46" rx="4"/><rect x="1226" y="652" width="70" height="46" rx="4"/>
      <rect x="1140" y="712" width="70" height="46" rx="4"/><rect x="1226" y="712" width="70" height="46" rx="4"/>
    </g>
    <circle cx="1175" cy="800" r="24" fill="url(#axG)" stroke="#8a94b8" stroke-width="3"/>
    <line x1="1175" y1="800" x2="1175" y2="782" stroke="#e8e9f3" stroke-width="3" stroke-linecap="round"/>
    <line x1="1175" y1="800" x2="1188" y2="806" stroke="#e8e9f3" stroke-width="3" stroke-linecap="round"/>
    <g fill="#e8c33a"><rect x="1222" y="778" width="30" height="14" rx="3"/><rect x="1258" y="778" width="30" height="14" rx="3"/><rect x="1222" y="800" width="30" height="14" rx="3"/></g>
    <!-- ================== TPH (15) ================== -->
    <rect x="1268" y="90" width="72" height="220" rx="14" fill="url(#axE)" stroke="#68689a" stroke-width="4" filter="url(#axS)"/>
    <rect x="1280" y="112" width="48" height="56" rx="5" fill="#13233a" stroke="#4a5474" stroke-width="2"/>
    <g fill="url(#axG)" stroke="#55556a" stroke-width="2">
      <circle cx="1290" cy="196" r="8"/><circle cx="1312" cy="196" r="8"/><circle cx="1290" cy="222" r="8"/><circle cx="1312" cy="222" r="8"/><circle cx="1290" cy="248" r="8"/><circle cx="1312" cy="248" r="8"/>
    </g>
    <line x1="1284" y1="90" x2="1284" y2="40" stroke="#8a94b8" stroke-width="6" stroke-linecap="round"/>
    ${HOSES}
    <!-- légende -->
    <g font-family="IBM Plex Mono" font-size="19">
      <path d="M40 560 h34" stroke="#8a94b8" stroke-width="4" stroke-dasharray="7 7"/><text x="86" y="566" fill="#8a94b8">HP — 300 bar</text>
      <path d="M40 596 h34" stroke="#e67e22" stroke-width="5"/><text x="86" y="602" fill="#e67e22">MP — 6-7 bar</text>
      <path d="M40 632 h34" stroke="#4B8FE0" stroke-width="5"/><text x="86" y="638" fill="#4B8FE0">BP — ~1 mbar surpression</text>
    </g>
  </svg>`;
  }

  /* ---------- panneau de détail riche ---------- */
  function detailHTML(item){
    if (!item) return `<div class="ari-empty"><div class="ari-empty-big">ARI</div>
      Sélectionnez un composant numéroté<br>sur le schéma pour afficher sa fiche :<br>description · fonction · vérifications · pannes · procédure</div>`;
    const list = (arr, cls, icon) => (arr || []).map(v =>
      `<li class="${cls}"><span>${icon}</span><div>${v}</div></li>`).join('');
    return `
      <div class="ari-d-head">
        <div class="ari-d-num">N° ${item.num} · ${item.family.toUpperCase()}</div>
        <div class="ari-d-name">${item.name}</div>
        <div class="ari-d-short">${item.short}</div>
      </div>
      <div class="ari-d-sec"><h4>Description</h4><p>${item.description}</p></div>
      <div class="ari-d-sec"><h4>Fonction</h4><p>${item.fonction}</p></div>
      <div class="ari-d-sec"><h4>Vérifications</h4><ul class="ari-list">${list(item.verifications, 'ari-check', '☐')}</ul></div>
      <div class="ari-d-sec"><h4>Pannes / réforme</h4><ul class="ari-list">${list(item.pannes, 'ari-fault', '!')}</ul></div>
      <div class="ari-d-sec"><h4>Procédure porteur</h4><p>${item.procedure}</p></div>`;
  }

  /* ---------- vue circuit (diagramme de flux animé) ---------- */
  function circuitSVG(){
    const N = {
      bouteille: { x:60, y:270, w:135, h:100, l:'BOUTEILLE', s:'7 L · 300 bar', n:'01' },
      robinet:   { x:235, y:295, w:95, h:52, l:'ROBINET', s:'volant HP', n:'02' },
      junction:  { x:370, y:290, w:85, h:62, l:'JONCTION', s:'4 flexibles', n:'', a:1 },
      manometre: { x:545, y:360, w:135, h:70, l:'BODYGUARD', s:'mano + DSU', n:'07' },
      sifflet:   { x:545, y:460, w:135, h:70, l:'SIFFLET HP', s:'< 50 bar', n:'08' },
      detendeur: { x:495, y:215, w:145, h:70, l:'DÉTENDEUR HP', s:'→ 6-7 bar MP', n:'04' },
      soupape:   { x:705, y:125, w:135, h:70, l:'SAD', s:'détendeur BP', n:'05' },
      prise_aux: { x:705, y:250, w:135, h:70, l:'PRISE AUX', s:'narguilé MP', n:'09' },
      masque:    { x:895, y:125, w:135, h:70, l:'MASQUE', s:'+ ~1 mbar', n:'06' },
      cagoule:   { x:895, y:250, w:135, h:70, l:'CAGOULE', s:'40 L/min', n:'10' },
    };
    const E = [
      ['bouteille','robinet','main','300 BAR'], ['robinet','junction','main','HP'],
      ['junction','manometre','hp','FLEX. HP n°1'], ['junction','sifflet','hp','FLEX. HP n°2'],
      ['junction','detendeur','hp','HP'],
      ['detendeur','soupape','mp','MP n°1 · 6-7 bar'], ['detendeur','prise_aux','mp','MP n°2 · 6-7 bar'],
      ['soupape','masque','bp','~1 mbar'], ['prise_aux','cagoule','mpo','40 L/min'],
    ];
    const path = (a, b) => {
      const ca = { x:a.x+a.w/2, y:a.y+a.h/2 }, cb = { x:b.x+b.w/2, y:b.y+b.h/2 };
      const dx = cb.x-ca.x, dy = cb.y-ca.y;
      if (Math.abs(dx) >= Math.abs(dy)){
        const p1 = { x: dx>0? a.x+a.w : a.x, y: ca.y }, p2 = { x: dx>0? b.x : b.x+b.w, y: cb.y };
        const mx = (p1.x+p2.x)/2;
        return { d:`M ${p1.x} ${p1.y} L ${mx} ${p1.y} L ${mx} ${p2.y} L ${p2.x} ${p2.y}`, mx, my:(p1.y+p2.y)/2 };
      }
      const p1 = { x: ca.x, y: dy>0? a.y+a.h : a.y }, p2 = { x: cb.x, y: dy>0? b.y : b.y+b.h };
      const my = (p1.y+p2.y)/2;
      return { d:`M ${p1.x} ${p1.y} L ${p1.x} ${my} L ${p2.x} ${my} L ${p2.x} ${p2.y}`, mx:(p1.x+p2.x)/2, my };
    };
    let edges = '', nodes = '';
    E.forEach(([f, t, kind, label]) => {
      const { d, mx, my } = path(N[f], N[t]);
      const style = {
        main: ['#9ba4ad','0',3,''], hp:['#9ba4ad','6 4',1.8,''],
        mp:['#e67e22','0',2.6,'url(#axAo)'], mpo:['#e67e22','4 4',1.7,'url(#axAo)'], bp:['#4B8FE0','0',2.2,'url(#axAb)'],
      }[kind];
      edges += `<path d="${d}" fill="none" stroke="${style[0]}" stroke-width="${style[2]}" stroke-dasharray="${style[1]}" ${style[3]?`marker-end="${style[3]}"`:''} opacity="${kind==='mpo'?.7:1}"/>
        <path d="${d}" fill="none" stroke="${style[0]}" stroke-width="${style[2]+1.2}" stroke-dasharray="2 14" style="animation:flowdash 1.4s linear infinite;"/>`;
      if (label) edges += `<rect x="${mx-label.length*3.4-4}" y="${my-20}" width="${label.length*6.8+8}" height="14" fill="#15152b" opacity=".9" rx="2"/>
        <text x="${mx}" y="${my-9}" font-family="IBM Plex Mono" font-size="10" fill="${kind.startsWith('mp')?'#e67e22':kind==='bp'?'#4B8FE0':'#9ba4ad'}" text-anchor="middle">${label}</text>`;
    });
    Object.values(N).forEach(n => {
      nodes += `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="3" fill="${n.a?'rgba(230,126,34,.12)':'#15152b'}" stroke="${n.a?'#e67e22':'#8a94b8'}" stroke-width="1.4"/>
        <text x="${n.x+n.w/2}" y="${n.y+n.h/2-2}" font-family="IBM Plex Mono" font-size="12" font-weight="700" fill="#e8e9f3" text-anchor="middle">${n.l}</text>
        <text x="${n.x+n.w/2}" y="${n.y+n.h/2+15}" font-family="IBM Plex Mono" font-size="10" fill="#62628a" text-anchor="middle">${n.s}</text>
        ${n.n?`<text x="${n.x+7}" y="${n.y+14}" font-family="IBM Plex Mono" font-size="10" font-weight="700" fill="#e67e22">${n.n}</text>`:''}`;
    });
    return `<svg viewBox="0 0 1080 600">${DEFS}
      <text x="60" y="46" font-family="Chakra Petch" font-weight="700" font-size="17" fill="#e8e9f3" letter-spacing="2">TRAJET DE L'AIR — 4 FLEXIBLES</text>
      <text x="60" y="68" font-family="IBM Plex Mono" font-size="11" fill="#62628a">2 HP DIRECTS · 2 MP VIA DÉTENDEUR HP · BP À LA DEMANDE</text>
      ${edges}${nodes}
      <rect x="72" y="380" width="112" height="16" fill="#1a1a1a" stroke="#44446e" stroke-width="1"/>
      <text x="128" y="392" font-family="IBM Plex Mono" font-size="9" fill="#f5c518" text-anchor="middle" font-weight="700">N₂ 78 · O₂ 21 · 1 GR</text>
    </svg>`;
  }

  const CIRCUIT_SIDE = `
    <div class="card"><div class="card-title">Les 4 flexibles</div>
      <div class="ari-flex-grid">
        <b>1</b><div><b>HP direct → SIFFLET</b> — alerte fin de charge &lt; 50 bar, sécurité passive sans électricité.</div>
        <b>2</b><div><b>HP direct → BODYGUARD</b> — surveillance pression + DSU + balise détresse (21 s + 8 s).</div>
        <b>3</b><div><b>MP → SAD</b> — 6-7 bar, puis BP ~1 mbar : surpression permanente dans le masque.</div>
        <b>4</b><div><b>MP → PRISE AUX</b> — narguilé pour une 2ᵉ SAD ou la cagoule d'évacuation (40 L/min).</div>
      </div>
    </div>
    <div class="card" style="margin-top:10px; border-left:3px solid var(--orange);">
      <div class="card-title" style="color:var(--orange)">⚠ Cagoule d'évacuation</div>
      <div style="font-size:13px;color:var(--mut);line-height:1.55;">Branchée sur la prise auxiliaire : <b style="color:var(--txt)">retour immédiat obligatoire</b> — deux personnes consomment la même bouteille.</div>
    </div>`;

  /* ---------- vue autonomie ---------- */
  function autonomyHTML(){
    return `
    <div class="ari-auto">
      <div>
        <h3 class="ari-auto-title">Calcul d'autonomie</h3>
        <p class="ari-auto-lede">Boyle-Mariotte : le volume d'air disponible = <b>Pression × Volume ÷ 1,1</b>. L'autonomie = volume ÷ consommation. Ajustez les curseurs pour voir l'effet de l'effort sur votre temps d'air.</p>
        <div class="ari-field"><label>Pression bouteille</label><div><input type="range" id="au-p" min="50" max="300" step="10" value="300"><span id="au-pv">300 bar</span></div></div>
        <div class="ari-field"><label>Volume bouteille</label><div><input type="range" id="au-v" min="4" max="9" step="0.5" value="7"><span id="au-vv">7 L</span></div></div>
        <div class="ari-field"><label>Consommation (effort)</label><div><input type="range" id="au-q" min="30" max="120" step="10" value="100"><span id="au-qv">100 L/min</span></div></div>
        <div class="ari-conso-hints">30 L/min repos · 50 marche · 100 lutte incendie · 120 effort violent</div>
      </div>
      <div class="ari-readout">
        <div class="ari-r-label">AUTONOMIE THÉORIQUE</div>
        <div class="ari-r-big"><span id="au-min">19</span><span class="u">min</span></div>
        <div class="ari-r-sub" id="au-detail"></div>
        <div class="ari-phase"><div id="au-seg-w" style="background:var(--orange)"></div><div id="au-seg-r" style="background:var(--red-hi)"></div></div>
        <div class="ari-phase-leg"><span><i style="background:var(--orange)"></i>engagement + retour</span><span><i style="background:var(--red-hi)"></i>réserve sifflet (&lt; 50 bar)</span></div>
      </div>
    </div>`;
  }

  function bindAutonomy(root){
    const $ = s => root.querySelector(s);
    const upd = () => {
      const P = +$('#au-p').value, V = +$('#au-v').value, Q = +$('#au-q').value;
      $('#au-pv').textContent = P + ' bar'; $('#au-vv').textContent = V + ' L'; $('#au-qv').textContent = Q + ' L/min';
      const capa = (P * V) / 1.1;
      const total = capa / Q;
      const reserve = (50 * V) / 1.1 / Q;
      const utile = Math.max(0, total - reserve);
      $('#au-min').textContent = Math.round(total);
      $('#au-detail').innerHTML = `Capacité : <b>${Math.round(capa)} L</b> d'air détendu · dont <b>${Math.round(utile)} min</b> utiles avant le sifflet (${Math.round(reserve)} min de réserve)`;
      $('#au-seg-w').style.width = (utile/total*100) + '%';
      $('#au-seg-r').style.width = (reserve/total*100) + '%';
    };
    ['#au-p','#au-v','#au-q'].forEach(s => $(s).addEventListener('input', upd));
    upd();
  }

  /* ---------- montage ---------- */
  function render(){
    const items = DATA();
    zone.innerHTML = `
      <div class="scenario-bar">
        ${[['schema','⬡ Schéma annoté'],['circuit','⇶ Circuit d\u2019air'],['auto','◔ Autonomie']].map(([k,l]) =>
          `<button class="scenario-btn ${tab===k?'active':''}" data-t="${k}"><span class="dot"></span>${l}</button>`).join('')}
      </div>
      <div id="ari-view"></div>`;
    zone.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.t; render(); }));
    const view = zone.querySelector('#ari-view');

    if (tab === 'schema'){
      view.innerHTML = `
        <div class="ari-grid">
          <div class="schema-stage" style="aspect-ratio:1400/980;" id="ari-stage">${schemaSVG()}</div>
          <div class="ari-detail" id="ari-detail">${detailHTML(items.find(i => i.id === sel))}</div>
        </div>
        <div class="element-chips" id="ari-chips">${items.map(i =>
          `<button class="element-chip ${i.id===sel?'sel':''}" data-id="${i.id}"><span class="n">${i.num}</span>${i.name}</button>`).join('')}</div>`;
      const stage = view.querySelector('#ari-stage');
      items.forEach(i => {
        const b = document.createElement('button');
        b.className = 'hotspot' + (i.id === sel ? ' sel' : '');
        b.style.left = (i.point.x/14) + '%';
        b.style.top  = (i.point.y/9.8) + '%';
        b.textContent = i.num;
        b.title = i.name;
        b.addEventListener('click', () => select(i.id));
        b.addEventListener('mouseenter', () => hoverLabel(b, i));
        b.addEventListener('mouseleave', () => { const l = b.querySelector('.hs-label'); if (l) l.remove(); });
        stage.appendChild(b);
      });
      view.querySelectorAll('.element-chip').forEach(c => c.addEventListener('click', () => select(c.dataset.id)));
    } else if (tab === 'circuit'){
      view.innerHTML = `<div class="schema-stage" style="aspect-ratio:1080/600;">${circuitSVG()}</div><div style="margin-top:12px;">${CIRCUIT_SIDE}</div>`;
    } else {
      view.innerHTML = autonomyHTML();
      bindAutonomy(view);
    }
  }

  function hoverLabel(b, i){
    if (b.querySelector('.hs-label')) return;
    const lab = document.createElement('span');
    lab.className = 'hs-label';
    lab.textContent = i.name;
    b.appendChild(lab);
  }

  function select(id){
    sel = (sel === id) ? sel : id;
    const items = DATA();
    const d = zone.querySelector('#ari-detail');
    if (d){ d.innerHTML = detailHTML(items.find(i => i.id === id)); d.scrollTop = 0; }
    zone.querySelectorAll('#ari-stage .hotspot').forEach(h => h.classList.toggle('sel', h.textContent === (items.find(i=>i.id===id)||{}).num));
    zone.querySelectorAll('.element-chip').forEach(c => c.classList.toggle('sel', c.dataset.id === id));
  }

  return {
    mount(container){ zone = container; tab = 'schema'; render(); }
  };
})();
window.AriConsole = AriConsole; // exposé explicitement (const ≠ propriété window)
