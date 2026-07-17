/* ============================================================
   progress.js — profils locaux (nom + PIN), maîtrise, répétition espacée
   Tout est stocké en localStorage sur l'appareil (aucun serveur).
   ============================================================ */

const Progress = (() => {
  const KEY_PROFILES = 'sp33_profiles';
  const KEY_CURRENT  = 'sp33_current';
  const KEY_PROG     = 'sp33_prog_';   // + nom du profil

  let current  = null;   // nom du profil connecté
  let progress = {};     // { moduleId: {mastery, last, attempts} }

  /* ----- profils ----- */
  function getProfiles(){
    try{ return JSON.parse(localStorage.getItem(KEY_PROFILES) || '[]'); }
    catch(e){ return []; }
  }
  function saveProfiles(p){ localStorage.setItem(KEY_PROFILES, JSON.stringify(p)); }

  function login(name, pin, createNew){
    name = (name || '').trim();
    if (!name) return { error: 'Entrez un nom.' };
    if (!/^\d{4}$/.test(pin)) return { error: 'Le code PIN doit faire 4 chiffres.' };
    const profiles = getProfiles();
    const existing = profiles.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (createNew || !existing){
      if (existing) return { error: 'Ce profil existe déjà — connectez-vous.' };
      if (profiles.length >= 10) return { error: 'Maximum 10 profils atteint.' };
      profiles.push({ name, pin });
      saveProfiles(profiles);
    } else if (existing.pin !== pin){
      return { error: 'Code PIN incorrect.' };
    }
    current = name;
    localStorage.setItem(KEY_CURRENT, name);
    loadProgress();
    return { ok: true };
  }

  function restore(){
    const name = localStorage.getItem(KEY_CURRENT);
    if (name && getProfiles().some(p => p.name === name)){
      current = name;
      loadProgress();
      return true;
    }
    return false;
  }

  function logout(){
    current = null; progress = {};
    localStorage.removeItem(KEY_CURRENT);
  }

  /* ----- progression ----- */
  function loadProgress(){
    try{ progress = JSON.parse(localStorage.getItem(KEY_PROG + current) || '{}'); }
    catch(e){ progress = {}; }
  }
  function saveProgress(){
    if (current) localStorage.setItem(KEY_PROG + current, JSON.stringify(progress));
  }

  function get(id){ return progress[id] || { mastery: 0, last: 0, attempts: 0 }; }

  /* Met à jour la maîtrise après un exercice (QCM ou schéma à blanc).
     Pondération : 40 % ancien score, 60 % nouveau — récompense la constance. */
  function record(id, scorePct){
    const old = get(id);
    const mastery = Math.round((old.mastery || 0) * 0.4 + scorePct * 0.6);
    progress[id] = { mastery, last: Date.now(), attempts: (old.attempts || 0) + 1 };
    saveProgress();
    return mastery;
  }

  function daysSince(ts){
    if (!ts) return null;
    return Math.floor((Date.now() - ts) / 86400000);
  }

  /* Priorité de révision espacée : jamais vu > ancien + faible maîtrise */
  function priority(id){
    const p = get(id);
    if (!p.last) return 10000;
    return (100 - p.mastery) + daysSince(p.last) * 8;
  }

  function masteryColor(m){
    if (m >= 75) return 'var(--ok)';
    if (m >= 40) return 'var(--orange)';
    return 'var(--red-hi)';
  }
  function masteryBadge(m){
    if (m >= 75) return 'badge-ok';
    if (m >= 40) return 'badge-warn';
    return 'badge-bad';
  }

  function reviewLabel(id){
    const p = get(id);
    if (!p.last) return 'Jamais révisé';
    const d = daysSince(p.last);
    if (d === 0) return "Révisé aujourd'hui";
    if (d === 1) return 'Révisé hier';
    return 'Révisé il y a ' + d + ' j';
  }

  /* ----- méta : XP, streak, cartes (rappel espacé SM-2 simplifié) ----- */
  function meta(){
    if (!progress._meta) progress._meta = { xp: 0, days: [], cards: {} };
    return progress._meta;
  }
  const today = () => new Date().toISOString().slice(0, 10);

  function addXP(n){
    const m = meta();
    m.xp += n;
    touchDay();
    saveProgress();
    return m.xp;
  }

  /* Grades pompier : [seuil XP, libellé] */
  const GRADES = [[0,'Sapeur 2ᵉ classe'],[100,'Sapeur 1ʳᵉ classe'],[250,'Caporal'],[450,'Caporal-chef'],[700,'Sergent'],[1000,'Sergent-chef'],[1400,'Adjudant'],[1900,'Adjudant-chef'],[2500,'Lieutenant'],[3200,'Capitaine']];
  function level(){
    const xp = meta().xp;
    let i = 0;
    while (i + 1 < GRADES.length && xp >= GRADES[i + 1][0]) i++;
    const next = GRADES[i + 1];
    return { n: i + 1, grade: GRADES[i][1], xp,
      pct: next ? Math.round((xp - GRADES[i][0]) / (next[0] - GRADES[i][0]) * 100) : 100,
      nextAt: next ? next[0] : null };
  }

  /* streak : jours consécutifs d'activité */
  function touchDay(){
    const m = meta();
    if (!m.days.includes(today())){ m.days.push(today()); m.days = m.days.slice(-60); saveProgress(); }
  }
  function streak(){
    const days = new Set(meta().days);
    let n = 0;
    const d = new Date();
    if (!days.has(today())) d.setDate(d.getDate() - 1); // la série tient jusqu'à hier
    while (days.has(d.toISOString().slice(0, 10))){ n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  /* prochaine révision d'un module : date exacte + statut couleur */
  function intervalOf(mastery){ return mastery >= 75 ? 7 : mastery >= 40 ? 3 : 1; }
  function dueInfo(id){
    const p = get(id);
    const fmt = ts => new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    if (!p.last) return { status: 'bad', label: 'jamais révisé — à faire', due: 0 };
    const due = p.last + intervalOf(p.mastery) * 86400000;
    const today0 = new Date(); today0.setHours(0,0,0,0);
    if (due < today0.getTime()) return { status: 'bad', label: 'en retard — prévu le ' + fmt(due), due };
    if (due < today0.getTime() + 86400000) return { status: 'warn', label: "à revoir aujourd'hui", due };
    return { status: 'ok', label: 'à revoir le ' + fmt(due), due };
  }

  /* cartes flashcard : état SM-2 simplifié par carte */
  function cardState(key){ return meta().cards[key] || { interval: 0, due: 0 }; }
  function rateCard(key, rating){ /* rating: 0 difficile, 1 bien, 2 facile */
    const c = cardState(key);
    c.interval = rating === 0 ? 1 : rating === 1 ? Math.max(2, c.interval * 2) : Math.max(4, c.interval * 3);
    c.due = Date.now() + c.interval * 86400000;
    meta().cards[key] = c;
    addXP([1, 3, 5][rating]);
  }

  return {
    getProfiles, login, restore, logout,
    get, record, priority, daysSince,
    masteryColor, masteryBadge, reviewLabel,
    addXP, level, touchDay, streak, dueInfo, cardState, rateCard,
    get current(){ return current; },
  };
})();
