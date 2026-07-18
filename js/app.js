/* ============================================================
   app.js — noyau de l'application
   Routing SPA léger (hash), navigation, recherche, vues :
   accueil (graphe global), domaine, fiche module, QCM,
   révision rapide, exercice « à blanc », session du jour.
   ============================================================ */

const App = (() => {

  let DATA = null;      // contenu de data/modules.json
  let QUIZ = null;      // contenu de data/quiz.json
  let session = null;   // { queue:[moduleIds], idx } — session du jour
  let cleanupGraph = null; // destructeur du graphe de la vue courante

  const $ = sel => document.querySelector(sel);

  /* ---------- helpers données ---------- */
  const domain = id => DATA.domains.find(d => d.id === id);
  const module_ = id => DATA.modules.find(m => m.id === id);
  const domainModules = id => DATA.modules.filter(m => m.domain === id);
  const isFull = m => m.status !== 'squelette';
  const quizOf = id => (QUIZ && QUIZ[id]) || [];

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

  /* ============================================================
     DÉMARRAGE
     ============================================================ */
  async function init(){
    try{
      const [m, q] = await Promise.all([
        fetch('data/modules.json').then(r => r.json()),
        fetch('data/quiz.json').then(r => r.json()),
      ]);
      DATA = m; QUIZ = q;
    }catch(e){
      document.body.innerHTML =
        '<div style="max-width:520px;margin:80px auto;padding:24px;font-family:sans-serif;color:#e8e9f3;">' +
        '<h2>Impossible de charger les données</h2>' +
        '<p>Ouvrez le site via un petit serveur local (ex. extension <b>Live Server</b> de VS Code), ' +
        'le chargement des fichiers JSON est bloqué en ouverture directe de fichier.</p></div>';
      return;
    }

    bindLogin();
    bindChrome();

    if (Progress.restore()) showApp();
    else showLogin();
  }

  /* ============================================================
     CONNEXION (profils locaux)
     ============================================================ */
  let loginNew = false;

  function bindLogin(){
    $('#login-submit').addEventListener('click', doLogin);
    $('#login-pin').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    $('#login-pin').addEventListener('input', e => {
      e.target.value = e.target.value.replace(/\D/g,'').slice(0,4);
    });
    $('#login-toggle').addEventListener('click', () => {
      loginNew = !loginNew;
      $('#login-mode-title').textContent = loginNew ? 'Nouveau profil' : 'Connexion';
      $('#login-submit').textContent = loginNew ? 'Créer le profil' : 'Se connecter';
      $('#login-toggle').textContent = loginNew ? '‹ Retour à la connexion' : 'Créer un nouveau profil';
      $('#login-error').hidden = true;
    });
    $('#btn-logout').addEventListener('click', () => {
      Progress.logout();
      session = null;
      $('#app').hidden = true;
      showLogin();
    });
  }

  function doLogin(){
    const res = Progress.login($('#login-name').value, $('#login-pin').value, loginNew);
    if (res.error){
      const el = $('#login-error');
      el.textContent = res.error; el.hidden = false;
      return;
    }
    $('#login-pin').value = '';
    showApp();
  }

  function showLogin(){
    $('#login-screen').hidden = false;
    /* pastilles de profils existants */
    const chips = $('#profile-chips');
    const profiles = Progress.getProfiles();
    chips.innerHTML = profiles.length
      ? profiles.map(p => `<button class="profile-chip" data-name="${esc(p.name)}">
          <span class="pc-initial">${esc(p.name[0].toUpperCase())}</span>${esc(p.name)}</button>`).join('')
      : '<div class="no-profiles">Aucun profil — créez-en un ci-dessous.</div>';
    chips.querySelectorAll('.profile-chip').forEach(b => {
      b.addEventListener('click', () => {
        $('#login-name').value = b.dataset.name;
        $('#login-pin').focus();
      });
    });
  }

  function showApp(){
    $('#login-screen').hidden = true;
    $('#app').hidden = false;
    $('#foot-user').textContent = Progress.current;
    Progress.touchDay();
    session = loadSession();
    renderNav();
    window.addEventListener('hashchange', route);
    route();
  }

  /* ============================================================
     CHROME : sidebar, recherche, session
     ============================================================ */
  function bindChrome(){
    $('#btn-menu').addEventListener('click', () => $('#sidebar').classList.add('open') || ($('#sidebar-backdrop').hidden = false));
    $('#sidebar-backdrop').addEventListener('click', closeSidebar);
    $('#btn-session').addEventListener('click', continueSession);
    Pomo.init();
    $('#btn-focus').addEventListener('click', openFocus);

    const input = $('#search-input');
    input.addEventListener('input', () => renderSearch(input.value));
    input.addEventListener('blur', () => setTimeout(() => { $('#search-results').hidden = true; }, 180));
    input.addEventListener('focus', () => renderSearch(input.value));
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){
        e.preventDefault();
        $('#sidebar').classList.add('open'); $('#sidebar-backdrop').hidden = false;
        input.focus(); input.select();
      }
      if (e.key === 'Escape') closeSidebar();
    });
  }

  function closeSidebar(){
    $('#sidebar').classList.remove('open');
    $('#sidebar-backdrop').hidden = true;
  }

  function renderSearch(qstr){
    const box = $('#search-results');
    qstr = (qstr || '').trim().toLowerCase();
    if (!qstr){ box.hidden = true; return; }
    const hits = DATA.modules.filter(m =>
      m.title.toLowerCase().includes(qstr) ||
      (m.tags || []).some(t => t.toLowerCase().includes(qstr)) ||
      (m.tag || '').toLowerCase().includes(qstr)
    ).slice(0, 8);
    box.innerHTML = hits.length
      ? hits.map(m => `<button class="search-result" data-id="${m.id}">
          <span class="sr-domain">${esc(domain(m.domain).title)}</span>${esc(m.title)}</button>`).join('')
      : '<div class="search-result" style="color:var(--mut-2)">Aucun résultat</div>';
    box.hidden = false;
    box.querySelectorAll('[data-id]').forEach(b => {
      b.addEventListener('click', () => {
        box.hidden = true; $('#search-input').value = '';
        closeSidebar();
        location.hash = '#/module/' + b.dataset.id;
      });
    });
  }

  /* ---------- arbre de navigation ---------- */
  const openDomains = new Set();

  function renderNav(){
    const tree = $('#nav-tree');
    const curId = currentModuleId();
    if (curId && module_(curId)) openDomains.add(module_(curId).domain);
    if (!openDomains.size && DATA.domains.length) openDomains.add(DATA.domains[0].id);

    tree.innerHTML = DATA.domains.map(d => {
      const mods = domainModules(d.id);
      const items = mods.map(m => {
        const p = Progress.get(m.id).mastery || 0;
        return `<button class="nav-item ${m.id === curId ? 'active':''} ${isFull(m) ? '' : 'skeleton'}" data-mod="${m.id}">
          ${esc(m.title)}<span class="nav-pct">${isFull(m) ? (p > 0 ? p + '%' : '—') : '⚠'}</span></button>`;
      }).join('');
      return `<div class="nav-domain ${openDomains.has(d.id) ? 'open':''}" data-dom="${d.id}">
        <button class="nav-domain-head"><span class="nav-dot" style="background:${d.color}"></span>${esc(d.title)}<span class="nav-caret">▶</span></button>
        <div class="nav-items">${items}</div>
      </div>`;
    }).join('');

    tree.querySelectorAll('.nav-domain-head').forEach(h => {
      h.addEventListener('click', () => {
        const dom = h.parentElement.dataset.dom;
        if (openDomains.has(dom)) openDomains.delete(dom); else openDomains.add(dom);
        h.parentElement.classList.toggle('open');
      });
    });
    tree.querySelectorAll('.nav-item').forEach(b => {
      b.addEventListener('click', () => {
        closeSidebar();
        location.hash = '#/module/' + b.dataset.mod;
      });
    });
  }

  /* ============================================================
     ROUTER
     ============================================================ */
  function currentModuleId(){
    const m = location.hash.match(/^#\/module\/([\w-]+)/);
    return m ? m[1] : null;
  }

  function route(){
    if (cleanupGraph){ cleanupGraph(); cleanupGraph = null; }
    const h = location.hash || '#/';
    const view = $('#view');
    view.scrollTop = 0; window.scrollTo(0, 0);

    let m;
    if ((m = h.match(/^#\/module\/([\w-]+)\/qcm/)))      renderQuizView(m[1]);
    else if ((m = h.match(/^#\/module\/([\w-]+)\/cartes/))) renderFlashcards(m[1]);
    else if ((m = h.match(/^#\/module\/([\w-]+)/)))      renderModule(m[1]);
    else if ((m = h.match(/^#\/domaine\/([\w-]+)/)))     renderDomain(m[1]);
    else                                                 renderHome();
    renderNav();
  }

  function setBreadcrumb(parts){
    /* parts : [{label, href?}] — le dernier est la page courante */
    $('#breadcrumb').innerHTML = parts.map((p, i) => {
      const last = i === parts.length - 1;
      const el = p.href && !last ? `<a href="${p.href}">${esc(p.label)}</a>` : `<span class="${last ? 'bc-cur':''}">${esc(p.label)}</span>`;
      return el + (last ? '' : '<span class="bc-sep">›</span>');
    }).join('');
  }

  /* ============================================================
     VUE : ACCUEIL (graphe global + stats + points faibles)
     ============================================================ */
  function renderHome(){
    setBreadcrumb([{ label: 'Accueil' }]);
    const view = $('#view');

    const fulls = DATA.modules.filter(isFull);
    const global = Math.round(fulls.reduce((a, m) => a + (Progress.get(m.id).mastery || 0), 0) / (fulls.length || 1));
    const gcolor = Progress.masteryColor(global);
    const lvl = Progress.level();
    const stk = Progress.streak();
    const queue = sessionQueue();
    const saved = loadSession();

    /* à revoir : tri par urgence (date de rappel) */
    const due = fulls.map(m => ({ m, d: Progress.dueInfo(m.id) }))
      .sort((a, b) => a.d.due - b.d.due).slice(0, 5);

    view.innerHTML = `
      <div class="home-hero">
        <div class="home-hello">Bonjour ${esc(Progress.current)}.</div>
        <div class="home-sub">Reprenez là où ça compte — la session cible les modules dus et fragiles.</div>
      </div>

      <div class="mod-actions" style="margin:14px 0 20px;">
        <button class="btn btn-orange btn-sm" id="home-session">◆ ${saved ? 'Continuer la session' : 'Session du jour'}</button>
        <span style="font-size:12px;color:var(--mut-2);align-self:center;">${saved
            ? 'Étape ' + (saved.idx + 1) + '/' + saved.queue.length + ' — ' + esc((module_(saved.queue[saved.idx]) || {}).title || '')
            : 'Répétition espacée : ' + queue.slice(0, 3).map(id => module_(id).title).join(', ') + (queue.length > 3 ? '…' : '')}</span>
      </div>

      <div class="section-block" style="margin-top:0;">
        <div class="section-title">À revoir — dates exactes</div>
        ${due.map(({ m, d }) => `<a class="due-item s-${d.status}" href="#/module/${m.id}">
          <span class="due-badge due-${d.status}">${d.label}</span>
          <div style="flex:1;"><div class="wi-title">${esc(m.title)}</div></div>
          <span class="wi-pct" style="color:${Progress.masteryColor(Progress.get(m.id).mastery || 0)}">${Progress.get(m.id).mastery || 0}%</span>
          <span style="color:var(--mut-2)">›</span></a>`).join('')}
      </div>

      <div class="home-stats">
        <div class="card stat-card">
          <div class="card-title">Maîtrise globale</div>
          <div><span class="stat-big" style="color:${gcolor}">${global}</span><span class="stat-unit"> %</span></div>
          <div class="pbar" style="margin-top:12px;"><div style="width:${global}%; background:${gcolor}"></div></div>
          <div class="stat-note">Sur les ${fulls.length} modules rédigés.</div>
        </div>
      </div>

      <div class="section-block">
        <div class="section-title">Graphe des connaissances</div>
        <div class="graph-wrap" id="global-graph">
          <div class="graph-legend">${DATA.domains.map(d => `<span><i style="background:${d.color}"></i>${esc(d.title)}</span>`).join('')}</div>
        </div>
      </div>

      <div class="section-block">
        <div class="section-title">Domaines</div>
        <div class="grid-2">
          ${DATA.domains.map(d => {
            const mods = domainModules(d.id);
            const done = mods.filter(isFull).length;
            const pct = Math.round(mods.filter(isFull).reduce((a, m) => a + (Progress.get(m.id).mastery || 0), 0) / (done || 1));
            return `<a class="mod-card" href="#/domaine/${d.id}">
              <div class="mod-card-top"><div class="mod-card-title">${esc(d.title)}</div><span style="font-size:16px">${d.icon}</span></div>
              <div class="mod-card-tag">${mods.length} modules · ${done} rédigés${done < mods.length ? ' · ' + (mods.length - done) + ' à compléter' : ''}</div>
              <div class="mod-card-foot"><div class="pbar"><div style="width:${done ? pct : 0}%; background:${d.color}"></div></div>
              <span class="pbar-pct" style="color:${d.color}">${done ? pct + '%' : '—'}</span></div>
            </a>`;
          }).join('')}
        </div>
      </div>`;

    $('#home-session').addEventListener('click', continueSession);

    /* graphe global */
    const nodes = DATA.modules.map(mm => ({
      id: mm.id, label: mm.title.length > 22 ? mm.title.slice(0, 21) + '…' : mm.title,
      color: domain(mm.domain).color,
      size: 5 + Math.min(5, (mm.links || []).length),
      dim: !isFull(mm),
    }));
    const links = [];
    DATA.modules.forEach(mm => (mm.links || []).forEach(l => {
      if (mm.id < l) links.push([mm.id, l]); else links.push([l, mm.id]);
    }));
    const uniq = [...new Set(links.map(l => l.join('|')))].map(s => s.split('|'));
    cleanupGraph = Graph.create($('#global-graph'), nodes, uniq, id => location.hash = '#/module/' + id);
  }

  /* ============================================================
     VUE : DOMAINE
     ============================================================ */
  function renderDomain(id){
    const d = domain(id);
    if (!d) return renderHome();
    setBreadcrumb([{ label: 'Accueil', href: '#/' }, { label: d.title }]);
    const mods = domainModules(id);
    $('#view').innerHTML = `
      <div class="mod-head">
        <div class="mod-domain"><span class="nav-dot" style="background:${d.color}"></span>Domaine</div>
        <h1 class="mod-title">${d.icon} ${esc(d.title)}</h1>
        <div class="mod-tagline">${esc(d.tag || '')}</div>
      </div>
      <div class="grid-2">
        ${mods.map(m => {
          const p = Progress.get(m.id).mastery || 0;
          const color = Progress.masteryColor(p);
          return `<a class="mod-card" href="#/module/${m.id}">
            <div class="mod-card-top"><div class="mod-card-title">${esc(m.title)}</div><span style="font-size:15px">${m.icon || ''}</span></div>
            <div class="mod-card-tag">${esc(m.tag || '')}</div>
            ${isFull(m)
              ? `<div class="mod-card-foot"><div class="pbar"><div style="width:${p}%; background:${color}"></div></div><span class="pbar-pct" style="color:${color}">${p > 0 ? p + '%' : '—'}</span></div>
                 <div class="reviewed">${Progress.reviewLabel(m.id)}</div>`
              : '<span class="badge badge-warn">Squelette — à compléter</span>'}
          </a>`;
        }).join('')}
      </div>`;
  }

  /* ============================================================
     VUE : MODULE (fiche)
     ============================================================ */
  function renderModule(id){
    const mod = module_(id);
    if (!mod) return renderHome();
    const d = domain(mod.domain);
    setBreadcrumb([{ label: 'Accueil', href: '#/' }, { label: d.title, href: '#/domaine/' + d.id }, { label: mod.title }]);
    const hasQuiz = quizOf(id).length > 0;
    const views = mod.views || (mod.schema ? [{ schema: mod.schema, elements: mod.elements || [] }] : []);
    const hasSchema = views.some(v => Schema.has(v.schema) && (v.elements || []).length > 0);

    const view = $('#view');
    view.innerHTML = `
      <div class="mod-head">
        <div class="mod-domain"><span class="nav-dot" style="background:${d.color}"></span>${esc(d.title)}</div>
        <h1 class="mod-title">${esc(mod.title)}</h1>
        <div class="mod-tagline">${esc(mod.tag || '')}</div>
      </div>

      ${isFull(mod) ? `<div class="mod-actions">
        <div class="rev-wrap">
          <button class="btn btn-red btn-sm" id="btn-reviser">◆ Réviser ▾</button>
          <div class="rev-menu" id="rev-menu" hidden>
            ${(mod.keypoints || []).length ? '<button class="rev-item" data-r="flash">⚡ Révision rapide (30 s)</button>' : ''}
            ${(mod.keypoints || []).length ? `<a class="rev-item" href="#/module/${id}/cartes">⧉ Flashcards (${mod.keypoints.length})</a>` : ''}
            ${hasQuiz ? `<a class="rev-item" href="#/module/${id}/qcm">✎ QCM (${quizOf(id).length} questions)</a>` : ''}
            ${hasSchema ? '<button class="rev-item" data-r="drill">◎ Schéma à compléter</button>' : ''}
            ${hasSchema ? '<button class="rev-item" data-r="ident">☷ Identification de composants</button>' : ''}
            ${mod.guide ? '<button class="rev-item" data-r="guide">▶ Simulation de procédure</button>' : ''}
          </div>
        </div>
      </div>` : `<div class="skeleton-note">⚠ <b>Module squelette.</b> La structure est en place mais le contenu détaillé reste à rédiger à partir du document source : <i>${esc(mod.source || 'à préciser')}</i>.</div>`}

      <div id="mod-interactive"></div>
      <div id="mod-body"></div>

      ${(mod.links || []).length ? `<div class="section-block">
        <div class="section-title">Modules liés</div>
        <div class="link-list">
          ${mod.links.map(l => { const lm = module_(l); if (!lm) return ''; const ld = domain(lm.domain);
            return `<a class="link-pill" href="#/module/${l}"><span class="lp-dot" style="background:${ld.color}"></span>${esc(lm.title)}</a>`; }).join('')}
        </div>
        <div class="graph-wrap mini-graph" style="margin-top:12px;" id="mini-graph"></div>
      </div>` : ''}

      ${(mod.tags || []).length ? `<div class="mod-tags mod-tags-footer" aria-label="Mots-clés du module">
        ${mod.tags.map(t => `<span class="tag">#${esc(t)}</span>`).join('')}
      </div>` : ''}`;

    renderModuleBody(mod);
    if (mod.id === 'arico' && window.AriConsole) AriConsole.mount($('#mod-interactive'));
    else if (hasSchema) mountSchema(mod, 'fiche');

    /* menu Réviser : un seul point d'entrée pour tous les outils */
    const bRev = $('#btn-reviser');
    if (bRev){
      const menu = $('#rev-menu');
      bRev.addEventListener('click', e => { e.stopPropagation(); menu.hidden = !menu.hidden; });
      document.addEventListener('click', () => { if (menu) menu.hidden = true; }, { once: true });
      menu.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => {
        menu.hidden = true;
        const r = b.dataset.r;
        if (r === 'flash') return openFlash(mod);
        if (mod.id === 'arico') $('#mod-interactive').innerHTML = '';
        mountSchema(mod, r); /* drill / ident / guide */
        $('#mod-interactive').scrollTop = 0;
      }));
    }

    /* mini-graphe (réseau du module) */
    const mg = $('#mini-graph');
    if (mg){
      const ids = new Set([mod.id, ...(mod.links || [])]);
      const nodes = [...ids].map(i => { const mm = module_(i); return {
        id: i, label: mm.title.length > 22 ? mm.title.slice(0, 21) + '…' : mm.title,
        color: domain(mm.domain).color, size: i === mod.id ? 9 : 6, dim: !isFull(mm) }; });
      const links = [];
      ids.forEach(i => (module_(i).links || []).forEach(l => { if (ids.has(l) && i < l) links.push([i, l]); }));
      cleanupGraph = Graph.create(mg, nodes, links, nid => { if (nid !== mod.id) location.hash = '#/module/' + nid; });
    }
  }

  const keypointTypes = new Set([
    'vehicle', 'drivetrain', 'dimensions', 'tanks', 'pump',
    'hydraulic-flow', 'hydraulic-sequence', 'hydraulic-state',
    'hydraulic-cause', 'hydraulic-drain',
    'mechanical-course', 'foam-course', 'control-course',
    'hydro-course', 'mast-course', 'equipment-course',
    'flow', 'cause-effect', 'loop', 'sequence',
    'icons', 'comparison', 'threshold', 'concept', 'default'
  ]);

  function fireTruckBody(){
    return `<g class="kp-svg-muted" stroke-linejoin="round">
      <path d="M45 70h70l20-28h68v78H45z"/>
      <path d="M203 42h111v78H203z"/>
      <path d="M137 48h55v38h-70z"/>
      <path d="M55 55h53v31H55z"/>
      <path d="M214 54h89M214 68h89M214 82h89M214 96h89" opacity=".35"/>
      <path d="M52 36h257M68 28h225M83 22h198" opacity=".7"/>
      <path d="M41 120h278"/>
      <circle cx="92" cy="121" r="23"/><circle cx="92" cy="121" r="10"/>
      <circle cx="266" cy="121" r="23"/><circle cx="266" cy="121" r="10"/>
      <rect x="278" y="72" width="27" height="35" rx="3" class="kp-svg-accent-soft"/>
      <circle cx="291.5" cy="89.5" r="8" class="kp-svg-accent"/>
    </g>`;
  }

  function drawFireTruck(visual){
    const labels = visual.callouts || ['Cabine', 'Caisse / cellule', 'Groupe motopompe'];
    return `<div class="kp-tech-diagram kp-vehicle-diagram">
      <span class="kp-tech-badge">${esc(visual.badge || 'FPT')}</span>
      <svg class="kp-tech-svg" viewBox="0 0 360 168" role="img" aria-label="Silhouette technique d’un fourgon pompe tonne">
        ${fireTruckBody()}
        <g class="kp-svg-callout">
          <circle cx="88" cy="70" r="3"/><path d="M88 70 45 145"/><circle cx="45" cy="145" r="8"/><text x="45" y="148" text-anchor="middle">1</text>
          <circle cx="238" cy="63" r="3"/><path d="M238 63 178 145"/><circle cx="178" cy="145" r="8"/><text x="178" y="148" text-anchor="middle">2</text>
          <circle cx="292" cy="90" r="3"/><path d="M292 90 315 145"/><circle cx="315" cy="145" r="8"/><text x="315" y="148" text-anchor="middle">3</text>
        </g>
      </svg>
      <div class="kp-callout-legend">${labels.map((label, i) => `<span><i>${i + 1}</i>${esc(label)}</span>`).join('')}</div>
    </div>`;
  }

  function drawEngine(x){
    return `<g transform="translate(${x} 37)" class="kp-mech-part">
      <path d="M4 26h16V12h38l10 12h12v42H4z"/><path d="M25 12V3h25v9M18 34h48M18 47h48"/>
      <circle cx="20" cy="67" r="7"/><circle cx="62" cy="67" r="7"/>
    </g>`;
  }

  function drawGearbox(x){
    return `<g transform="translate(${x} 41)" class="kp-mech-part">
      <path d="M4 15 20 3h45l14 16v43L65 75H20L4 62z"/>
      <circle cx="31" cy="38" r="15"/><circle cx="31" cy="38" r="5"/>
      <circle cx="57" cy="43" r="11"/><circle cx="57" cy="43" r="4"/>
    </g>`;
  }

  function drawDriveshaft(x){
    return `<g transform="translate(${x} 72)" class="kp-mech-part">
      <path d="M4 10h78" stroke-width="7"/><path d="m3 1 13 18M3 19 16 1M70 1l13 18M70 19 83 1"/>
    </g>`;
  }

  function drawPump(x, accent = true){
    return `<g transform="translate(${x} 36)" class="${accent ? 'kp-pump-part' : 'kp-mech-part'}">
      <path d="M16 38c0-23 18-36 39-36 22 0 37 15 37 35 0 23-17 39-39 39H25V62h29c13 0 21-9 21-22 0-12-9-21-22-21-12 0-21 8-21 19z"/>
      <circle cx="52" cy="39" r="15"/><path d="M52 24v30M37 39h30M42 29l20 20M62 29 42 49"/>
      <path d="M91 29h17v19H91M1 32h17v16H1"/>
    </g>`;
  }

  function drawDrivetrain(visual){
    const labels = visual.labels || ['Moteur', 'Boîte de vitesses', 'Transmission', 'Pompe'];
    return `<div class="kp-tech-diagram">
      <svg class="kp-tech-svg kp-drivetrain-svg" viewBox="0 0 480 125" role="img" aria-label="Chaîne mécanique du moteur à la pompe">
        <g class="kp-drive-flow">
          <path d="M101 78h22M226 78h18M344 78h17"/>
          <path class="kp-drive-arrowhead" d="m123 72 10 6-10 6zM244 72l10 6-10 6zM361 72l10 6-10 6z"/>
        </g>
        ${drawEngine(15)}${drawGearbox(137)}${drawDriveshaft(258)}${drawPump(370)}
      </svg>
      <div class="kp-mech-labels">${labels.map(label => `<span>${esc(label)}</span>`).join('')}</div>
    </div>`;
  }

  function drawDimensions(visual){
    const values = visual.values || [];
    return `<div class="kp-tech-diagram kp-dimensions-diagram">
      <svg class="kp-tech-svg" viewBox="0 0 440 175" role="img" aria-label="Cotes principales du fourgon pompe tonne">
        <defs><marker id="kp-dim-arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M7 0 0 3.5 7 7z"/></marker></defs>
        <g transform="translate(24 18) scale(1.03 .78)">${fireTruckBody()}</g>
        <g class="kp-dimension-lines">
          <path d="M70 151h270" marker-start="url(#kp-dim-arrow)" marker-end="url(#kp-dim-arrow)"/>
          <path d="M392 35v98" marker-start="url(#kp-dim-arrow)" marker-end="url(#kp-dim-arrow)"/>
          <text x="205" y="168" text-anchor="middle">LONGUEUR</text>
          <text x="410" y="88" transform="rotate(90 410 88)" text-anchor="middle">HAUTEUR</text>
        </g>
      </svg>
      <div class="kp-dimension-values">${values.map(item => `<span><i>${esc(item.label)}</i><strong>${esc(item.value)}</strong></span>`).join('')}</div>
    </div>`;
  }

  function drawTanks(visual){
    const tanks = (visual.tanks || []).slice(0, 2);
    return `<div class="kp-tech-diagram kp-tanks-diagram">
      <svg class="kp-tech-svg" viewBox="0 0 430 200" role="img" aria-label="Cuves d’eau et d’additif">
        ${tanks.map((tank, i) => {
          const x = i ? 245 : 35;
          const liquidClass = i ? 'kp-liquid-foam' : 'kp-liquid-water';
          return `<g>
            <text class="kp-tank-title" x="${x + 72}" y="20" text-anchor="middle">${esc(tank.label)}</text>
            <path class="kp-tank-shell" d="M${x + 12} 34h120l12 16v115l-12 14h-120L${x} 165V50z"/>
            <path class="${liquidClass}" d="M${x + 5} 43h134v119l-10 11h-114l-10-11z"/>
            <path class="kp-liquid-line" d="M${x + 5} 43q17-6 34 0t34 0t34 0t32 0"/>
            <g class="kp-tank-grades"><path d="M${x + 147} 38h9M${x + 147} 104h9M${x + 147} 174h9"/><text x="${x + 160}" y="42">100</text><text x="${x + 160}" y="108">50</text><text x="${x + 160}" y="178">0</text></g>
            <text class="kp-tank-volume" x="${x + 72}" y="120" text-anchor="middle">${esc(tank.volume)}</text>
          </g>`;
        }).join('')}
      </svg>
    </div>`;
  }

  function drawPumpVisual(visual){
    const instruments = visual.instruments || [];
    return `<div class="kp-tech-diagram kp-pump-diagram">
      <svg class="kp-tech-svg" viewBox="0 0 600 190" role="img" aria-label="Aspiration, pompe centrifuge et refoulement">
        <defs><marker id="kp-water-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8z"/></marker><marker id="kp-pressure-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8z"/></marker></defs>
        <g class="kp-water-flow"><path d="M22 95c22-18 42 18 64 0s42 18 64 0h75" marker-end="url(#kp-water-arrow)"/><text x="22" y="66">ASPIRATION</text></g>
        <g transform="translate(235 42) scale(1.18)">${drawPump(0, true)}</g>
        <g class="kp-pressure-flow"><path d="M365 95h105c20 0 20-38 40-38h62" marker-end="url(#kp-pressure-arrow)"/><text x="452" y="132">REFOULEMENT</text></g>
        <text class="kp-pump-model" x="291" y="175" text-anchor="middle">${esc(visual.model || '')}</text>
      </svg>
      <div class="kp-instruments">${instruments.map(item => `<span><i>${esc(item.label)}</i><strong>${esc(item.value)}</strong></span>`).join('')}</div>
    </div>`;
  }

  /* Briques hydrauliques : mêmes objets et mêmes états dans chaque scénario. */
  function hydTank(x, y, state = 'inactive', empty = false, label = 'CUVE'){
    return `<g transform="translate(${x} ${y})" class="hyd-object hyd-${state}">
      <path class="hyd-shell" d="M3 4h82l10 10v74l-10 10H3L-7 88V14z"/>
      ${empty ? '' : '<path class="hyd-water-fill" d="M-3 31h94v54l-9 9H6l-9-9z"/><path class="hyd-surface" d="M-3 31q12-5 24 0t24 0t24 0t22 0"/>'}
      <text class="hyd-label" x="44" y="116" text-anchor="middle">${esc(label)}</text>
    </g>`;
  }

  function hydPump(x, y, state = 'active', hot = false){
    return `<g transform="translate(${x} ${y})" class="hyd-object hyd-${state} ${hot ? 'hyd-hot' : ''}">
      <path class="hyd-pump-shell" d="M8 35C8 14 24 2 44 2c22 0 37 15 37 35 0 22-16 37-37 37H17V61h27c13 0 21-9 21-22 0-12-9-21-22-21-11 0-20 8-20 19z"/>
      <circle cx="43" cy="38" r="14"/><path d="M43 24v28M29 38h28M33 28l20 20M53 28 33 48"/>
      <path d="M-5 30H10v17H-5M80 28h17v18H80"/>
      <text class="hyd-label" x="43" y="92" text-anchor="middle">POMPE</text>
      ${hot ? '<path class="hyd-heat" d="M20-7q-9-12 0-22M43-10q-9-12 0-22M66-7q-9-12 0-22"/>' : ''}
    </g>`;
  }

  function hydValve(x, y, state = 'closed', label = 'VANNE', rotate = 0){
    return `<g transform="translate(${x} ${y})" class="hyd-valve hyd-${state}">
      <title>${state === 'open' ? 'OUVERTE' : state === 'partial' ? 'PARTIELLEMENT OUVERTE' : 'FERMÉE'}</title>
      <g transform="rotate(${rotate})"><circle cx="0" cy="0" r="15"/><path d="m-12-8 12 8-12 8zm24 0L0 0l12 8z"/>
      ${state === 'closed' ? '<path class="hyd-valve-x" d="m-10-10 20 20m0-20-20 20"/>' : ''}</g>
      <text class="hyd-label" x="0" y="31" text-anchor="middle">${esc(label)}</text>
    </g>`;
  }

  function hydHydrant(x, y, state = 'active'){
    return `<g transform="translate(${x} ${y})" class="hyd-object hyd-${state}">
      <path class="hyd-shell" d="M13 24h34v64H13zM8 88h44v12H8zM18 9h24l5 15H13zM2 39h11v21H2zm45 0h11v21H47z"/>
      <circle cx="30" cy="15" r="5"/><text class="hyd-label" x="30" y="118" text-anchor="middle">HYDRANT</text>
    </g>`;
  }

  function hydWaterSource(x, y, state = 'active'){
    return `<g transform="translate(${x} ${y})" class="hyd-object hyd-${state}">
      <path class="hyd-source-water" d="M0 34q14-10 28 0t28 0t28 0t28 0M0 50q14-10 28 0t28 0t28 0t28 0M0 66q14-10 28 0t28 0t28 0t28 0"/>
      <path class="hyd-strainer" d="M91 7h26v27H91zM95 12l18 17m0-17-18 17"/>
      <text class="hyd-label" x="54" y="90" text-anchor="middle">PLAN D’EAU</text>
    </g>`;
  }

  function hydPrimer(x, y, state = 'active'){
    return `<g transform="translate(${x} ${y})" class="hyd-object hyd-${state}">
      <rect class="hyd-shell" x="0" y="11" width="67" height="45" rx="7"/><path d="M12 19v29M22 19v29M49 19v29M58 19v29M22 33h27M34 5v55"/>
      <text class="hyd-label" x="34" y="74" text-anchor="middle">AMORCEUR</text>
    </g>`;
  }

  function hydCollector(x, y, state = 'active'){
    return `<g transform="translate(${x} ${y})" class="hyd-object hyd-${state}">
      <rect class="hyd-shell" x="0" y="15" width="76" height="35" rx="12"/>
      <path d="M15 15V3m23 12V3m23 12V3M15 50v12m23-12v12m23-12v12"/>
      <text class="hyd-label" x="38" y="78" text-anchor="middle">COLLECTEUR</text>
    </g>`;
  }

  function hydNozzle(x, y, state = 'active'){
    return `<g transform="translate(${x} ${y})" class="hyd-object hyd-${state}">
      <path class="hyd-shell" d="M0 25h34l18-13 12 10-17 15H0zM64 22l20-4v14l-20-4z"/>
      <text class="hyd-label" x="40" y="58" text-anchor="middle">LANCE</text>
    </g>`;
  }

  function hydHoseReel(x, y, state = 'inactive'){
    return `<g transform="translate(${x} ${y})" class="hyd-object hyd-${state}">
      <circle class="hyd-shell" cx="38" cy="40" r="32"/><circle cx="38" cy="40" r="20"/><circle cx="38" cy="40" r="7"/>
      <path d="M68 39h29l14-8 8 7-15 11H68M12 72h52"/>
      <text class="hyd-label" x="50" y="91" text-anchor="middle">DÉVIDOIR PS</text>
    </g>`;
  }

  function hydDrain(x, y, label = 'PURGE'){
    return `<g transform="translate(${x} ${y})" class="hyd-drain">
      <path d="M0 0v28"/><path class="hyd-drop" d="M0 34c-10 13-10 19 0 19s10-6 0-19z"/>
      <text class="hyd-label" x="0" y="69" text-anchor="middle">${esc(label)}</text>
    </g>`;
  }

  function hydMotor(x, y, state = 'active'){
    return `<g transform="translate(${x} ${y})" class="hyd-object hyd-${state}">
      <path class="hyd-shell" d="M2 22h15V10h42l10 12h12v47H2zM23 10V2h29v8M17 37h48M17 51h48"/>
      <text class="hyd-label" x="41" y="89" text-anchor="middle">MOTEUR</text>
    </g>`;
  }

  function hydPdm(x, y, state = 'active'){
    return `<g transform="translate(${x} ${y})" class="hyd-object hyd-${state}">
      <path class="hyd-shell" d="M5 13 18 2h45l13 14v46L63 74H18L5 61z"/>
      <circle cx="31" cy="37" r="13"/><circle cx="55" cy="42" r="10"/>
      <text class="hyd-label" x="40" y="92" text-anchor="middle">PDM</text>
    </g>`;
  }

  function waterScenario(mod, key){
    const view = (mod.views || []).find(candidate => candidate.scenarios && candidate.scenarios[key]);
    return view ? view.scenarios[key] : { open:[], closed:[], partial:[] };
  }

  function waterState(scenario, id){
    if ((scenario.open || []).includes(id)) return 'open';
    if ((scenario.partial || []).includes(id)) return 'partial';
    if ((scenario.closed || []).includes(id)) return 'closed';
    return 'inactive';
  }

  function drawHydraulicFlow(visual, mod){
    const key = visual.sourceScenario;
    const scenario = waterScenario(mod, key);
    const state = id => waterState(scenario, id);
    let content = '';

    if (key === 'cuve'){
      content = `${hydTank(28, 25, state('tonne'), false)}
        <path class="hyd-pipe hyd-flow-active" d="M120 74h62v58h78"/>${hydValve(182, 132, state('iso'), 'VANNE CUVE')}
        ${hydPump(260, 96, state('pompe'))}<path class="hyd-pipe hyd-flow-pressure" d="M357 133h55"/>
        ${hydCollector(412, 99, state('coll'))}<path class="hyd-pipe hyd-flow-pressure" d="M488 132h30"/>${hydNozzle(500, 105, state('refoul'))}
        ${hydHydrant(35, 150, state('alim'))}<path class="hyd-pipe hyd-flow-inactive" d="M93 194h90v-42"/>${hydValve(183, 172, state('alim'), 'EXT.', 90)}
        <text class="hyd-short" x="270" y="232">CUVE → POMPE → LANCES</text>`;
    } else if (key === 'hydrant'){
      content = `${hydHydrant(24, 78, state('alim'))}<path class="hyd-pipe hyd-flow-active" d="M82 128h112"/>
        ${hydValve(194, 128, state('alim'), 'EXT.')}<path class="hyd-pipe hyd-flow-active" d="M209 128h58"/>${hydPump(267, 91, state('pompe'))}
        <path class="hyd-pipe hyd-flow-pressure" d="M364 128h52"/>${hydCollector(416, 94, state('coll'))}<path class="hyd-pipe hyd-flow-pressure" d="M492 127h27"/>${hydNozzle(500, 100, state('refoul'))}
        ${hydTank(105, 10, 'inactive', false)}<path class="hyd-pipe hyd-flow-inactive" d="M199 59h67v45"/>${hydValve(236, 59, state('iso'), 'CUVE')}
        <path class="hyd-pipe hyd-flow-partial" d="M421 93V55H200"/>${hydValve(318, 55, state('retour'), 'RETOUR')}
        <text class="hyd-short" x="270" y="232">SOURCE PRESSURISÉE</text>`;
    } else {
      content = `${hydWaterSource(15, 130, 'active')}<path class="hyd-pipe hyd-flow-active" d="M112 164h60V94h52"/>
        ${hydValve(172, 94, state('alim'), 'EXT.')} ${hydPrimer(222, 35, 'active')}
        <path class="hyd-air-path" d="M255 35V4m-12 20V0m24 23V3"/>
        <path class="hyd-pipe hyd-air-line" d="M224 94h52"/>${hydPump(276, 58, state('pompe'))}
        <path class="hyd-pipe hyd-flow-pressure" d="M373 95h71"/>${hydCollector(444, 61, state('coll'))}<path class="hyd-pipe hyd-flow-pressure" d="M520 94h20"/>
        ${hydTank(355, 142, state('iso'), false)}<path class="hyd-pipe hyd-flow-inactive" d="M355 185h-36v-52"/>${hydValve(319, 164, state('iso'), 'CUVE', 90)}
        <text class="hyd-short" x="270" y="232">DÉPRESSION → EAU MONTE</text>`;
    }
    return `<div class="kp-tech-diagram kp-hydraulic-diagram"><svg class="kp-tech-svg kp-hydraulic-svg" viewBox="0 0 560 250" role="img" aria-label="${esc(visual.aria || '')}">${content}</svg>
      ${(visual.notes || []).length ? `<div class="hyd-inline-notes">${visual.notes.map(note => `<span>${esc(note)}</span>`).join('')}</div>` : ''}</div>`;
  }

  function drawHydraulicSequence(visual){
    const steps = visual.steps || [];
    const objects = visual.scenario === 'startup'
      ? [hydMotor(22, 27), hydPdm(178, 27), hydPump(352, 27), hydTank(39, 150, 'open', false), hydValve(223, 191, 'open', 'CUVE'), hydPump(352, 154)]
      : [hydMotor(22, 74, 'partial'), hydPdm(165, 74, 'closed'), hydValve(315, 111, 'closed', 'ASP.'), hydValve(455, 111, 'closed', 'REFOUL.')];
    const pipes = visual.scenario === 'startup'
      ? '<path class="hyd-mech-flow" d="M103 67h72m79 0h98"/><path class="hyd-pipe hyd-flow-active" d="M134 193h89m15 0h114"/>'
      : '<path class="hyd-mech-flow hyd-stop-flow" d="M103 112h62m79 0h71m30 0h110"/>';
    const height = visual.scenario === 'startup' ? 280 : 205;
    return `<div class="kp-tech-diagram kp-hydraulic-diagram"><svg class="kp-tech-svg kp-hydraulic-svg" viewBox="0 0 560 ${height}" role="img" aria-label="${esc(visual.aria || '')}">
      ${pipes}${objects.join('')}
    </svg><div class="hyd-step-legend">${steps.map((step, i) => `<span><i>${i + 1}</i>${esc(step)}</span>`).join('')}</div></div>`;
  }

  function drawHydraulicState(visual, mod){
    const a = waterScenario(mod, visual.states?.[0] || 'cuve');
    const b = waterScenario(mod, visual.states?.[1] || 'hydrant');
    const branch = (x, scenario, label) => `<g transform="translate(${x} 16)">
      <text class="hyd-state-title" x="105" y="12" text-anchor="middle">${esc(label)}</text>
      ${hydTank(0, 28, waterState(scenario, 'iso'), false, 'CUVE')}${hydHydrant(8, 142, waterState(scenario, 'alim'))}
      <path class="hyd-pipe ${waterState(scenario, 'iso') === 'open' ? 'hyd-flow-active' : 'hyd-flow-inactive'}" d="M95 75h15v72h30"/>
      <path class="hyd-pipe ${waterState(scenario, 'alim') === 'open' ? 'hyd-flow-active' : 'hyd-flow-inactive'}" d="M66 190h44v-43h30"/>
      ${hydValve(110, 104, waterState(scenario, 'iso'), 'CUVE', 90)}${hydValve(110, 181, waterState(scenario, 'alim'), 'EXT.', 90)}${hydPump(140, 110, 'active')}
    </g>`;
    return `<div class="kp-tech-diagram kp-hydraulic-diagram"><svg class="kp-tech-svg kp-hydraulic-svg" viewBox="0 0 560 260" role="img" aria-label="Bascule entre alimentation cuve et extérieure">
      ${branch(5, a, 'ÉTAT A · CUVE')}${branch(310, b, 'ÉTAT B · EXTÉRIEUR')}
      <g class="hyd-switch"><path d="M267 115h28m-7-8 9 8-9 8M297 145h-28m7-8-9 8 9 8"/><text x="282" y="185" text-anchor="middle">RÉGULATION OFF</text></g>
    </svg></div>`;
  }

  function drawHydraulicCause(visual){
    let content = '';
    if (visual.scenario === 'heat'){
      const values = visual.values || [];
      content = `${hydTank(20, 35, 'open', false)}<path class="hyd-pipe hyd-flow-active" d="M115 82h105"/>${hydPump(220, 45, 'active', true)}
        <path class="hyd-pipe hyd-flow-pressure" d="M317 82h93"/>${hydValve(410, 82, 'closed', 'REFOUL.')}
        <path class="hyd-pipe hyd-flow-partial" d="M355 82v105H115"/>${hydValve(355, 187, 'partial', 'RETOUR')}
        <text class="hyd-zero-flow" x="445" y="42">0 L/min</text><text class="hyd-heat-label" x="265" y="20">TEMPÉRATURE ↑</text>
        <g class="hyd-threshold-line">${values.map((item, i) => {
          const x = 408 + i * 58;
          const value = typeof item === 'string' ? item : item.value;
          const label = typeof item === 'string' ? '' : item.label;
          return `<path d="M${x} 145V${115 - i * 25}"/><text x="${x}" y="165" text-anchor="middle">${esc(value)}</text>${label ? `<text class="hyd-threshold-role" x="${x}" y="178" text-anchor="middle">${esc(label)}</text>` : ''}`;
        }).join('')}</g>`;
    } else {
      const causes = visual.causes || [];
      content = `${hydWaterSource(20, 130, 'active')}<path class="hyd-pipe hyd-air-line" d="M120 164h185V95h60"/>${hydPump(365, 58, 'inactive')}
        <path class="hyd-air-path hyd-air-fault" d="M214 141v-48m-12 18 12-18 12 18"/>
        <text class="hyd-fault-center" x="335" y="28">VIDE NON OBTENU</text>
        <g class="hyd-cause-orbit">${causes.map((cause, i) => {
          const pos = [[165,30],[255,198],[465,178]][i] || [455,35];
          return `<circle cx="${pos[0]}" cy="${pos[1]}" r="23"/><path d="M${pos[0]} ${pos[1] + 23} ${i === 0 ? 250 : 330} 120"/><text x="${pos[0]}" y="${pos[1] + 4}" text-anchor="middle">${esc(cause)}</text>`;
        }).join('')}</g><text class="hyd-limit" x="482" y="32">MAX 1 MIN</text>`;
    }
    return `<div class="kp-tech-diagram kp-hydraulic-diagram"><svg class="kp-tech-svg kp-hydraulic-svg" viewBox="0 0 560 245" role="img" aria-label="${esc(visual.aria || '')}">${content}</svg></div>`;
  }

  function drawHydraulicDrain(visual){
    const steps = visual.steps || [];
    let content = '';
    if (visual.scenario === 'winter'){
      content = `${hydHoseReel(20, 28, 'inactive')}<path class="hyd-pipe hyd-flow-inactive" d="M139 68h91"/>${hydPump(230, 31, 'inactive')}<path class="hyd-pipe hyd-flow-inactive" d="M327 68h74"/>${hydCollector(401, 34, 'inactive')}
        ${hydDrain(94, 125, 'REP 28')}${hydDrain(275, 125, 'REP 5')}${hydDrain(438, 125, 'REP 9–12')}
        <g class="hyd-snow"><path d="M505 25v50m-22-37 44 25m-44 0 44-25M505 25l-7 9m7-9 7 9M483 38l12 1m-12-1 5 11M527 38l-12 1m12-1-5 11"/></g>`;
    } else {
      content = `<g transform="translate(30 24)">${hydTank(0, 0, 'open', false, 'PLEINE')}${hydValve(45, 128, 'open', 'REP 6', 90)}${hydDrain(45, 145, 'VIDANGE')}</g>
        <path class="hyd-state-arrow" d="M200 93h105m-12-10 14 10-14 10"/>
        <g transform="translate(355 24)">${hydTank(0, 0, 'inactive', true, 'VIDE')}${hydValve(45, 128, 'closed', 'REP 6', 90)}</g>
        <g transform="translate(215 145)">${hydPump(0, 0, 'inactive')}${hydDrain(42, 78, 'PURGE POMPE')}</g>`;
    }
    return `<div class="kp-tech-diagram kp-hydraulic-diagram"><svg class="kp-tech-svg kp-hydraulic-svg" viewBox="0 0 560 250" role="img" aria-label="${esc(visual.aria || '')}">${content}</svg>
      <div class="hyd-step-legend">${steps.map((step, i) => `<span><i>${i + 1}</i>${esc(step)}</span>`).join('')}</div></div>`;
  }

  function drawHydraulicVisual(type, visual, mod){
    if (type === 'hydraulic-flow') return drawHydraulicFlow(visual, mod);
    if (type === 'hydraulic-sequence') return drawHydraulicSequence(visual);
    if (type === 'hydraulic-state') return drawHydraulicState(visual, mod);
    if (type === 'hydraulic-cause') return drawHydraulicCause(visual);
    return drawHydraulicDrain(visual);
  }

  /* Objets techniques partagés par les mini-schémas des cours engins. */
  function courseWrap(visual, content, legend = []){
    return `<div class="kp-tech-diagram kp-course-diagram"><svg class="kp-tech-svg kp-course-svg" viewBox="0 0 560 230" role="img" aria-label="${esc(visual.aria || '')}">${content}</svg>${legend.length ? `<div class="kp-course-legend">${legend.map(item => `<span>${esc(item)}</span>`).join('')}</div>` : ''}</div>`;
  }

  function courseArrow(x1, y1, x2, y2, tone = 'blue'){
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const ax = x2 - Math.cos(angle) * 8, ay = y2 - Math.sin(angle) * 8;
    const left = `${ax - Math.cos(angle - Math.PI / 2) * 6},${ay - Math.sin(angle - Math.PI / 2) * 6}`;
    const right = `${ax + Math.cos(angle - Math.PI / 2) * 6},${ay + Math.sin(angle - Math.PI / 2) * 6}`;
    return `<g class="course-arrow course-${tone}"><path d="M${x1} ${y1}L${x2} ${y2}"/><path class="course-arrow-head" d="M${x2} ${y2}L${left}L${right}Z"/></g>`;
  }

  function courseLabel(x, y, text, tone = ''){
    return `<text class="course-label ${tone ? `course-${tone}` : ''}" x="${x}" y="${y}" text-anchor="middle">${esc(text)}</text>`;
  }

  function courseEngine(x, y, label = 'MOTEUR'){
    return `<g transform="translate(${x} ${y})" class="course-object"><path d="M0 22h17V8h55l13 14h16v54H0zM27 8V0h34v8M18 39h66M18 55h66"/><circle cx="22" cy="77" r="8"/><circle cx="78" cy="77" r="8"/>${courseLabel(50, 100, label)}</g>`;
  }

  function courseGearbox(x, y, label = 'BOÎTE'){
    return `<g transform="translate(${x} ${y})" class="course-object"><path d="M2 16 20 2h57l17 18v50L77 86H20L2 70z"/><circle cx="36" cy="43" r="18"/><circle cx="36" cy="43" r="6"/><circle cx="68" cy="49" r="13"/><circle cx="68" cy="49" r="4"/>${courseLabel(48, 107, label)}</g>`;
  }

  function courseClutch(x, y){
    return `<g transform="translate(${x} ${y})" class="course-object"><circle cx="28" cy="34" r="27"/><circle cx="28" cy="34" r="16"/><path d="M28 7v54M15 11l26 46M5 34h46M15 57l26-46"/>${courseLabel(28, 78, 'EMBRAYAGE')}</g>`;
  }

  function courseShaft(x, y, length = 95, label = 'ARBRE'){
    return `<g transform="translate(${x} ${y})" class="course-object"><path d="M0 0h${length}" stroke-width="9"/><path d="m0-10 18 20M0 10 18-10M${length - 18}-10l18 20M${length - 18} 10l18-20"/>${courseLabel(length / 2, 29, label)}</g>`;
  }

  function courseDifferential(x, y, label = 'PONT'){
    return `<g transform="translate(${x} ${y})" class="course-object"><path d="M-52 30H52" stroke-width="12"/><circle cx="0" cy="30" r="30"/><circle cx="0" cy="30" r="15"/><circle cx="-66" cy="30" r="24" class="course-wheel"/><circle cx="66" cy="30" r="24" class="course-wheel"/>${courseLabel(0, 78, label)}</g>`;
  }

  function coursePump(x, y, label = 'POMPE'){
    return `<g transform="translate(${x} ${y})" class="course-object course-object-accent"><path d="M8 39C8 15 27 2 49 2c24 0 41 16 41 39 0 24-18 41-41 41H17V67h31c14 0 24-10 24-24 0-13-10-23-24-23-13 0-23 9-23 21z"/><circle cx="48" cy="42" r="16"/><path d="M48 26v32M32 42h32M37 31l22 22M59 31 37 53"/>${courseLabel(49, 105, label, 'orange')}</g>`;
  }

  function drawMechanicalCourse(visual){
    const s = visual.scenario;
    let c = '';
    if (s === 'definition' || s === 'propulsion'){
      c = `${courseEngine(4, 64)}${courseClutch(119, 76)}${courseGearbox(183, 61)}${courseShaft(292, 104, 108, 'TRANSMISSION')}${courseDifferential(475, 75, s === 'propulsion' ? 'PONT + ROUES' : 'ROUES')}${courseArrow(103,105,118,105,'orange')}${courseArrow(174,105,183,105,'orange')}${courseArrow(280,105,292,105,'orange')}${courseArrow(400,105,423,105,'orange')}`;
    } else if (s === 'pump-branch'){
      c = `${courseEngine(12, 18)}${courseGearbox(151, 16, 'BOÎTE + PDM')}${courseShaft(264, 60, 115, 'ARBRE PONT')}${courseDifferential(470, 30)}${courseShaft(264, 150, 102, 'ARBRE POMPE')}${coursePump(407, 116)}${courseArrow(113,60,151,60,'orange')}${courseArrow(246,60,264,60,'orange')}${courseArrow(246,70,264,150,'blue')}${courseArrow(366,150,407,150,'blue')}`;
    } else {
      c = `${courseGearbox(34, 61, 'PDM NL/10B')}<g class="course-pdm" transform="translate(190 20)"><circle cx="80" cy="85" r="62"/><circle cx="80" cy="85" r="33"/><path d="M80 52v66M47 85h66M57 62l46 46M103 62l-46 46"/>${courseLabel(80, 160, '270 Nm · RAPPORT 2,03','orange')}</g><g transform="translate(389 22)" class="course-panel"><rect x="0" y="0" width="145" height="166" rx="12"/><circle cx="35" cy="40" r="18"/><text x="35" y="46">N</text><circle cx="103" cy="40" r="18"/><text x="103" y="46">P</text><rect x="25" y="78" width="94" height="38" rx="8"/><text x="72" y="102">APPUI LONG</text><path d="M24 142h94"/>${courseLabel(72, 158, 'VANNE CUVE OUVERTE','green')}</g>${courseArrow(128,105,205,105,'orange')}${courseArrow(350,105,389,105,'green')}`;
    }
    return courseWrap(visual, c, visual.labels || []);
  }

  function foamTank(x, y, label, tone = 'blue'){
    return `<g transform="translate(${x} ${y})" class="course-object foam-${tone}"><path d="M4 10h62l10 10v85l-10 10H4L-6 105V20z"/><path class="foam-liquid" d="M-1 43h72v58l-8 9H7l-8-9z"/>${courseLabel(35, 134, label)}</g>`;
  }

  function foamCloud(x, y, count = 9, scale = 1){
    const bubbles = Array.from({length:count}, (_, i) => {
      const bx = (i % 4) * 24 + (i % 2) * 5, by = Math.floor(i / 4) * 24, r = 10 + (i % 3) * 3;
      return `<circle cx="${bx}" cy="${by}" r="${r}"/>`;
    }).join('');
    return `<g transform="translate(${x} ${y}) scale(${scale})" class="foam-bubbles">${bubbles}</g>`;
  }

  function foamNozzle(x, y, label = 'LANCE'){
    return `<g transform="translate(${x} ${y})" class="course-object"><path d="M0 20h58l23-14 14 12-21 17H0zM95 18l29-5v18l-29-6z"/>${courseLabel(60, 58, label)}</g>`;
  }

  function drawFoamCourse(visual){
    const s = visual.scenario;
    let c = '';
    if (s === 'principle'){
      c = `${foamTank(12,42,'EAU','blue')}${foamTank(112,42,'ÉMULSEUR','orange')}<g class="foam-mixer course-object" transform="translate(230 74)"><circle cx="38" cy="38" r="37"/><path d="M38 12v52M12 38h52M20 20l36 36M56 20 20 56"/>${courseLabel(38,94,'SOLUTION')}</g><g class="foam-fan course-object" transform="translate(350 78)"><circle cx="34" cy="34" r="31"/><path d="M34 34q10-25 20-12t-20 12q25 10 12 20t-12-20q-10 25-20 12t20-12q-25-10-12-20t12 20"/>${courseLabel(34,89,'AIR')}</g>${foamCloud(450,78,10,.82)}${courseArrow(83,92,112,92,'blue')}${courseArrow(188,92,230,108,'orange')}${courseArrow(306,108,350,108,'blue')}${courseArrow(420,108,450,108,'blue')}`;
    } else if (s === 'emulsifier'){
      c = `${foamTank(32,42,'EAU','blue')}<g class="foam-surface" transform="translate(145 31)"><path d="M0 120q22-22 44 0t44 0t44 0"/><path d="M0 136q22-8 44 0t44 0t44 0"/>${foamCloud(21,40,8,.7)}${courseLabel(66,181,'TENSION SUPERFICIELLE ↓','blue')}</g>${foamTank(330,42,'PROTÉINIQUE','orange')}${foamTank(438,42,'SYNTHÉTIQUE','green')}${courseArrow(104,92,145,92,'orange')}`;
    } else if (s === 'concentration'){
      c = `${foamTank(18,48,'EAU','blue')}${foamTank(118,48,'ÉMULSEUR','orange')}<path class="course-pipe foam-water" d="M90 96h300"/><path class="course-pipe foam-additive" d="M190 96h0"/>${coursePump(225,49,'POMPE CTD')}<g class="foam-gauge" transform="translate(385 32)"><path d="M10 125A70 70 0 01150 125"/><path d="M80 125 128 69"/><circle cx="80" cy="125" r="9"/><text x="80" y="28">0,2 → 1 %</text>${courseLabel(80,155,'DOSAGE AUTOMATIQUE')}</g>${courseArrow(90,96,220,96,'blue')}${courseArrow(320,96,385,96,'orange')}`;
    } else if (s === 'expansion'){
      c = `<g class="foam-cylinder" transform="translate(50 20)"><path d="M0 0h105v174H0z"/><path class="foam-solution" d="M5 138h95v31H5z"/>${courseLabel(52,209,'SOLUTION')}</g><text class="course-formula" x="280" y="70" text-anchor="middle">VOLUME MOUSSE</text><path class="course-fraction" d="M200 85h160"/><text class="course-formula" x="280" y="118" text-anchor="middle">VOLUME SOLUTION</text><text class="course-equals" x="386" y="99">=</text><g class="foam-cylinder" transform="translate(420 20)"><path d="M0 0h105v174H0z"/>${foamCloud(13,20,18,.77)}${courseLabel(52,209,'AIR ↑ · BULLES ↑')}</g>`;
    } else if (['low','medium','high'].includes(s)){
      const count = s === 'low' ? 7 : s === 'medium' ? 13 : 22;
      const scale = s === 'low' ? .55 : s === 'medium' ? .75 : .95;
      const title = s === 'low' ? '< 20 · LONGUE PORTÉE' : s === 'medium' ? '20–200 · SURFACE' : '> 200 · VOLUME CLOS';
      c = `${foamNozzle(20,89,s === 'high' ? 'GÉNÉRATEUR' : 'LANCE')}${courseArrow(142,112,200,112,'blue')}${foamCloud(210,s === 'low' ? 98 : s === 'medium' ? 72 : 38,count,scale)}<g class="foam-target" transform="translate(420 43)">${s === 'high' ? '<path d="M0 145V25h105v120M0 145h105M18 145V69h69v76"/>' : s === 'medium' ? '<path d="M0 122h110l-13-48H22zM27 74l14-38h40l16 38M18 122h84M28 128a15 15 0 1030 0M76 128a15 15 0 1030 0"/>' : '<path d="M54 145c-60-37-15-72-8-119 17 24 27 39 23 59 16-16 26-31 26-45 37 59 15 105-41 105z"/>'}${courseLabel(54,176,title,s === 'low' ? 'orange' : 'green')}</g>`;
    } else if (s === 'return-valve'){
      c = `${foamTank(18,48,'TONNE','blue')}${coursePump(160,53,'POMPE')}${foamNozzle(392,70,'LANCE MOUSSE')}<path class="course-pipe foam-water" d="M92 96h67M260 96h132"/><path class="course-pipe foam-return" d="M330 96v86H60v-55"/><g class="foam-valve-closed" transform="translate(196 182)"><circle r="18"/><path d="m-12-12 24 24m0-24-24 24"/>${courseLabel(0,37,'RETOUR TONNE FERMÉ','orange')}</g>${courseArrow(95,96,155,96,'blue')}${courseArrow(262,96,390,96,'orange')}`;
    } else if (s === 'choice'){
      c = `${foamNozzle(205,15,'CHOISIR L’OBJECTIF')}<path class="course-pipe" d="M280 72v38H85v35M280 110v35M280 110h195v35"/>${foamCloud(25,145,5,.45)}${foamCloud(230,137,10,.55)}${foamCloud(415,125,17,.62)}${courseLabel(65,218,'PORTÉE / VENT · BAS','orange')}${courseLabel(275,218,'SURFACE · MOYEN','green')}${courseLabel(465,218,'VOLUME · HAUT','blue')}`;
    } else {
      c = `<g class="foam-checks">${[['COMBUSTIBLE','drop'],['COMPATIBILITÉ','can'],['CONCENTRATION','gauge'],['MOYEN','nozzle'],['VENT','wind']].map((item,i)=>{const x=15+i*109; return `<g transform="translate(${x} 42)"><rect width="94" height="118" rx="12"/><circle cx="47" cy="44" r="25"/><path d="M31 47q16-35 32 0q0 17-16 17T31 47z"/>${courseLabel(47,91,item[0])}<circle class="foam-check" cx="47" cy="139" r="12"/><path class="foam-checkmark" d="m39 139 6 6 12-15"/></g>`;}).join('')}</g>`;
    }
    return courseWrap(visual, c, visual.labels || []);
  }

  function panelGauge(x, y, label, tone = 'blue', value = ''){
    return `<g transform="translate(${x} ${y})" class="course-panel-gauge course-${tone}"><circle cx="35" cy="35" r="31"/><path d="M12 42A25 25 0 0158 42"/><path d="M35 35 53 21"/><circle cx="35" cy="35" r="4"/><text x="35" y="78">${esc(label)}</text>${value ? `<text x="35" y="19">${esc(value)}</text>` : ''}</g>`;
  }

  function drawControlCourse(visual){
    const s = visual.scenario;
    let c = '';
    if (s === 'pmt'){
      c = `<g class="course-panel" transform="translate(20 30)"><rect width="520" height="165" rx="14"/>${[['N','NEUTRE','green'],['P','FREIN PARC','red'],['PMT','APPUI LONG','orange'],['!','ARRÊT URG.','red'],['☀','ÉCLAIRAGE','blue'],['↯','FLASH + BUZZER','orange']].map((a,i)=>{const x=24+i*83;return `<g transform="translate(${x} 27)" class="course-${a[2]}"><circle cx="30" cy="30" r="24"/><text x="30" y="37">${a[0]}</text>${courseLabel(30,80,a[1])}</g>`;}).join('')}</g>${courseArrow(174,120,214,120,'orange')}${courseArrow(298,120,338,120,'orange')}`;
    } else if (s === 'monitor'){
      c = `<g class="course-panel" transform="translate(20 18)"><rect width="520" height="194" rx="14"/>${[['RÉGIME','tr/min','orange'],['ALERTE','MOTEUR','red'],['REFOUL.','bar','blue'],['ASPIR.','bar','blue'],['TEMP.','°C','red'],['NIVEAU','%','green']].map((a,i)=>panelGauge(18+(i%3)*170,18+Math.floor(i/3)*92,a[0],a[2],a[1])).join('')}</g>`;
    } else if (s === 'faults'){
      c = `<g class="control-faults">${[['POMPE À SEC','M0 18h62v54H0z'],['VANNES FERMÉES','M10 48h52M36 22v52'],['AMORÇAGE > 1 min','M36 15a28 28 0 110 56 28 28 0 010-56M36 28v22l13 8'],['ARRÊT BRUSQUE','M5 62h58M18 62V30h36v32M24 19h24']].map((a,i)=>{const x=12+i*137;return `<g transform="translate(${x} 35)"><rect width="123" height="150" rx="12"/><path d="${a[1]}"/>${courseLabel(61,126,a[0],'red')}<path class="course-cross" d="M12 12l99 99M111 12 12 111"/></g>`;}).join('')}</g>`;
    } else {
      c = `<g class="control-reel" transform="translate(75 20)"><circle cx="100" cy="95" r="74"/><circle cx="100" cy="95" r="48"/><circle cx="100" cy="95" r="12"/><path d="M174 95h130l55-32"/><path class="course-brake" d="M63 29 22 0M55 41 12 14"/>${courseLabel(100,190,'DÉVIDOIR')}<g transform="translate(340 30)"><path d="M0 55h65M33 55V0"/><circle cx="33" cy="0" r="14"/>${courseLabel(33,88,'FREIN LIBÉRÉ','green')}</g>${courseArrow(250,95,355,95,'green')}</g>`;
    }
    return courseWrap(visual, c, visual.labels || []);
  }

  function drawHydroCourse(visual){
    const s = visual.scenario;
    let c = '';
    if (s === 'flow'){
      c = `${hydTank(28,45,'open',false,'RÉSERVOIR')}<path class="hyd-pipe hyd-flow-active" d="M125 94h245"/>${hydNozzle(370,67,'active')}<g class="hydro-timer" transform="translate(462 47)"><circle cx="35" cy="35" r="31"/><path d="M35 12v23l17 12"/>${courseLabel(35,90,'TEMPS')}</g><text class="course-formula" x="280" y="190" text-anchor="middle">Q = VOLUME / TEMPS · L/s · L/min · m³/h</text>`;
    } else if (s === 'pressure'){
      c = `<g class="hydro-piston course-object" transform="translate(42 34)"><path d="M0 135V20h135v115M0 84h135M67 84V20M30 12h74"/><path class="hydro-force" d="M67 0v54"/>${courseLabel(67,165,'FORCE / SURFACE')}</g>${panelGauge(225,52,'STATIQUE','blue','EAU AU REPOS')}${panelGauge(360,52,'DYNAMIQUE','orange','EAU EN MVT')}<text class="course-formula" x="315" y="195" text-anchor="middle">1 bar = 1 kg/cm²</text>`;
    } else if (s === 'loss-laws'){
      c = `<g class="hydro-laws">${[['Q²','DÉBIT ×2 → PC ×4'],['L','LONGUEUR'],['≈','RUGOSITÉ'],['Ø','DIAMÈTRE'],['P','INDÉP. PRESSION']].map((a,i)=>{const x=8+i*110;return `<g transform="translate(${x} 43)"><circle cx="50" cy="50" r="43"/><text class="hydro-law-symbol" x="50" y="61">${a[0]}</text>${courseLabel(50,120,a[1])}</g>`;}).join('')}</g>`;
    } else if (s === 'elevation'){
      c = `${coursePump(38,108)}<path class="course-ground" d="M110 180 485 35"/><path class="hyd-pipe hyd-flow-pressure" d="M125 150 465 55"/>${hydNozzle(445,25,'active')}<path class="hydro-height" d="M510 40v140"/><path class="hydro-height-tick" d="m500 50 10-10 10 10m-20 120 10 10 10-10"/><text class="course-formula" x="355" y="203">+ 1 bar / 10 m</text>`;
    } else if (s === 'long-line'){
      c = `${coursePump(18,55)}<path class="hyd-pipe hyd-flow-pressure hydro-long-hose" d="M112 96c35-48 70 48 105 0s70 48 105 0 70 48 105 0"/>${hydNozzle(430,69,'active')}<g class="hydro-measures"><text x="270" y="28">100 m · Ø45 · 250 L/min</text><text x="270" y="193">PERTES = 1,5 bar À AJOUTER</text></g>`;
    } else if (s === 'cavitation'){
      c = `${hydHydrant(24,76,'active')}<path class="hyd-pipe hyd-flow-active hydro-crushed" d="M80 126c42 0 42 40 84 0s42-40 84 0"/>${coursePump(250,86)}<g class="hydro-cav-bubbles">${[0,1,2,3,4,5].map(i=>`<circle cx="${288+i*14}" cy="${55-(i%2)*10}" r="${4+i%3}"/>`).join('')}</g><path class="hyd-pipe hyd-flow-pressure" d="M347 126h75"/>${hydNozzle(420,99,'active')}<text class="course-formula course-red" x="280" y="205" text-anchor="middle">BRUIT DE BILLES · TUYAU ÉCRASÉ · RÉDUIRE LES DÉBITS</text>`;
    } else if (s === 'multi-nozzle'){
      c = `${coursePump(20,65)}<path class="hyd-pipe hyd-flow-pressure" d="M115 106h125v-55h95M240 106v70h95"/>${hydNozzle(335,25,'active')}${hydNozzle(335,150,'active')}<text class="course-formula" x="430" y="70">Q1 + Q2</text><text class="course-formula course-orange" x="430" y="177">LANCE DÉFAVORISÉE</text><path class="hydro-pressure-bars" d="M505 42v35M520 52v25M505 148v30M520 163v15"/>`;
    } else if (s === 'reaction'){
      c = `<g class="hydro-firefighter course-object" transform="translate(145 25)"><circle cx="65" cy="24" r="18"/><path d="M65 42v70M65 62l-45 39M65 70l70 28M65 112l-35 70M65 112l45 70"/></g>${foamNozzle(280,94,'LANCE')}${courseArrow(405,116,510,116,'blue')}${courseArrow(278,145,160,145,'red')}<text class="course-formula" x="380" y="201">PRESSION ↑ + DÉBIT ↑ = RÉACTION ↑</text>`;
    } else if (s === 'hydrant-max'){
      c = `${hydHydrant(35,68,'active')}${panelGauge(135,35,'P stat','blue')}${panelGauge(250,35,'P dyn','orange')}<path class="hyd-pipe hyd-flow-active" d="M95 118h70M320 118h68"/>${hydNozzle(390,91,'active')}<text class="course-formula" x="280" y="190" text-anchor="middle">Qmax = Q × √[Pstat / (Pstat − Pdyn)]</text>`;
    } else {
      const items = [['40/14','250 L/min','3,5 bar'],['65/18','500 L/min','5,7 bar'],['100/25','1 000 L/min','6,1 bar'],['LDV 45','≤ 500 L/min','6–8 bar']];
      c = `<g class="hydro-nozzle-table">${items.map((a,i)=>{const x=8+i*137;return `<g transform="translate(${x} 37)">${foamNozzle(4,0,a[0])}<rect y="77" width="125" height="92" rx="10"/><text x="62" y="112">${a[1]}</text><text class="course-orange" x="62" y="144">${a[2]}</text></g>`;}).join('')}</g>`;
    }
    return courseWrap(visual, c, visual.labels || []);
  }

  function mastDrawing(x, y, extended = true, lights = true){
    const mastTop = extended ? 8 : 92;
    return `<g transform="translate(${x} ${y})" class="mast-object"><path class="mast-truck" d="M0 90h155v72H0zM155 110h76l35 52H155z"/><circle cx="52" cy="163" r="22"/><circle cx="204" cy="163" r="22"/><path class="mast-column" d="M42 92V${mastTop + 18}h14V92M45 92V${mastTop + 8}h8V92"/><path class="mast-head" d="M18 ${mastTop + 8}h62v18H18z"/>${lights ? `<path class="mast-beam" d="M25 ${mastTop + 27} -25 70M73 ${mastTop + 27} 123 70"/>` : ''}</g>`;
  }

  function drawMastCourse(visual){
    const s = visual.scenario;
    let c = '';
    if (s === 'overview'){
      c = `${mastDrawing(40,18,true,true)}<path class="mast-height" d="M345 28v153"/><path class="mast-height-tick" d="m335 38 10-10 10 10m-20 133 10 10 10-10"/><text class="course-formula" x="390" y="85">4,95 m</text><g class="mast-leds" transform="translate(390 115)">${[0,1,2,3].map(i=>`<circle cx="${i*35}" cy="20" r="14"/><text x="${i*35}" y="52">55W</text>`).join('')}</g>`;
    } else if (s === 'conditions'){
      c = `${courseEngine(18,68)}<g class="mast-air" transform="translate(170 62)"><rect width="92" height="72" rx="30"/><circle cx="25" cy="36" r="12"/><circle cx="67" cy="36" r="12"/>${courseLabel(46,96,'AIR SERVITUDE')}</g>${mastDrawing(360,32,true,false)}${courseArrow(118,110,170,110,'orange')}${courseArrow(262,110,360,110,'blue')}`;
    } else if (s === 'descent'){
      c = `${mastDrawing(20,26,true,false)}<g class="mast-timer" transform="translate(315 37)"><circle cx="55" cy="55" r="48"/><path d="M55 18v37l28 18"/><text x="55" y="119">2 MIN</text></g>${courseArrow(425,92,470,92,'blue')}<g class="mast-final" transform="translate(467 43)"><path d="M16 15v112M8 127h42"/><circle cx="58" cy="127" r="13" class="mast-light-off"/>${courseLabel(40,157,'VOYANT ÉTEINT','green')}</g>`;
    } else if (s === 'purge'){
      c = `<g class="mast-cylinder" transform="translate(110 15)"><rect x="35" y="0" width="80" height="175" rx="35"/><rect x="57" y="12" width="36" height="145" rx="17"/><path d="M75 157v48"/>${courseLabel(75,222,'MÂT EN POSITION HAUTE')}</g><g class="mast-purge-valve" transform="translate(318 78)"><circle cx="45" cy="45" r="35"/><path d="M45 10v70M10 45h70"/>${hydDrain(45,92,'PURGER JUSQU’EN BAS')}</g>${courseArrow(225,105,318,105,'blue')}`;
    } else {
      c = `<g class="ladder-carrier" transform="translate(22 18)"><path class="mast-truck" d="M30 80h330v112H30z"/><circle cx="105" cy="194" r="27"/><circle cx="300" cy="194" r="27"/><g transform="rotate(-16 130 63)"><path d="M25 28h330M25 64h330"/><path d="M55 28v36M95 28v36M135 28v36M175 28v36M215 28v36M255 28v36M295 28v36M335 28v36"/></g><circle cx="130" cy="63" r="16"/>${courseArrow(130,63,75,130,'orange')}<g class="course-panel" transform="translate(390 62)"><rect width="130" height="90" rx="10"/><path d="M35 60V25m-11 12 11-12 11 12M95 25v35m-11-12 11 12 11-12"/>${courseLabel(65,113,'COFFRE AR GAUCHE')}</g></g>`;
    }
    return courseWrap(visual, c, visual.labels || []);
  }

  function drawEquipmentCourse(visual){
    const s = visual.scenario;
    let c = '';
    if (s === 'turbo'){
      c = `<g class="equip-turbo" transform="translate(84 31)"><path d="M-10 93c0-72 63-102 119-76 48 23 53 89 9 116-33 20-81 4-78-32 2-24 31-34 48-20"/><circle cx="82" cy="91" r="45"/><g class="equip-impeller">${Array.from({length:8},(_,i)=>`<path d="M82 91q33-10 39-34" transform="rotate(${i*45} 82 91)"/>`).join('')}</g><path d="M126 91h150" stroke-width="13"/><circle cx="320" cy="91" r="58"/><g class="equip-impeller equip-hot">${Array.from({length:8},(_,i)=>`<path d="M320 91q37-11 45-40" transform="rotate(${i*45} 320 91)"/>`).join('')}</g>${courseLabel(82,174,'COMPRESSEUR','blue')}${courseLabel(320,174,'TURBINE ÉCHAPPEMENT','orange')}</g>`;
    } else if (s === 'axle'){
      c = `<g class="equip-axle course-object" transform="translate(42 30)"><circle cx="45" cy="95" r="56" class="course-wheel"/><circle cx="433" cy="95" r="56" class="course-wheel"/><path d="M100 95h278" stroke-width="22"/><circle cx="239" cy="95" r="72"/><circle cx="239" cy="95" r="42"/><g class="equip-gears"><circle cx="218" cy="95" r="17"/><circle cx="260" cy="95" r="17"/><circle cx="239" cy="74" r="15"/><circle cx="239" cy="116" r="15"/></g><path class="equip-leak" d="M239 170c-10 13-10 22 0 22s10-9 0-22z"/>${courseLabel(239,216,'FUITE RÉDUCTEUR = INDISPONIBLE','red')}</g>`;
    } else if (s === 'transfer'){
      c = `${courseGearbox(28,65,'BOÎTE TRANSFERT')}<g class="equip-transfer course-object" transform="translate(180 46)"><path d="M0 30h105v105H0z"/><circle cx="34" cy="63" r="19"/><circle cx="72" cy="62" r="16"/><circle cx="54" cy="101" r="20"/>${courseLabel(52,159,'GV / PV')}</g>${courseShaft(285,92,95,'VERS PONT AR')}${courseDifferential(468,63,'PONT AR')}${courseShaft(285,158,95,'VERS PONT AV')}${courseArrow(122,105,180,105,'orange')}`;
    } else if (s === 'four-wheel-order'){
      c = `<g class="equip-4x4">${[['1','PONT AVANT'],['2','GV → PV À L’ARRÊT'],['3','BLOCAGES SI BESOIN']].map((a,i)=>{const x=20+i*180;return `<g transform="translate(${x} 35)"><circle cx="75" cy="65" r="55"/><text class="equip-step" x="75" y="78">${a[0]}</text>${courseLabel(75,150,a[1],i===2?'orange':'green')}</g>`;}).join('')}<path class="equip-release" d="M420 205H140"/>${courseArrow(420,205,140,205,'blue')}<text x="280" y="198">RETIRER APRÈS FRANCHISSEMENT</text></g>`;
    } else {
      c = `<g class="equip-retarder" transform="translate(70 27)"><circle cx="100" cy="92" r="80"/><circle cx="100" cy="92" r="24"/><g class="equip-impeller">${Array.from({length:10},(_,i)=>`<path d="M100 92q45-12 59-51" transform="rotate(${i*36} 100 92)"/>`).join('')}</g><path d="M183 92h115" stroke-width="14"/><circle cx="380" cy="92" r="80"/><circle cx="380" cy="92" r="24"/><g class="equip-impeller equip-static">${Array.from({length:10},(_,i)=>`<path d="M380 92q45-12 59-51" transform="rotate(${i*36} 380 92)"/>`).join('')}</g>${courseLabel(100,205,'ROTOR · HUILE','blue')}${courseLabel(380,205,'STATOR · CHALEUR','orange')}</g>`;
    }
    return courseWrap(visual, c, visual.labels || []);
  }

  function drawCourseVisual(type, visual){
    if (type === 'mechanical-course') return drawMechanicalCourse(visual);
    if (type === 'foam-course') return drawFoamCourse(visual);
    if (type === 'control-course') return drawControlCourse(visual);
    if (type === 'hydro-course') return drawHydroCourse(visual);
    if (type === 'mast-course') return drawMastCourse(visual);
    return drawEquipmentCourse(visual);
  }

  function renderKeypointVisual(k, index, mod){
    const visual = k.visual || {};
    const requestedType = visual.type || k.type || 'default';
    const type = keypointTypes.has(requestedType) ? requestedType : 'default';
    const layouts = ['hero', 'wide', 'compact', 'half', 'vehicle', 'drivetrain', 'dimensions', 'tanks', 'pump'];
    const layout = layouts.includes(visual.layout) ? visual.layout : 'half';
    const nodes = (visual.nodes || []).slice(0, 7);
    const badges = (visual.badges || []).slice(0, 4);
    const items = (visual.items || []).slice(0, 6);
    const values = (visual.values || []).slice(0, 4);
    const sides = (visual.sides || []).slice(0, 2);
    const detailId = `kp-detail-${index}`;
    let diagram = '';

    if (type.endsWith('-course')) diagram = drawCourseVisual(type, visual);
    else if (type.startsWith('hydraulic-')) diagram = drawHydraulicVisual(type, visual, mod);
    else if (type === 'vehicle') diagram = drawFireTruck(visual);
    else if (type === 'drivetrain') diagram = drawDrivetrain(visual);
    else if (type === 'dimensions') diagram = drawDimensions(visual);
    else if (type === 'tanks') diagram = drawTanks(visual);
    else if (type === 'pump') diagram = drawPumpVisual(visual);
    else if (type === 'flow' || type === 'sequence'){
      diagram = `<div class="kp-path ${type === 'sequence' ? 'kp-path-sequence' : ''}">
        ${nodes.map((node, i) => `<span class="kp-node">${type === 'sequence' ? `<i>${i + 1}</i>` : ''}${esc(node)}</span>${i < nodes.length - 1 ? '<span class="kp-arrow" aria-hidden="true">→</span>' : ''}`).join('')}
      </div>`;
    } else if (type === 'cause-effect'){
      diagram = `<div class="kp-cause-path">${nodes.map((node, i) =>
        `<span class="kp-cause kp-tone-${i === 0 ? 'warn' : i === nodes.length - 1 ? 'ok' : 'bad'}">${esc(node)}</span>${i < nodes.length - 1 ? '<span class="kp-arrow" aria-hidden="true">→</span>' : ''}`
      ).join('')}</div>`;
    } else if (type === 'loop'){
      diagram = `<div class="kp-loop" aria-label="Boucle de régulation">
        ${nodes.map((node, i) => `<span class="kp-loop-node"><i>${i + 1}</i>${esc(node)}</span>`).join('')}
        <span class="kp-loop-return" aria-hidden="true">↺ retour mesure</span>
      </div>`;
    } else if (type === 'icons'){
      diagram = `<div class="kp-icon-grid">${items.map(item =>
        `<span class="kp-icon-item"><i aria-hidden="true">${esc(item.icon || '•')}</i><span>${esc(item.label || item)}</span></span>`
      ).join('')}</div>`;
    } else if (type === 'comparison'){
      diagram = `<div class="kp-comparison">${sides.map((side, i) =>
        `<span class="kp-side kp-side-${i ? 'b' : 'a'}"><i>${esc(side.label || '')}</i><strong>${esc(side.value || '')}</strong></span>`
      ).join('<span class="kp-vs" aria-hidden="true">⇄</span>')}</div>`;
    } else if (type === 'threshold'){
      diagram = `<div class="kp-thresholds">${values.map(value =>
        `<span class="kp-threshold kp-tone-${esc(value.tone || 'info')}"><strong>${esc(value.value || '')}</strong><i>${esc(value.label || '')}</i></span>`
      ).join('')}</div>`;
    } else if (type === 'concept'){
      diagram = `<div class="kp-concept">
        <strong>${esc(visual.headline || k.t)}</strong>
        ${nodes.length ? `<div class="kp-concept-nodes">${nodes.map(node => `<span>${esc(node)}</span>`).join('<i aria-hidden="true">→</i>')}</div>` : ''}
      </div>`;
    } else {
      diagram = `<div class="kp-default-visual"><svg viewBox="0 0 240 72" aria-hidden="true"><path d="M12 52h45l19-30h43l19 30h90M28 52V34h29M92 22v30M154 52V30h31v22"/><circle cx="76" cy="52" r="5"/><circle cx="138" cy="52" r="5"/></svg><span>${esc(k.t)}</span></div>`;
    }

    return `<article class="kp-visual kp-type-${type} kp-layout-${layout}">
      <button class="kp-toggle" type="button" aria-expanded="false" aria-controls="${detailId}">
        <span class="kp-top"><span class="kp-symbol" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span class="kp-title">${esc(k.t)}</span></span>
        ${diagram}
        ${badges.length ? `<span class="kp-badges">${badges.map(b => `<span>${esc(b)}</span>`).join('')}</span>` : ''}
        <span class="kp-open-label">Voir l’explication <i aria-hidden="true">＋</i></span>
      </button>
      <div class="kp-detail" id="${detailId}" hidden><p>${esc(k.d)}</p></div>
    </article>`;
  }

  /* corps de fiche : points clés + sections de faits + éléments */
  function renderModuleBody(mod){
    const body = $('#mod-body');
    let html = '';

    if ((mod.keypoints || []).length){
      html += `<div class="section-block"><div class="section-title">Points clés</div>
        <div class="keypoints-visual">${mod.keypoints.map((k, index) => renderKeypointVisual(k, index, mod)).join('')}
        </div></div>`;
    }

    (mod.sections || []).forEach(sec => {
      html += `<div class="section-block"><div class="section-title">${esc(sec.title)}</div>
        <div class="keypoints">${(sec.facts || []).map(f =>
          `<div class="keypoint"><div class="keypoint-bar" style="background:${sec.color || 'var(--cyan)'}"></div><div><b>${esc(f.t)}</b><p>${esc(f.d)}</p></div></div>`).join('')}
        </div></div>`;
    });

    body.innerHTML = html;
    body.querySelectorAll('.kp-toggle').forEach(button => button.addEventListener('click', () => {
      const detail = document.getElementById(button.getAttribute('aria-controls'));
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      if (detail) detail.hidden = open;
      const mark = button.querySelector('.kp-open-label i');
      if (mark) mark.textContent = open ? '＋' : '−';
    }));
  }

  /* ============================================================
     SCHÉMA INTERACTIF : fiche / à blanc / guidé
     ============================================================ */
  function mountSchema(mod, mode, viewIdx = null){
    const zone = $('#mod-interactive');
    zone.innerHTML = '';
    /* plusieurs vues possibles (ex. FPT GIMAEX : tableau arrière + écran cabine) */
    const views = mod.views || [{ schema: mod.schema, label: null, elements: mod.elements || [] }];
    if (viewIdx == null){
      const preferred = views.findIndex(candidate => candidate.schema === 'gimaex-tableau');
      viewIdx = preferred >= 0 ? preferred : 0;
    }
    const view = views[viewIdx] || views[0];
    const els = view.elements || mod.elements || [];
    const scenarios = view.scenarios || mod.scenarios;
    const isEx = mode === 'drill' || mode === 'ident';
    const isGimaexRear = view.schema === 'gimaex-tableau';
    const isFreeTest = mode === 'test';
    const viewName = (v, i) => {
      return String(v.label || 'Vue ' + (i + 1)).replace(/\s*\(p\.\s*\d+\)\s*$/i, '');
    };
    const toolbar = document.createElement('div');
    toolbar.className = 'schema-toolbar';
    if (views.length > 1 || (isGimaexRear && !isEx)) zone.appendChild(toolbar);

    if (views.length > 1){
      const tabs = document.createElement('div');
      tabs.className = 'schema-view-tabs';
      tabs.setAttribute('role', 'tablist');
      tabs.setAttribute('aria-label', 'Vues du module');
      const orderedViewIndexes = views.some(candidate => candidate.schema === 'gimaex-tableau')
        ? [
            views.findIndex(candidate => candidate.schema === 'gimaex-cabine'),
            views.findIndex(candidate => candidate.schema === 'gimaex-tableau'),
            views.findIndex(candidate => candidate.schema === 'gimaex-ecran'),
            ...views.map((_, index) => index)
          ].filter((index, position, all) => index >= 0 && all.indexOf(index) === position)
        : views.map((_, index) => index);
      tabs.innerHTML = orderedViewIndexes.map(i => {
        const v = views[i];
        return `<button class="schema-view-tab ${i === viewIdx ? 'active':''}" type="button" role="tab" aria-selected="${i === viewIdx}" data-v="${i}">${esc(viewName(v, i))}</button>`;
      }).join('');
      toolbar.appendChild(tabs);
      tabs.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => {
        const nextIdx = +b.dataset.v;
        const nextView = views[nextIdx] || views[0];
        const isGimaexScreen = nextView.schema === 'gimaex-ecran' || nextView.schema === 'gimaex-cabine';
        const nextMode = mode === 'operate' && nextView.schema !== 'gimaex-tableau'
          ? 'fiche'
          : mode === 'test' && nextView.schema !== 'gimaex-tableau' && !isGimaexScreen
            ? 'fiche'
            : mode;
        mountSchema(mod, nextMode, nextIdx);
      }));
    }

    /* Le pupitre arrière sépare clairement repérage, manipulation et test libre. */
    if (isGimaexRear && !isEx){
      const modeBar = document.createElement('div');
      modeBar.className = 'schema-mode-switch gx-mode-bar';
      modeBar.setAttribute('role', 'group');
      modeBar.setAttribute('aria-label', 'Mode du pupitre');
      modeBar.innerHTML = '<span class="gx-mode-label"><span aria-hidden="true">⌁</span> Mode du pupitre</span>' +
        [
          ['fiche', 'Repérage'],
          ['operate', 'Fonctionnement'],
          ['test', 'Test libre']
        ].map(([key, label]) =>
          `<button class="schema-mode-btn ${mode === key ? 'active' : ''}" type="button" aria-pressed="${mode === key}" data-mode="${key}"><span class="dot"></span>${label}</button>`
        ).join('');
      toolbar.appendChild(modeBar);
      modeBar.querySelectorAll('[data-mode]').forEach(button =>
        button.addEventListener('click', () => mountSchema(mod, button.dataset.mode, viewIdx)));
    }

    let scenario = scenarios ? Object.keys(scenarios)[0] : null;
    let drill = null;
    let guideStep = null;

    /* barre de scénarios (env uniquement) */
    let scenarioBar = null;
    if (scenarios && !isEx){
      scenarioBar = document.createElement('div');
      scenarioBar.className = 'schema-bottom-panel schema-scenario-panel';
      scenarioBar.innerHTML = '<div class="schema-bottom-head"><span><b>Scénarios rapides</b><small>Appliquez une configuration complète au schéma.</small></span><span class="schema-live-badge">PRÊT</span></div>' +
        '<div class="schema-panel-actions">' +
          Object.entries(scenarios).map(([k, s]) =>
            `<button class="scenario-btn ${k === scenario ? 'active':''}" type="button" aria-pressed="${k === scenario}" data-s="${k}"><span class="dot"></span>${esc(s.label)}</button>`).join('') +
        '</div>';
    }

    /* panneau guidé */
    const guidePanel = document.createElement('div');
    /* barre d'exercice */
    const drillBar = document.createElement('div');

    if (mode === 'guide' && mod.guide){ zone.appendChild(guidePanel); }
    if (isEx){ zone.appendChild(drillBar); }

    /* Les scénarios et les commandes restent au-dessus de l'image. */
    if (scenarioBar) zone.appendChild(scenarioBar);

    const workspace = document.createElement('div');
    workspace.className = 'schema-workspace';
    zone.appendChild(workspace);

    const schemaBox = document.createElement('div');
    const schemaClass = String(view.schema || 'unknown').toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    schemaBox.className = `schema-box schema-box-${schemaClass}`;
    workspace.appendChild(schemaBox);

    /* Sur écran large, la fiche apparaît à droite sans pousser le schéma
       sous la ligne de flottaison. Sur mobile elle repasse naturellement dessous. */
    const detail = document.createElement('aside');
    detail.className = 'schema-detail-pane';
    detail.setAttribute('aria-live', 'polite');
    detail.hidden = true;
    workspace.appendChild(detail);

    const handle = Schema.render(schemaBox, view.schema, els, {
      mode,
      interactive: !isEx && (!isGimaexRear || mode !== 'fiche'),
      onSelect: id => {
        if (mode === 'drill' && drill) return answerDrill(id);
        if (mode === 'ident' || isFreeTest) return;
        select(id);
      }
    });
    if (scenario) handle.setScenario(scenario);

    /* chips d'éléments */
    const chips = document.createElement('div');
    chips.className = 'element-chips';
    chips.innerHTML = els.map(e =>
      `<button class="element-chip" data-id="${e.id}"><span class="n">${e.n}</span>${esc(e.label)}</button>`).join('');
    if (mode !== 'drill' && mode !== 'ident' && !isFreeTest) zone.appendChild(chips);
    chips.querySelectorAll('.element-chip').forEach(c =>
      c.addEventListener('click', () => {
        if (isEx) return;
        select(c.dataset.id);
      }));

    function elState(id){
      if (!scenarios || !scenario) return null;
      const s = scenarios[scenario];
      if ((s.open || []).includes(id)) return { label: 'OUVERTE / EN SERVICE', cls: 'badge-ok' };
      if ((s.partial || []).includes(id)) return { label: 'OUVERTE PARTIELLEMENT', cls: 'badge-warn' };
      if ((s.closed || []).includes(id)) return { label: 'FERMÉE', cls: 'badge-bad' };
      return null;
    }

    function select(id){
      handle.setSelected(id);
      chips.querySelectorAll('.element-chip').forEach(c => c.classList.toggle('sel', c.dataset.id === id));
      const el = els.find(e => e.id === id);
      if (!el){ clearDetail(); return; }
      const st = elState(id);
      detail.hidden = false;
      workspace.classList.add('has-detail');
      detail.innerHTML = `<div class="element-detail">
        <button type="button" class="schema-detail-close" aria-label="Fermer la fiche">×</button>
        <div class="ed-head"><span class="ed-num">${el.n}</span><span class="ed-label">${esc(el.label)}</span>
        ${st ? `<span class="badge ${st.cls} ed-state">${st.label}</span>` : ''}</div>
        <div class="ed-role">${esc(el.role)}</div></div>`;
      detail.querySelector('.schema-detail-close').addEventListener('click', () => {
        clearDetail(); handle.setSelected(null);
        chips.querySelectorAll('.element-chip').forEach(c => c.classList.remove('sel'));
      });
    }

    function clearDetail(){
      detail.innerHTML = '';
      detail.hidden = true;
      workspace.classList.remove('has-detail');
    }

    if (scenarioBar){
      scenarioBar.querySelectorAll('.scenario-btn').forEach(b => b.addEventListener('click', () => {
        scenario = b.dataset.s;
        scenarioBar.querySelectorAll('.scenario-btn').forEach(x => {
          const active = x === b;
          x.classList.toggle('active', active);
          x.setAttribute('aria-pressed', String(active));
        });
        handle.setScenario(scenario);
        clearDetail(); handle.setSelected(null);
        chips.querySelectorAll('.element-chip').forEach(c => c.classList.remove('sel'));
      }));
    }

    /* ----- exercice « à blanc » : placer les éléments de mémoire ----- */
    function startDrill(){
      const ids = els.map(e => e.id);
      for (let i = ids.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
      drill = { queue: ids, idx: 0, correct: 0, wrong: 0, found: {} };
      handle.reset(); clearDetail();
      renderDrillBar();
    }
    function renderDrillBar(fb, fbColor){
      const t = els.find(e => e.id === drill.queue[drill.idx]);
      drillBar.className = 'drill-bar';
      drillBar.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <div><div class="drill-label">Placez sur le schéma</div><div class="drill-target">${esc(t.label)}</div></div>
          <div class="drill-stats">${drill.idx + 1} / ${drill.queue.length}<br><span style="color:var(--ok)">✓ ${drill.correct}</span> <span style="color:var(--red-hi)">✗ ${drill.wrong}</span></div>
        </div>
        ${fb ? `<div class="drill-feedback" style="color:${fbColor}">${fb}</div>` : ''}`;
    }
    function answerDrill(id){
      if (drill.found[id]) return;
      const target = drill.queue[drill.idx];
      if (id === target){
        drill.found[id] = true; drill.correct++; drill.idx++;
        handle.markOk(id);
        if (drill.idx >= drill.queue.length) return finishDrill();
        renderDrillBar('✓ Bien placé.', 'var(--ok)');
      } else {
        drill.wrong++;
        const el = els.find(e => e.id === id);
        renderDrillBar('✗ Ceci est : ' + (el ? el.label : '?'), 'var(--red-hi)');
      }
    }
    function finishDrill(){
      const score = Math.round((drill.correct / (drill.correct + drill.wrong || 1)) * 100);
      const nm = Progress.record(mod.id, score);
      Progress.addXP(Math.round(score / 10));
      const verdict = score >= 75 ? 'Maîtrisé' : score >= 40 ? 'À consolider' : 'À retravailler';
      drillBar.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div><div class="drill-label">Résultat</div>
            <div class="drill-target">${score}% — ${verdict}</div>
            <div style="font-size:12px;color:var(--mut);margin-top:2px;">Maîtrise mise à jour : ${nm}%</div></div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-panel btn-sm" id="drill-again">Recommencer</button>
            ${session ? `<button class="btn btn-orange btn-sm" id="drill-next">Suite de la session</button>` : ''}
          </div>
        </div>`;
      $('#drill-again').addEventListener('click', startDrill);
      const dn = $('#drill-next');
      if (dn) dn.addEventListener('click', nextInSession);
      renderNav();
    }

    /* ----- mise en œuvre guidée (env) ----- */
    function showGuide(i){
      guideStep = i;
      const g = mod.guide[i];
      if (g.scen){ scenario = g.scen; handle.setScenario(g.scen);
        if (scenarioBar) scenarioBar.querySelectorAll('.scenario-btn').forEach(x => x.classList.toggle('active', x.dataset.s === g.scen)); }
      select(g.emph);
      guidePanel.className = 'guide-panel';
      guidePanel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div class="guide-step">MISE EN ŒUVRE · ÉTAPE ${i + 1} / ${mod.guide.length}</div>
          <button class="btn-ghost" id="guide-quit">Quitter ✕</button>
        </div>
        <div class="guide-title">${esc(g.t)}</div>
        <div class="guide-note">${esc(g.note)}</div>
        <div class="guide-nav">
          <button class="btn btn-panel btn-sm" id="guide-prev" ${i === 0 ? 'disabled style="opacity:.4"' : ''}>‹ Préc.</button>
          <button class="btn btn-orange btn-sm" style="flex:1" id="guide-next">${i + 1 >= mod.guide.length ? 'Terminer ✓' : 'Étape suivante ›'}</button>
        </div>`;
      $('#guide-quit').addEventListener('click', () => mountSchema(mod, 'fiche'));
      $('#guide-prev').addEventListener('click', () => { if (guideStep > 0) showGuide(guideStep - 1); });
      $('#guide-next').addEventListener('click', () => {
        if (guideStep + 1 >= mod.guide.length) mountSchema(mod, 'fiche');
        else showGuide(guideStep + 1);
      });
    }

    if (mode === 'drill') startDrill();
    if (mode === 'ident') startIdent();
    if (mode === 'guide' && mod.guide) showGuide(0);

    /* ----- identification : un composant surligné, 4 noms proposés ----- */
    function startIdent(){
      const ids = els.map(e => e.id);
      for (let i = ids.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
      const st = { queue: ids, idx: 0, ok: 0, ko: 0 };
      handle.reset();
      next();
      function next(fb, col){
        if (st.idx >= st.queue.length) return done();
        const target = els.find(e => e.id === st.queue[st.idx]);
        handle.setSelected(target.id, false);
        const others = els.filter(e => e.id !== target.id);
        for (let i = others.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
        const opts = [target, ...others.slice(0, 3)].sort(() => Math.random() - 0.5);
        drillBar.className = 'drill-bar';
        drillBar.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <div class="drill-label">Quel est le composant surligné ?</div>
            <div class="drill-stats">${st.idx + 1} / ${st.queue.length} · <span style="color:var(--ok)">✓ ${st.ok}</span> <span style="color:var(--red-hi)">✗ ${st.ko}</span></div>
          </div>
          ${fb ? `<div class="drill-feedback" style="color:${col}">${fb}</div>` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">
            ${opts.map(o => `<button class="scenario-btn" data-id="${o.id}"><span class="dot"></span>${esc(o.label)}</button>`).join('')}
          </div>`;
        drillBar.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => {
          if (b.dataset.id === target.id){ st.ok++; handle.markOk(target.id); st.idx++; next('✓ ' + target.label, 'var(--ok)'); }
          else { st.ko++; next('✗ Non — c’était : ' + target.label, 'var(--red-hi)'); handle.markOk(target.id); st.idx++; }
        }));
      }
      function done(){
        const score = Math.round(st.ok / (st.ok + st.ko || 1) * 100);
        const nm = Progress.record(mod.id, score);
        drillBar.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div><div class="drill-label">Identification terminée</div>
              <div class="drill-target">${score}%</div>
              <div style="font-size:12px;color:var(--mut);margin-top:2px;">Maîtrise mise à jour : ${nm}%</div></div>
            <button class="btn btn-panel btn-sm" id="ident-again">Recommencer</button>
          </div>`;
        drillBar.querySelector('#ident-again').addEventListener('click', () => { handle.reset(); startIdent(); });
        renderNav();
      }
    }
  }

  /* ============================================================
     RÉVISION RAPIDE (points clés en 30 s)
     ============================================================ */
  function openFlash(mod){
    const pts = mod.keypoints || [];
    if (!pts.length) return;
    let i = 0;
    const ov = document.createElement('div');
    ov.className = 'flash-overlay';
    document.body.appendChild(ov);

    function draw(){
      const k = pts[i];
      ov.innerHTML = `<div class="flash-card">
        <div class="flash-count">RÉVISION RAPIDE · ${esc(mod.title).toUpperCase()} · ${i + 1} / ${pts.length}</div>
        <div class="flash-title">${esc(k.t)}</div>
        <div class="flash-text">${esc(k.d)}</div>
        <div class="flash-nav">
          <button class="btn btn-panel" id="fl-prev" ${i === 0 ? 'disabled style="opacity:.4"' : ''}>‹</button>
          <button class="btn btn-orange" style="flex:1" id="fl-next">${i + 1 >= pts.length ? 'Terminer ✓' : 'Suivant ›'}</button>
          <button class="btn btn-panel" id="fl-close">✕</button>
        </div></div>`;
      ov.querySelector('#fl-prev').addEventListener('click', () => { if (i > 0){ i--; draw(); } });
      ov.querySelector('#fl-next').addEventListener('click', () => { if (i + 1 >= pts.length) ov.remove(); else { i++; draw(); } });
      ov.querySelector('#fl-close').addEventListener('click', () => ov.remove());
    }
    draw();
  }

  /* ============================================================
     VUE : QCM
     ============================================================ */
  function renderQuizView(id){
    const mod = module_(id);
    if (!mod) return renderHome();
    const d = domain(mod.domain);
    setBreadcrumb([{ label: 'Accueil', href: '#/' }, { label: d.title, href: '#/domaine/' + d.id },
                   { label: mod.title, href: '#/module/' + id }, { label: 'QCM' }]);
    const questions = quizOf(id);
    const view = $('#view');
    view.innerHTML = `
      <div class="mod-head">
        <div class="mod-domain"><span class="nav-dot" style="background:${d.color}"></span>${esc(d.title)} · QCM</div>
        <h1 class="mod-title">${esc(mod.title)}</h1>
        <div class="mod-tagline"><a href="#/module/${id}">‹ Retour à la fiche</a></div>
      </div>
      <div id="quiz-zone"></div>
      ${session ? `<div class="card" style="margin-top:16px; display:none;" id="session-next-card"></div>` : ''}`;

    if (!questions.length){
      $('#quiz-zone').innerHTML = '<div class="skeleton-note">Pas encore de questions pour ce module.</div>';
      return;
    }
    Quiz.start($('#quiz-zone'), questions, {
      timer: true,
      onFinish: pct => {
        Progress.record(id, pct);
        Progress.addXP(Math.round(pct / 10));
        renderNav();
        if (session){
          const card = $('#session-next-card');
          if (card){
            card.style.display = 'block';
            const left = session.queue.length - session.idx - 1;
            card.innerHTML = left > 0
              ? `<div class="card-title">Session du jour · ${session.idx + 1}/${session.queue.length} terminé</div>
                 <button class="btn btn-orange" id="sess-next">Module suivant : ${esc(module_(session.queue[session.idx + 1]).title)} ›</button>`
              : `<div class="card-title">Session du jour</div><div style="font-weight:600;">🎉 Session terminée — bien joué.</div>
                 <button class="btn btn-panel btn-sm" id="sess-home" style="margin-top:10px;">Retour à l'accueil</button>`;
            const n = card.querySelector('#sess-next');
            if (n) n.addEventListener('click', nextInSession);
            const h = card.querySelector('#sess-home');
            if (h) h.addEventListener('click', () => { clearSession(); location.hash = '#/'; });
          }
        }
      }
    });
  }

  /* ============================================================
     SESSION DU JOUR (répétition espacée)
     ============================================================ */
  function sessionQueue(){
    return DATA.modules.filter(m => isFull(m) && quizOf(m.id).length)
      .sort((a, b) => Progress.priority(b.id) - Progress.priority(a.id))
      .slice(0, 4).map(m => m.id);
  }
  function startSession(){ clearSession(); continueSession(); }
  function nextInSession(){
    if (!session) session = loadSession();
    if (!session) return;
    session.idx++;
    if (session.idx >= session.queue.length){ clearSession(); location.hash = '#/'; return; }
    saveSession();
    location.hash = '#/module/' + session.queue[session.idx] + '/qcm';
  }

  /* ----- session persistante (reprise après fermeture) ----- */
  const SKEY = () => 'sp33_session_' + Progress.current;
  function loadSession(){ try{ return JSON.parse(localStorage.getItem(SKEY())); }catch(e){ return null; } }
  function saveSession(){ if (session) localStorage.setItem(SKEY(), JSON.stringify(session)); }
  function clearSession(){ session = null; localStorage.removeItem(SKEY()); }
  function continueSession(){
    session = loadSession() || { queue: sessionQueue(), idx: 0 };
    saveSession();
    const target = '#/module/' + session.queue[session.idx] + '/qcm';
    if (location.hash === target) route(); else location.hash = target;
  }

  /* ============================================================
     FLASHCARDS — flip 3D + rating Facile/Bien/Difficile (SM-2)
     ============================================================ */
  function xpPop(x, y, n){
    const el = document.createElement('div');
    el.className = 'xp-pop';
    el.textContent = '+' + n + ' XP';
    el.style.left = x + 'px'; el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  function renderFlashcards(id){
    const mod = module_(id);
    if (!mod || !(mod.keypoints || []).length) return renderModule(id);
    const d = domain(mod.domain);
    setBreadcrumb([{ label: 'Accueil', href: '#/' }, { label: d.title, href: '#/domaine/' + d.id },
                   { label: mod.title, href: '#/module/' + id }, { label: 'Flashcards' }]);
    /* les cartes les plus urgentes (date de rappel) d'abord */
    const cards = mod.keypoints.map((k, i) => ({ k, key: id + ':' + i }))
      .sort((a, b) => (Progress.cardState(a.key).due || 0) - (Progress.cardState(b.key).due || 0));
    let i = 0;
    const results = [];
    $('#view').innerHTML = `
      <div class="mod-head">
        <div class="mod-domain"><span class="nav-dot" style="background:${d.color}"></span>${esc(d.title)} · Flashcards</div>
        <h1 class="mod-title">${esc(mod.title)}</h1>
        <div class="mod-tagline"><a href="#/module/${id}">‹ Retour à la fiche</a></div>
      </div>
      <div id="fc-zone"></div>`;

    function draw(){
      if (i >= cards.length) return done();
      const c = cards[i];
      $('#fc-zone').innerHTML = `
        <div class="fc-progress"><div class="pbar"><div style="width:${i / cards.length * 100}%; background:var(--orange)"></div></div><span class="pbar-pct">${i + 1}/${cards.length}</span></div>
        <div class="fc-scene"><div class="fc-card" id="fc-card">
          <div class="fc-face fc-front"><div class="fc-kind">${esc(mod.title)}</div><div class="fc-q">${esc(c.k.t)}</div><div class="fc-hint">↻ cliquez pour retourner la carte</div></div>
          <div class="fc-face fc-back"><div class="fc-kind">Réponse</div><div class="fc-a">${esc(c.k.d)}</div></div>
        </div></div>
        <div class="fc-rate" id="fc-rate" hidden>
          <button class="fc-hard" data-r="0">Difficile<br><small>demain</small></button>
          <button class="fc-good" data-r="1">Bien<br><small>+2 j et plus</small></button>
          <button class="fc-easy" data-r="2">Facile<br><small>+4 j et plus</small></button>
        </div>`;
      const card = $('#fc-card');
      card.addEventListener('click', () => {
        card.classList.add('flipped');
        $('#fc-rate').hidden = false;
      });
      $('#fc-rate').querySelectorAll('button').forEach(b => b.addEventListener('click', ev => {
        const r = +b.dataset.r;
        Progress.rateCard(c.key, r);
        results.push(r);
        i++;
        draw();
      }));
    }

    function done(){
      const pct = Math.round(results.reduce((a, r) => a + [30, 70, 100][r], 0) / (results.length || 1));
      const nm = Progress.record(id, pct);
      renderNav();
      const easy = results.filter(r => r === 2).length, good = results.filter(r => r === 1).length, hard = results.filter(r => r === 0).length;
      $('#fc-zone').innerHTML = `
        <div class="card" style="text-align:center; padding:26px; max-width:640px; margin:0 auto;">
          <div class="card-title">Paquet terminé</div>
          <div class="quiz-score-big" style="color:${Progress.masteryColor(pct)}">${pct}%</div>
          <div style="font-size:13px; color:var(--mut); margin-top:6px;">
            <span style="color:#4cd68a">${easy} facile(s)</span> · <span style="color:#f39c4a">${good} bien</span> · <span style="color:#e8695c">${hard} difficile(s)</span><br>
            Maîtrise mise à jour : ${nm}% — les cartes « difficile » reviendront demain.
          </div>
          <div style="display:flex; gap:8px; justify-content:center; margin-top:18px;">
            <button class="btn btn-panel" id="fc-again">Rejouer le paquet</button>
            <a class="btn btn-orange" href="#/module/${id}">Retour à la fiche</a>
          </div>
        </div>`;
      $('#fc-again').addEventListener('click', () => renderFlashcards(id));
    }
    draw();
  }

  /* ============================================================
     POMODORO 25 min — 4 sessions / jour (topbar + mode focus)
     ============================================================ */
  const Pomo = (() => {
    const KEY = 'sp33_pomo', DUR = 25 * 60;
    let st = {}, int = null;
    const today = () => new Date().toISOString().slice(0, 10);
    function load(){
      try{ st = JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ st = {}; }
      if (st.date !== today()) st = { date: today(), done: 0, remaining: DUR, running: false, endTs: 0 };
      if (st.remaining == null) st.remaining = DUR;
    }
    function save(){ localStorage.setItem(KEY, JSON.stringify(st)); }
    function remaining(){ return st.running ? Math.max(0, Math.round((st.endTs - Date.now()) / 1000)) : st.remaining; }
    function fmt(s){ return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
    function toggle(){
      if (st.running){ st.remaining = remaining(); st.running = false; }
      else {
        if (st.remaining <= 0) st.remaining = DUR;
        st.endTs = Date.now() + st.remaining * 1000;
        st.running = true;
      }
      save(); render();
    }
    function tick(){
      if (st.date !== today()) load();
      if (st.running && remaining() <= 0){
        st.running = false; st.remaining = DUR;
        st.done = Math.min(4, (st.done || 0) + 1);
        if (Progress.current) Progress.addXP(20);
        save();
        const p = document.getElementById('pomo');
        if (p){ p.classList.add('done-flash'); setTimeout(() => p.classList.remove('done-flash'), 6000); }
      }
      render();
    }
    function dots(){ return [0, 1, 2, 3].map(i => `<i class="${i < (st.done || 0) ? 'on' : ''}"></i>`).join(''); }
    function render(){
      const t = document.getElementById('pomo-toggle');
      if (t){
        t.textContent = fmt(remaining());
        document.getElementById('pomo').classList.toggle('running', !!st.running);
        document.getElementById('pomo-dots').innerHTML = dots();
      }
      const ft = document.getElementById('focus-time');
      if (ft){
        ft.textContent = fmt(remaining());
        const ov = document.querySelector('.focus-overlay');
        if (ov) ov.classList.toggle('running', !!st.running);
        const fd = document.getElementById('focus-dots');
        if (fd) fd.innerHTML = dots();
      }
    }
    function init(){
      load();
      const t = document.getElementById('pomo-toggle');
      if (t) t.addEventListener('click', toggle);
      clearInterval(int);
      int = setInterval(tick, 1000);
      render();
    }
    return { init, toggle, fmt, remaining, dots, state: () => st };
  })();

  /* ============================================================
     MODE FOCUS — tout masquer sauf le Pomodoro et la tâche
     ============================================================ */
  function openFocus(){
    if (document.querySelector('.focus-overlay')) return;
    const fulls = DATA.modules.filter(isFull);
    const next = fulls.map(m => ({ m, d: Progress.dueInfo(m.id) })).sort((a, b) => a.d.due - b.d.due)[0];
    const st = Pomo.state();
    const ov = document.createElement('div');
    ov.className = 'focus-overlay' + (st.running ? ' running' : '');
    ov.innerHTML = `
      <div class="focus-time" id="focus-time">${Pomo.fmt(Pomo.remaining())}</div>
      <div class="focus-dots" id="focus-dots">${Pomo.dots()}</div>
      ${next ? `<a class="focus-task" id="focus-task" href="#/module/${next.m.id}">TÂCHE EN COURS<br><b>${esc(next.m.title)}</b><br><span style="font-size:11px;color:var(--mut-2)">${next.d.label}</span></a>` : ''}
      <div class="focus-actions">
        <button class="btn btn-orange" id="focus-toggle">▶ / ⏸</button>
        <button class="btn btn-panel" id="focus-quit">✕ Quitter le focus</button>
      </div>`;
    document.body.appendChild(ov);
    ov.querySelector('#focus-toggle').addEventListener('click', Pomo.toggle);
    ov.querySelector('#focus-quit').addEventListener('click', () => ov.remove());
    const task = ov.querySelector('#focus-task');
    if (task) task.addEventListener('click', () => ov.remove());
    document.addEventListener('keydown', function esc(e){ if (e.key === 'Escape'){ ov.remove(); document.removeEventListener('keydown', esc); } });
  }

  document.addEventListener('DOMContentLoaded', init);
  return {};
})();
