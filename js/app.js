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
    const p = Progress.get(id).mastery || 0;
    const pcolor = Progress.masteryColor(p);
    const hasQuiz = quizOf(id).length > 0;
    const views = mod.views || (mod.schema ? [{ schema: mod.schema, elements: mod.elements || [] }] : []);
    const hasSchema = views.some(v => Schema.has(v.schema) && (v.elements || []).length > 0);

    const view = $('#view');
    view.innerHTML = `
      <div class="mod-head">
        <div class="mod-domain"><span class="nav-dot" style="background:${d.color}"></span>${esc(d.title)}</div>
        <h1 class="mod-title">${esc(mod.title)}</h1>
        <div class="mod-tagline">${esc(mod.tag || '')}</div>
        <div class="mod-tags">${(mod.tags || []).map(t => `<span class="tag">#${esc(t)}</span>`).join('')}</div>
        ${isFull(mod) ? `<div class="mod-progress-line">
          <div class="pbar"><div style="width:${p}%; background:${pcolor}"></div></div>
          <span class="pbar-pct" style="color:${pcolor}">${p > 0 ? p + '%' : '—'}</span>
          <span style="font-size:11px; color:var(--mut-2);">${Progress.reviewLabel(id)}</span>
        </div>` : ''}
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

  /* corps de fiche : points clés + sections de faits + éléments */
  function renderModuleBody(mod){
    const body = $('#mod-body');
    let html = '';

    if ((mod.keypoints || []).length){
      html += `<div class="section-block"><div class="section-title">Points clés</div>
        <div class="keypoints">${mod.keypoints.map(k =>
          `<div class="keypoint"><div class="keypoint-bar"></div><div><b>${esc(k.t)}</b><p>${esc(k.d)}</p></div></div>`).join('')}
        </div></div>`;
    }

    (mod.sections || []).forEach(sec => {
      html += `<div class="section-block"><div class="section-title">${esc(sec.title)}</div>
        <div class="keypoints">${(sec.facts || []).map(f =>
          `<div class="keypoint"><div class="keypoint-bar" style="background:${sec.color || 'var(--cyan)'}"></div><div><b>${esc(f.t)}</b><p>${esc(f.d)}</p></div></div>`).join('')}
        </div></div>`;
    });

    body.innerHTML = html;
  }

  /* ============================================================
     SCHÉMA INTERACTIF : fiche / à blanc / guidé
     ============================================================ */
  function mountSchema(mod, mode, viewIdx = 0){
    const zone = $('#mod-interactive');
    zone.innerHTML = '';
    /* plusieurs vues possibles (ex. FPT GIMAEX : tableau arrière + écran cabine) */
    const views = mod.views || [{ schema: mod.schema, label: null, elements: mod.elements || [] }];
    const view = views[viewIdx] || views[0];
    const els = view.elements || [];
    const scenarios = view.scenarios || mod.scenarios;
    const isEx = mode === 'drill' || mode === 'ident';
    const isGimaexRear = view.schema === 'gimaex-tableau';
    const isFreeTest = mode === 'test';

    if (views.length > 1){
      const tabs = document.createElement('div');
      tabs.className = 'scenario-bar';
      tabs.innerHTML = views.map((v, i) =>
        `<button class="scenario-btn ${i === viewIdx ? 'active':''}" data-v="${i}"><span class="dot"></span>${esc(v.label || 'Vue ' + (i + 1))}</button>`).join('');
      zone.appendChild(tabs);
      tabs.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => {
        const nextIdx = +b.dataset.v;
        const nextView = views[nextIdx] || views[0];
        const nextMode = (mode === 'operate' || mode === 'test') && nextView.schema !== 'gimaex-tableau'
          ? 'fiche'
          : mode;
        mountSchema(mod, nextMode, nextIdx);
      }));
    }

    /* Le pupitre arrière sépare clairement repérage, manipulation et test libre. */
    if (isGimaexRear && !isEx){
      const modeBar = document.createElement('div');
      modeBar.className = 'scenario-bar gx-mode-bar';
      modeBar.innerHTML = '<span class="gx-mode-label">Mode du pupitre</span>' +
        [
          ['fiche', 'Repérage'],
          ['operate', 'Fonctionnement'],
          ['test', 'Test libre']
        ].map(([key, label]) =>
          `<button class="scenario-btn ${mode === key ? 'active' : ''}" data-mode="${key}"><span class="dot"></span>${label}</button>`
        ).join('');
      zone.appendChild(modeBar);
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
      scenarioBar.className = 'scenario-bar';
      scenarioBar.innerHTML = '<span style="font-size:11px;color:var(--mut-2);text-transform:uppercase;letter-spacing:.5px;">Scénario</span>' +
        Object.entries(scenarios).map(([k, s]) =>
          `<button class="scenario-btn ${k === scenario ? 'active':''}" data-s="${k}"><span class="dot"></span>${esc(s.label)}</button>`).join('');
      zone.appendChild(scenarioBar);
    }

    /* panneau guidé */
    const guidePanel = document.createElement('div');
    /* barre d'exercice */
    const drillBar = document.createElement('div');

    if (mode === 'guide' && mod.guide){ zone.appendChild(guidePanel); }
    if (isEx){ zone.appendChild(drillBar); }

    const schemaBox = document.createElement('div');
    const schemaClass = String(view.schema || 'unknown').toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    schemaBox.className = `schema-box schema-box-${schemaClass}`;
    zone.appendChild(schemaBox);

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

    /* détail d'élément (mode fiche) */
    const detail = document.createElement('div');
    zone.appendChild(detail);

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
      if (!el){ detail.innerHTML = ''; return; }
      const st = elState(id);
      detail.innerHTML = `<div class="element-detail">
        <div class="ed-head"><span class="ed-num">${el.n}</span><span class="ed-label">${esc(el.label)}</span>
        ${st ? `<span class="badge ${st.cls} ed-state">${st.label}</span>` : ''}</div>
        <div class="ed-role">${esc(el.role)}</div></div>`;
    }

    if (scenarioBar){
      scenarioBar.querySelectorAll('.scenario-btn').forEach(b => b.addEventListener('click', () => {
        scenario = b.dataset.s;
        scenarioBar.querySelectorAll('.scenario-btn').forEach(x => x.classList.toggle('active', x === b));
        handle.setScenario(scenario);
        detail.innerHTML = ''; handle.setSelected(null);
        chips.querySelectorAll('.element-chip').forEach(c => c.classList.remove('sel'));
      }));
    }

    /* ----- exercice « à blanc » : placer les éléments de mémoire ----- */
    function startDrill(){
      const ids = els.map(e => e.id);
      for (let i = ids.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
      drill = { queue: ids, idx: 0, correct: 0, wrong: 0, found: {} };
      handle.reset(); detail.innerHTML = '';
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
