/* ============================================================
   quiz.js — moteur QCM
   Questions en JSON (data/quiz.json), correction immédiate avec
   explication, score final, récapitulatif des erreurs et
   possibilité de rejouer uniquement les questions ratées.
   ============================================================ */

const Quiz = (() => {

  /* Mélange (copie) un tableau */
  function shuffle(arr){
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* Lance un QCM dans `container`.
     questions : [{q, choices[], answer, explain}]
     opts : { timer:bool, onFinish(scorePct), title } */
  function start(container, questions, opts = {}){
    const qs = shuffle(questions);
    let idx = 0, correct = 0;
    const failed = [];          // questions ratées (pour rejouer)
    let timerInt = null, seconds = 0;

    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'quiz-wrap';
    container.appendChild(wrap);

    if (opts.timer){
      timerInt = setInterval(() => {
        seconds++;
        const t = wrap.querySelector('.quiz-timer');
        if (t) t.textContent = fmtTime(seconds);
      }, 1000);
    }

    function fmtTime(s){
      return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
    }

    function renderQuestion(){
      const q = qs[idx];
      wrap.innerHTML = `
        <div class="quiz-head">
          <div class="quiz-count">Question ${idx+1} / ${qs.length} · <span style="color:var(--ok)">✓ ${correct}</span> <span style="color:var(--red-hi)">✗ ${failed.length}</span></div>
          ${opts.timer ? `<div class="quiz-timer">${fmtTime(seconds)}</div>` : ''}
        </div>
        <div class="quiz-q">${q.q}</div>
        <div class="quiz-choices"></div>
        <div class="quiz-after"></div>`;
      const choicesEl = wrap.querySelector('.quiz-choices');
      const letters = ['A','B','C','D','E'];

      /* on mélange l'ordre des réponses en gardant la bonne trace */
      const order = shuffle(q.choices.map((c, i) => i));
      order.forEach((origIdx, pos) => {
        const b = document.createElement('button');
        b.className = 'quiz-choice';
        b.innerHTML = `<span class="qc-letter">${letters[pos]}</span><span>${q.choices[origIdx]}</span>`;
        b.addEventListener('click', () => answer(origIdx, b));
        choicesEl.appendChild(b);
      });

      function answer(origIdx, btn){
        const good = origIdx === q.answer;
        /* verrouille tout, colore la bonne et l'éventuelle mauvaise */
        [...choicesEl.children].forEach((c, pos) => {
          c.disabled = true;
          if (order[pos] === q.answer) c.classList.add('correct');
        });
        if (good) correct++;
        else { btn.classList.add('wrong'); failed.push(q); }

        const after = wrap.querySelector('.quiz-after');
        after.innerHTML = `
          ${q.explain ? `<div class="quiz-explain"><b>${good ? '✓ Exact.' : '✗ Raté.'}</b> ${q.explain}</div>` : ''}
          <button class="btn btn-orange quiz-next">${idx + 1 < qs.length ? 'Question suivante ›' : 'Voir le résultat'}</button>`;
        after.querySelector('.quiz-next').addEventListener('click', next);
      }
    }

    function next(){
      idx++;
      if (idx < qs.length) renderQuestion();
      else renderResult();
    }

    function renderResult(){
      if (timerInt) clearInterval(timerInt);
      const pct = Math.round((correct / qs.length) * 100);
      const verdict = pct >= 75 ? 'Maîtrisé' : pct >= 40 ? 'À consolider' : 'À retravailler';
      const color = pct >= 75 ? 'var(--ok)' : pct >= 40 ? 'var(--orange)' : 'var(--red-hi)';

      let recap = '';
      if (failed.length){
        recap = `<div class="quiz-recap">
          <div class="section-title">Récapitulatif des erreurs (${failed.length})</div>
          ${failed.map(f => `<div class="quiz-recap-item"><b>${f.q}</b><span>→ ${f.choices[f.answer]}</span></div>`).join('')}
        </div>`;
      }

      wrap.innerHTML = `
        <div class="card" style="text-align:center; padding:26px;">
          <div class="card-title">Résultat${opts.timer ? ' · ' + fmtTime(seconds) : ''}</div>
          <div class="quiz-score-big" style="color:${color}">${pct}%</div>
          <div style="font-family:var(--disp); font-weight:600; margin-top:4px;">${verdict}</div>
          <div style="font-size:12.5px; color:var(--mut); margin-top:6px;">${correct} bonne(s) réponse(s) sur ${qs.length}</div>
          <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-top:18px;">
            ${failed.length ? '<button class="btn btn-red" id="qz-replay-failed">Rejouer les ' + failed.length + ' ratées</button>' : ''}
            <button class="btn btn-panel" id="qz-replay-all">Tout rejouer</button>
          </div>
        </div>
        ${recap}`;

      if (opts.onFinish) opts.onFinish(pct);

      const rf = wrap.querySelector('#qz-replay-failed');
      if (rf) rf.addEventListener('click', () => start(container, failed, opts));
      wrap.querySelector('#qz-replay-all').addEventListener('click', () => start(container, questions, opts));
    }

    renderQuestion();
    return { stop: () => { if (timerInt) clearInterval(timerInt); } };
  }

  return { start };
})();
