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
    'hydro-course', 'mast-course', 'equipment-course', 'incident-course',
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

  /*
   * Planche Incendie : chaque index possède une scène explicite. Les chaînes
   * ci-dessous ne sont jamais déduites des titres et ne modifient pas le cours.
   * Format : [composition, "objet|légende|état,...", note courte].
   */
  const INCIDENT_SCENES = {
    'systeme-feu': [
      ['orbit','fire|FLAMME|orange,outside|EXTÉRIEUR|blue,air|ZONE BASSE|blue,smoke|ZONE HAUTE|red,fuel|GAZ COMB.|orange,wall|PAROIS|grey,heat|ÉNERGIE|red','7 ZONES RELIÉES'],
      ['flow','air|O₂|blue,fuel|PYROLYSE|orange,fire|COMBUSTION|red,smoke|FUMÉES|grey','MATIÈRE EN CIRCULATION'],
      ['compare','fire|FOYER|orange,smoke|CONVECTION|red,heat|RAYONNEMENT|orange,wall|CONDUCTION FAIBLE|grey','ÉCHANGES D’ÉNERGIE'],
      ['network','fire|ACTION|orange,room|VOLUME|grey,smoke|FUMÉES|red,air|AIR|blue,fuel|COMBUSTIBLE|orange,heat|CHALEUR|red','TOUT LE SYSTÈME RÉAGIT'],
      ['flow','outside|EXTÉRIEUR|grey,door-closed|PORTE FERMÉE|green,air|AIR COUPÉ|grey,fire|FOYER ↓|green','ANTIVENTILATION'],
      ['flow','outside|EXTÉRIEUR|blue,door-open|PORTE OUVERTE|orange,air|AIR ENTRE|blue,fire|FOYER ↑|red','CONVECTION ACTIVÉE'],
      ['flow','nozzle|IMPULSION|blue,smoke|CIEL GAZEUX|red,steam|VAPEUR|blue,heat|RAYONNEMENT ↓|green','REFROIDIR · INERTER'],
      ['scene','smoke|BACKDRAFT|red,air|COMBURANT|blue,fuel|FLASHOVER|orange,heat|FGI|red,chain|RADICAUX|orange','TÉTRAÈDRE DE COMBUSTION']
    ],
    phenomenes: [
      ['scene','room|VOLUME|grey,fuel|COMBUSTIBLE|orange,fire-small|FEU NAISSANT|orange,smoke-small|PEU DE FUMÉES|grey','PUISSANCE MODÉRÉE'],
      ['compare','door-open|VENTILÉ|blue,fire|FLC|orange,door-closed|SOUS-VENTILÉ|grey,smoke|FLV|red','DEUX RÉGIMES'],
      ['scene','room|PIÈCE|grey,fuel|TOUT LE MOBILIER|orange,fire|PLEINEMENT DÉV.|red,smoke|VENTILATION LIMITANTE|red','APRÈS FLASHOVER'],
      ['timeline','fire|PUISSANCE MAX|red,fire-small|RÉGRESSION|orange,smoke|FUMÉES PRÉSENTES|red','DANGER RÉSIDUEL'],
      ['orbit','smoke|FUMÉES|red,skull|TOXICITÉ|red,eye|OPACITÉ|grey,heat|RAYONNEMENT|orange,fire|INFLAMMABILITÉ|red,building|ENVAHISSEMENT|grey','7 DANGERS'],
      ['sequence','fire-small|FEU LOCALISÉ|orange,smoke|GAZ CHAUDS|red,heat|SEUIL ÉNERGIE|red,fire|EMBRASEMENT|red','VOLUME VENTILÉ'],
      ['sequence','door-closed|CONFINÉ|grey,smoke|FUMÉES RICHES|red,door-open|APPORT D’AIR|orange,explosion|BACKDRAFT|red','COMBURANT DÉCLENCHEUR'],
      ['sequence','smoke|GAZ IMBRÛLÉS|grey,heat|SOURCE D’IGNITION|orange,explosion|FGI|red','ÉNERGIE D’ACTIVATION']
    ],
    extinction: [
      ['flow','outside|AIR|blue,door-closed|OUVRANT CONTRÔLÉ|green,air|COMBURANT ↓|grey,fire|FEU MAÎTRISÉ|green','ANTIVENTILATION'],
      ['flow','smoke|FUMÉES|red,nozzle|EAU|blue,steam|VAPORISATION|blue,heat|TEMPÉRATURE ↓|green','ÉVACUER · REFROIDIR · INERTER'],
      ['flow','fuel|COMBUSTIBLE|orange,nozzle|APPLICATION DIRECTE|blue,heat|TEMPÉRATURE ↓|green,smoke-small|PYROLYSE ↓|green','AGIR À LA SOURCE'],
      ['flow','chain|RADICAUX LIBRES|red,powder|POUDRE / GAZ|orange,chain-broken|RÉACTION CASSÉE|green','INHIBITION'],
      ['sequence','controller|CHEF D’AGRÈS|orange,pair|BAT|blue,hose|ÉTABLISSEMENT|blue,nozzle|ATTAQUE|orange','ORDRES PRÉPARATOIRES'],
      ['compare','reel|100 m|blue,clock|≈ 2 MIN|green,tank|CITERNE SOUPLE|blue,clock|≈ 20 MIN|orange','ORDRES DE GRANDEUR'],
      ['orbit','truck|ENGIN ALIMENTÉ|blue,tanker|NORIA 1|orange,tanker|NORIA 2|orange,tank|RÉSERVE D’EAU|blue,nozzle|LANCES|blue','PÉRENNITÉ DE L’EAU']
    ],
    ventilation: [
      ['scene','room|VOLUME|grey,door-open|ENTRANT|blue,fan|VENTILATEUR|orange,smoke|FLUX GAZEUX|red,outlet|SORTANT|green','AGIR SUR LES FLUX'],
      ['flow','air|AIR ENTRANT|blue,door-open|OUVRANT|green,smoke|VEINE D’AIR|red,outlet|FUMÉES SORTANTES|green','ENTRANT → SORTANT'],
      ['stack','air|GAZ FROIDS EN BAS|blue,smoke|GAZ CHAUDS EN HAUT|red,outlet|TIRAGE|orange','CONVECTION + PRESSION'],
      ['orbit','fan|VENTILER|orange,shield|PROTÉGER|green,smoke|DÉSENFUMER|blue,nozzle|ATTAQUER|red','3 OBJECTIFS'],
      ['compare','fire|LOCAL EN FEU|red,fan|DÉPRESSION|blue,building|VOLUME SAIN|green,fan|SURPRESSION|green','RECLOISONNER LES FLUX'],
      ['compare','fan|VENTILATION ATTAQUE|orange,nozzle|ATTAQUE HYDRAULIQUE|blue,door-closed|ANTIVENTILATION|green,fire|COMBURANT COUPÉ|grey','DEUX TACTIQUES'],
      ['sequence','controller|CHEF DE GROUPE|orange,check|FEU ÉTEINT / ORDRE|green,fan|DÉSENFUMAGE|blue','CONDITION DE MISE EN ŒUVRE'],
      ['flow','fan|ACTION|orange,smoke|FLUX|red,outlet|SORTANT|green,gauge|VITESSE ↑|blue','INDICATEUR D’EFFICACITÉ']
    ],
    sauvetage: [
      ['flow','person-danger|VICTIME|red,stairs|COMMUNICATIONS|green,ladder|MOYEN EXTÉRIEUR|orange,safe|ZONE SÛRE|green','DANGER IMMINENT'],
      ['flow','person|PERSONNE VALIDE|blue,rescuer|ACCOMPAGNER|orange,safe|ZONE SÛRE|green','DÉPLACEMENT GUIDÉ'],
      ['scene','room|LOCAL ÉTANCHE|green,person|PERSONNES|blue,shield|PROTECTION|green,smoke|DANGER DEHORS|red','RESTER À L’ABRI'],
      ['compare','people|PUBLIC|blue,exit|ÉVACUATION|orange,smoke|TRAJET EXPOSÉ|red,room|CONFINEMENT|green','CHOISIR LE MOINS EXPOSANT'],
      ['compare','building|STRUCTURE EN DUR|green,shield|CONFINER|green,people|ÉVACUATION|orange,rescuer|ACCOMPAGNER|orange','FORÊT : CONFINEMENT PRIORITAIRE'],
      ['scene','stairs|ACCÈS EXISTANT|green,smoke|IMPRATICABLE|red,ladder|ÉCHELLE|orange,aerial|MEA|blue,person-danger|VICTIMES|red','VOIES D’ACTION']
    ],
    'milieu-vicie': [
      ['compare','gauge|O₂ < 21 %|orange,bottle|ARI CAPELÉ|blue,gauge|O₂ < 19 %|red,mask|COIFFÉ + ENCLIQUETÉ|red','SEUILS D’OXYGÈNE'],
      ['compare','firefighter|PORTEUR 1|blue,mask|MASQUE / SAD|green,firefighter|PORTEUR 2|blue,bottle|ARI / TENUE|green','CONTRÔLE CROISÉ'],
      ['sequence','pair|BINÔME|blue,controller|CONTRÔLEUR|orange,table|TGR|green,door-open|ENGAGEMENT|red','ENREGISTRER AVANT D’ENTRER'],
      ['orbit','controller|1 CONTRÔLEUR|orange,pair|BINÔME 1|blue,pair|BINÔME 2|blue,pair|BINÔME 3|blue,pair|BINÔME 4|blue,pair-safe|SÉCURITÉ|green,radio|ÉCOUTE|blue','MAXIMUM 10 PORTEURS'],
      ['sequence','pair-safe|ATTENTE ÉQUIPÉE|green,alarm|DIFFICULTÉ|red,pair-safe|ENGAGEMENT|orange,pair|REMPLAÇANT|green','SOUS AUTORITÉ DU CONTRÔLEUR'],
      ['flow','pair|BINÔME|blue,person-danger|UN MEMBRE EN DIFFICULTÉ|red,exit|REPLI IMPÉRATIF|green','INDISSOCIABLES'],
      ['timeline','clock|0 MIN|blue,pair|RECONNAISSANCE|orange,clock|45 MIN MAX|red,alarm|SÉCURITÉ ENGAGÉE|red','TEMPS CONTRÔLÉ'],
      ['flow','person-danger|VICTIME IMMÉDIATE|red,pair|BINÔME ENVOYÉ|orange,radio|CHEF INFORMÉ|blue,table|ENREGISTREMENT|green','EXCEPTION ENCADRÉE']
    ],
    arico: [
      ['cutaway','bottle|7 L · 300 / 200 bar|blue,gauge|270 / 180 bar MINI|green,air|78 % N₂ · 21 % O₂|blue','BOUTEILLE D’AIR COMPRIMÉ'],
      ['network','bottle|ROBINET|blue,whistle|SIFFLET HP|orange,gauge|MANOMÈTRE HP|blue,regulator|DÉTENDEUR|orange,mask|SAD|green,hose|PRISE AUX.|blue','4 FLEXIBLES'],
      ['threshold','gauge|PRESSION ↓|blue,whistle|50 bar ± 5|orange,alarm|SIFFLET|red','CIRCUIT HAUTE PRESSION'],
      ['flow','bottle|200 / 300 bar|red,regulator|DÉTENDEUR HP|orange,gauge|6 À 7 bar|green,mask|SAD|blue','MOYENNE PRESSION CONSTANTE'],
      ['cutaway','regulator|SAD|orange,stop|BOUTON ROUGE|red,mask|MASQUE|green,air|BY-PASS 300 L/min|blue,shield|SURPRESSION / FUMÉES BLOQUÉES|green','ORGANE CENTRAL ET FONCTIONS'],
      ['orbit','mask|PIÈCE FACIALE|blue,visor|VISIÈRE 96 %|green,seal|JUPE DOUBLE|green,valve|SOUPAPES|orange,strap|FIXATION|blue,voice|MEMBRANE PHONIQUE|blue','5 ÉLÉMENTS'],
      ['timeline','bodyguard|IMMOBILITÉ|blue,clock|21 s|orange,alarm|PRÉ-ALARME|orange,clock|+ 8 s|red,alarm|HOMME MORT|red','29 SECONDES AU TOTAL'],
      ['flow','regulator|MP|orange,hose|PRISE FEMELLE|blue,connector|PRISE MÂLE|green,mask|2e SAD / CAGOULE|blue','NARGUILÉ'],
      ['flow','bottle|MÊME BOUTEILLE|blue,hose|1,5 m|blue,hood|40 L/min|orange,person|VICTIME|green,exit|RETOUR IMMÉDIAT|red','DEUX CONSOMMATEURS'],
      ['compare','pair|CHEF + ÉQUIPIER|blue,rope|1,25 m + 6 m|green,pair|DEUX LONGUES|red,rope|12 m INTERDIT|red','LIAISON PERSONNELLE'],
      ['cutaway','rope|LIGNE GUIDE 50 m|blue,olive|13 → FEU|orange,olive|31 → SORTIE|green,hose|40 m MAX DANS FEU|red','REPÈRES DE PROGRESSION'],
      ['flow','rope|LIAISON PERSONNELLE|blue,rope-guide|LIGNE GUIDE|orange,anchor|LIEN CONSTANT|green,exit|SORTIE|green','LIGNE DE VIE'],
      ['sequence','bottle|300 × 7 / 1,1|blue,air|≈ 1 909 L|green,lungs|100 L/min|orange,clock|≈ 19 MIN|red','CALCUL D’AUTONOMIE'],
      ['flow','lungs|150 ml ESPACE MORT|blue,co2|CO₂ RÉINHALÉ|red,lungs|HYPERVENTILATION|orange,gauge|AIR CONSOMMÉ ↑|red','RÉINSPIRATION'],
      ['sequence','damage|BRÛLÉ / DÉCHIRÉ|red,stop|RÉFORME|red,bottle|BOUTEILLE NEUVE|green,mask|MASQUE NEUF|green','RECONDITIONNEMENT']
    ],
    lspcc: [
      ['orbit','rope|LSPCC|orange,person-danger|FAÇADE|red,well|PUITS / FOSSE|grey,harness|VICTIME|blue,cliff|RISQUE DE CHUTE|red,building|RECONNAISSANCE|blue','6 POSSIBILITÉS'],
      ['compare','bag|LOT DISPONIBLE|green,harness|SITUATION STANDARD|blue,specialist|MATÉRIEL INSUFFISANT|red,ambulance|PRISE EN CHARGE SPÉCIALE|orange','PASSER LE RELAIS'],
      ['scene','truck|FPTGP|blue,bag-yellow|2 SACS JAUNES|orange,van|VTU|blue,bag-blue|1 SAC BLEU|blue','LOCALISATION DES LOTS'],
      ['cutaway','bag|SAC|orange,rope|CORDE PROTÉGÉE|blue,tarp|BÂCHE|green,dirt|SOUILLURES DEHORS|grey','RANGEMENT ET PROTECTION'],
      ['cutaway','rope|30 m · Ø12–13|blue,knot|NŒUD DE HUIT DOUBLE|orange,gauge|> 3 TONNES|green,stretch|≤ 4 %|blue','CORDE SEMI-STATIQUE'],
      ['flow','cord|COMMANDE Ø7|blue,person|ÉCARTER VICTIME|orange,bag|MATÉRIEL|blue,height|ESTIMER HAUTEUR|green','RÉSISTANCE NULLE'],
      ['cutaway','rope|CORDE PORTEUSE|blue,cord|CORDELETTE 50–60 cm|orange,knot|NŒUD FRANÇAIS|green,hand|POIGNÉES|green','AUTOBLOQUANT'],
      ['orbit','anchor|POINT FIXE|green,brake|FREIN 2 t|orange,carabiner|GRAND AXE 2 t|blue,pulley|POULIE 2 t|blue,load|CHARGE ÷ 2|green','PIÈCES MÉTALLIQUES'],
      ['orbit','harness|CUISSARD|blue,triangle|TRIANGLE|orange,sling|ANNEAUX 80 cm|green,sling|ANNEAUX 150 cm|green,connector|DEMI-LUNE|red','TEXTILES'],
      ['scene','edge|REBORD VIF|red,protector|PROTECTION|green,rope|CORDE|blue,load|CHARGE|orange','AUCUN FROTTEMENT DIRECT'],
      ['sequence','anchor|DOUBLE AMARRAGE|green,brake|FREIN FIXE|orange,carabiner|VIS − ¼ TOUR|blue,knot|HUIT DOUBLE|green,person|SOUS POINT FIXE|blue,protector|REBORD PROTÉGÉ|green','6 RÈGLES'],
      ['flow','fall|CHUTE AMORTIE|red,corrosive|SOUILLURE|red,burn|BRÛLURE / COUPURE|red,stop|RÉFORME|red','IMMÉDIATE'],
      ['sequence','eye|CONTRÔLE VISUEL|blue,hand|CONTRÔLE TACTILE|blue,wash|EAU ≤ 30 °C|green,dry|OMBRE À PLAT|green,bag|RANGER|orange','APRÈS INTERVENTION']
    ],
    echelles: [
      ['scene','wall|FAÇADE|grey,ladder-hook|ÉCHELLE À CROCHETS|orange,firefighter|1 SP|blue,window|ÉTAGE|red','4,25 m · 8 kg'],
      ['cutaway','ladder-hook|ÉCHELLE|orange,hook|2 CROCHETS|red,rung|ÉCHELONS|blue,brace|ENTRETOISE|green,feet|2 SABOTS|grey','NOMENCLATURE'],
      ['scene','truck|FPTGP|blue,ladder-hook|CROCHETS|orange,ladder|2 PLANS|green,van|VTU|blue','EMPLACEMENT À BORD'],
      ['cutaway','ladder|DÉPLOYÉE 9 m|blue,height|REPLIÉE 5 m|green,gauge|33 kg|orange,team|1 ÉQUIPE|blue','GRAND MODÈLE'],
      ['cutaway','ladder|DÉPLOYÉE 5,6 m|blue,height|REPLIÉE 3,6 m|green,gauge|20 kg|orange,team|1 ÉQUIPE|blue','PETIT MODÈLE'],
      ['orbit','ladder|2 PLANS|blue,pulley|POULIE / GUIDES|orange,rope|TRAIT|blue,lock|PARACHUTES|green,feet|SABOTS|grey,tie|LIGATURE|orange','ORGANES DE MANŒUVRE'],
      ['sequence','ground|SOL STABLE|green,feet|SABOTS POSÉS|green,lock|PARACHUTES|green,hand|MAINS MONTANTS|blue','AVANT DE MONTER'],
      ['scene','wall|FAÇADE|grey,ladder|ÉCHELLE|blue,measure|1/3 LONGUEUR|orange,person|TEST DU COUDE|green','PIÉTAGE CORRECT'],
      ['scene','wall|REBORD|grey,ladder-reverse|GRAND PLAN EN BAS|orange,anchor|AMARRÉE / CALÉE|green,measure|4 OU 5 PAS|blue','ITINÉRAIRE DE SECOURS'],
      ['cutaway','ladder|ÉCHELLE|blue,rope|TRAIT LIBRE|green,people|SAUVETAGES MULTIPLES|orange,hand|LIBÉRATION RAPIDE|green','NE PAS GÊNER'],
      ['flow','pair|BINÔME EN CHUTE|red,ladder|CHOC SUR ÉCHELLE|red,check|CONTRÔLE|orange,stop|RÉFORME POSSIBLE|red','QUELLE QUE SOIT LA HAUTEUR'],
      ['sequence','hand|CONTRÔLE TACTILE|blue,eye|CONTRÔLE VISUEL|blue,wash|NETTOYER|green,truck|RECONDITIONNER|orange','APRÈS INTERVENTION']
    ],
    parc: [
      ['scene','parking|PARC|grey,wall|COMPARTIMENT < 3000 m²|green,door-closed|PORTE CF|orange,sprinkler|6000 m² SI EAE|blue','RECOUPEMENT'],
      ['scene','parking|NIVEAU|grey,stairs|2 ESCALIERS · 40 m|green,deadend|CUL-DE-SAC · 25 m|orange,airlock|SAS|blue','DISTANCES MAXIMALES'],
      ['sequence','panel|COFFRET EXTÉRIEUR|blue,fan-low|PETITE VITESSE|green,fan|GRANDE VITESSE|orange,smoke|DÉSENFUMAGE|red','PV TOUJOURS AVANT GV'],
      ['flow','power|COUPURE GÉNÉRALE|red,fan|DÉSENFUMAGE|blue,stop|ARRÊT DANGEREUX|red,smoke|FUMÉES PIÉGÉES|red','NE PAS COUPER'],
      ['flow','hydrant|BI|blue,hose|≤ 100 m|green,dry-column|COLONNE SÈCHE|orange,anchor|ANCRAGES 0,5–0,8 m|blue','ACCÈS ET GUIDAGE'],
      ['orbit','car|FEU DE VÉHICULE|red,smoke|FOUR / FUMÉES|red,levels|MULTI-NIVEAUX|grey,battery|ÉNERGIES ALT.|orange,structure|FRAGILISATION|red','RISQUES CARACTÉRISTIQUES'],
      ['sequence','map|LOCALISER|blue,nozzle|ATTAQUE MASSIVE|orange,pair-safe|BINÔME SÉCURITÉ|green,rope-guide|REPLI BALISÉ|green','3 PRINCIPES'],
      ['sequence','battery|BATTERIE VE|orange,fire|EMBALLEMENT|red,sparks|PROJECTIONS|red,exit|REPLI IMMÉDIAT|green','ATTITUDE DÉFENSIVE'],
      ['sequence','map|PLAN|blue,power|COUPER IRVE|orange,elevator|ASCENSEUR RÉFÉRENCE|green,stairs|CAGE D’ESCALIER|green,camera|GUIDE + CAMÉRA|blue','RECONNAISSANCE']
    ],
    'feux-foret': [
      ['scene','truck-forest|CCF|orange,spray|RIDEAUX D’EAU|blue,shield|PROTECTION THERMIQUE|green,bottle|AIR 10 MIN|blue,people|4 PERSONNES|green','30 L/min PAR PERSONNE'],
      ['compare','tank|CA|blue,spray|AUTOPROTECTION|green,tank|CU|blue,nozzle|EXTINCTION|orange','DEUX RÉSERVES DISTINCTES'],
      ['sequence','valve|FERMER VANNES|green,people|TOUS DANS CCF|orange,spray|AUTOPROTECTION|blue,bottle|AIR RESPIRABLE|green,radio|ALERTER|red','PERSONNEL MENACÉ'],
      ['scene','truck-forest|CCF 1|orange,truck-forest|CCF 2|orange,truck-forest|CCF 3|orange,spray|AUTOPROTECTION|blue,fire-front|FRONT DE FEU|red','SERRER EN PASSIF'],
      ['orbit','driver|CONDUCTEUR|orange,radio|VEILLE|blue,tank|EAU|blue,spray|PROTECTION CCF|green,mask|ARI EN URGENCE|red','PERMANENCE À L’ARRIÈRE'],
      ['flow','hose|LIGNE INEFFICACE|red,truck-forest|MARCHE AVANT|orange,fire-front|LAISSER PASSER FRONT|red,building|CONFINEMENT DUR|green','REPLI DU GROUPE'],
      ['flow','water-source|EAU NATURELLE|blue,sediment|SÉDIMENTS|red,wash|RINCER POMPE|green,spray|BUSES LIBRES|green','APRÈS POMPAGE']
    ]
  };

  const INC_LABELS = {
    fire:'FEU', 'fire-small':'FEU', smoke:'FUMÉES', 'smoke-small':'FUMÉES', air:'AIR', fuel:'COMBUSTIBLE', heat:'CHALEUR',
    room:'VOLUME', outside:'EXTÉRIEUR', wall:'PAROI', person:'PERSONNE', people:'PERSONNES', pair:'BINÔME',
    bottle:'BOUTEILLE', mask:'MASQUE', rope:'CORDE', ladder:'ÉCHELLE', truck:'ENGIN', car:'VÉHICULE', fan:'VENTILATEUR'
  };

  function incidentToken(raw, x, y, scale = 1){
    const [token, explicitLabel, tone = 'blue'] = raw.split('|');
    const label = explicitLabel || INC_LABELS[token] || token.toUpperCase();
    let shape = '';
    if (token.includes('fire') || token === 'burn') shape = '<path class="inc-fill" d="M35 62C4 48 17 25 31 5c2 14 12 20 9 33 10-8 15-17 15-25 20 29 10 49-20 49z"/>';
    else if (token === 'fuel') shape = '<path d="M7 51 28 30l34 19M12 62h46M18 44l26 18M52 42 31 62"/><path class="inc-fill" d="M35 34C20 25 27 13 35 3c1 7 6 11 5 17 6-4 9-9 9-13 11 16 5 27-14 27z"/>';
    else if (token === 'smoke' || token === 'smoke-small') shape = '<path d="M9 54c-12-13 2-25 14-20-5-18 21-27 29-12 18-7 28 19 11 28 4 15-17 21-26 11-9 9-24 4-28-7z"/>';
    else if (['air','steam','co2'].includes(token)) shape = '<path d="M4 21q16-14 32 0t32 0M4 37q16-14 32 0t32 0M4 53q16-14 32 0t32 0"/>';
    else if (token === 'heat') shape = '<path d="M12 62q-14-17 0-34t0-25M35 62q-14-17 0-34t0-25M58 62q-14-17 0-34t0-25"/>';
    else if (['room','building','parking','structure'].includes(token)) shape = '<path d="M5 64V13h62v51M5 64h62M18 64V37h18v27M45 25h12v13H45"/>';
    else if (token === 'wall' || token === 'edge') shape = '<path d="M12 65V5h48v60M12 20h48M12 36h48M12 52h48"/>';
    else if (token === 'outside') shape = '<circle cx="35" cy="34" r="22"/><path d="M35 2v10M35 56v10M3 34h10M57 34h10M12 11l8 8M50 49l8 8M58 11l-8 8M20 49l-8 8"/>';
    else if (token === 'door-open' || token === 'door-closed') shape = token === 'door-open' ? '<path d="M10 66V4h47v62M15 8l31 8v45l-31 5z"/><circle cx="39" cy="39" r="2"/>' : '<path d="M10 66V4h47v62M15 8h37v58H15z"/><circle cx="44" cy="38" r="2"/>';
    else if (['person','rescuer','firefighter','driver','controller','specialist','person-danger'].includes(token)) shape = '<circle cx="35" cy="12" r="9"/><path d="M35 21v24M35 28 17 42M35 28l18 14M35 45 20 65M35 45l15 20"/>' + (token==='controller'?'<path d="M51 25h16v25H51zM55 31h8M55 38h8"/>':'');
    else if (token === 'pair' || token === 'pair-safe' || token === 'team' || token === 'people') shape = '<circle cx="22" cy="14" r="8"/><circle cx="49" cy="14" r="8"/><path d="M22 22v24M49 22v24M22 29 9 42M49 29l13 13M22 46 12 65M22 46l10 19M49 46 39 65M49 46l10 19"/>';
    else if (['safe','shield','protector'].includes(token)) shape = '<path class="inc-fill-soft" d="M35 3 63 14v22c0 17-11 26-28 33C18 62 7 53 7 36V14z"/><path d="m21 35 9 9 20-24"/>';
    else if (['nozzle','hose'].includes(token)) shape = token === 'nozzle' ? '<path d="M3 34h34l18-13 11 9-17 15H3zM66 29l12-3v10l-12-3z"/>' : '<path d="M5 52q14-38 30 0t30 0M5 52h60"/>';
    else if (token === 'fan' || token === 'fan-low') shape = '<circle cx="35" cy="34" r="29"/><path d="M35 34q8-25 19-10t-19 10q25 8 10 19t-10-19q-8 25-19 10t19-10q-25-8-10-19t10 19"/>';
    else if (token === 'outlet' || token === 'exit') shape = '<path d="M10 66V5h42v61M17 12h28v54M35 36h33m-9-9 10 9-10 9"/>';
    else if (['bottle','tank'].includes(token)) shape = '<path d="M22 10h26l6 9v42l-6 7H22l-6-7V19zM27 3h16v7"/><path class="inc-level" d="M19 40h32v18l-5 6H24l-5-6z"/>';
    else if (token === 'mask' || token === 'hood') shape = '<path d="M12 17Q35-2 58 17v29Q49 66 35 69 21 66 12 46z"/><path d="M20 21h30v22H20zM25 50h20M35 43v13"/>';
    else if (token === 'regulator') shape = '<circle cx="35" cy="34" r="27"/><circle cx="35" cy="34" r="9"/><path d="M35 7v18M35 43v18M8 34h18M44 34h18"/>';
    else if (token === 'gauge' || token === 'clock' || token === 'bodyguard') shape = '<circle cx="35" cy="34" r="28"/><path d="M13 42a24 24 0 0144 0M35 34l16-13"/><circle cx="35" cy="34" r="4"/>';
    else if (token === 'whistle' || token === 'alarm' || token === 'radio') shape = token === 'radio' ? '<rect x="14" y="11" width="42" height="51" rx="5"/><path d="M44 11 55 0M23 25h24M23 35h24"/><circle cx="35" cy="50" r="7"/>' : '<path d="M18 53V27a17 17 0 0134 0v26M10 53h50M25 14V6M45 14V6"/><path d="M5 27h8M57 27h8"/>';
    else if (token === 'rope' || token === 'rope-guide' || token === 'cord') shape = '<path d="M9 15c50-25 50 52 0 29s-48 32 10 22"/><circle cx="12" cy="15" r="4"/><circle cx="18" cy="66" r="4"/>';
    else if (token.includes('ladder') || token === 'aerial') shape = `<g transform="${token==='ladder-reverse'?'rotate(180 35 35)':''}"><path d="M15 66 25 4M55 66 45 4"/>${[14,25,36,47,58].map(v=>`<path d="M${19+(58-v)*.16} ${v}h${32-(58-v)*.32}"/>`).join('')}${token==='ladder-hook'?'<path d="M25 5q-15-12-18 5M45 5q15-12 18 5"/>':''}</g>`;
    else if (token === 'stairs') shape = '<path d="M5 64h14V51h13V38h13V25h13V12h10"/>';
    else if (token === 'truck' || token === 'tanker' || token === 'van' || token === 'ambulance' || token === 'truck-forest') shape = '<path d="M2 24h42v31H2zM44 34h17l10 21H44z"/><circle cx="17" cy="58" r="8"/><circle cx="56" cy="58" r="8"/>' + (token==='truck-forest'?'<path class="inc-water" d="M8 20q10-20 20 0M33 20q10-20 20 0"/>':'') + (token==='ambulance'?'<path d="M18 29v18M9 38h18"/>':'');
    else if (token === 'car') shape = '<path d="M5 47h62l-8-23H22L12 47M18 24l9-15h25l7 15"/><circle cx="20" cy="51" r="8"/><circle cx="55" cy="51" r="8"/>';
    else if (token === 'battery' || token === 'power') shape = '<rect x="9" y="14" width="54" height="47" rx="5"/><path d="M21 9v5M51 9v5M35 20 22 40h13l-5 16 20-25H37z"/>';
    else if (token === 'tree' || token === 'fire-front') shape = '<path d="M35 5 13 34h14L8 55h21v13h12V55h21L43 34h14z"/>' + (token==='fire-front'?'<path class="inc-hot" d="M4 65q8-21 16 0t16 0 16 0 16 0"/>':'');
    else if (token === 'spray' || token === 'water-source' || token === 'wash') shape = '<path class="inc-water" d="M35 3C9 34 12 63 35 63S61 34 35 3z"/><path d="M22 40q13-10 26 0"/>';
    else if (token === 'rope-guide' || token === 'olive') shape = '<path d="M4 35h64"/><path class="inc-fill" d="M17 27h10l6 8-6 8H17l-6-8zM43 27h10l6 8-6 8H43l-6-8z"/>';
    else if (['anchor','pulley','carabiner','connector','brake'].includes(token)) shape = token === 'pulley' ? '<circle cx="35" cy="32" r="26"/><circle cx="35" cy="32" r="11"/><path d="M35 58v10"/>' : token === 'carabiner' || token === 'connector' ? '<path d="M45 8C16-2 3 24 13 48s39 27 48 2L48 38c-6 15-24 14-29 1S24 11 39 16z"/>' : '<path d="M8 61 35 6l27 55M20 39h30M14 51h42"/>';
    else if (['harness','triangle','sling'].includes(token)) shape = token === 'triangle' ? '<path d="M35 5 66 62H4zM35 20 18 52h34z"/>' : '<circle cx="35" cy="14" r="9"/><path d="M20 26h30l8 36H12zM20 26l15 18 15-18M35 44v22"/>';
    else if (token === 'bag' || token.includes('bag-') || token === 'tarp') shape = '<path d="M10 22h50v43H10zM23 22V11h24v11M18 36h34"/>';
    else if (token === 'explosion' || token === 'sparks') shape = '<path class="inc-fill" d="m35 2 8 20 20-11-10 21 17 11-22 5 7 20-20-12-18 12 5-21-21-5 18-11L7 12l21 10z"/>';
    else if (token === 'powder') shape = '<path d="M15 62V18h40v44M22 18V7h26v11"/><path class="inc-dots" d="M58 25h10M58 35h10M58 45h10"/>';
    else if (token === 'chain' || token === 'chain-broken') shape = '<path d="M8 45c-13-13 7-33 20-20l10 10M62 23c13 13-7 33-20 20L32 33"/>' + (token==='chain-broken'?'<path class="inc-hot" d="m27 18 16 32M43 18 27 50"/>':'');
    else if (['eye','visor'].includes(token)) shape = '<path d="M3 35q32-30 64 0Q35 65 3 35z"/><circle cx="35" cy="35" r="12"/>';
    else if (token === 'lungs') shape = '<path d="M31 20v18C12 14 5 47 11 62c18 5 25-6 24-24M39 20v18c19-24 26 9 20 24-18 5-25-6-24-24"/>';
    else if (token === 'map' || token === 'table' || token === 'panel') shape = '<rect x="7" y="10" width="56" height="51" rx="4"/><path d="M18 10v51M43 10v51M18 25l25 16M43 20l20 12"/>';
    else if (token === 'camera') shape = '<rect x="8" y="20" width="48" height="37" rx="5"/><circle cx="32" cy="38" r="12"/><path d="M56 28l12-7v34l-12-7"/>';
    else if (token === 'hydrant' || token === 'dry-column') shape = '<path d="M21 20h28v45H21zM15 65h40M25 8h20l5 12H20zM10 31h11v17H10m39-17h11v17H49"/>';
    else if (token === 'check') shape = '<circle cx="35" cy="35" r="28"/><path d="m19 35 11 11 23-25"/>';
    else if (token === 'stop' || token === 'damage' || token === 'fall' || token === 'corrosive') shape = '<circle cx="35" cy="35" r="28"/><path class="inc-hot" d="M16 16l38 38M54 16 16 54"/>';
    else if (token === 'skull') shape = '<path d="M12 29a23 23 0 0146 0c0 13-7 20-14 23v13H26V52c-7-3-14-10-14-23z"/><circle cx="27" cy="29" r="5"/><circle cx="43" cy="29" r="5"/><path d="M30 43h10M18 65l34-13M52 65 18 52"/>';
    else if (token === 'window') shape = '<rect x="8" y="8" width="54" height="54"/><path d="M35 8v54M8 35h54"/>';
    else if (token === 'airlock') shape = '<path d="M5 64V7h60v57M18 7v57M52 7v57M22 14h26v43H22"/><circle cx="27" cy="35" r="2"/><circle cx="43" cy="35" r="2"/>';
    else if (token === 'elevator') shape = '<rect x="10" y="6" width="50" height="59"/><path d="M35 6v59M22 17l8-8 8 8M48 53l-8 8-8-8"/>';
    else if (token === 'deadend') shape = '<path d="M8 58h35V13M28 13h30M28 6h30M58 6v14"/>';
    else if (token === 'levels') shape = '<path d="M7 61h56M7 43h56M7 25h56M15 61V8h40v53"/>';
    else if (token === 'well' || token === 'cliff') shape = token === 'well' ? '<ellipse cx="35" cy="18" rx="28" ry="12"/><path d="M7 18v44M63 18v44M7 62q28 12 56 0"/>' : '<path d="M3 11h33v20H23v16H12v21M36 11h31"/>';
    else if (token === 'sprinkler') shape = '<path d="M35 3v24M17 27h36M25 27l-6 13M35 27v15M45 27l6 13"/><path class="inc-water" d="M15 47c-6 8-6 14 0 14s6-6 0-14M35 47c-6 8-6 14 0 14s6-6 0-14M55 47c-6 8-6 14 0 14s6-6 0-14"/>';
    else if (token === 'valve') shape = '<path d="M4 35h20M46 35h20M24 20l11 15-11 15zM46 20 35 35l11 15zM35 20V7M23 7h24"/>';
    else if (token === 'reel') shape = '<circle cx="31" cy="35" r="27"/><circle cx="31" cy="35" r="14"/><circle cx="31" cy="35" r="4"/><path d="M58 35h10M10 66h48"/>';
    else if (token === 'hand') shape = '<path d="M20 64V31q0-7 6-7t6 7V12q0-7 6-7t6 7v18-14q0-7 6-7t6 7v22q8-7 12 0-7 24-25 30z"/>';
    else if (token === 'ground') shape = '<path d="M3 55h64M8 55l10-12 9 12 12-15 13 15 8-9"/>';
    else if (['height','measure','stretch'].includes(token)) shape = '<path d="M14 7v56M8 13l6-6 6 6M8 57l6 6 6-6M28 12h33M28 58h33"/><path d="M35 18v35M44 18v35M53 18v35"/>';
    else if (token === 'knot') shape = '<path d="M15 60c36-4 48-38 22-45C10 8 4 39 26 48c21 9 43-8 33-27"/><circle cx="35" cy="36" r="8"/>';
    else if (['hook','rung','brace','feet','lock','tie'].includes(token)) shape = token === 'hook' ? '<path d="M45 5v36c0 29-38 29-38 5 0-13 15-18 23-9"/>' : token === 'lock' ? '<rect x="12" y="30" width="46" height="34" rx="5"/><path d="M22 30v-9a13 13 0 0126 0v9"/>' : token === 'feet' ? '<path d="M12 7 30 62M58 7 40 62M20 62h18M32 62h18"/>' : '<path d="M10 15h50M10 35h50M10 55h50M20 8v54M50 8v54"/>';
    else if (['seal','strap','voice'].includes(token)) shape = token === 'seal' ? '<path d="M10 35q25-39 50 0-25 39-50 0zM21 35q14-22 28 0-14 22-28 0z"/>' : token === 'strap' ? '<path d="M8 12h54v10H8zM8 48h54v10H8zM17 22l12 26M53 22 41 48"/>' : '<path d="M8 26h15l18-15v48L23 44H8zM49 23q18 12 0 24M55 16q28 19 0 38"/>';
    else if (token === 'load') shape = '<path d="M18 21h34l8 42H10zM25 21a10 10 0 0120 0"/><text x="35" y="52">½</text>';
    else if (token === 'sediment' || token === 'dirt') shape = '<path class="inc-water" d="M4 30q15-10 30 0t30 0M4 44q15-10 30 0t30 0"/><g class="inc-fill"><circle cx="16" cy="58" r="4"/><circle cx="31" cy="54" r="6"/><circle cx="49" cy="59" r="5"/><circle cx="61" cy="53" r="3"/></g>';
    else if (token === 'dry') shape = '<circle cx="35" cy="23" r="13"/><path d="M35 2v7M35 37v7M14 23h7M49 23h7M20 8l5 5M45 33l5 5M50 8l-5 5M25 33l-5 5M6 60q14-12 28 0t28 0"/>';
    else shape = '<circle cx="35" cy="35" r="27"/><path d="M19 35h32M35 19v32"/>';
    return `<g class="inc-token inc-${tone} inc-${esc(token)}" transform="translate(${x} ${y}) scale(${scale})"><title>${esc(label)}</title>${shape}${courseLabel(35,84,label,tone)}</g>`;
  }

  function drawARISpecial(index, aria){
    const wrap = (kind, content) => `<div class="kp-tech-diagram kp-course-diagram ari-special ari-special-${kind}" data-composition="ari-${kind}"><svg class="kp-tech-svg kp-course-svg ari-special-svg" viewBox="0 0 560 280" role="img" aria-label="${esc(aria || '')}"><defs>
      <linearGradient id="ari-metal-${kind}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#26384c"/><stop offset=".48" stop-color="#0d1724"/><stop offset="1" stop-color="#31465d"/></linearGradient>
      <linearGradient id="ari-glass-${kind}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#75d6ee" stop-opacity=".35"/><stop offset="1" stop-color="#18334a" stop-opacity=".72"/></linearGradient>
      <marker id="ari-arrow-${kind}" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 8 4 0 8z" class="ari-arrow-head"/></marker>
    </defs><rect class="ari-blueprint" x="2" y="2" width="556" height="276" rx="18"/>${content}</svg></div>`;

    if (index === 0) return wrap('bottle', `
      <g class="ari-primary-object ari-bottle-object">
        <path class="ari-bottle-shadow" d="M148 254h190"/>
        <path class="ari-bottle-shell" d="M178 61V45h18V29h51v16h18v16c28 14 43 36 43 68v103c0 20-13 31-31 31h-81c-18 0-31-11-31-31V129c0-32 14-54 43-68z"/>
        <path class="ari-bottle-highlight" d="M190 76c-9 15-13 32-13 53v96c0 15 7 22 19 25"/>
        <path class="ari-bottle-band" d="M166 108h141v37H166z"/>
        <path class="ari-bottle-boot" d="M174 238h125v24H174z"/>
        <g class="ari-valve"><path d="M196 45h51M207 29V15h29v14M214 15V8h15v7M229 20h23v15"/><circle cx="256" cy="27" r="8"/></g>
        <text class="ari-object-big" x="236" y="127">300</text><text class="ari-object-unit" x="236" y="141">BAR</text>
        <text class="ari-object-data" x="236" y="185">7 L</text><text class="ari-object-small" x="236" y="207">AIR COMPRIMÉ</text>
      </g>
      <g class="ari-gauge-panel">
        <text class="ari-callout-title" x="435" y="35">JAUGE D’ENGAGEMENT</text>
        <path class="ari-gauge-track" d="M451 58v171"/><path class="ari-gauge-fill" d="M451 58v145"/>
        <path class="ari-gauge-tick" d="M430 58h43M430 76h43M423 203h57"/>
        <text x="498" y="62">100 %</text><text x="498" y="80">90 %</text><text class="ari-warning-text" x="492" y="199">LIMITE</text><text class="ari-warning-text" x="492" y="213">ENGAGEMENT</text>
      </g>
      <g class="ari-callout ari-callout-left"><path d="M34 52h106l45 15"/><text x="34" y="42">ROBINET + MANOMÈTRE</text></g>
      <g class="ari-callout ari-callout-left"><path d="M35 228h105l25-18"/><text x="35" y="218">SABOT RENFORCÉ</text></g>`);

    if (index === 3) return wrap('regulator', `
      <g class="ari-pressure ari-pressure-hp"><text x="18" y="40">HAUTE PRESSION</text><text class="ari-pressure-value" x="18" y="61">200 / 300 bar</text><path d="M24 125H145" marker-end="url(#ari-arrow-regulator)"/></g>
      <g class="ari-primary-object ari-regulator-object">
        <path class="ari-mech-body" d="M153 92h48l18-30h96l22 30h44v73h-44l-22 30h-96l-18-30h-48z"/>
        <path class="ari-mech-rib" d="M175 93v71M192 84v89M342 91v74M359 93v71"/>
        <circle class="ari-diaphragm" cx="268" cy="128" r="66"/><circle class="ari-diaphragm-inner" cx="268" cy="128" r="43"/><circle class="ari-cap" cx="268" cy="128" r="19"/>
        <g class="ari-bolts">${[0,60,120,180,240,300].map(a=>{const r=a*Math.PI/180;return `<circle cx="${268+54*Math.cos(r)}" cy="${128+54*Math.sin(r)}" r="4"/>`;}).join('')}</g>
        <path class="ari-spring" d="M232 128h10l7-9 9 18 9-18 9 18 9-18 8 9h13"/>
        <text class="ari-object-data" x="268" y="218">DÉTENDEUR HP → MP</text>
      </g>
      <g class="ari-pressure ari-pressure-mp"><path d="M382 128h39v-58h68"/><path d="M421 128v70h68"/><circle cx="421" cy="128" r="7"/><text x="423" y="36">MOYENNE PRESSION</text><text class="ari-pressure-value" x="423" y="55">6–7 bar</text></g>
      <g class="ari-output ari-output-sad"><path class="ari-mini-mask" d="M482 61q30-14 58 0l-6 43-23 18-24-18z"/><path d="M493 74h36v24h-36z"/><text x="511" y="140">VERS SAD</text></g>
      <g class="ari-output ari-output-aux"><path d="M478 184h43l16 14-16 14h-43l-12-14zM488 184v28M515 184v28"/><text x="502" y="235">PRISE AUXILIAIRE</text></g>`);

    if (index === 4) return wrap('sad', `
      <g class="ari-smoke-blocked"><path d="M15 78q22-23 44 0t44 0M12 104q24-23 48 0t48 0M18 130q21-20 42 0t42 0"/><path class="ari-stop-wall" d="M118 55v101M105 68l26 26M131 68l-26 26"/><text x="14" y="155">FUMÉES</text><text class="ari-ok-text" x="92" y="176">BLOQUÉES</text></g>
      <g class="ari-primary-object ari-sad-mask-object">
        <path class="ari-mask-skirt" d="M245 50q80-31 157 0l27 36-10 111-51 52h-91l-53-52-9-111z"/>
        <path class="ari-mask-seal" d="M258 62q66-24 131 0l19 30-10 91-42 39h-66l-44-39-9-91z"/>
        <path class="ari-mask-visor" d="M271 76q53-18 105 0l15 21-13 73-35 23-38-23-48-73z"/>
        <path class="ari-positive-air" d="M309 158v-42M343 166v-55M374 157v-39" marker-end="url(#ari-arrow-sad)"/>
        <text class="ari-pressure-plus" x="342" y="104">PRESSION +</text>
        <g class="ari-sad-device"><path class="ari-mech-body" d="M150 91h50l17-19h49l27 30v61l-27 30h-49l-17-18h-50l-19-18v-48z"/><circle class="ari-diaphragm" cx="224" cy="132" r="45"/><circle class="ari-cap" cx="224" cy="132" r="19"/><path d="M269 113h36v38h-36"/><text class="ari-object-unit" x="224" y="137">SAD</text></g>
        <path class="ari-air-pipe" d="M224 8v76" marker-end="url(#ari-arrow-sad)"/><text class="ari-callout-title" x="224" y="20">AIR MP · 6–7 BAR</text>
      </g>
      <g class="ari-secondary ari-red-button"><circle cx="170" cy="232" r="19"/><circle cx="170" cy="232" r="11"/><path d="M181 215l22-25"/><text x="120" y="267">BOUTON ROUGE · COUPE DÉBIT</text></g>
      <g class="ari-secondary ari-bypass"><path d="M433 222h87M477 204v36M461 211l16-16 16 16"/><text x="472" y="260">BY-PASS ≥ 300 L/min</text></g>`);

    return wrap('facepiece', `
      <g class="ari-primary-object ari-facepiece-object">
        <path class="ari-mask-strap" d="M180 62 99 112l72 26M381 62l81 50-72 26M175 172l-70 47M386 172l69 47"/>
        <path class="ari-mask-skirt" d="M205 28q75-25 150 0l35 46-13 130-55 53h-84l-55-53-13-130z"/>
        <path class="ari-mask-seal" d="M218 43q62-20 124 0l27 38-12 110-45 43h-64l-45-43-12-110z"/>
        <path class="ari-mask-visor" d="M225 60q55-18 110 0l20 27-14 77-61 23-62-23-14-77z"/>
        <path class="ari-visor-shine" d="M232 75q46-14 91-2M241 91q30-10 57-8"/>
        <g class="ari-mask-valves"><circle cx="229" cy="192" r="13"/><path d="M221 192h16M229 184v16"/><circle cx="331" cy="192" r="13"/><path d="M323 192h16M331 184v16"/></g>
        <g class="ari-mask-port"><circle cx="280" cy="221" r="30"/><circle cx="280" cy="221" r="18"/><path d="M280 191v60M250 221h60"/></g>
      </g>
      <g class="ari-callout"><path d="M280 51V10H171"/><circle cx="280" cy="51" r="4"/><text x="106" y="14">GRANDE VISIÈRE · 96 %</text></g>
      <g class="ari-callout"><path d="M197 95H54"/><circle cx="197" cy="95" r="4"/><text x="24" y="85">JUPE DOUBLE</text><text x="24" y="101">ÉTANCHÉITÉ</text></g>
      <g class="ari-callout"><path d="M170 137H63"/><circle cx="170" cy="137" r="4"/><text x="23" y="160">BRIDES / FIXATION</text></g>
      <g class="ari-callout"><path d="M344 192h166"/><circle cx="344" cy="192" r="4"/><text x="424" y="181">SOUPAPES</text></g>
      <g class="ari-callout"><path d="M280 251v18h116"/><circle cx="280" cy="251" r="4"/><text x="401" y="273">RACCORD SAD</text></g>`);
  }

  function incidentHeroObject(raw, cx, cy, scale = 1){
    const [token, explicitLabel, tone = 'blue'] = raw.split('|');
    const label = explicitLabel || INC_LABELS[token] || token.toUpperCase();
    const people = ['person','rescuer','firefighter','driver','controller','specialist','person-danger'];
    const pairs = ['pair','pair-safe','team','people'];
    let shape = '';
    if (token.includes('fire') || token === 'burn' || token === 'explosion') shape = `
      <path class="hero-hot hero-flame-outer" d="M80 7c-7 35 28 44 5 80 2-29-19-33-18-57-51 47-61 103-25 132 28 23 84 7 88-38 3-31-13-52-33-76 2 30-13 39-22 51 8-38-17-58-20-92z"/>
      <path class="hero-flame-mid" d="M82 73c-5 26-29 35-24 62 5 28 48 28 54 2 5-22-11-35-18-53 1 18-7 25-12 32 4-20-4-31 0-43z"/><path class="hero-ground" d="M21 165h118"/>`;
    else if (token === 'smoke' || token === 'smoke-small' || token === 'air' || token === 'steam' || token === 'co2') shape = `
      <path class="hero-smoke" d="M12 134c-22-24 3-49 31-38-12-34 34-55 54-25 33-15 63 23 43 50 26 27-13 58-42 39-23 25-69 13-86-26z"/>
      <path class="hero-flow" d="M7 45q35-30 70 0t70 0M4 74q39-30 78 0t73 0"/>`;
    else if (['room','building','parking','structure','wall','edge'].includes(token)) shape = `
      <path class="hero-shell" d="M10 160V21h140v139M10 160h140M23 54h114M23 96h114M23 138h114"/>
      <path class="hero-detail" d="M28 37h27v17M76 37h27v17M110 37h20v17M31 111h35v49M82 110h46v28H82z"/><path class="hero-hot" d="M91 151c-17-13-4-31 8-43 0 11 7 14 6 24 8-6 11-13 10-21 13 18 7 38-24 40z"/>`;
    else if (token === 'door-open' || token === 'door-closed' || token === 'outside' || token === 'exit') shape = `
      <path class="hero-shell" d="M25 166V13h111v153M42 28h75v138H42z"/>
      ${token === 'door-closed' ? '<path class="hero-panel" d="M48 35h63v131H48z"/>' : '<path class="hero-panel" d="M48 35 102 53v98l-54 15z"/><circle class="hero-bolt" cx="91" cy="101" r="4"/>'}
      <path class="hero-flow" d="M2 66h42M5 101h39M2 136h42"/>`;
    else if (people.includes(token) || pairs.includes(token)) {
      const firefighter = (dx) => `<g transform="translate(${dx})"><path class="hero-helmet" d="M25 31q9-27 33 0v12H22V32zM18 43h46"/><path class="hero-visor" d="M30 43h24v20H30z"/><path class="hero-pack" d="M55 66h23v67H55z"/><path class="hero-body" d="M22 66h39l13 67H10z"/><path class="hero-detail" d="M29 66v67M53 66v67M15 105h53"/><path class="hero-limb" d="M19 72 2 118M62 73l19 42M25 132 15 169M55 132l12 37"/><path class="hero-boot" d="M4 169h25M52 169h27"/></g>`;
      shape = pairs.includes(token) ? `${firefighter(1)}${firefighter(79)}` : firefighter(39);
    } else if (token === 'fan' || token === 'fan-low') shape = `
      <circle class="hero-shell" cx="80" cy="79" r="68"/><circle class="hero-panel" cx="80" cy="79" r="51"/><circle class="hero-bolt" cx="80" cy="79" r="10"/>
      <path class="hero-blade" d="M80 69c3-47 34-45 38-23 3 17-14 27-38 33 43 17 27 44 6 38-16-5-16-25-6-38-31 35-51 9-34-7 12-11 27-3 34 7z"/><path class="hero-stand" d="M38 160h84M58 132l-13 28M102 132l13 28"/>`;
    else if (token.includes('ladder') || token === 'aerial' || token === 'stairs') shape = `
      <path class="hero-rail" d="M39 169 57 12M121 169 103 12"/>${[27,43,59,75,91,107,123,139,155].map(y=>`<path class="hero-rung" d="M${52-y*.08} ${y}h${56+y*.16}"/>`).join('')}
      ${token === 'ladder-hook' ? '<path class="hero-hook" d="M57 14Q31-9 18 16M103 14q26-23 39 2"/>' : ''}<path class="hero-boot" d="M24 169h40M96 169h40"/>`;
    else if (token === 'rope' || token === 'rope-guide' || token === 'cord' || token === 'anchor') shape = `
      <circle class="hero-rope" cx="78" cy="87" r="63"/><circle class="hero-rope" cx="78" cy="87" r="45"/><circle class="hero-rope" cx="78" cy="87" r="27"/><path class="hero-rope" d="M127 126q36 20 7 44M31 42 7 17M7 17h45"/>
      <path class="hero-knot" d="M48 80c23-36 60-5 40 20-20 26-54-4-31-26 22-20 50 15 29 33"/>`;
    else if (token === 'truck' || token === 'tanker' || token === 'van' || token === 'ambulance' || token === 'truck-forest' || token === 'car') shape = `
      <path class="hero-vehicle" d="M5 68h93v72H5zM98 85h35l23 55H98z"/><path class="hero-window" d="M108 91h21l13 31h-34z"/>
      <path class="hero-detail" d="M14 80h74v43H14zM23 88h18v27M49 88h30v27"/><circle class="hero-wheel" cx="35" cy="145" r="20"/><circle class="hero-wheel" cx="124" cy="145" r="20"/><circle class="hero-hub" cx="35" cy="145" r="7"/><circle class="hero-hub" cx="124" cy="145" r="7"/>
      ${token === 'truck-forest' ? '<path class="hero-water" d="M16 61q16-37 32 0M52 61q16-37 32 0M88 61q16-37 32 0"/>' : ''}`;
    else if (token === 'bottle' || token === 'tank' || token === 'hydrant' || token === 'dry-column') shape = `
      <path class="hero-shell" d="M49 26V14h62v12l17 22v101l-14 18H46l-14-18V48z"/><path class="hero-valve" d="M61 14V4h38v10M80 4v-8M99 9h26"/><path class="hero-water-fill" d="M38 94h84v51l-12 15H50l-12-15z"/><path class="hero-highlight" d="M51 48v91"/>`;
    else if (token === 'mask' || token === 'hood' || token === 'regulator') shape = token === 'regulator' ? `
      <path class="hero-mech" d="M13 60h26l17-24h51l17 24h25v61h-25l-17 24H56l-17-24H13z"/><circle class="hero-panel" cx="81" cy="90" r="51"/><circle class="hero-bolt" cx="81" cy="90" r="18"/><path class="hero-detail" d="M81 39v33M81 108v34M30 90h33M99 90h33"/>` : `
      <path class="hero-mask" d="M26 31q54-37 108 0l16 35-13 72-36 33H59l-36-33-13-72z"/><path class="hero-visor" d="M38 48q42-24 84 0l10 25-14 48-38 18-39-18-13-48z"/><circle class="hero-port" cx="80" cy="139" r="23"/><path class="hero-detail" d="M80 116v46M57 139h46"/>`;
    else if (token === 'gauge' || token === 'clock' || token === 'bodyguard' || token === 'panel' || token === 'map' || token === 'table') shape = `
      <rect class="hero-device" x="20" y="12" width="120" height="153" rx="18"/><rect class="hero-screen" x="34" y="30" width="92" height="53" rx="6"/><circle class="hero-dial" cx="80" cy="120" r="31"/><path class="hero-needle" d="M80 120 105 94"/><circle class="hero-bolt" cx="80" cy="120" r="6"/><circle class="hero-light" cx="43" cy="146" r="7"/><circle class="hero-light" cx="117" cy="146" r="7"/>`;
    else if (token === 'nozzle' || token === 'hose' || token === 'reel' || token === 'water-source' || token === 'spray') shape = `
      <path class="hero-hose" d="M5 145q38-83 74 0t74 0"/><path class="hero-nozzle" d="M25 59h74l27-22 25 20-31 31H25zM151 55l20-7v19l-20-8z"/><path class="hero-water" d="M166 58q-35 17-60 47M169 59q-24 35-46 66"/>`;
    else if (token === 'bag' || token.includes('bag-') || token === 'tarp' || token === 'harness') shape = `
      <path class="hero-bag" d="M18 49h124v116H18zM48 49V22h64v27M34 77h92M45 91l35 56 35-56M80 77v88"/><path class="hero-buckle" d="M67 115h26v24H67z"/>`;
    else if (token === 'battery' || token === 'power' || token === 'chain' || token === 'damage' || token === 'fall') shape = `
      <rect class="hero-device" x="17" y="28" width="126" height="126" rx="13"/><path class="hero-hot" d="M80 42 48 96h30l-12 48 49-70H84z"/><path class="hero-danger" d="M28 39 132 143M132 39 28 143"/>`;
    else shape = `<g transform="translate(10 12) scale(2)">${incidentToken(raw,0,0,1)}</g>`;
    return `<g class="inc-hero-object inc-hero-${esc(token)} inc-${esc(tone)}" transform="translate(${cx-80*scale} ${cy-87*scale}) scale(${scale})"><title>${esc(label)}</title>${shape}<text class="hero-label" x="80" y="184">${esc(label)}</text></g>`;
  }

  function drawIncidentIllustrated(modId, index, visual, aria){
    const spec = visual.scene;
    const kind = spec[0], tokens = spec[1].split(/,(?=[a-z][a-z-]*\|)/i), note = spec[2] || '';
    const key = `${modId}-${index}`;
    const fireModules = ['systeme-feu','phenomenes','extinction'];
    const stage = fireModules.includes(modId) ? 'fire-room' : modId === 'ventilation' ? 'ventilation' : ['sauvetage','milieu-vicie'].includes(modId) ? 'rescue' : modId === 'arico' ? 'ari-equipment' : modId === 'lspcc' ? 'rope-rescue' : modId === 'echelles' ? 'ladder-ground' : modId === 'parc' ? 'garage' : 'forest';
    const primaryOverrides = {
      arico: {1:'harness|DOSSARD ARI|blue',2:'gauge|SIFFLET HP|orange',6:'bodyguard|BODYGUARD|orange',7:'regulator|PRISE AUXILIAIRE|orange',8:'hood|CAGOULE|green',9:'rope|LIAISON|blue',10:'rope-guide|LIGNE GUIDE|orange',11:'rope|LIGNE DE VIE|blue',12:'gauge|AUTONOMIE|green',13:'lungs|RÉINSPIRATION|red',14:'damage|CONTRÔLE|red'},
      echelles: Object.fromEntries(Array.from({length:12},(_,i)=>[i, i === 0 ? 'ladder-hook|ÉCHELLE À CROCHETS|orange' : 'ladder|ÉCHELLE|blue'])),
      parc: {0:'parking|PARC DE STATIONNEMENT|grey',1:'stairs|ESCALIERS|blue',2:'panel|COFFRET VENTILATION|orange',3:'fan|DÉSENFUMAGE|blue',4:'hydrant|COLONNE SÈCHE|blue',5:'car|VÉHICULE|orange',6:'map|PLAN D’ACTION|blue',7:'battery|BATTERIE VE|red',8:'map|RECONNAISSANCE|blue'},
      'feux-foret': {0:'truck-forest|CCF|orange',1:'tank|RÉSERVES|blue',2:'truck-forest|CCF|orange',3:'truck-forest|AUTODÉFENSE|orange',4:'driver|CONDUCTEUR|blue',5:'truck-forest|REPLI|orange',6:'water-source|EAU NATURELLE|blue'}
    };
    const primary = primaryOverrides[modId]?.[index] || tokens[0];
    const secondary = tokens.filter((_,i)=>i>0).slice(0,5);
    const marker = `ill-arrow-${key}`;
    const defs = `<defs><linearGradient id="ill-metal-${key}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#26394e"/><stop offset=".55" stop-color="#101b29"/><stop offset="1" stop-color="#30465c"/></linearGradient><marker id="${marker}" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 8 4 0 8z" class="ill-arrow-head"/></marker></defs>`;
    const stageArt = {
      'fire-room': '<path class="ill-stage-shell" d="M34 240V28h492v212M34 240h492M52 74h456"/><path class="ill-stage-window" d="M407 92h82v68h-82zM448 92v68M407 126h82"/><path class="ill-stage-door" d="M61 105h74v135H61z"/>',
      ventilation: '<path class="ill-stage-shell" d="M116 238V31h407v207M116 238h407"/><path class="ill-stage-opening" d="M116 93H88M523 88h28"/><path class="ill-air-layer" d="M126 71h387M126 122h387M126 178h387"/>',
      rescue: '<path class="ill-stage-shell" d="M48 239V35h464v204M48 239h464M48 91h464M48 150h464"/><path class="ill-stairs" d="M61 224h41v-23h38v-23h39v-23h38v-23h39"/><path class="ill-stage-window" d="M348 52h125v72H348zM410 52v72"/>',
      'ari-equipment': '<path class="ill-tech-grid" d="M30 42h500M30 91h500M30 140h500M30 189h500M80 18v232M160 18v232M240 18v232M320 18v232M400 18v232M480 18v232"/><path class="ill-bench" d="M42 229h476M73 229v22M487 229v22"/>',
      'rope-rescue': '<path class="ill-anchor-beam" d="M36 33h488M74 33v28M486 33v28"/><path class="ill-cliff" d="M30 238h191V96h42v142M263 238h271"/><circle class="ill-anchor" cx="152" cy="53" r="13"/><path class="ill-void" d="M270 76h244v143H270z"/>',
      'ladder-ground': '<path class="ill-facade" d="M283 25h235v215H283zM302 51h82v64h-82zM418 51h80v64h-80zM302 141h82v72h-82zM418 141h80v72h-80z"/><path class="ill-ground" d="M23 241h514"/>',
      garage: '<path class="ill-garage" d="M25 240V32h510v208M25 240h510M25 98h510M25 164h510"/><path class="ill-ramp" d="M42 220 183 173M373 153l144-46"/><path class="ill-garage-bays" d="M59 48h103v35H59zM204 48h103v35H204zM350 48h145v35H350z"/>',
      forest: '<path class="ill-slope" d="M18 239q138-86 270-17t254-19"/><path class="ill-trees" d="M49 205v-61m0 0-27 38h54zm70 27v-89m0 0-34 47h68zm361 61v-78m0 0-31 43h62zM411 209v-55m0 0-24 35h48z"/><path class="ill-fireline" d="M20 235q17-45 34 0t34 0 34 0 34 0 34 0"/>'
    }[stage];
    const callouts = (items, positions) => items.map((token,i)=>{
      const [x,y] = positions[i] || positions[positions.length-1];
      return incidentToken(token,x-25,y-25,.7);
    }).join('');
    let content = '';
    if (kind === 'compare'){
      const cut = Math.ceil(tokens.length/2), right = tokens[cut] || tokens.at(-1);
      content = `<rect class="ill-compare-side ill-side-a" x="18" y="20" width="252" height="226" rx="16"/><rect class="ill-compare-side ill-side-b" x="290" y="20" width="252" height="226" rx="16"/>${incidentHeroObject(primary,145,124,.93)}${incidentHeroObject(right,415,124,.93)}<path class="ill-vs" d="M267 110h26M267 136h26" marker-end="url(#${marker})"/>`;
    } else if (kind === 'sequence' || kind === 'timeline'){
      const milestones = tokens.slice(1,5), ys = milestones.map((_,i)=>48+i*(175/Math.max(1,milestones.length-1)));
      content = `${stageArt}${incidentHeroObject(primary,145,136,1.05)}<path class="ill-process-rail" d="M310 35v205"/>${milestones.map((token,i)=>`<circle class="ill-process-dot" cx="310" cy="${ys[i]}" r="12"/><text class="ill-process-number" x="310" y="${ys[i]+4}">${i+1}</text><path class="ill-callout-line" d="M322 ${ys[i]}h54"/>${incidentToken(token,382,ys[i]-25,.68)}`).join('')}`;
    } else if (kind === 'flow'){
      const input=tokens[0], processor=tokens[1] || primary, outputs=tokens.slice(2,5), ys=outputs.map((_,i)=>70+i*(135/Math.max(1,outputs.length-1)));
      content = `${stageArt}${incidentHeroObject(processor,270,132,1.08)}${incidentToken(input,18,102,.92)}<path class="ill-flow-pipe" d="M98 137h91" marker-end="url(#${marker})"/>${outputs.map((token,i)=>`<path class="ill-flow-pipe" d="M350 132Q406 132 419 ${ys[i]}" marker-end="url(#${marker})"/>${incidentToken(token,454,ys[i]-28,.78)}`).join('')}`;
    } else {
      const heroScale = stage === 'ladder-ground' ? 1.22 : stage === 'forest' ? 1.25 : 1.08;
      const heroX = ['ladder-ground','forest'].includes(stage) ? 188 : 252;
      const positions = [[435,48],[466,122],[432,204],[76,55],[72,190]];
      content = `${stageArt}${incidentHeroObject(primary,heroX,135,heroScale)}<g class="ill-callouts">${secondary.map((_,i)=>`<path d="M${heroX+(i%2?55:-55)} ${95+i*20}Q${i<3?360:145} ${positions[i][1]} ${positions[i][0]} ${positions[i][1]}"/>`).join('')}</g>${callouts(secondary,positions)}`;
    }
    return `<div class="kp-tech-diagram kp-course-diagram inc-illustrated inc-illustrated-${stage} inc-layout-${kind}" data-composition="illustrated-${kind}"><svg class="kp-tech-svg kp-course-svg inc-illustrated-svg" viewBox="0 0 560 280" role="img" aria-label="${esc(aria || '')}">${defs}<rect class="ill-blueprint" x="2" y="2" width="556" height="276" rx="18"/>${content}${note ? courseLabel(280,270,note,'orange') : ''}</svg></div>`;
  }

  function drawIncidentCourse(visual){
    const spec = visual.scene;
    const kind = spec[0], tokens = spec[1].split(/,(?=[a-z][a-z-]*\|)/i), note = spec[2] || '';
    const place = (token, cx, cy, scale = 1) => incidentToken(token, cx - 35 * scale, cy - 35 * scale, scale);
    let content = '';
    if (kind === 'orbit' || kind === 'network' || kind === 'cutaway'){
      const rest = tokens.slice(1), cx = 280, cy = 110;
      const radiusX = kind === 'cutaway' ? 205 : 215, radiusY = kind === 'cutaway' ? 76 : 82;
      content = `<circle class="inc-central-halo" cx="${cx}" cy="${cy}" r="57"/><g class="inc-links">${rest.map((_,i)=>{const a=-Math.PI/2+i*Math.PI*2/rest.length;return `<path d="M${cx} ${cy}Q${cx+Math.cos(a)*115} ${cy+Math.sin(a)*45} ${cx+Math.cos(a)*radiusX} ${cy+Math.sin(a)*radiusY}"/>`;}).join('')}</g>${place(tokens[0],cx,cy,1.2)}${rest.map((token,i)=>{const a=-Math.PI/2+i*Math.PI*2/rest.length;return place(token,cx+Math.cos(a)*radiusX,cy+Math.sin(a)*radiusY,.72);}).join('')}`;
    } else if (kind === 'scene'){
      const rest = tokens.slice(1);
      const positions = [[105,55],[455,55],[95,145],[465,145],[280,35],[280,165]];
      content = `<path class="inc-scene-frame" d="M18 187V18h524v169M18 187h524"/><path class="inc-scene-floor" d="M40 170h480M80 170l-24 17M480 170l24 17"/><circle class="inc-central-halo" cx="280" cy="112" r="62"/>${place(tokens[0],280,108,1.22)}<g class="inc-links">${rest.map((_,i)=>`<path d="M280 108L${positions[i][0]} ${positions[i][1]}"/>`).join('')}</g>${rest.map((token,i)=>place(token,positions[i][0],positions[i][1],.7)).join('')}`;
    } else if (kind === 'stack'){
      content = `<path class="inc-stack-room" d="M95 15h370v180H95z"/>${tokens.map((token,i)=>incidentToken(token,245,130-i*58,.82)).join('')}${courseArrow(360,175,360,35,'orange')}`;
    } else if (kind === 'compare'){
      const cut = Math.ceil(tokens.length / 2), left = tokens.slice(0,cut), right = tokens.slice(cut);
      const panel = (items, cx, tone) => {
        const rest = items.slice(1);
        const restX = rest.length > 1 ? [cx-58,cx+58] : [cx];
        return `<rect class="inc-compare-panel inc-compare-${tone}" x="${cx-122}" y="18" width="244" height="174" rx="18"/><circle class="inc-central-halo" cx="${cx}" cy="70" r="47"/>${place(items[0],cx,66,1)}<g class="inc-links">${rest.map((_,i)=>`<path d="M${cx} 82Q${cx} 112 ${restX[i]} 142"/>`).join('')}</g>${rest.map((token,i)=>place(token,restX[i],145,.7)).join('')}`;
      };
      content = `${panel(left,140,'a')}${panel(right,420,'b')}<g class="inc-compare-vs"><circle cx="280" cy="104" r="20"/><text x="280" y="109">⇄</text></g>`;
    } else if (kind === 'flow'){
      const n = tokens.length;
      if (n === 3){
        content = `<path class="inc-system-frame" d="M170 35h220v145H170z"/>${place(tokens[0],72,105,.9)}${place(tokens[1],280,103,1.12)}${place(tokens[2],488,105,.9)}<path class="inc-system-flow" d="M112 105C165 105 190 70 230 90M330 90c40-20 65 15 118 15"/>${courseArrow(115,105,222,94,'blue')}${courseArrow(338,94,445,105,'green')}`;
      } else if (n === 4){
        content = `${place(tokens[0],65,108,.88)}${place(tokens[1],250,55,.82)}${place(tokens[2],250,155,.82)}${place(tokens[3],490,108,.9)}<g class="inc-system-flow"><path d="M105 108C155 108 165 55 210 55M105 108c50 0 60 47 105 47M290 55c65 0 75 53 158 53M290 155c65 0 75-47 158-47"/></g><circle class="inc-junction" cx="150" cy="108" r="5"/><circle class="inc-junction" cx="390" cy="108" r="5"/>`;
      } else {
        const outputs = tokens.slice(2), ys = outputs.length === 3 ? [40,108,176] : outputs.map((_,i)=>48+i*58);
        content = `${place(tokens[0],60,108,.84)}${place(tokens[1],230,108,1.05)}<circle class="inc-central-halo" cx="230" cy="108" r="53"/><g class="inc-system-flow"><path d="M100 108C145 108 160 108 185 108"/>${outputs.map((_,i)=>`<path d="M275 108Q345 108 395 ${ys[i]}"/>`).join('')}</g>${outputs.map((token,i)=>place(token,450,ys[i],.7)).join('')}`;
      }
    } else if (kind === 'sequence'){
      const n = tokens.length, gap = n > 1 ? 430/(n-1) : 0;
      const positions = tokens.map((_,i)=>[65+i*gap, i%2 ? 142 : 58]);
      content = `<path class="inc-process-path" d="${positions.map((p,i)=>`${i?'L':'M'}${p[0]} ${p[1]}`).join(' ')}"/>${tokens.map((token,i)=>{const [x,y]=positions[i];return `<g class="inc-process-step"><circle cx="${x-31}" cy="${y-31}" r="13"/><text x="${x-31}" y="${y-27}">${i+1}</text></g>${place(token,x,y,n>5?.64:.76)}`;}).join('')}`;
    } else if (kind === 'timeline'){
      const n = tokens.length, gap = n > 1 ? 154/(n-1) : 0;
      content = `<path class="inc-timeline-rail" d="M82 25V188"/>${tokens.map((token,i)=>{const y=28+i*gap, x=i%2?370:205;return `<circle class="inc-timeline-dot" cx="82" cy="${y}" r="9"/><text class="inc-step-text" x="82" y="${y+3}">${i+1}</text><path class="inc-timeline-link" d="M91 ${y}H${x-35}"/>${place(token,x,y,.62)}`;}).join('')}`;
    } else if (kind === 'threshold'){
      const rest=tokens.slice(1);
      content = `<path class="inc-threshold-arc" d="M105 154A120 120 0 01345 154"/><path class="inc-threshold-needle" d="M225 154 304 76"/><circle class="inc-threshold-hub" cx="225" cy="154" r="10"/>${place(tokens[0],225,92,1.18)}<g class="inc-links">${rest.map((_,i)=>`<path d="M330 105Q370 ${65+i*90} 415 ${65+i*90}"/>`).join('')}</g>${rest.map((token,i)=>place(token,465,65+i*90,.78)).join('')}`;
    } else {
      content = tokens.map((token,i)=>place(token,80+i*(400/Math.max(1,tokens.length-1)),105,.82)).join('');
    }
    return `<div class="kp-tech-diagram kp-course-diagram inc-composition-${kind}" data-composition="${esc(kind)}"><svg class="kp-tech-svg kp-course-svg" viewBox="0 0 560 230" role="img" aria-label="${esc(visual.aria || '')}">${content}${note ? courseLabel(280,220,note,'orange') : ''}</svg></div>`;
  }

  function renderKeypointVisual(k, index, mod){
    const incidentScene = INCIDENT_SCENES[mod.id]?.[index];
    const visual = k.visual || (incidentScene ? { type:'incident-course', layout:'half', scene:incidentScene, aria:k.t } : {});
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

    if (type === 'incident-course' && mod.id === 'arico' && [0, 3, 4, 5].includes(index)) diagram = drawARISpecial(index, k.t);
    else if (type === 'incident-course') diagram = drawIncidentIllustrated(mod.id, index, visual, k.t);
    else if (type.endsWith('-course')) diagram = drawCourseVisual(type, visual);
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

    const sceneKey = `${mod.id}:${index}`;
    return `<article class="kp-visual visual-keypoint kp-type-${type} kp-layout-${layout}"
      data-domain="${esc(mod.domain || '')}" data-module="${esc(mod.id)}"
      data-keypoint-index="${index}" data-scene-key="${esc(sceneKey)}">
      <button class="kp-toggle" type="button" aria-expanded="false" aria-controls="${detailId}">
        <span class="kp-top"><span class="kp-symbol" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span class="kp-title">${esc(k.t)}</span></span>
        <span class="visual-keypoint-scene">${diagram}</span>
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
    body.dataset.renderedModule = mod.id;
    body.dataset.expectedVisualKeypoints = String((mod.keypoints || []).length);
    body.dataset.renderedVisualKeypoints = String(body.querySelectorAll('.visual-keypoint').length);
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
