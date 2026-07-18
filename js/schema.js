/* ============================================================
   schema.js — schémas interactifs vanilla (SVG + points chauds)
   Portage des schémas SARCE : environnement de la pompe (scénarios,
   flux animés, mise en œuvre guidée), et schémas d'appui des autres
   modules « engins-pompe ».
   ============================================================ */

const Schema = (() => {

  /* Marqueurs / dégradés communs (réutilisés par le schéma env) */
  const ENV_DEFS = `
    <defs>
      <marker id="agr" markerUnits="userSpaceOnUse" markerWidth="22" markerHeight="22" refX="13" refY="11" orient="auto"><path d="M0 1 L22 11 L0 21 Z" fill="#27ae60"/></marker>
      <marker id="ard" markerUnits="userSpaceOnUse" markerWidth="22" markerHeight="22" refX="13" refY="11" orient="auto"><path d="M0 1 L22 11 L0 21 Z" fill="#e74c3c"/></marker>
      <marker id="aam" markerUnits="userSpaceOnUse" markerWidth="20" markerHeight="20" refX="12" refY="10" orient="auto"><path d="M0 1 L20 10 L0 19 Z" fill="#e67e22"/></marker>
      <marker id="abl" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="7" refY="7" orient="auto"><path d="M0 1 L14 7 L0 13 Z" fill="#4B8FE0"/></marker>
      <linearGradient id="watr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#39597c"/><stop offset="1" stop-color="#213b52"/></linearGradient>
      <radialGradient id="pumpG" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#4a5474"/><stop offset="55%" stop-color="#232342"/><stop offset="100%" stop-color="#141428"/></radialGradient>
      <radialGradient id="valG" cx="35%" cy="28%" r="85%"><stop offset="0" stop-color="#5a6488"/><stop offset="100%" stop-color="#1a1a32"/></radialGradient>
      <linearGradient id="tankBody" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#20203c"/><stop offset="100%" stop-color="#101024"/></linearGradient>
      <linearGradient id="engG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#32324f"/><stop offset="100%" stop-color="#181830"/></linearGradient>
      <filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="7" stdDeviation="11" flood-color="#000" flood-opacity="0.5"/></filter>
      <linearGradient id="smokeG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4a62"/><stop offset="1" stop-color="#4a4a62" stop-opacity="0"/></linearGradient>
      <radialGradient id="flameG" cx="50%" cy="85%" r="85%"><stop offset="0" stop-color="#ffd166"/><stop offset="45%" stop-color="#e67e22"/><stop offset="100%" stop-color="#c0392b"/></radialGradient>
      <linearGradient id="redP" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c74a3a"/><stop offset="100%" stop-color="#7e2418"/></linearGradient>
      <linearGradient id="ariY" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e8c33a"/><stop offset="45%" stop-color="#b8922a"/><stop offset="100%" stop-color="#8a6a1a"/></linearGradient>
    </defs>`;

  const FLOW = 'fill="none" stroke-linecap="round" stroke-dasharray="16 22" style="animation:flowdash .8s linear infinite;"';

  /* --- Schéma « environnement de la pompe » (vue hydraulique de l'engin) --- */
  const ENV_SVG = `
  <svg viewBox="0 0 1000 900">
    ${ENV_DEFS}
    <!-- compartiment arrière inspiré du coffre réel : cadre pompier, rails et sol aluminium -->
    <rect x="12" y="12" width="976" height="876" rx="24" fill="#070b0f" stroke="#26333c" stroke-width="4"/>
    <rect x="26" y="26" width="948" height="848" rx="18" fill="none" stroke="url(#redP)" stroke-width="22" filter="url(#soft)"/>
    <path d="M48 64H952M48 842H952" stroke="#79848a" stroke-width="10"/>
    <path d="M52 78H948M52 828H948" stroke="#252d32" stroke-width="4"/>
    <g opacity=".32" stroke="#b6bdc0" stroke-width="2">
      ${Array.from({length:16},(_,i)=>`<path d="M${70+i*56} 42l-22 22M${70+i*56} 838l-22 22"/>`).join('')}
    </g>
    <text x="60" y="112" fill="#89979f" font-family="IBM Plex Mono" font-size="15">COMPARTIMENT POMPE · VUE OPÉRATEUR</text>
    <!-- tuyauteries -->
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <g stroke="#101020" stroke-width="26">
        <path d="M470 390 V690 H726"/><path d="M620 872 V690 H726"/><path d="M790 626 V610"/>
        <path d="M300 610 H900"/><path d="M340 610 V800"/><path d="M440 610 V800"/><path d="M540 610 V800"/>
        <path d="M300 610 V240 H236"/><path d="M900 610 V150 H742"/>
      </g>
      <g stroke="#41416a" stroke-width="15">
        <path d="M470 390 V690 H726"/><path d="M620 872 V690 H726"/><path d="M790 626 V610"/>
        <path d="M300 610 H900"/><path d="M340 610 V800"/><path d="M440 610 V800"/><path d="M540 610 V800"/>
        <path d="M300 610 V240 H236"/><path d="M900 610 V150 H742"/>
      </g>
    </g>
    <!-- tonne -->
    <ellipse cx="552" cy="398" rx="205" ry="14" fill="#000" opacity="0.32"/>
    <rect x="360" y="90" width="380" height="300" rx="12" fill="url(#tankBody)" stroke="#5a6488" stroke-width="4" filter="url(#soft)"/>
    <clipPath id="tankclip"><rect x="366" y="96" width="368" height="288" rx="7"/></clipPath>
    <g clip-path="url(#tankclip)">
      <rect x="360" y="150" width="380" height="240" fill="url(#watr)"/>
      <path d="M360 150 q40 -12 80 0 t80 0 t80 0 t80 0 t80 0 V162 H360 Z" fill="#4a6f95" opacity=".7"/>
    </g>
    <rect x="384" y="150" width="22" height="230" rx="11" fill="#ffffff" opacity="0.05"/>
    <path d="M600 90 V66 Q600 50 618 50 Q636 50 636 66 V90" fill="none" stroke="#5a6488" stroke-width="6"/>
    <rect x="662" y="74" width="62" height="15" rx="3" fill="#20203a" stroke="#5a6488" stroke-width="3"/>
    <!-- dévidoir -->
    <g stroke="#5a6488" fill="none" stroke-width="4"><circle cx="160" cy="205" r="98" fill="#12122a"/></g>
    <g stroke="#41416a" fill="none" stroke-width="7">
      <circle cx="160" cy="205" r="84"/><circle cx="160" cy="205" r="68"/><circle cx="160" cy="205" r="52"/><circle cx="160" cy="205" r="36"/>
    </g>
    <circle cx="160" cy="205" r="16" fill="#20203a" stroke="#5a6488" stroke-width="4"/>
    <g stroke="#5a6488" stroke-width="6" stroke-linecap="round"><path d="M70 300 L120 260"/><path d="M250 300 L200 260"/></g>
    <path d="M120 285 Q92 315 90 340 V378" fill="none" stroke="#41416a" stroke-width="11" stroke-linecap="round"/>
    <path d="M78 378 H102 L94 410 H86 Z" fill="#20203a" stroke="#5a6488" stroke-width="3"/>
    <path d="M236 240 Q212 232 200 218" fill="none" stroke="#41416a" stroke-width="11" stroke-linecap="round"/>
    <!-- demi-raccords de refoulement -->
    <g>
      <g transform="translate(340,800)"><rect x="-18" y="0" width="36" height="26" rx="4" fill="#20203a" stroke="#5a6488" stroke-width="3"/><circle cx="-9" cy="13" r="3.5" fill="#5a6488"/><circle cx="9" cy="13" r="3.5" fill="#5a6488"/></g>
      <g transform="translate(440,800)"><rect x="-18" y="0" width="36" height="26" rx="4" fill="#20203a" stroke="#5a6488" stroke-width="3"/><circle cx="-9" cy="13" r="3.5" fill="#5a6488"/><circle cx="9" cy="13" r="3.5" fill="#5a6488"/></g>
      <g transform="translate(540,800)"><rect x="-18" y="0" width="36" height="26" rx="4" fill="#20203a" stroke="#5a6488" stroke-width="3"/><circle cx="-9" cy="13" r="3.5" fill="#5a6488"/><circle cx="9" cy="13" r="3.5" fill="#5a6488"/></g>
    </g>
    <!-- pompe centrifuge -->
    <ellipse cx="790" cy="760" rx="58" ry="12" fill="#000" opacity="0.4"/>
    <circle cx="790" cy="690" r="66" fill="url(#pumpG)" stroke="#68689a" stroke-width="4" filter="url(#soft)"/>
    <path d="M748 652 A66 66 0 0 1 836 662" fill="none" stroke="#a8b4d8" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
    <g id="env-imp" style="transform-box:fill-box;transform-origin:center;animation:spin 7s linear infinite;">
      <g stroke="#68689a" stroke-width="8" fill="none" stroke-linecap="round">
        <path d="M790 690 Q812 660 806 632"/><path d="M790 690 Q828 678 848 690"/><path d="M790 690 Q812 720 806 748"/><path d="M790 690 Q768 720 774 748"/><path d="M790 690 Q752 678 732 690"/><path d="M790 690 Q768 660 774 632"/>
      </g>
      <circle cx="790" cy="690" r="15" fill="#20203a" stroke="#7878aa" stroke-width="3"/>
    </g>
    <path d="M790 632 A58 58 0 0 1 848 690" fill="none" stroke="#4B8FE0" stroke-width="4" marker-end="url(#abl)"/>
    <!-- moteur + PDM -->
    <ellipse cx="921" cy="770" rx="52" ry="11" fill="#000" opacity="0.4"/>
    <rect x="878" y="688" width="86" height="74" rx="10" fill="url(#engG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
    <g stroke="#4a4a78" stroke-width="4" stroke-linecap="round"><line x1="895" y1="700" x2="895" y2="750"/><line x1="909" y1="700" x2="909" y2="750"/><line x1="923" y1="700" x2="923" y2="750"/></g>
    <circle cx="948" cy="725" r="12" fill="#20203a" stroke="#7878aa" stroke-width="3"/>
    <path d="M858 704 H878" fill="none" stroke="#41416a" stroke-width="9" stroke-linecap="round"/>
    <path id="f-drive" d="M876 704 H860" fill="none" stroke="#4B8FE0" stroke-width="7" stroke-linecap="round" stroke-dasharray="10 12" marker-end="url(#abl)" style="animation:flowdash .5s linear infinite;" visibility="hidden"/>
    <!-- vannes à volant (interactives) -->
    <g id="v-iso" stroke="#8a94b8" stroke-width="4" fill="url(#valG)" filter="url(#soft)"><circle cx="470" cy="500" r="17"/><line x1="453" y1="500" x2="487" y2="500"/><line x1="470" y1="483" x2="470" y2="517"/></g>
    <g id="v-alim" stroke="#8a94b8" stroke-width="4" fill="url(#valG)" filter="url(#soft)"><circle cx="620" cy="835" r="17"/><line x1="603" y1="835" x2="637" y2="835"/><line x1="620" y1="818" x2="620" y2="852"/></g>
    <g id="v-retour" stroke="#8a94b8" stroke-width="4" fill="url(#valG)" filter="url(#soft)"><circle cx="900" cy="560" r="17"/><line x1="883" y1="560" x2="917" y2="560"/><line x1="900" y1="543" x2="900" y2="577"/></g>
    <!-- flux animés (affichés selon le scénario) -->
    <g id="f-cuve" visibility="hidden">
      <path d="M470 390 V690 H720" stroke="#27ae60" stroke-width="7" marker-end="url(#agr)" ${FLOW}/>
      <path d="M790 626 V610 H300 V240 H232" stroke="#e74c3c" stroke-width="7" marker-end="url(#ard)" ${FLOW}/>
      <path d="M340 610 V806" stroke="#e74c3c" stroke-width="7" marker-end="url(#ard)" ${FLOW}/>
      <path d="M440 610 V806" stroke="#e74c3c" stroke-width="7" marker-end="url(#ard)" ${FLOW}/>
      <path d="M540 610 V806" stroke="#e74c3c" stroke-width="7" marker-end="url(#ard)" ${FLOW}/>
    </g>
    <g id="f-ext" visibility="hidden">
      <path d="M620 872 V690 H720" stroke="#27ae60" stroke-width="7" marker-end="url(#agr)" ${FLOW}/>
      <path d="M790 626 V610 H300 V240 H232" stroke="#e74c3c" stroke-width="7" marker-end="url(#ard)" ${FLOW}/>
      <path d="M340 610 V806" stroke="#e74c3c" stroke-width="7" marker-end="url(#ard)" ${FLOW}/>
      <path d="M440 610 V806" stroke="#e74c3c" stroke-width="7" marker-end="url(#ard)" ${FLOW}/>
      <path d="M540 610 V806" stroke="#e74c3c" stroke-width="7" marker-end="url(#ard)" ${FLOW}/>
    </g>
    <g id="f-retour" visibility="hidden">
      <path d="M790 610 H900 V150 H746" stroke="#e67e22" stroke-width="6" marker-end="url(#aam)" fill="none" stroke-linecap="round" stroke-dasharray="12 18" style="animation:flowdash 1.1s linear infinite;"/>
    </g>
    <!-- légende -->
    <g font-family="IBM Plex Mono" font-size="21">
      <path d="M42 838 h30" stroke="#27ae60" stroke-width="6" marker-end="url(#agr)"/><text x="86" y="845" fill="#27ae60">Alimentation</text>
      <path d="M42 872 h30" stroke="#e74c3c" stroke-width="6" marker-end="url(#ard)"/><text x="86" y="879" fill="#e74c3c">Refoulement</text>
    </g>
  </svg>`;

  /* --- Schémas d'appui simples (fond des points chauds) --- */
  const S = {}; // slug -> {aspect, svg}

  S.env = { aspect: '1000 / 900', className: 'schema-realistic', svg: ENV_SVG };

  S.analyse = { aspect: '1000 / 620', className: 'schema-realistic schema-pump-cutaway', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <defs>
      <linearGradient id="pc-steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1f4f5"/><stop offset=".2" stop-color="#77838a"/><stop offset=".48" stop-color="#dce1e3"/><stop offset=".72" stop-color="#4a555b"/><stop offset="1" stop-color="#aeb7bb"/></linearGradient>
      <linearGradient id="pc-bronze" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3b268"/><stop offset=".45" stop-color="#8f5524"/><stop offset="1" stop-color="#4e2b15"/></linearGradient>
      <radialGradient id="pc-dark" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#707c83"/><stop offset=".35" stop-color="#2d363b"/><stop offset="1" stop-color="#080b0d"/></radialGradient>
      <filter id="pc-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="8" stdDeviation="9" flood-color="#000" flood-opacity=".55"/></filter>
    </defs>
    <rect x="20" y="20" width="960" height="580" rx="18" fill="#080d12" stroke="#2c3942" stroke-width="3"/>
    <text x="48" y="57" fill="#82919a" font-family="IBM Plex Mono" font-size="14">WATEROUS S 200 G · POMPE MULTICELLULAIRE</text>
    <path d="M72 490H930" stroke="#202a31" stroke-width="2" stroke-dasharray="8 12"/>

    <!-- axe commun, volontairement visible comme sur une vue éclatée -->
    <path d="M92 318H930" stroke="#2b180e" stroke-width="24" stroke-linecap="round" filter="url(#pc-shadow)"/>
    <path d="M92 311H930" stroke="url(#pc-bronze)" stroke-width="12" stroke-linecap="round"/>

    <!-- demi-raccord filtré d'aspiration -->
    <g transform="translate(100 318)" filter="url(#pc-shadow)">
      <path d="M-54-46H30V46H-54Q-72 24-72 0Q-72-24-54-46Z" fill="url(#pc-steel)" stroke="#151a1e" stroke-width="6"/>
      <circle cx="30" r="48" fill="#222a2f" stroke="#c2cace" stroke-width="7"/>
      <circle cx="30" r="30" fill="#080b0d" stroke="#6f7b82" stroke-width="4"/>
      <g stroke="#7b878e" stroke-width="3"><path d="M10-18L50 18M10 0L44 28M18-28L52 6"/></g>
    </g>

    <!-- premier étage : roue et diffuseur -->
    <g transform="translate(315 318)" filter="url(#pc-shadow)">
      <circle r="120" fill="url(#pc-dark)" stroke="#a8b1b6" stroke-width="7"/>
      <circle r="91" fill="#151d22" stroke="#536068" stroke-width="4"/>
      <g id="pc-wheel-one" style="transform-box:fill-box;transform-origin:center;animation:spin 4.2s linear infinite;">
        ${Array.from({length:8},(_,i)=>`<path d="M0 0 Q48 -18 75 -58" transform="rotate(${i*45})" fill="none" stroke="url(#pc-steel)" stroke-width="18" stroke-linecap="round"/>`).join('')}
        <circle r="27" fill="url(#pc-steel)" stroke="#20272b" stroke-width="5"/>
      </g>
    </g>
    <g transform="translate(468 318)">
      <circle r="137" fill="none" stroke="url(#pc-steel)" stroke-width="24"/>
      <circle r="108" fill="none" stroke="#39454c" stroke-width="17" stroke-dasharray="34 13"/>
      <circle r="148" fill="none" stroke="#11171a" stroke-width="6"/>
    </g>

    <!-- second étage -->
    <g transform="translate(620 318)" filter="url(#pc-shadow)">
      <circle r="120" fill="url(#pc-dark)" stroke="#a8b1b6" stroke-width="7"/>
      <circle r="91" fill="#151d22" stroke="#536068" stroke-width="4"/>
      <g id="pc-wheel-two" style="transform-box:fill-box;transform-origin:center;animation:spin 4.2s linear infinite;">
        ${Array.from({length:8},(_,i)=>`<path d="M0 0 Q48 -18 75 -58" transform="rotate(${i*45})" fill="none" stroke="url(#pc-steel)" stroke-width="18" stroke-linecap="round"/>`).join('')}
        <circle r="27" fill="url(#pc-steel)" stroke="#20272b" stroke-width="5"/>
      </g>
    </g>

    <!-- collecteur final et sortie de refoulement -->
    <g transform="translate(790 318)" filter="url(#pc-shadow)">
      <path d="M-122-122Q42-162 126-70Q176-14 130 96Q80 164-102 126L-72 84Q42 112 79 50Q108-8 60-55Q12-96-82-75Z" fill="url(#pc-steel)" stroke="#171d21" stroke-width="7"/>
      <circle r="94" fill="none" stroke="#3b474e" stroke-width="18" stroke-dasharray="31 12"/>
      <path d="M82-74Q135-118 174-98V-18H118" fill="url(#pc-steel)" stroke="#171d21" stroke-width="7"/>
      <ellipse cx="173" cy="-58" rx="40" ry="48" fill="url(#pc-steel)" stroke="#151a1e" stroke-width="7"/>
      <ellipse cx="173" cy="-58" rx="23" ry="30" fill="#11171a"/>
    </g>

    <!-- flux fonctionnels -->
    <path d="M36 318H260" stroke="#4cd68a" stroke-width="8" stroke-dasharray="13 17" marker-end="url(#agr)" fill="none" style="animation:flowdash .85s linear infinite"/>
    <path d="M690 210Q790 150 910 214" stroke="#e8695c" stroke-width="8" stroke-dasharray="13 17" marker-end="url(#ard)" fill="none" style="animation:flowdash .85s linear infinite"/>
    <g font-family="IBM Plex Mono" font-size="15" text-anchor="middle"><text x="120" y="430" fill="#79e4a7">ASPIRATION</text><text x="315" y="477" fill="#b9c5ca">ROUE 1</text><text x="468" y="508" fill="#b9c5ca">DIFFUSEUR</text><text x="620" y="477" fill="#b9c5ca">ROUE 2</text><text x="810" y="508" fill="#ff9187">COLLECTEUR / REFOULEMENT</text></g>
  </svg>` };

  S.amorcage = { aspect: '1000 / 620', className: 'schema-realistic', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <!-- tuyauteries -->
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <g stroke="#101020" stroke-width="20"><path d="M210 380 H400"/><path d="M452 430 H560"/><path d="M620 300 V210 H720"/><path d="M400 378 V300 H500"/><path d="M680 355 H790 V300"/><path d="M890 150 H930 V90"/></g>
      <g stroke="#41416a" stroke-width="11"><path d="M210 380 H400"/><path d="M452 430 H560"/><path d="M620 300 V210 H720"/><path d="M400 378 V300 H500"/><path d="M680 355 H790 V300"/><path d="M890 150 H930 V90"/></g>
    </g>
    <!-- tonne -->
    <ellipse cx="135" cy="432" rx="90" ry="11" fill="#000" opacity="0.32"/>
    <rect x="60" y="270" width="150" height="150" rx="10" fill="url(#tankBody)" stroke="#5a6488" stroke-width="3" filter="url(#soft)"/>
    <clipPath id="amtank"><rect x="65" y="275" width="140" height="140" rx="6"/></clipPath>
    <g clip-path="url(#amtank)"><rect x="60" y="310" width="150" height="110" fill="url(#watr)"/></g>
    <!-- pompe -->
    <ellipse cx="400" cy="495" rx="58" ry="11" fill="#000" opacity="0.35"/>
    <circle cx="400" cy="430" r="52" fill="url(#pumpG)" stroke="#68689a" stroke-width="4" filter="url(#soft)"/>
    <path d="M366 396 A52 52 0 0 1 436 402" fill="none" stroke="#a8b4d8" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
    <circle cx="400" cy="430" r="24" fill="url(#valG)" stroke="#7878aa" stroke-width="3"/>
    <!-- amorceur -->
    <ellipse cx="620" cy="420" rx="70" ry="10" fill="#000" opacity="0.32"/>
    <g id="am-amorceur">
    <rect x="560" y="300" width="120" height="110" rx="9" fill="url(#engG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
    <g stroke="#4a4a78" stroke-width="4" stroke-linecap="round"><line x1="580" y1="318" x2="580" y2="392"/><line x1="598" y1="318" x2="598" y2="392"/><line x1="616" y1="318" x2="616" y2="392"/></g>
    <circle cx="652" cy="355" r="14" fill="url(#valG)" stroke="#7878aa" stroke-width="3"/>
    </g>
    <!-- bac d'amorçage -->
    <rect x="720" y="90" width="170" height="120" rx="10" fill="url(#tankBody)" stroke="#5a6488" stroke-width="3" filter="url(#soft)"/>
    <clipPath id="ambac"><rect x="725" y="95" width="160" height="110" rx="6"/></clipPath>
    <g clip-path="url(#ambac)"><rect x="720" y="128" width="170" height="82" fill="url(#watr)"/><path d="M720 128 q28 -9 56 0 t56 0 t56 0 V138 H720 Z" fill="#4a6f95" opacity=".7"/></g>
    <!-- clapet -->
    <g id="am-clapet">
    <circle cx="500" cy="340" r="15" fill="url(#valG)" stroke="#8a94b8" stroke-width="3"/>
    <line x1="492" y1="330" x2="508" y2="350" stroke="#8a94b8" stroke-width="3" stroke-linecap="round"/>
    </g>
    <!-- couche animée amorçage -->
    <g id="am-air" visibility="hidden" fill="none" stroke-linecap="round">
      <path d="M400 370 V300 H560" stroke="#8a94b8" stroke-width="5" stroke-dasharray="3 16" style="animation:flowdash .5s linear infinite;"/>
      <path d="M680 355 H790 V300" stroke="#8a94b8" stroke-width="4" stroke-dasharray="3 16" style="animation:flowdash .6s linear infinite;"/>
    </g>
    <path id="am-eau" visibility="hidden" d="M210 380 H400" fill="none" stroke="#27ae60" stroke-width="6" stroke-linecap="round" stroke-dasharray="14 18" style="animation:flowdash .8s linear infinite;"/>
    <text id="am-bar" x="400" y="540" text-anchor="middle" font-family="IBM Plex Mono" font-size="26" fill="#e67e22">0,0 bar</text>
  </svg>` };

  S.tableau = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <rect x="45" y="40" width="910" height="540" rx="18" fill="url(#engG)" stroke="#5a6488" stroke-width="3" filter="url(#soft)"/>
    <rect x="58" y="52" width="18" height="516" rx="9" fill="#ffffff" opacity="0.04"/>
    <rect x="70" y="66" width="860" height="80" rx="8" fill="#0b0b1c" stroke="#34345c" stroke-width="2"/>
    <rect x="78" y="72" width="844" height="30" rx="5" fill="#13233a" opacity=".8"/>
    <!-- manomètres -->
    <g>
      <circle cx="200" cy="174" r="62" fill="url(#valG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
      <circle cx="400" cy="174" r="62" fill="url(#valG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
      <circle cx="600" cy="174" r="62" fill="url(#valG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
      <circle cx="800" cy="174" r="62" fill="url(#valG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
      <g stroke="#e8e9f3" stroke-width="3" stroke-linecap="round">
        <line x1="200" y1="174" x2="228" y2="140"/><line x1="400" y1="174" x2="378" y2="136"/><line id="tb-hp" x1="600" y1="174" x2="634" y2="152"/><line x1="800" y1="174" x2="800" y2="130"/>
      </g>
      <g fill="#20203a" stroke="#8a94b8" stroke-width="2"><circle cx="200" cy="174" r="7"/><circle cx="400" cy="174" r="7"/><circle cx="600" cy="174" r="7"/><circle cx="800" cy="174" r="7"/></g>
    </g>
    <!-- voyants -->
    <g stroke="#68689a" stroke-width="2.5">
      <circle id="tb-cav" cx="180" cy="322" r="22" fill="#3a1512"/><circle cx="330" cy="322" r="22" fill="#3a2a10"/>
      <rect x="470" y="300" width="60" height="44" rx="6" fill="#0b0b1c"/><rect x="628" y="300" width="60" height="44" rx="6" fill="#0b0b1c"/><rect x="786" y="300" width="60" height="44" rx="6" fill="#0b0b1c"/>
    </g>
    <circle cx="172" cy="314" r="7" fill="#ffffff" opacity="0.12"/><circle cx="322" cy="314" r="7" fill="#ffffff" opacity="0.12"/>
    <!-- commandes -->
    <g filter="url(#soft)">
      <circle cx="250" cy="470" r="30" fill="url(#valG)" stroke="#8a94b8" stroke-width="3"/>
      <circle cx="500" cy="470" r="34" fill="url(#valG)" stroke="#8a94b8" stroke-width="3"/>
      <circle cx="620" cy="470" r="26" fill="url(#valG)" stroke="#8a94b8" stroke-width="3"/>
    </g>
    <g stroke="#c8d0e8" stroke-width="4" stroke-linecap="round"><line x1="250" y1="470" x2="250" y2="446"/><line id="tb-potl" x1="500" y1="470" x2="522" y2="446"/><line x1="620" y1="470" x2="620" y2="450"/></g>
    <g fill="#0b0b1c" stroke="#68689a" stroke-width="2.5"><rect x="756" y="440" width="52" height="60" rx="6"/><rect x="866" y="440" width="52" height="60" rx="6"/></g>
    <g fill="#3aa8c9" opacity=".8"><rect x="762" y="470" width="40" height="24" rx="3"/><rect x="872" y="458" width="40" height="36" rx="3"/></g>
  </svg>` };

  S.modes = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <linearGradient id="piG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e05a4a"/><stop offset="45%" stop-color="#a03024"/><stop offset="100%" stop-color="#701e15"/></linearGradient>
    <!-- sol -->
    <line x1="40" y1="475" x2="960" y2="475" stroke="#2a2a4c" stroke-width="3"/>
    <!-- tuyau d'alimentation -->
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M120 270 V405" stroke="#101020" stroke-width="22"/><path d="M120 270 V405" stroke="#41416a" stroke-width="12"/>
      <path d="M154 440 H620 V365 H690" stroke="#101020" stroke-width="22"/><path d="M154 440 H620 V365 H690" stroke="#41416a" stroke-width="12"/>
    </g>
    <!-- poteau incendie -->
    <ellipse cx="120" cy="278" rx="52" ry="9" fill="#000" opacity="0.35"/>
    <rect x="90" y="180" width="60" height="92" rx="10" fill="url(#piG)" stroke="#5a2018" stroke-width="3" filter="url(#soft)"/>
    <ellipse cx="120" cy="180" rx="30" ry="12" fill="#e05a4a" stroke="#5a2018" stroke-width="3"/>
    <rect x="96" y="188" width="9" height="76" rx="4.5" fill="#ffffff" opacity="0.15"/>
    <circle cx="120" cy="222" r="13" fill="#701e15" stroke="#5a2018" stroke-width="3"/>
    <!-- bouche incendie -->
    <ellipse cx="120" cy="440" rx="40" ry="14" fill="url(#valG)" stroke="#8a94b8" stroke-width="3"/>
    <ellipse cx="120" cy="436" rx="28" ry="9" fill="#12122a" stroke="#565686" stroke-width="2"/>
    <!-- engin -->
    <ellipse cx="805" cy="468" rx="140" ry="14" fill="#000" opacity="0.35"/>
    <rect x="690" y="300" width="230" height="130" rx="12" fill="url(#engG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
    <rect x="700" y="310" width="14" height="110" rx="7" fill="#ffffff" opacity="0.05"/>
    <rect x="852" y="312" width="58" height="44" rx="6" fill="#13233a" stroke="#4a5474" stroke-width="2"/>
    <g fill="url(#valG)" stroke="#68689a" stroke-width="3"><circle cx="745" cy="440" r="26"/><circle cx="865" cy="440" r="26"/></g>
    <g fill="#12122a" stroke="#8a94b8" stroke-width="2"><circle cx="745" cy="440" r="10"/><circle cx="865" cy="440" r="10"/></g>
    <text x="380" y="418" fill="#62628a" font-family="IBM Plex Mono" font-size="20">10–20 m</text>
  </svg>` };

  S.horsgel = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <!-- tuyauteries -->
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <g stroke="#101020" stroke-width="20"><path d="M150 180 V300 H360"/><path d="M480 300 H640"/><path d="M420 360 V470"/><path d="M705 360 V470"/></g>
      <g stroke="#41416a" stroke-width="11"><path d="M150 180 V300 H360"/><path d="M480 300 H640"/><path d="M420 360 V470"/><path d="M705 360 V470"/></g>
    </g>
    <!-- tonne -->
    <rect x="60" y="70" width="180" height="110" rx="10" fill="url(#tankBody)" stroke="#5a6488" stroke-width="3" filter="url(#soft)"/>
    <clipPath id="hgtank"><rect x="65" y="75" width="170" height="100" rx="6"/></clipPath>
    <g clip-path="url(#hgtank)"><rect x="60" y="105" width="180" height="75" fill="url(#watr)"/></g>
    <!-- vanne Tonne-Pompe (interactive) -->
    <g id="hg-iso" stroke="#8a94b8" stroke-width="4" fill="url(#valG)"><circle cx="255" cy="300" r="16"/><line x1="241" y1="300" x2="269" y2="300"/><line x1="255" y1="286" x2="255" y2="314"/></g>
    <!-- pompe -->
    <ellipse cx="420" cy="372" rx="66" ry="11" fill="#000" opacity="0.32"/>
    <circle cx="420" cy="300" r="60" fill="url(#pumpG)" stroke="#68689a" stroke-width="4" filter="url(#soft)"/>
    <path d="M382 262 A60 60 0 0 1 462 270" fill="none" stroke="#a8b4d8" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
    <circle cx="420" cy="300" r="28" fill="url(#valG)" stroke="#7878aa" stroke-width="3"/>
    <!-- amorceur -->
    <rect x="640" y="250" width="130" height="110" rx="9" fill="url(#engG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
    <g stroke="#4a4a78" stroke-width="4" stroke-linecap="round"><line x1="662" y1="268" x2="662" y2="342"/><line x1="682" y1="268" x2="682" y2="342"/><line x1="702" y1="268" x2="702" y2="342"/></g>
    <!-- robinets de vidange + gouttes -->
    <g fill="url(#valG)" stroke="#8a94b8" stroke-width="3"><circle cx="420" cy="440" r="14"/><circle cx="705" cy="440" r="14"/></g>
    <path d="M405 470 h30 l-15 26 z" fill="#44446e"/><path d="M690 470 h30 l-15 26 z" fill="#44446e"/>
    <g id="hg-drops" visibility="hidden" fill="#4B8FE0" opacity=".85">
      <path d="M420 520 q-7 12 0 18 q7 -6 0 -18"/><path d="M705 520 q-7 12 0 18 q7 -6 0 -18"/>
      <path d="M408 552 q-5 9 0 14 q5 -5 0 -14" opacity=".5"/><path d="M718 552 q-5 9 0 14 q5 -5 0 -14" opacity=".5"/>
    </g>
    <!-- flocon temps froid -->
    <g stroke="#7ec3e0" stroke-width="3" stroke-linecap="round" opacity=".7" transform="translate(890,110)">
      <line x1="-22" y1="0" x2="22" y2="0"/><line x1="-11" y1="-19" x2="11" y2="19"/><line x1="-11" y1="19" x2="11" y2="-19"/>
    </g>
  </svg>` };

  S.chaine = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <!-- arbres de transmission -->
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <g stroke="#101020" stroke-width="22"><path d="M80 155 H620"/><path d="M350 155 V310 H400"/><path d="M470 340 L540 380 L640 459 H780"/><path d="M840 459 L900 372"/></g>
      <g stroke="#41416a" stroke-width="12"><path d="M80 155 H620"/><path d="M350 155 V310 H400"/><path d="M470 340 L540 380 L640 459 H780"/><path d="M840 459 L900 372"/></g>
    </g>
    <!-- moteur -->
    <ellipse cx="120" cy="228" rx="66" ry="11" fill="#000" opacity="0.32"/>
    <rect x="58" y="100" width="124" height="120" rx="12" fill="url(#engG)" stroke="#68689a" stroke-width="3" filter="url(#soft)" id="ch-eng"/>
    <g stroke="#4a4a78" stroke-width="5" stroke-linecap="round"><line x1="82" y1="118" x2="82" y2="200"/><line x1="104" y1="118" x2="104" y2="200"/><line x1="126" y1="118" x2="126" y2="200"/><line x1="148" y1="118" x2="148" y2="200"/></g>
    <!-- embrayage + boîte -->
    <circle cx="235" cy="155" r="30" fill="url(#valG)" stroke="#7878aa" stroke-width="3" filter="url(#soft)"/>
    <rect x="295" y="118" width="90" height="74" rx="9" fill="url(#engG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
    <line x1="318" y1="130" x2="318" y2="180" stroke="#4a4a78" stroke-width="4" stroke-linecap="round"/><line x1="340" y1="130" x2="340" y2="180" stroke="#4a4a78" stroke-width="4" stroke-linecap="round"/><line x1="362" y1="130" x2="362" y2="180" stroke="#4a4a78" stroke-width="4" stroke-linecap="round"/>
    <!-- pont + roues -->
    <circle cx="620" cy="155" r="34" fill="url(#pumpG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
    <g fill="#12122a" stroke="#565686" stroke-width="4"><circle cx="585" cy="215" r="24"/><circle cx="655" cy="215" r="24"/></g>
    <g fill="url(#valG)" stroke="#68689a" stroke-width="2"><circle cx="585" cy="215" r="9"/><circle cx="655" cy="215" r="9"/></g>
    <!-- PDM -->
    <circle cx="435" cy="325" r="28" fill="url(#valG)" stroke="#7878aa" stroke-width="3" filter="url(#soft)"/>
    <circle cx="435" cy="325" r="11" fill="#12122a" stroke="#8a94b8" stroke-width="2"/>
    <!-- pompe + amorceur -->
    <ellipse cx="810" cy="530" rx="60" ry="11" fill="#000" opacity="0.32"/>
    <circle cx="810" cy="459" r="52" fill="url(#pumpG)" stroke="#68689a" stroke-width="4" filter="url(#soft)"/>
    <path d="M776 425 A52 52 0 0 1 846 431" fill="none" stroke="#a8b4d8" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
    <circle cx="810" cy="459" r="22" fill="url(#valG)" stroke="#7878aa" stroke-width="3"/>
    <rect x="872" y="310" width="76" height="66" rx="8" fill="url(#engG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
    <line x1="890" y1="322" x2="890" y2="364" stroke="#4a4a78" stroke-width="4" stroke-linecap="round"/><line x1="910" y1="322" x2="910" y2="364" stroke="#4a4a78" stroke-width="4" stroke-linecap="round"/>
    <!-- couche animée : moteur en marche / PDM enclenchée -->
    <g id="ch-run" visibility="hidden" fill="none" stroke-linecap="round">
      <path d="M80 155 H620" stroke="#4B8FE0" stroke-width="5" stroke-dasharray="4 18" style="animation:flowdash .5s linear infinite;"/>
    </g>
    <g id="ch-pdm-run" visibility="hidden" fill="none" stroke-linecap="round">
      <path d="M350 155 V310 H400" stroke="#4B8FE0" stroke-width="5" stroke-dasharray="4 18" style="animation:flowdash .5s linear infinite;"/>
      <path d="M470 340 L540 380 L640 459 H780" stroke="#4B8FE0" stroke-width="5" stroke-dasharray="4 18" style="animation:flowdash .5s linear infinite;"/>
      <path d="M840 459 L900 372" stroke="#4B8FE0" stroke-width="4" stroke-dasharray="4 16" style="animation:flowdash .6s linear infinite;"/>
      <g style="transform-box:fill-box;transform-origin:center;animation:spin 1.1s linear infinite;" stroke="#3aa8c9" stroke-width="5">
        <path d="M810 459 L810 439"/><path d="M810 459 L828 469"/><path d="M810 459 L792 469"/>
      </g>
    </g>
  </svg>` };

  S.hydro = { aspect: '1000 / 620', className: 'schema-realistic', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <defs>
      <linearGradient id="hy-pipe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cdd5d9"/><stop offset=".22" stop-color="#556168"/><stop offset=".55" stop-color="#172027"/><stop offset="1" stop-color="#88949a"/></linearGradient>
      <linearGradient id="hy-red" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff533f"/><stop offset=".48" stop-color="#c3261b"/><stop offset="1" stop-color="#690d09"/></linearGradient>
      <filter id="hy-shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="9" stdDeviation="8" flood-color="#000" flood-opacity=".55"/></filter>
    </defs>
    <text x="500" y="55" text-anchor="middle" fill="#e8e9f3" font-family="Chakra Petch" font-weight="700" font-size="31">Pr = Po + J45 + J70 + J110 + Z</text>
    <text x="500" y="82" text-anchor="middle" fill="#72818b" font-family="IBM Plex Mono" font-size="13">PRESSION POMPE = LANCE + PERTES DE CHARGE + DÉNIVELLATION</text>

    <!-- engin-pompe en volume -->
    <g transform="translate(38 252)" filter="url(#hy-shadow)">
      <path d="M0 38Q0 8 30 8H158Q180 10 186 35L196 80V156H0Z" fill="url(#hy-red)" stroke="#5c100c" stroke-width="5"/>
      <path d="M108 22H158Q170 24 176 48H108Z" fill="#172b38" stroke="#62717a" stroke-width="3"/>
      <rect x="16" y="34" width="76" height="86" rx="7" fill="#171e23" stroke="#6d787e" stroke-width="3"/>
      <circle cx="46" cy="154" r="30" fill="#090c0e" stroke="#616d74" stroke-width="6"/><circle cx="150" cy="154" r="30" fill="#090c0e" stroke="#616d74" stroke-width="6"/>
      <circle cx="46" cy="154" r="12" fill="url(#valG)"/><circle cx="150" cy="154" r="12" fill="url(#valG)"/>
      <circle cx="53" cy="77" r="25" fill="url(#pumpG)" stroke="#9aa7ae" stroke-width="4"/>
    </g>

    <!-- établissement : trois diamètres matérialisés par des flexibles cylindriques -->
    <g fill="none" stroke-linecap="round" filter="url(#hy-shadow)">
      <path d="M205 372H388" stroke="#101519" stroke-width="34"/><path d="M205 366H388" stroke="url(#hy-pipe)" stroke-width="22"/>
      <path d="M388 372H590" stroke="#101519" stroke-width="29"/><path d="M388 366H590" stroke="url(#hy-pipe)" stroke-width="17"/>
      <path d="M590 372H745L846 276" stroke="#101519" stroke-width="24"/><path d="M590 366H745L846 270" stroke="url(#hy-pipe)" stroke-width="13"/>
    </g>
    <g font-family="IBM Plex Mono" font-size="15" text-anchor="middle"><text x="296" y="418" fill="#87c8e5">Ø110 · J110</text><text x="490" y="418" fill="#7ed59f">Ø70 · J70</text><text x="671" y="418" fill="#f3bd72">Ø45 · J45</text></g>

    <!-- lance et jet -->
    <g transform="translate(846 270) rotate(-35)" filter="url(#hy-shadow)"><path d="M0 0H78" stroke="url(#hy-pipe)" stroke-width="20" stroke-linecap="round"/><path d="M54-14H88V14H54Z" fill="#242c31" stroke="#adb7bc" stroke-width="4"/></g>
    <path d="M912 224Q950 196 982 184" stroke="#45bce5" stroke-width="7" stroke-linecap="round" stroke-dasharray="5 12"/>
    <text x="862" y="188" text-anchor="middle" fill="#e8e9f3" font-family="IBM Plex Mono" font-size="15">Po · LANCE DÉFAVORISÉE</text>

    <!-- dénivellation -->
    <g stroke="#e67e22" stroke-width="3"><path d="M930 370V250"/><path d="M920 370H940M920 250H940"/></g><text x="950" y="318" fill="#f3a45d" font-family="IBM Plex Mono" font-size="21">Z</text>
    <g transform="translate(250 500)"><rect width="500" height="76" rx="12" fill="#101923" stroke="#2d3e4e" stroke-width="2"/><text x="250" y="31" text-anchor="middle" fill="#cbd6dc" font-family="IBM Plex Mono" font-size="15">5 LOIS : Q² · LONGUEUR · RUGOSITÉ · 1/DIAMÈTRE · INDÉPENDANT DE P</text><text id="hy-result" x="250" y="57" text-anchor="middle" fill="#e67e22" font-family="IBM Plex Mono" font-size="14">Choisissez un exemple de calcul au-dessus du schéma.</text></g>
  </svg>` };

  /* Hydrant : pression statique/dynamique et débit maximal disponible. */
  S['hydro-hydrant'] = { aspect: '1000 / 620', className: 'schema-realistic', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <defs><linearGradient id="hh-red" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6653"/><stop offset=".45" stop-color="#c42a1e"/><stop offset="1" stop-color="#650c08"/></linearGradient><filter id="hh-shadow" x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#000" flood-opacity=".55"/></filter></defs>
    <text x="500" y="52" text-anchor="middle" fill="#e8e9f3" font-family="Chakra Petch" font-size="28" font-weight="700">CAPACITÉ D’UN HYDRANT</text>
    <!-- poteau incendie en volume -->
    <g transform="translate(92 156)" filter="url(#hh-shadow)"><path d="M65 40Q65 0 105 0H155Q195 0 195 40V304H65Z" fill="url(#hh-red)" stroke="#5f100b" stroke-width="7"/><ellipse cx="130" cy="40" rx="65" ry="34" fill="#e34a39" stroke="#68120d" stroke-width="7"/><ellipse cx="130" cy="33" rx="34" ry="17" fill="#ad2117"/><path d="M48 120H0V202H48M212 120H260V202H212" fill="url(#hh-red)" stroke="#5f100b" stroke-width="7"/><circle cy="161" r="29" fill="#30383d" stroke="#b9c2c6" stroke-width="6"/><circle cx="260" cy="161" r="29" fill="#30383d" stroke="#b9c2c6" stroke-width="6"/><path d="M36 304H224L246 352H14Z" fill="#8d1710" stroke="#5f100b" stroke-width="7"/></g>
    <!-- manomètres -->
    <g transform="translate(500 220)" filter="url(#hh-shadow)"><circle r="112" fill="url(#valG)" stroke="#919da3" stroke-width="7"/><circle r="88" fill="#0a1117" stroke="#33434f" stroke-width="4"/><g stroke="#758792" stroke-width="3">${Array.from({length:11},(_,i)=>{const a=(-210+i*24)*Math.PI/180;return `<path d="M${Math.cos(a)*72} ${Math.sin(a)*72}L${Math.cos(a)*84} ${Math.sin(a)*84}"/>`;}).join('')}</g><line id="hh-static-needle" y2="-68" stroke="#4cd68a" stroke-width="6" stroke-linecap="round" style="transform:rotate(-70deg);transition:transform .5s;"/><circle r="11" fill="#d2d9dc"/><text y="52" text-anchor="middle" fill="#8ceab5" font-family="IBM Plex Mono" font-size="14">STATIQUE</text></g>
    <g transform="translate(770 220)" filter="url(#hh-shadow)"><circle r="112" fill="url(#valG)" stroke="#919da3" stroke-width="7"/><circle r="88" fill="#0a1117" stroke="#33434f" stroke-width="4"/><g stroke="#758792" stroke-width="3">${Array.from({length:11},(_,i)=>{const a=(-210+i*24)*Math.PI/180;return `<path d="M${Math.cos(a)*72} ${Math.sin(a)*72}L${Math.cos(a)*84} ${Math.sin(a)*84}"/>`;}).join('')}</g><line id="hh-dynamic-needle" y2="-68" stroke="#46bfe8" stroke-width="6" stroke-linecap="round" style="transform:rotate(-100deg);transition:transform .5s;"/><circle r="11" fill="#d2d9dc"/><text y="52" text-anchor="middle" fill="#73d6f8" font-family="IBM Plex Mono" font-size="14">DYNAMIQUE</text></g>
    <g transform="translate(400 394)"><rect width="500" height="154" rx="15" fill="#101923" stroke="#2d3e4e" stroke-width="3"/><text id="hh-pressures" x="250" y="42" text-anchor="middle" fill="#d8e2e7" font-family="IBM Plex Mono" font-size="20">Pstat 7,5 bar · Pdyn 5,0 bar</text><text id="hh-flow" x="250" y="82" text-anchor="middle" fill="#73d6f8" font-family="Chakra Petch" font-size="27" font-weight="700">Débit utilisé : 500 L/min</text><text id="hh-qmax" x="250" y="122" text-anchor="middle" fill="#8ceab5" font-family="IBM Plex Mono" font-size="18">Qmax ≈ 612 L/min</text></g>
    <text x="650" y="584" text-anchor="middle" fill="#71808a" font-family="IBM Plex Mono" font-size="14">Qmax = Q utilisé × √(Pstat ÷ (Pstat − Pdyn))</text>
  </svg>` };

  /* --- FPT GIMAEX : tableau de commande arrière --- */
  S['gimaex-tableau'] = {
    aspect: '740 / 1000',
    className: 'schema-photo schema-gimaex-rear',
    svg: `
  <svg viewBox="0 0 740 1000" role="img" aria-labelledby="gx-panel-title" preserveAspectRatio="xMidYMid meet">
    <title id="gx-panel-title">Tableau de commande arrière GIMAEX</title>
    <defs>
      <linearGradient id="gx-backdrop" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#111820"/><stop offset=".52" stop-color="#080b0f"/><stop offset="1" stop-color="#020304"/>
      </linearGradient>
      <linearGradient id="gx-red-panel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ff4a35"/><stop offset=".18" stop-color="#d72c1d"/>
        <stop offset=".68" stop-color="#b71912"/><stop offset="1" stop-color="#750d0a"/>
      </linearGradient>
      <linearGradient id="gx-red-edge" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#6d0908"/><stop offset=".09" stop-color="#ff5d43"/>
        <stop offset=".45" stop-color="#d4261a"/><stop offset=".9" stop-color="#8f100c"/><stop offset="1" stop-color="#480504"/>
      </linearGradient>
      <linearGradient id="gx-bevel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3d444a"/><stop offset=".16" stop-color="#090b0d"/>
        <stop offset=".82" stop-color="#020304"/><stop offset="1" stop-color="#252b30"/>
      </linearGradient>
      <linearGradient id="gx-screen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#233746"/><stop offset=".55" stop-color="#12212b"/><stop offset="1" stop-color="#091116"/>
      </linearGradient>
      <linearGradient id="gx-metal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#606a71"/><stop offset=".22" stop-color="#171b1e"/>
        <stop offset=".7" stop-color="#050607"/><stop offset="1" stop-color="#535c62"/>
      </linearGradient>
      <radialGradient id="gx-black-knob" cx="35%" cy="28%" r="75%">
        <stop offset="0" stop-color="#535b60"/><stop offset=".32" stop-color="#15191c"/><stop offset="1" stop-color="#020303"/>
      </radialGradient>
      <radialGradient id="gx-yellow" cx="32%" cy="25%" r="80%">
        <stop offset="0" stop-color="#fff27a"/><stop offset=".38" stop-color="#e4bd20"/><stop offset="1" stop-color="#8a5f00"/>
      </radialGradient>
      <radialGradient id="gx-red-button" cx="34%" cy="25%" r="78%">
        <stop offset="0" stop-color="#ff7868"/><stop offset=".38" stop-color="#df251b"/><stop offset="1" stop-color="#6d0807"/>
      </radialGradient>
      <filter id="gx-panel-shadow" x="-25%" y="-15%" width="150%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000" flood-opacity=".72"/>
      </filter>
      <filter id="gx-control-shadow" x="-60%" y="-60%" width="220%" height="240%">
        <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000" flood-opacity=".76"/>
      </filter>
      <filter id="gx-screen-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#6db5dc" flood-opacity=".22"/>
      </filter>
      <filter id="gx-grain" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency=".62" numOctaves="3" seed="17"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <clipPath id="gx-panel-clip"><rect x="38" y="18" width="664" height="964" rx="22"/></clipPath>
      <style>
        .gx-plate{fill:#e9ece9;stroke:#aeb5b3;stroke-width:1}
        .gx-label{fill:#181b1c;font-family:IBM Plex Mono,monospace;font-size:9px;font-weight:700;letter-spacing:.35px}
        .gx-screen-copy{font-family:IBM Plex Mono,monospace}
        .gx-bolt{fill:#101315;stroke:#657078;stroke-width:2}
      </style>
    </defs>

    <rect width="740" height="1000" fill="url(#gx-backdrop)"/>
    <ellipse cx="370" cy="976" rx="312" ry="18" fill="#000" opacity=".72"/>

    <!-- Tôle rouge verticale, arêtes, reflets et grain -->
    <g filter="url(#gx-panel-shadow)">
      <rect x="38" y="18" width="664" height="964" rx="22" fill="url(#gx-red-edge)" stroke="#360403" stroke-width="4"/>
      <path d="M58 28 H674 Q692 28 692 48 V952 Q692 972 672 972 H58 Q48 972 48 952 V48 Q48 28 58 28Z"
            fill="url(#gx-red-panel)" stroke="#ff6b51" stroke-opacity=".28" stroke-width="2"/>
      <path d="M54 56 Q170 18 300 44 T686 40 V96 Q530 70 372 88 T54 92Z" fill="#fff" opacity=".055"/>
      <path d="M58 30 V970" stroke="#fff" stroke-width="10" opacity=".065"/>
      <path d="M678 38 V962" stroke="#3d0504" stroke-width="12" opacity=".45"/>
      <rect x="42" y="22" width="656" height="956" rx="20" fill="#fff" opacity=".055"
            filter="url(#gx-grain)" clip-path="url(#gx-panel-clip)"/>
    </g>

    <!-- Écran principal : cadre noir épais en relief -->
    <g filter="url(#gx-control-shadow)">
      <rect x="124" y="42" width="496" height="478" rx="20" fill="#040506" stroke="#171b1e" stroke-width="5"/>
      <path d="M143 58 H601 L585 76 H159Z" fill="#50575c" opacity=".56"/>
      <path d="M143 58 L159 76 V487 L143 504Z" fill="#24292d"/>
      <path d="M601 58 L585 76 V487 L601 504Z" fill="#000"/>
      <path d="M143 504 L159 487 H585 L601 504Z" fill="#32383c"/>
      <rect x="158" y="75" width="428" height="414" rx="8" fill="url(#gx-screen)" stroke="#020303" stroke-width="4"/>
    </g>
    <text x="370" y="70" text-anchor="middle" fill="#d7b91f" font-family="Chakra Petch, sans-serif" font-size="24" font-weight="700" letter-spacing="3">GIMAEX</text>
    <g class="gx-screen-copy" filter="url(#gx-screen-glow)">
      <rect x="171" y="89" width="402" height="34" rx="4" fill="#0a151d" stroke="#3c5969"/>
      <text x="184" y="111" fill="#d7e4e9" font-size="13" font-weight="700">GIMAEX FT 12.1</text>
      <text x="558" y="111" text-anchor="end" fill="#91a8b3" font-size="11">POMPE · ARRIÈRE</text>
      <g fill="#0b151b" stroke="#547080" stroke-width="2">
        <circle cx="253" cy="250" r="62"/><circle cx="370" cy="237" r="82"/><circle cx="487" cy="250" r="62"/>
      </g>
      <g fill="none" stroke-linecap="round" stroke-width="7">
        <path d="M207 272 A52 52 0 0 1 291 215" stroke="#4dbe78"/>
        <path d="M305 260 A70 70 0 0 1 427 198" stroke="#58a9d5"/>
        <path d="M447 217 A52 52 0 0 1 535 267" stroke="#e7b736"/>
      </g>
      <g stroke="#f0f4f4" stroke-width="3" stroke-linecap="round">
        <line x1="253" y1="250" x2="225" y2="218"/><line x1="370" y1="237" x2="395" y2="177"/><line x1="487" y1="250" x2="520" y2="225"/>
      </g>
      <g fill="#d9e3e6" text-anchor="middle">
        <text x="253" y="326" font-size="11">ASPIRATION</text><text x="370" y="326" font-size="11">PRESSION</text>
        <text x="487" y="326" font-size="11">DÉBIT</text>
      </g>
      <rect x="181" y="346" width="382" height="44" rx="5" fill="#071015" stroke="#314954"/>
      <g fill="#8ed6ef" font-size="12">
        <text x="196" y="365">EAU 100 %</text><text x="544" y="365" text-anchor="end">MOUILLANT 100 %</text>
        <text x="196" y="382">0.0 bar</text><text x="544" y="382" text-anchor="end">0 L/min</text>
      </g>
      <g id="gx-display-overlay">
        <rect x="181" y="402" width="382" height="60" rx="6" fill="#060c10" stroke="#365261"/>
        <text id="gx-rpm" x="372" y="427" text-anchor="middle" font-size="15" font-weight="700" fill="#dce8df">800 tr/min · PDM non engagée</text>
        <text id="gx-pressure" x="372" y="449" text-anchor="middle" font-size="11" fill="#8ca2ac">Mode manuel · consigne 3 bar</text>
      </g>
    </g>
    <g class="gx-bolt">
      <circle cx="143" cy="60" r="6"/><circle cx="601" cy="60" r="6"/>
      <circle cx="143" cy="502" r="6"/><circle cx="601" cy="502" r="6"/>
    </g>

    <!-- Capteur de luminosité déporté à gauche de l'écran -->
    <g filter="url(#gx-control-shadow)">
      <circle cx="96" cy="340" r="18" fill="#15191b" stroke="#050606" stroke-width="4"/>
      <circle cx="96" cy="340" r="9" fill="#06090a" stroke="#66747b" stroke-width="2"/>
      <circle cx="92" cy="336" r="3" fill="#b7d6df" opacity=".5"/>
    </g>
    <rect x="60" y="369" width="72" height="18" rx="2" class="gx-plate"/>
    <text x="96" y="381" text-anchor="middle" class="gx-label" font-size="8">LUMINOSITÉ</text>

    <!-- Niveau supérieur : deux commutateurs irréguliers et levier de bord -->
    <g>
      <rect x="204" y="582" width="96" height="27" rx="3" class="gx-plate"/>
      <text x="252" y="594" text-anchor="middle" class="gx-label"><tspan x="252">ÉCLAIRAGE</tspan><tspan x="252" dy="10">ZONE POMPE</tspan></text>
      <g filter="url(#gx-control-shadow)">
        <circle cx="252" cy="640" r="28" fill="url(#gx-metal)" stroke="#050606" stroke-width="4"/>
        <circle cx="252" cy="640" r="18" fill="url(#gx-black-knob)"/>
        <path d="M241 630 L263 650" stroke="#d7dde0" stroke-width="6" stroke-linecap="round"/>
        <circle id="gx-pump-state" cx="273" cy="618" r="7" fill="#351711" stroke="#090a0a" stroke-width="2"/>
      </g>

      <rect x="358" y="582" width="98" height="27" rx="3" class="gx-plate"/>
      <text x="407" y="594" text-anchor="middle" class="gx-label"><tspan x="407">ALARME</tspan><tspan x="407" dy="10">DE REPLI</tspan></text>
      <g filter="url(#gx-control-shadow)">
        <circle cx="407" cy="640" r="27" fill="url(#gx-metal)" stroke="#050606" stroke-width="4"/>
        <rect x="393" y="625" width="28" height="31" rx="6" fill="url(#gx-black-knob)"/>
        <path d="M399 632 H415" stroke="#d2d8da" stroke-width="4" stroke-linecap="round"/>
        <circle id="gx-repli-state" cx="429" cy="618" r="7" fill="#351711" stroke="#090a0a" stroke-width="2"/>
      </g>

      <rect x="640" y="573" width="66" height="44" rx="3" class="gx-plate"/>
      <text x="673" y="586" text-anchor="middle" class="gx-label" font-size="7.6"><tspan x="673">ÉCLAIRAGE</tspan><tspan x="673" dy="9">TABLEAU</tspan><tspan x="673" dy="9">DE BORD</tspan></text>
      <g filter="url(#gx-control-shadow)">
        <rect x="665" y="625" width="42" height="72" rx="9" fill="#07090a" stroke="#262c2f" stroke-width="4"/>
        <path id="gx-table-lever" d="M687 677 L687 642" stroke="#111517" stroke-width="15" stroke-linecap="round"/>
        <path d="M681 645 H693" stroke="#aeb6ba" stroke-width="4" stroke-linecap="round"/>
        <circle id="gx-table-light" cx="687" cy="615" r="8" fill="#321912" stroke="#080909" stroke-width="2"/>
      </g>
    </g>

    <!-- Niveau médian -->
    <g>
      <rect x="54" y="706" width="100" height="28" rx="3" class="gx-plate"/>
      <text x="104" y="718" text-anchor="middle" class="gx-label"><tspan x="104">DÉVIDOIR G</tspan><tspan x="104" dy="10">MONTÉE · DESC.</tspan></text>
      <g id="gx-dev-g" filter="url(#gx-control-shadow)" style="transform-origin:104px 770px;transform-box:view-box;">
        <rect x="66" y="746" width="76" height="48" rx="12" fill="#15191b" stroke="#050606" stroke-width="4"/>
        <path d="M73 779 C76 753 95 746 116 756 C132 764 141 778 132 790 C125 799 113 795 105 789 C94 801 72 796 73 779Z" fill="url(#gx-yellow)" stroke="#755400" stroke-width="3"/>
        <circle cx="126" cy="785" r="7" fill="#c9a51b" stroke="#6e5000" stroke-width="2"/>
      </g>

      <rect x="218" y="714" width="96" height="27" rx="3" class="gx-plate"/>
      <text x="266" y="726" text-anchor="middle" class="gx-label"><tspan x="266">MISE EN ROUTE</tspan><tspan x="266" dy="10">RÉGULATION</tspan></text>
      <g filter="url(#gx-control-shadow)">
        <circle cx="266" cy="780" r="27" fill="#101514" stroke="#050606" stroke-width="4"/>
        <circle cx="266" cy="780" r="18" fill="#155a3b" stroke="#092b1d" stroke-width="3"/>
        <circle cx="260" cy="773" r="5" fill="#fff" opacity=".22"/>
        <circle id="gx-reg-light" cx="266" cy="780" r="18" fill="transparent"/>
      </g>

      <rect x="344" y="704" width="112" height="28" rx="3" class="gx-plate"/>
      <text x="400" y="721" text-anchor="middle" class="gx-label" font-size="10">ARRÊT D'URGENCE</text>
      <g filter="url(#gx-control-shadow)">
        <circle cx="400" cy="780" r="46" fill="url(#gx-yellow)" stroke="#6e5000" stroke-width="4"/>
        <circle cx="400" cy="780" r="34" fill="url(#gx-red-button)" stroke="#710a07" stroke-width="4"/>
        <ellipse cx="389" cy="768" rx="9" ry="6" fill="#fff" opacity=".22"/>
        <circle id="gx-emergency-state" cx="400" cy="780" r="36" fill="transparent"/>
      </g>

      <rect x="552" y="714" width="94" height="27" rx="3" class="gx-plate"/>
      <text x="599" y="726" text-anchor="middle" class="gx-label"><tspan x="599">ENROULEMENT</tspan><tspan x="599" dy="10">LDT</tspan></text>
      <g filter="url(#gx-control-shadow)">
        <circle cx="599" cy="780" r="28" fill="url(#gx-metal)" stroke="#050606" stroke-width="4"/>
        <circle cx="599" cy="780" r="20" fill="url(#gx-black-knob)"/>
        <ellipse cx="592" cy="772" rx="6" ry="4" fill="#fff" opacity=".14"/>
        <circle id="gx-ldt-state" cx="628" cy="750" r="7" fill="#201913" stroke="#070808" stroke-width="2"/>
      </g>
    </g>

    <!-- Niveau inférieur -->
    <g>
      <rect x="54" y="846" width="100" height="28" rx="3" class="gx-plate"/>
      <text x="104" y="858" text-anchor="middle" class="gx-label"><tspan x="104">DÉVIDOIR D</tspan><tspan x="104" dy="10">MONTÉE · DESC.</tspan></text>
      <g id="gx-dev-d" filter="url(#gx-control-shadow)" style="transform-origin:104px 910px;transform-box:view-box;">
        <rect x="66" y="886" width="76" height="48" rx="12" fill="#15191b" stroke="#050606" stroke-width="4"/>
        <path d="M73 919 C76 893 95 886 116 896 C132 904 141 918 132 930 C125 939 113 935 105 929 C94 941 72 936 73 919Z" fill="url(#gx-yellow)" stroke="#755400" stroke-width="3"/>
        <circle cx="126" cy="925" r="7" fill="#c9a51b" stroke="#6e5000" stroke-width="2"/>
      </g>

      <rect x="223" y="850" width="86" height="24" rx="3" class="gx-plate"/>
      <text x="266" y="866" text-anchor="middle" class="gx-label">RÉGIME MOTEUR −</text>
      <g filter="url(#gx-control-shadow)">
        <circle cx="266" cy="910" r="27" fill="#0c1b31" stroke="#050606" stroke-width="4"/>
        <circle cx="266" cy="910" r="19" fill="#225daa" stroke="#10325f" stroke-width="3"/>
        <path d="M256 910 H276" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
      </g>

      <rect x="364" y="850" width="86" height="24" rx="3" class="gx-plate"/>
      <text x="407" y="866" text-anchor="middle" class="gx-label">RÉGIME MOTEUR +</text>
      <g filter="url(#gx-control-shadow)">
        <circle cx="407" cy="910" r="27" fill="#0c1b31" stroke="#050606" stroke-width="4"/>
        <circle cx="407" cy="910" r="19" fill="#225daa" stroke="#10325f" stroke-width="3"/>
        <path d="M397 910 H417 M407 900 V920" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
      </g>

      <rect x="535" y="839" width="100" height="35" rx="3" class="gx-plate"/>
      <text x="585" y="851" text-anchor="middle" class="gx-label" font-size="8"><tspan x="585">ISOLEMENT D'AIR</tspan><tspan x="585" dy="9">VANNES PNEUM.</tspan><tspan x="585" dy="9">AUTO · MANUEL</tspan></text>
      <g filter="url(#gx-control-shadow)">
        <ellipse cx="585" cy="900" rx="38" ry="31" fill="#111617" stroke="#050606" stroke-width="4"/>
        <g id="gx-iso-lever" style="transform-origin:585px 900px;transform-box:view-box;">
          <path d="M553 908 C557 883 577 876 598 885 C614 892 625 905 617 917 C611 927 598 924 590 918 C578 929 555 925 553 908Z" fill="#1c7c42" stroke="#0b3f22" stroke-width="3"/>
          <circle cx="611" cy="913" r="7" fill="#b8c0bd" stroke="#59615e" stroke-width="2"/>
        </g>
      </g>
    </g>

    <!-- Visserie et marques d'usage -->
    <g class="gx-bolt">
      <circle cx="60" cy="48" r="6"/><circle cx="680" cy="48" r="6"/>
      <circle cx="60" cy="952" r="6"/><circle cx="680" cy="952" r="6"/>
    </g>
    <g fill="none" stroke="#5f0a08" stroke-linecap="round" opacity=".35">
      <path d="M166 550 q32 -8 64 0" stroke-width="2"/><path d="M472 680 q42 8 84 -3" stroke-width="2"/>
      <path d="M165 948 q70 12 134 2" stroke-width="3"/>
    </g>
  </svg>`
  };

  /* --- FPT GIMAEX : écran cabine --- */
  S['gimaex-cabine-legacy'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <rect x="30" y="26" width="940" height="568" rx="16" fill="#15151f" stroke="#3a3a4c" stroke-width="3" filter="url(#soft)"/>
    <text x="500" y="66" text-anchor="middle" fill="#8a94b8" font-family="Chakra Petch" font-weight="700" font-size="30" letter-spacing="5">GIMAEX</text>
    <!-- boutons latéraux -->
    <g fill="url(#valG)" stroke="#55556a" stroke-width="3">
      <rect x="62" y="96" width="58" height="46" rx="10"/><rect x="62" y="188" width="58" height="46" rx="10"/><rect x="62" y="280" width="58" height="46" rx="10"/><rect x="62" y="368" width="58" height="46" rx="10"/><rect x="62" y="466" width="58" height="46" rx="10"/>
      <rect x="880" y="96" width="58" height="46" rx="10"/><rect x="880" y="188" width="58" height="46" rx="10"/><rect x="880" y="280" width="58" height="46" rx="10"/><rect x="880" y="368" width="58" height="46" rx="10"/><rect x="880" y="466" width="58" height="46" rx="10"/>
    </g>
    <g fill="#c0392b">
      <path d="M132 119 l26 -8 v16 z" transform="rotate(180 145 119)"/><path d="M132 211 l26 -8 v16 z" transform="rotate(180 145 211)"/><path d="M132 391 l26 -8 v16 z" transform="rotate(180 145 391)"/><path d="M132 489 l26 -8 v16 z" transform="rotate(180 145 489)"/>
      <path d="M842 119 l26 -8 v16 z"/><path d="M842 211 l26 -8 v16 z"/><path d="M842 391 l26 -8 v16 z"/><path d="M842 489 l26 -8 v16 z"/>
    </g>
    <!-- écran -->
    <rect x="250" y="86" width="500" height="470" rx="10" fill="#28303a" stroke="#4a4a5c" stroke-width="3"/>
    <rect x="262" y="98" width="476" height="30" rx="4" fill="#10161e"/>
    <text x="274" y="120" fill="#c8d0e8" font-family="IBM Plex Mono" font-size="17">20/11/2023 - 07:49</text>
    <text x="730" y="120" text-anchor="end" fill="#c8d0e8" font-family="IBM Plex Mono" font-size="17">23.7 V</text>
    <!-- niveaux citernes -->
    <circle cx="500" cy="320" r="118" fill="#0c1218" stroke="#3a4652" stroke-width="3"/>
    <rect x="432" y="306" width="136" height="26" rx="5" fill="#1b232d" stroke="#3a4652" stroke-width="1.5"/>
    <text x="500" y="325" text-anchor="middle" fill="#c8d0e8" font-family="IBM Plex Mono" font-size="15">Niveaux citernes</text>
    <path d="M448 262 A70 70 0 0 1 552 262" fill="none" stroke="#3aa8c9" stroke-width="9" stroke-linecap="round"/>
    <path d="M448 380 A70 70 0 0 0 552 380" fill="none" stroke="#27ae60" stroke-width="9" stroke-linecap="round"/>
    <text x="500" y="250" text-anchor="middle" fill="#3aa8c9" font-family="IBM Plex Mono" font-size="15">EAU 0 %</text>
    <text x="500" y="404" text-anchor="middle" fill="#27ae60" font-family="IBM Plex Mono" font-size="15">MOUILLANT 0 %</text>
    <!-- icônes périphériques -->
    <g fill="#10161e" stroke="#3a4652" stroke-width="2.5">
      <circle cx="470" cy="149" r="17"/><circle cx="620" cy="136" r="17"/><circle cx="350" cy="198" r="17"/><circle cx="350" cy="341" r="17"/><circle cx="620" cy="465" r="17"/><circle cx="680" cy="397" r="17"/><circle cx="660" cy="223" r="17"/><circle cx="600" cy="99" r="0"/>
    </g>
    <g>
      <circle cx="470" cy="149" r="7" fill="#8a94b8"/><circle cx="620" cy="136" r="7" fill="#e67e22"/><circle cx="350" cy="198" r="7" fill="#e67e22"/><circle cx="350" cy="341" r="7" fill="#3aa8c9"/><circle cx="620" cy="465" r="7" fill="#d4ac2b"/><circle cx="680" cy="397" r="7" fill="#d4ac2b"/><circle cx="660" cy="223" r="7" fill="#e67e22"/>
    </g>
    <text x="500" y="538" text-anchor="middle" fill="#c8d0e8" font-family="IBM Plex Mono" font-size="18">⊙ 0 Bar</text>
  </svg>` };

  /* Vue active : photographie réelle de l'écran du poste de conduite.
     Le dessin précédent reste disponible sous la clé -legacy uniquement
     comme sauvegarde logique ; aucun module ne l'affiche. */
  S['gimaex-cabine'] = {
    aspect: '1000 / 620',
    className: 'schema-photo schema-gimaex-screen schema-gimaex-cabin-photo',
    svg: `
  <svg viewBox="0 0 1000 620" data-photo-base-height="620" role="img" aria-labelledby="gxc-photo-title" preserveAspectRatio="xMidYMid meet">
    <title id="gxc-photo-title">Écran GIMAEX du poste de conduite</title>
    <rect data-photo-background width="1000" height="620" fill="#05090d"/>
    <text x="500" y="300" text-anchor="middle" fill="#6f7d87" font-family="IBM Plex Mono" font-size="18">Image attendue :</text>
    <text x="500" y="330" text-anchor="middle" fill="#9ba9b2" font-family="IBM Plex Mono" font-size="17">assets/gimaex/ecran-cabine-gimaex.png</text>
    <image class="gimaex-screen-photo" href="assets/gimaex/ecran-cabine-gimaex.png"
      x="0" y="0" width="1000" height="620" preserveAspectRatio="xMidYMid meet"/>
  </svg>`
  };

  /* --- Système feu : coupe d'un local --- */
  S['systeme-feu'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <rect x="134" y="84" width="732" height="460" fill="#14141f"/>
    <!-- parois -->
    <path d="M120 300 V70 H880 V550 H120" fill="none" stroke="#565686" stroke-width="14" stroke-linejoin="round"/>
    <line x1="40" y1="550" x2="120" y2="550" stroke="#2a2a4c" stroke-width="6"/>
    <!-- fumées (zone gazeuse haute) -->
    <rect x="134" y="84" width="732" height="178" fill="url(#smokeG)"/>
    <path d="M134 262 q60 -18 120 0 t120 0 t120 0 t120 0 t120 0 t120 0" fill="none" stroke="#5a5a76" stroke-width="4" opacity=".6"/>
    <!-- source + flamme -->
    <ellipse cx="665" cy="545" rx="110" ry="10" fill="#000" opacity="0.35"/>
    <rect x="590" y="475" width="150" height="70" rx="10" fill="#2e2438" stroke="#4a3a5a" stroke-width="3"/>
    <path d="M665 470 q-36 -60 -8 -104 q6 26 26 36 q-8 -44 22 -72 q-2 40 22 62 q16 18 10 44 q-10 44 -72 34" fill="url(#flameG)" opacity=".95"/>
    <g stroke="#8a94b8" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round">
      <path d="M612 470 q-8 -22 4 -40"/><path d="M740 468 q10 -20 0 -38"/>
    </g>
    <!-- échanges air / gaz chauds à la porte -->
    <path d="M50 500 H210" stroke="#27ae60" stroke-width="6" marker-end="url(#agr)" fill="none" stroke-dasharray="14 18" style="animation:flowdash 1s linear infinite;"/>
    <path d="M210 330 H56" stroke="#e67e22" stroke-width="6" marker-end="url(#aam)" fill="none" stroke-dasharray="14 18" style="animation:flowdash 1s linear infinite;"/>
  </svg>` };

  /* --- Phénomènes : courbe de développement du feu --- */
  S['phenomenes'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <g stroke="#44446e" stroke-width="3"><line x1="100" y1="520" x2="940" y2="520"/><line x1="100" y1="520" x2="100" y2="80"/></g>
    <text x="920" y="552" text-anchor="end" fill="#62628a" font-family="IBM Plex Mono" font-size="18">temps</text>
    <text x="88" y="96" text-anchor="end" fill="#62628a" font-family="IBM Plex Mono" font-size="18" transform="rotate(-90 88 96)" style="transform-box:fill-box;">puissance</text>
    <!-- courbe FLC (feu correctement ventilé) -->
    <path d="M100 512 C220 502 292 458 340 380 C378 316 420 226 470 194 L620 198 C710 214 806 350 910 484" fill="none" stroke="#e67e22" stroke-width="6" stroke-linecap="round"/>
    <!-- flashover : montée brutale -->
    <path d="M348 372 C384 312 424 230 462 200" fill="none" stroke="#e74c3c" stroke-width="9" stroke-linecap="round" opacity=".85"/>
    <!-- branche FLV (feu sous-ventilé) -->
    <path d="M340 380 C430 424 540 456 660 470" fill="none" stroke="#8a94b8" stroke-width="5" stroke-dasharray="10 10"/>
    <!-- backdraft : reprise explosive -->
    <path d="M660 470 L706 312" fill="none" stroke="#e74c3c" stroke-width="5" stroke-dasharray="8 8" marker-end="url(#ard)"/>
    <g fill="#e74c3c" opacity=".9"><path d="M706 292 l8 18 18 -6 -10 16 14 12 -19 2 2 19 -13 -14 -16 10 6 -18 -17 -8 19 -5 z"/></g>
  </svg>` };

  /* --- Ventilation : coupe deux locaux + VPP --- */
  S['ventilation'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <rect x="232" y="110" width="656" height="430" fill="#14141f"/>
    <path d="M220 380 V100 H900 V140 M900 220 V540 H220" fill="none" stroke="#565686" stroke-width="13" stroke-linejoin="round"/>
    <path d="M580 100 V400 M580 540 V470" stroke="#565686" stroke-width="11"/>
    <!-- fumées local en feu + un peu au-dessus de la porte intérieure -->
    <rect x="592" y="112" width="296" height="150" fill="url(#smokeG)"/>
    <!-- foyer -->
    <path d="M760 535 q-28 -48 -6 -84 q5 21 21 29 q-6 -35 18 -58 q-2 32 18 50 q13 15 8 36 q-8 35 -59 27" fill="url(#flameG)"/>
    <!-- VPP -->
    <ellipse cx="140" cy="548" rx="58" ry="9" fill="#000" opacity="0.35"/>
    <circle cx="140" cy="468" r="40" fill="url(#valG)" stroke="#68689a" stroke-width="4" filter="url(#soft)"/>
    <g style="transform-box:fill-box;transform-origin:center;animation:spin 1.2s linear infinite;" stroke="#8a94b8" stroke-width="6" stroke-linecap="round" fill="none">
      <path d="M140 468 L140 438"/><path d="M140 468 L166 483"/><path d="M140 468 L114 483"/>
    </g>
    <g stroke="#41416a" stroke-width="7" stroke-linecap="round"><line x1="122" y1="502" x2="104" y2="545"/><line x1="158" y1="502" x2="176" y2="545"/></g>
    <!-- cône d'air + veine -->
    <g stroke="#4B8FE0" stroke-width="2.5" stroke-dasharray="6 8" opacity=".6"><line x1="172" y1="442" x2="228" y2="392"/><line x1="172" y1="496" x2="228" y2="532"/></g>
    <path d="M180 468 H520 M600 470 H700" stroke="#27ae60" stroke-width="6" fill="none" marker-end="url(#agr)" stroke-dasharray="14 18" style="animation:flowdash .9s linear infinite;"/>
    <!-- sortant -->
    <path d="M868 180 H952" stroke="#e67e22" stroke-width="7" fill="none" marker-end="url(#aam)" stroke-dasharray="12 16" style="animation:flowdash .9s linear infinite;"/>
  </svg>` };

  /* --- Établissements : de l'hydrant aux lances --- */
  S['extinction'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <line x1="30" y1="560" x2="970" y2="560" stroke="#2a2a4c" stroke-width="3"/>
    <!-- tuyaux -->
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <g stroke="#101020" stroke-width="18"><path d="M108 520 H225"/><path d="M382 505 H560"/><path d="M596 494 Q660 440 716 404"/><path d="M596 516 Q670 548 738 544"/></g>
      <g stroke="#41416a" stroke-width="10"><path d="M108 520 H225"/><path d="M382 505 H560"/><path d="M596 494 Q660 440 716 404"/><path d="M596 516 Q670 548 738 544"/></g>
    </g>
    <!-- hydrant -->
    <ellipse cx="80" cy="556" rx="46" ry="8" fill="#000" opacity="0.35"/>
    <rect x="54" y="432" width="52" height="120" rx="9" fill="url(#redP)" stroke="#5a2018" stroke-width="3" filter="url(#soft)"/>
    <ellipse cx="80" cy="432" rx="26" ry="10" fill="#c74a3a" stroke="#5a2018" stroke-width="3"/>
    <!-- engin-pompe -->
    <ellipse cx="302" cy="552" rx="96" ry="10" fill="#000" opacity="0.35"/>
    <rect x="225" y="430" width="156" height="104" rx="11" fill="url(#engG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
    <rect x="233" y="438" width="12" height="88" rx="6" fill="#ffffff" opacity="0.05"/>
    <g fill="url(#valG)" stroke="#68689a" stroke-width="3"><circle cx="262" cy="536" r="20"/><circle cx="344" cy="536" r="20"/></g>
    <!-- division -->
    <circle cx="578" cy="505" r="17" fill="url(#valG)" stroke="#8a94b8" stroke-width="3"/>
    <line x1="561" y1="505" x2="595" y2="505" stroke="#8a94b8" stroke-width="3"/>
    <!-- BAT : porte-lance + jet -->
    <g fill="#3aa8c9"><circle cx="728" cy="384" r="11"/><circle cx="752" cy="396" r="11"/></g>
    <path d="M746 386 L800 350" stroke="#8a94b8" stroke-width="7" stroke-linecap="round"/>
    <path d="M800 350 L866 320" stroke="#4B8FE0" stroke-width="5" stroke-dasharray="3 9" opacity=".85"/>
    <g fill="#3aa8c9"><circle cx="752" cy="528" r="11"/><circle cx="776" cy="540" r="11"/></g>
    <path d="M770 530 L822 500" stroke="#8a94b8" stroke-width="7" stroke-linecap="round"/>
    <path d="M822 500 L878 470" stroke="#4B8FE0" stroke-width="5" stroke-dasharray="3 9" opacity=".85"/>
    <!-- bâtiment sinistré -->
    <rect x="842" y="280" width="120" height="280" rx="6" fill="url(#tankBody)" stroke="#5a6488" stroke-width="3" filter="url(#soft)"/>
    <g fill="#0d0d20" stroke="#44446e" stroke-width="2"><rect x="862" y="310" width="34" height="40" rx="3"/><rect x="910" y="310" width="34" height="40" rx="3"/><rect x="862" y="390" width="34" height="40" rx="3"/><rect x="910" y="390" width="34" height="40" rx="3"/></g>
    <path d="M879 348 q-14 -24 -3 -42 q3 11 11 15 q-3 -18 9 -29 q-1 16 9 25 q7 8 4 18 q-4 18 -30 13" fill="url(#flameG)"/>
  </svg>` };

  /* --- Sauvetage & mise en sécurité --- */
  S['sauvetage'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <line x1="40" y1="560" x2="960" y2="560" stroke="#2a2a4c" stroke-width="3"/>
    <!-- immeuble -->
    <rect x="300" y="90" width="280" height="470" rx="6" fill="url(#tankBody)" stroke="#5a6488" stroke-width="4" filter="url(#soft)"/>
    <g stroke="#44446e" stroke-width="3"><line x1="300" y1="250" x2="580" y2="250"/><line x1="300" y1="400" x2="580" y2="400"/></g>
    <g fill="#0d0d20" stroke="#44446e" stroke-width="2">
      <rect x="330" y="130" width="56" height="72" rx="4"/><rect x="470" y="130" width="56" height="72" rx="4"/>
      <rect x="330" y="286" width="56" height="72" rx="4"/><rect x="470" y="286" width="56" height="72" rx="4"/>
      <rect x="400" y="455" width="70" height="105" rx="4"/>
    </g>
    <!-- escalier (communications existantes) -->
    <path d="M410 548 h14 v-14 h14 v-14 h14 v-14 h14" fill="none" stroke="#8a94b8" stroke-width="4"/>
    <!-- feu au 1er + victime au 2e -->
    <path d="M356 356 q-13 -22 -3 -38 q3 10 10 13 q-3 -16 8 -26 q-1 14 8 22 q6 7 4 16 q-4 16 -27 13" fill="url(#flameG)"/>
    <circle cx="498" cy="156" r="12" fill="#e8c39a"/><path d="M498 168 v22 m0 -16 l-14 10 m14 -10 l14 10" stroke="#e8c39a" stroke-width="5" stroke-linecap="round" fill="none"/>
    <!-- échelle à coulisse -->
    <g stroke="#8a6a1a" stroke-width="6" stroke-linecap="round">
      <line x1="180" y1="560" x2="300" y2="268"/><line x1="216" y1="568" x2="336" y2="276"/>
    </g>
    <g stroke="#b8922a" stroke-width="4" stroke-linecap="round">
      <line x1="192" y1="532" x2="228" y2="540"/><line x1="206" y1="498" x2="242" y2="506"/><line x1="220" y1="464" x2="256" y2="472"/><line x1="234" y1="430" x2="270" y2="438"/><line x1="248" y1="396" x2="284" y2="404"/><line x1="262" y1="362" x2="298" y2="370"/><line x1="276" y1="328" x2="312" y2="336"/><line x1="290" y1="294" x2="326" y2="302"/>
    </g>
    <!-- LSPCC depuis la toiture -->
    <path d="M580 100 H636 V330" fill="none" stroke="#2a6fdb" stroke-width="4"/>
    <path d="M614 330 L636 368 L658 330 Z" fill="#c0392b" stroke="#7e2418" stroke-width="3"/>
    <circle cx="636" cy="318" r="10" fill="#e8c39a"/>
    <!-- zone de regroupement -->
    <circle cx="850" cy="480" r="74" fill="none" stroke="#27ae60" stroke-width="3" stroke-dasharray="10 10"/>
    <g fill="#27ae60"><circle cx="828" cy="470" r="9"/><circle cx="858" cy="456" r="9"/><circle cx="868" cy="492" r="9"/></g>
    <path d="M600 522 H752" stroke="#27ae60" stroke-width="6" fill="none" marker-end="url(#agr)" stroke-dasharray="14 18" style="animation:flowdash 1s linear infinite;"/>
  </svg>` };

  /* --- Engagement en milieu vicié : vue en plan --- */
  S['milieu-vicie'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <!-- bâtiment enfumé -->
    <rect x="520" y="110" width="420" height="440" rx="6" fill="#181826" stroke="#565686" stroke-width="6"/>
    <g stroke="#3a3a52" stroke-width="3" opacity=".5"><line x1="540" y1="140" x2="920" y2="520"/><line x1="620" y1="130" x2="930" y2="440"/><line x1="540" y1="260" x2="830" y2="540"/><line x1="540" y1="390" x2="700" y2="544"/></g>
    <!-- point de pénétration -->
    <rect x="508" y="288" width="24" height="84" fill="#14141f"/>
    <path d="M520 288 A84 84 0 0 1 604 372" fill="none" stroke="#565686" stroke-width="3" stroke-dasharray="6 7"/>
    <!-- zone contrôlée -->
    <line x1="280" y1="90" x2="280" y2="570" stroke="#e67e22" stroke-width="3" stroke-dasharray="12 10" opacity=".7"/>
    <!-- ligne guide vers le binôme -->
    <path d="M532 330 C620 322 650 268 712 252" fill="none" stroke="#e67e22" stroke-width="4" stroke-dasharray="10 9"/>
    <g fill="#3aa8c9" stroke="#14507a" stroke-width="2.5"><circle cx="724" cy="246" r="13"/><circle cx="750" cy="262" r="13"/></g>
    <!-- contrôleur + TGR -->
    <circle cx="424" cy="330" r="15" fill="#e67e22" stroke="#8a4a10" stroke-width="3"/>
    <rect x="330" y="196" width="84" height="112" rx="7" fill="url(#engG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
    <g stroke="#8a94b8" stroke-width="3" stroke-linecap="round"><line x1="344" y1="222" x2="400" y2="222"/><line x1="344" y1="248" x2="400" y2="248"/><line x1="344" y1="274" x2="400" y2="274"/></g>
    <!-- binôme de sécurité -->
    <g fill="#27ae60" stroke="#0e4a30" stroke-width="2.5"><circle cx="410" cy="452" r="13"/><circle cx="440" cy="452" r="13"/></g>
    <!-- engin -->
    <ellipse cx="140" cy="532" rx="78" ry="9" fill="#000" opacity="0.35"/>
    <rect x="76" y="434" width="128" height="88" rx="10" fill="url(#engG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
    <g fill="url(#valG)" stroke="#68689a" stroke-width="3"><circle cx="106" cy="522" r="16"/><circle cx="174" cy="522" r="16"/></g>
  </svg>` };

  /* --- ARI : vue d'ensemble de l'appareil --- */
  S['arico'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <ellipse cx="520" cy="552" rx="200" ry="14" fill="#000" opacity="0.35"/>
    <!-- dossard -->
    <rect x="424" y="146" width="48" height="340" rx="18" fill="url(#engG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
    <g stroke="#41416a" stroke-width="9" stroke-linecap="round" fill="none"><path d="M428 190 Q380 230 396 300"/><path d="M428 420 Q386 440 392 480"/></g>
    <!-- bouteille -->
    <rect x="486" y="162" width="76" height="302" rx="38" fill="url(#ariY)" stroke="#6a5210" stroke-width="3" filter="url(#soft)"/>
    <rect x="498" y="180" width="14" height="260" rx="7" fill="#ffffff" opacity="0.22"/>
    <!-- robinet -->
    <rect x="512" y="118" width="24" height="46" rx="6" fill="url(#valG)" stroke="#8a94b8" stroke-width="3"/>
    <circle cx="552" cy="132" r="14" fill="none" stroke="#8a94b8" stroke-width="5"/>
    <!-- détendeur HP/MP -->
    <rect x="494" y="470" width="58" height="38" rx="8" fill="url(#valG)" stroke="#8a94b8" stroke-width="3" filter="url(#soft)"/>
    <!-- flexible MP vers la SAD -->
    <path d="M552 488 C660 480 686 380 716 322" fill="none" stroke="#41416a" stroke-width="9" stroke-linecap="round"/>
    <circle cx="726" cy="306" r="25" fill="url(#valG)" stroke="#8a94b8" stroke-width="3" filter="url(#soft)"/>
    <!-- pièce faciale -->
    <ellipse cx="822" cy="258" rx="40" ry="55" fill="#202038" stroke="#68689a" stroke-width="4" filter="url(#soft)"/>
    <ellipse cx="822" cy="244" rx="27" ry="32" fill="#3aa8c9" opacity=".28" stroke="#3aa8c9" stroke-width="2"/>
    <path d="M750 300 Q782 306 792 296" stroke="#41416a" stroke-width="7" fill="none" stroke-linecap="round"/>
    <!-- flexible HP : manomètre + sifflet -->
    <path d="M494 484 C420 502 380 470 362 424" fill="none" stroke="#101020" stroke-width="6" stroke-linecap="round"/>
    <circle cx="354" cy="406" r="22" fill="url(#valG)" stroke="#8a94b8" stroke-width="3" filter="url(#soft)"/>
    <line x1="354" y1="406" x2="366" y2="392" stroke="#e8e9f3" stroke-width="3" stroke-linecap="round"/>
    <!-- bodyguard -->
    <rect x="368" y="286" width="38" height="56" rx="7" fill="#12122a" stroke="#e67e22" stroke-width="3" filter="url(#soft)"/>
    <rect x="375" y="296" width="24" height="18" rx="3" fill="#2a5a3a"/>
  </svg>` };

  /* --- ARI : matériel périphérique (ligne guide, liaison personnelle, ligne de vie, cagoule, prise auxiliaire) --- */
  S['arico-peripheriques'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <line x1="40" y1="560" x2="960" y2="560" stroke="#2a2a4c" stroke-width="3"/>
    <!-- Ligne guide : tambour + olives -->
    <g transform="translate(180 186)">
      <circle r="70" fill="url(#valG)" stroke="#8a94b8" stroke-width="4" filter="url(#soft)"/>
      <circle r="52" fill="none" stroke="#c8d0e8" stroke-width="6"/>
      <circle r="36" fill="none" stroke="#c8d0e8" stroke-width="6"/>
      <circle r="20" fill="none" stroke="#c8d0e8" stroke-width="6"/>
      <circle r="9" fill="#12122a" stroke="#8a94b8" stroke-width="3"/>
      <path d="M64 46 C 100 56 120 60 140 66" fill="none" stroke="#9a9ab8" stroke-width="5"/>
      <g fill="#e67e22"><circle cx="100" cy="56" r="7"/><circle cx="122" cy="62" r="7"/><circle cx="140" cy="66" r="7"/></g>
    </g>
    <text x="180" y="300" text-anchor="middle" fill="#8a94b8" font-family="IBM Plex Mono" font-size="15">50 m · Ø 6-8 mm</text>
    <!-- Liaison personnelle : cordelette lovée + 2 mousquetons (chef / équipier) -->
    <g transform="translate(420 186)">
      <ellipse rx="66" ry="52" fill="none" stroke="#b0b0cc" stroke-width="8"/>
      <ellipse rx="48" ry="38" fill="none" stroke="#9a9ab8" stroke-width="8"/>
      <ellipse rx="30" ry="24" fill="none" stroke="#b0b0cc" stroke-width="8"/>
      <rect x="-92" y="-18" width="24" height="36" rx="11" fill="none" stroke="#8a94b8" stroke-width="6" transform="rotate(-16 -80 0)"/>
      <rect x="68" y="-18" width="24" height="36" rx="11" fill="none" stroke="#8a94b8" stroke-width="6" transform="rotate(16 80 0)"/>
    </g>
    <text x="420" y="300" text-anchor="middle" fill="#8a94b8" font-family="IBM Plex Mono" font-size="15">6 m · Ø 4 mm</text>
    <!-- Ligne de vie = liaison personnelle + ligne guide -->
    <g transform="translate(630 186)">
      <rect x="-92" y="-66" width="184" height="132" rx="16" fill="none" stroke="#3aa8c9" stroke-width="3" stroke-dasharray="6 8"/>
      <circle cx="-46" cy="0" r="30" fill="none" stroke="#9a9ab8" stroke-width="7"/>
      <circle cx="-46" cy="0" r="16" fill="none" stroke="#b0b0cc" stroke-width="6"/>
      <text x="4" y="11" text-anchor="middle" fill="#3aa8c9" font-family="Chakra Petch" font-weight="700" font-size="30">+</text>
      <circle cx="52" cy="0" r="30" fill="url(#valG)" stroke="#8a94b8" stroke-width="4"/>
      <circle cx="52" cy="0" r="12" fill="#12122a" stroke="#8a94b8" stroke-width="3"/>
    </g>
    <text x="630" y="300" text-anchor="middle" fill="#3aa8c9" font-family="IBM Plex Mono" font-size="14">liaison perso + ligne guide</text>
    <!-- Cagoule d'évacuation -->
    <g transform="translate(840 186)">
      <path d="M-64 36 Q-74 -54 0 -64 Q74 -54 64 36 Q0 56 -64 36 Z" fill="#c76a1e" stroke="#7a3f10" stroke-width="4" filter="url(#soft)"/>
      <ellipse cx="0" cy="-6" rx="32" ry="34" fill="#1a1a2e" opacity=".72" stroke="#7a3f10" stroke-width="3"/>
      <path d="M-52 40 Q0 60 52 40" fill="none" stroke="#e8c33a" stroke-width="5" stroke-dasharray="7 6"/>
      <path d="M54 26 C 96 30 112 40 128 52" fill="none" stroke="#41416a" stroke-width="8" stroke-linecap="round"/>
    </g>
    <text x="840" y="300" text-anchor="middle" fill="#8a94b8" font-family="IBM Plex Mono" font-size="15">1,5 m · 40 L/min</text>
    <!-- Prise auxiliaire (narguilé) : femelle / mâle -->
    <g transform="translate(300 459)">
      <rect x="-68" y="-20" width="54" height="40" rx="8" fill="url(#valG)" stroke="#8a94b8" stroke-width="3" filter="url(#soft)"/>
      <circle cx="-41" cy="0" r="11" fill="#12122a" stroke="#8a94b8" stroke-width="3"/>
      <path d="M-14 0 H26" stroke="#41416a" stroke-width="10" stroke-linecap="round"/>
      <rect x="26" y="-16" width="48" height="32" rx="7" fill="url(#engG)" stroke="#e67e22" stroke-width="3" filter="url(#soft)"/>
      <circle cx="64" cy="0" r="9" fill="#20203a" stroke="#e67e22" stroke-width="3"/>
    </g>
    <text x="300" y="512" text-anchor="middle" fill="#8a94b8" font-family="IBM Plex Mono" font-size="15">femelle ← → mâle</text>
    <text x="500" y="588" text-anchor="middle" fill="#62628a" font-family="IBM Plex Mono" font-size="17">touchez un repère numéroté</text>
  </svg>` };

  /* --- LSPCC : le lot déployé --- */
  S['lspcc'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <!-- sac jaune citron -->
    <ellipse cx="210" cy="478" rx="110" ry="13" fill="#000" opacity="0.35"/>
    <rect x="120" y="238" width="180" height="230" rx="26" fill="url(#ariY)" stroke="#6a5210" stroke-width="3" filter="url(#soft)"/>
    <path d="M120 300 H300" stroke="#8a6a1a" stroke-width="4"/>
    <rect x="136" y="252" width="16" height="200" rx="8" fill="#ffffff" opacity="0.2"/>
    <path d="M170 238 Q210 196 250 238" fill="none" stroke="#6a5210" stroke-width="9" stroke-linecap="round"/>
    <!-- corde en couronne -->
    <ellipse cx="440" cy="348" rx="92" ry="78" fill="none" stroke="#b0b0cc" stroke-width="9" filter="url(#soft)"/>
    <ellipse cx="440" cy="348" rx="72" ry="60" fill="none" stroke="#9a9ab8" stroke-width="9"/>
    <ellipse cx="440" cy="348" rx="52" ry="42" fill="none" stroke="#b0b0cc" stroke-width="9"/>
    <!-- commande (cordelette) -->
    <ellipse cx="310" cy="536" rx="36" ry="26" fill="none" stroke="#8a6a1a" stroke-width="6"/>
    <ellipse cx="310" cy="536" rx="20" ry="13" fill="none" stroke="#b8922a" stroke-width="5"/>
    <!-- frein de charge (huit) -->
    <circle cx="590" cy="172" r="26" fill="none" stroke="#8a94b8" stroke-width="10" filter="url(#soft)"/>
    <circle cx="590" cy="226" r="18" fill="none" stroke="#8a94b8" stroke-width="10"/>
    <!-- mousquetons -->
    <g fill="none" stroke="#8a94b8" stroke-width="8">
      <rect x="566" y="310" width="34" height="52" rx="16" transform="rotate(-14 583 336)"/>
      <rect x="606" y="322" width="34" height="52" rx="16" transform="rotate(12 623 348)"/>
    </g>
    <line x1="598" y1="318" x2="606" y2="350" stroke="#c8d0e8" stroke-width="4"/>
    <!-- poulie -->
    <rect x="568" y="436" width="52" height="66" rx="12" fill="url(#valG)" stroke="#8a94b8" stroke-width="3" filter="url(#soft)"/>
    <circle cx="594" cy="474" r="17" fill="#12122a" stroke="#8a94b8" stroke-width="3"/>
    <circle cx="594" cy="428" r="9" fill="none" stroke="#8a94b8" stroke-width="5"/>
    <!-- harnais cuissard -->
    <ellipse cx="788" cy="196" rx="66" ry="27" fill="none" stroke="#e67e22" stroke-width="11" filter="url(#soft)"/>
    <ellipse cx="760" cy="258" rx="27" ry="18" fill="none" stroke="#e67e22" stroke-width="9"/>
    <ellipse cx="818" cy="258" rx="27" ry="18" fill="none" stroke="#e67e22" stroke-width="9"/>
    <!-- triangle d'évacuation -->
    <path d="M740 470 L800 368 L860 470 Q800 496 740 470 Z" fill="#c0392b" stroke="#7e2418" stroke-width="4" filter="url(#soft)"/>
    <g fill="none" stroke="#e8e9f3" stroke-width="4"><circle cx="800" cy="376" r="8"/><circle cx="748" cy="464" r="8"/><circle cx="852" cy="464" r="8"/></g>
    <!-- anneaux cousus -->
    <ellipse cx="916" cy="300" rx="34" ry="14" fill="none" stroke="#27ae60" stroke-width="7" transform="rotate(-24 916 300)"/>
    <ellipse cx="930" cy="336" rx="26" ry="11" fill="none" stroke="#3aa8c9" stroke-width="6" transform="rotate(-24 930 336)"/>
    <!-- bâche de protection -->
    <g transform="translate(120 186)">
      <path d="M-70 40 L-50 -40 L50 -40 L70 40 Q0 62 -70 40 Z" fill="#3a4a3a" opacity=".85" stroke="#22301f" stroke-width="4" filter="url(#soft)"/>
      <path d="M-50 -40 L-30 30 M-10 -40 L0 34 M30 -40 L40 32" stroke="#22301f" stroke-width="2" opacity=".6"/>
    </g>
    <!-- protection de corde sur angle vif -->
    <g transform="translate(300 211)">
      <path d="M-40 30 L40 -30" stroke="#101020" stroke-width="12" stroke-linecap="round"/>
      <path d="M-40 30 L40 -30" stroke="#b0b0cc" stroke-width="6" stroke-linecap="round"/>
      <rect x="-22" y="-16" width="44" height="24" rx="10" fill="#8a6a1a" stroke="#6a5210" stroke-width="3" transform="rotate(-37 0 -4)"/>
    </g>
    <!-- cordelette à nœud français (autobloquant) -->
    <g transform="translate(440 496)">
      <path d="M-40 0 H40" stroke="#101020" stroke-width="10" stroke-linecap="round"/>
      <path d="M-40 0 H40" stroke="#9a9ab8" stroke-width="5" stroke-linecap="round"/>
      <circle r="20" fill="none" stroke="#c0392b" stroke-width="6"/>
      <circle r="20" fill="none" stroke="#7e2418" stroke-width="2" stroke-dasharray="3 4"/>
    </g>
  </svg>` };

  /* --- Échelles à mains : façade + piétage --- */
  S['echelles'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <line x1="40" y1="560" x2="960" y2="560" stroke="#2a2a4c" stroke-width="3"/>
    <!-- façade -->
    <rect x="700" y="60" width="260" height="500" rx="6" fill="url(#tankBody)" stroke="#5a6488" stroke-width="4" filter="url(#soft)"/>
    <g stroke="#44446e" stroke-width="3"><line x1="700" y1="230" x2="960" y2="230"/><line x1="700" y1="395" x2="960" y2="395"/></g>
    <g fill="#0d0d20" stroke="#44446e" stroke-width="2">
      <rect x="730" y="100" width="52" height="70" rx="4"/><rect x="810" y="100" width="52" height="70" rx="4"/>
      <rect x="730" y="268" width="52" height="70" rx="4"/><rect x="810" y="268" width="52" height="70" rx="4"/>
      <rect x="730" y="432" width="52" height="70" rx="4"/>
    </g>
    <!-- échelle 2 plans (inclinée) -->
    <g transform="rotate(42 322 560)">
      <g stroke="#8a6a1a" stroke-width="9" stroke-linecap="round"><line x1="300" y1="560" x2="300" y2="170"/><line x1="346" y1="560" x2="346" y2="170"/></g>
      <g stroke="#b8922a" stroke-width="8" stroke-linecap="round"><line x1="306" y1="390" x2="306" y2="20"/><line x1="340" y1="390" x2="340" y2="20"/></g>
      <g stroke="#d4ac2b" stroke-width="5" stroke-linecap="round">
        <line x1="300" y1="520" x2="346" y2="520"/><line x1="300" y1="478" x2="346" y2="478"/><line x1="300" y1="436" x2="346" y2="436"/><line x1="300" y1="394" x2="346" y2="394"/><line x1="306" y1="352" x2="340" y2="352"/><line x1="306" y1="310" x2="340" y2="310"/><line x1="306" y1="268" x2="340" y2="268"/><line x1="306" y1="226" x2="340" y2="226"/><line x1="306" y1="184" x2="340" y2="184"/><line x1="306" y1="142" x2="340" y2="142"/><line x1="306" y1="100" x2="340" y2="100"/><line x1="306" y1="58" x2="340" y2="58"/>
      </g>
      <g fill="#c0392b" stroke="#7e2418" stroke-width="2"><rect x="292" y="368" width="16" height="26" rx="3"/><rect x="338" y="368" width="16" height="26" rx="3"/></g>
    </g>
    <!-- cote de piétage -->
    <g stroke="#e67e22" stroke-width="2.5" opacity=".85"><line x1="322" y1="588" x2="700" y2="588"/><line x1="322" y1="578" x2="322" y2="598"/><line x1="700" y1="578" x2="700" y2="598"/></g>
    <text x="510" y="614" text-anchor="middle" fill="#e67e22" font-family="IBM Plex Mono" font-size="19">≈ 1/3 de la longueur développée</text>
    <!-- échelle à crochets suspendue au 2e -->
    <g stroke="#8a94b8" stroke-width="6" stroke-linecap="round"><line x1="820" y1="186" x2="820" y2="330"/><line x1="852" y1="186" x2="852" y2="330"/></g>
    <g stroke="#a8b4d8" stroke-width="4" stroke-linecap="round"><line x1="820" y1="216" x2="852" y2="216"/><line x1="820" y1="250" x2="852" y2="250"/><line x1="820" y1="284" x2="852" y2="284"/><line x1="820" y1="318" x2="852" y2="318"/></g>
    <path d="M820 186 q0 -22 20 -22 q16 0 16 14" fill="none" stroke="#a8b4d8" stroke-width="6" stroke-linecap="round"/>
  </svg>` };

  /* --- Échelles à mains : nomenclature détaillée (crochets + 2 plans grand modèle) --- */
  S['echelles-nomenclature'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <line x1="40" y1="580" x2="960" y2="580" stroke="#2a2a4c" stroke-width="3"/>
    <line x1="500" y1="60" x2="500" y2="580" stroke="#22223c" stroke-width="2" stroke-dasharray="4 10"/>
    <text x="190" y="606" text-anchor="middle" fill="#62628a" font-family="IBM Plex Mono" font-size="16">échelle à crochets</text>
    <text x="770" y="606" text-anchor="middle" fill="#62628a" font-family="IBM Plex Mono" font-size="16">échelle 2 plans — grand modèle</text>

    <!-- ============ ÉCHELLE À CROCHETS ============ -->
    <g stroke="#b8922a" stroke-width="9" stroke-linecap="round">
      <line x1="150" y1="100" x2="150" y2="560"/>
      <line x1="230" y1="100" x2="230" y2="560"/>
    </g>
    <g stroke="#d4ac2b" stroke-width="6" stroke-linecap="round">
      <line x1="150" y1="140" x2="230" y2="140"/><line x1="150" y1="186" x2="230" y2="186"/><line x1="150" y1="232" x2="230" y2="232"/><line x1="150" y1="278" x2="230" y2="278"/><line x1="150" y1="370" x2="230" y2="370"/><line x1="150" y1="416" x2="230" y2="416"/><line x1="150" y1="462" x2="230" y2="462"/><line x1="150" y1="508" x2="230" y2="508"/>
    </g>
    <rect x="146" y="316" width="88" height="16" rx="4" fill="#8a6a1a" stroke="#6a5210" stroke-width="2"/>
    <path d="M150 100 q0 -46 34 -46 q30 0 30 26" fill="none" stroke="#a8b4d8" stroke-width="8" stroke-linecap="round"/>
    <path d="M230 100 q0 -46 -34 -46 q-30 0 -30 26" fill="none" stroke="#a8b4d8" stroke-width="8" stroke-linecap="round"/>
    <g fill="#c8d0e8"><circle cx="184" cy="60" r="5"/><circle cx="196" cy="60" r="5"/></g>
    <g fill="#20203a" stroke="#8a94b8" stroke-width="3"><rect x="138" y="558" width="24" height="16" rx="4"/><rect x="218" y="558" width="24" height="16" rx="4"/></g>

    <!-- ============ ÉCHELLE 2 PLANS GRAND MODÈLE ============ -->
    <g stroke="#8a6a1a" stroke-width="9" stroke-linecap="round">
      <line x1="700" y1="220" x2="700" y2="560"/>
      <line x1="800" y1="220" x2="800" y2="560"/>
    </g>
    <g stroke="#b8922a" stroke-width="8" stroke-linecap="round">
      <line x1="712" y1="80" x2="712" y2="400"/>
      <line x1="788" y1="80" x2="788" y2="400"/>
    </g>
    <g stroke="#d4ac2b" stroke-width="5" stroke-linecap="round">
      <line x1="712" y1="112" x2="788" y2="112"/><line x1="712" y1="154" x2="788" y2="154"/><line x1="712" y1="196" x2="788" y2="196"/><line x1="712" y1="238" x2="788" y2="238"/><line x1="712" y1="280" x2="788" y2="280"/><line x1="712" y1="322" x2="788" y2="322"/><line x1="712" y1="364" x2="788" y2="364"/>
      <line x1="700" y1="440" x2="800" y2="440"/><line x1="700" y1="482" x2="800" y2="482"/><line x1="700" y1="524" x2="800" y2="524"/>
    </g>
    <g fill="url(#valG)" stroke="#8a94b8" stroke-width="3"><rect x="686" y="204" width="28" height="20" rx="5"/><rect x="786" y="204" width="28" height="20" rx="5"/></g>
    <circle cx="750" cy="96" r="16" fill="#12122a" stroke="#8a94b8" stroke-width="4"/>
    <circle cx="750" cy="96" r="6" fill="#8a94b8"/>
    <path d="M750 112 Q690 200 690 400" fill="none" stroke="#e8e9f3" stroke-width="3" stroke-dasharray="6 6"/>
    <rect x="686" y="392" width="128" height="22" rx="8" fill="#c0392b" stroke="#7e2418" stroke-width="3"/>
    <g stroke="#9a9ab8" stroke-width="4"><line x1="694" y1="470" x2="716" y2="470"/><line x1="694" y1="478" x2="716" y2="478"/><line x1="694" y1="486" x2="716" y2="486"/></g>
    <g fill="#20203a" stroke="#8a94b8" stroke-width="3"><rect x="686" y="558" width="30" height="18" rx="4"/><rect x="784" y="558" width="30" height="18" rx="4"/></g>
  </svg>` };

  /* --- Parc de stationnement couvert : coupe --- */
  S['parc'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <line x1="30" y1="150" x2="970" y2="150" stroke="#2a2a4c" stroke-width="5"/>
    <rect x="80" y="150" width="840" height="440" fill="#10101e" stroke="#34345c" stroke-width="5"/>
    <line x1="80" y1="372" x2="920" y2="372" stroke="#34345c" stroke-width="9"/>
    <text x="104" y="200" fill="#62628a" font-family="IBM Plex Mono" font-size="19">N-1</text>
    <text x="104" y="420" fill="#62628a" font-family="IBM Plex Mono" font-size="19">N-2</text>
    <!-- rampe -->
    <path d="M96 150 L330 368" stroke="#41416a" stroke-width="12" stroke-linecap="round"/>
    <!-- coffret PV / GV en surface -->
    <rect x="52" y="84" width="58" height="62" rx="7" fill="url(#valG)" stroke="#8a94b8" stroke-width="3" filter="url(#soft)"/>
    <circle cx="70" cy="104" r="7" fill="#27ae60"/><circle cx="94" cy="104" r="7" fill="#c0392b"/>
    <text x="81" y="136" text-anchor="middle" fill="#c8d0e8" font-family="IBM Plex Mono" font-size="13">PV GV</text>
    <!-- fumées N-1 + véhicule en feu -->
    <rect x="340" y="158" width="400" height="70" fill="url(#smokeG)"/>
    <g fill="url(#engG)" stroke="#4a4a78" stroke-width="3">
      <rect x="380" y="320" width="110" height="40" rx="12"/><rect x="540" y="320" width="110" height="40" rx="12"/><rect x="420" y="540" width="110" height="40" rx="12"/>
    </g>
    <path d="M428 318 q-16 -30 -4 -52 q4 13 13 17 q-4 -22 11 -35 q-1 19 11 30 q8 9 5 21 q-5 22 -36 19" fill="url(#flameG)"/>
    <!-- points d'ancrage ligne guide -->
    <g fill="#e67e22"><circle cx="400" cy="282" r="6"/><circle cx="490" cy="282" r="6"/><circle cx="580" cy="282" r="6"/><circle cx="670" cy="282" r="6"/></g>
    <!-- porte coupe-feu -->
    <line x1="720" y1="150" x2="720" y2="290" stroke="#34345c" stroke-width="9"/>
    <rect x="708" y="290" width="24" height="82" rx="3" fill="#c0392b" stroke="#7e2418" stroke-width="3"/>
    <!-- colonne sèche -->
    <path d="M800 118 V560" stroke="#101020" stroke-width="16"/><path d="M800 118 V560" stroke="#41416a" stroke-width="9"/>
    <rect x="782" y="96" width="36" height="26" rx="5" fill="url(#valG)" stroke="#8a94b8" stroke-width="3"/>
    <!-- escalier -->
    <rect x="850" y="150" width="70" height="440" fill="#14141f" stroke="#34345c" stroke-width="5"/>
    <path d="M858 560 h14 v-22 h14 v-22 h14 v-22 h14 M858 350 h14 v-22 h14 v-22 h14 v-22 h14" fill="none" stroke="#8a94b8" stroke-width="4"/>
  </svg>` };

  /* --- Feux de forêt : CCF en autoprotection --- */
  S['feux-foret'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <line x1="30" y1="520" x2="970" y2="520" stroke="#2a2a4c" stroke-width="3"/>
    <!-- CCF -->
    <ellipse cx="350" cy="512" rx="230" ry="14" fill="#000" opacity="0.35"/>
    <rect x="140" y="300" width="112" height="172" rx="12" fill="url(#redP)" stroke="#5a1c12" stroke-width="3" filter="url(#soft)"/>
    <rect x="156" y="318" width="78" height="56" rx="6" fill="#13233a" stroke="#4a5474" stroke-width="2"/>
    <g fill="#e8c39a"><circle cx="180" cy="346" r="9"/><circle cx="212" cy="346" r="9"/></g>
    <rect x="260" y="312" width="300" height="160" rx="10" fill="url(#tankBody)" stroke="#5a6488" stroke-width="4" filter="url(#soft)"/>
    <clipPath id="ccftank"><rect x="265" y="317" width="290" height="150" rx="6"/></clipPath>
    <g clip-path="url(#ccftank)">
      <rect x="265" y="350" width="200" height="120" fill="url(#watr)"/>
      <rect x="465" y="350" width="90" height="120" fill="#3aa8c9" opacity=".45"/>
      <line x1="465" y1="317" x2="465" y2="467" stroke="#8a94b8" stroke-width="3" stroke-dasharray="7 7"/>
    </g>
    <text x="365" y="420" text-anchor="middle" fill="#cfe0ee" font-family="IBM Plex Mono" font-size="19">CU</text>
    <text x="510" y="420" text-anchor="middle" fill="#cfe0ee" font-family="IBM Plex Mono" font-size="19">CA</text>
    <g fill="#12122a" stroke="#565686" stroke-width="4"><circle cx="200" cy="492" r="34"/><circle cx="330" cy="492" r="34"/><circle cx="480" cy="492" r="34"/></g>
    <g fill="url(#valG)" stroke="#68689a" stroke-width="2"><circle cx="200" cy="492" r="12"/><circle cx="330" cy="492" r="12"/><circle cx="480" cy="492" r="12"/></g>
    <!-- dévidoir LDT à l'arrière -->
    <circle cx="592" cy="400" r="27" fill="#12122a" stroke="#68689a" stroke-width="4"/>
    <circle cx="592" cy="400" r="14" fill="none" stroke="#41416a" stroke-width="4"/>
    <!-- buses + rideaux d'eau -->
    <g fill="#4B8FE0"><path d="M190 294 l10 -16 10 16 z"/><path d="M340 306 l10 -16 10 16 z"/><path d="M470 306 l10 -16 10 16 z"/></g>
    <g stroke="#4B8FE0" stroke-width="3.5" fill="none" stroke-dasharray="5 8" opacity=".85">
      <path d="M200 280 Q140 210 90 260"/><path d="M200 280 Q260 205 320 262"/>
      <path d="M350 292 Q290 215 240 268"/><path d="M350 292 Q410 215 465 268"/>
      <path d="M480 292 Q420 218 372 268"/><path d="M480 292 Q545 215 598 272"/>
    </g>
    <!-- front de feu -->
    <path d="M760 515 q-30 -55 -6 -95 q6 24 22 32 q-7 -40 20 -66 q-2 37 20 57 q15 16 9 40 q-9 40 -65 32" fill="url(#flameG)"/>
    <path d="M860 518 q-36 -66 -8 -114 q8 28 26 38 q-8 -48 24 -79 q-3 44 24 68 q18 20 11 48 q-11 48 -77 39" fill="url(#flameG)"/>
    <path d="M935 516 q-24 -44 -5 -76 q5 19 17 26 q-5 -32 16 -53 q-1 30 16 46 q12 13 7 32 q-7 32 -51 25" fill="url(#flameG)"/>
    <ellipse cx="850" cy="330" rx="110" ry="46" fill="#4a4a62" opacity=".5"/>
    <ellipse cx="890" cy="270" rx="80" ry="34" fill="#4a4a62" opacity=".35"/>
    <path d="M730 452 H640" stroke="#e67e22" stroke-width="5" fill="none" marker-end="url(#aam)" stroke-dasharray="10 14" style="animation:flowdash 1s linear infinite;"/>
  </svg>` };

  /* --- Radio : chaîne de transmission --- */
  S['radio'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <line x1="30" y1="520" x2="970" y2="520" stroke="#2a2a4c" stroke-width="3"/>
    <!-- engin sur les lieux -->
    <ellipse cx="160" cy="512" rx="110" ry="12" fill="#000" opacity="0.35"/>
    <rect x="70" y="400" width="180" height="106" rx="11" fill="url(#redP)" stroke="#5a1c12" stroke-width="3" filter="url(#soft)"/>
    <rect x="80" y="410" width="14" height="86" rx="7" fill="#ffffff" opacity="0.1"/>
    <g fill="url(#valG)" stroke="#68689a" stroke-width="3"><circle cx="112" cy="508" r="18"/><circle cx="208" cy="508" r="18"/></g>
    <!-- antenne engin -->
    <line x1="160" y1="400" x2="160" y2="330" stroke="#8a94b8" stroke-width="5" stroke-linecap="round"/>
    <circle cx="160" cy="322" r="8" fill="#e67e22"/>
    <!-- feu (le sinistre) -->
    <path d="M330 508 q-20 -38 -5 -66 q5 17 16 22 q-5 -28 14 -45 q-1 25 14 38 q10 11 6 27 q-6 28 -45 24" fill="url(#flameG)"/>
    <!-- ondes -->
    <g stroke="#e67e22" fill="none" stroke-width="3.5" opacity=".8">
      <path d="M200 300 Q290 230 400 210" stroke-dasharray="4 12" style="animation:flowdash 1.2s linear infinite;"/>
      <path d="M615 210 Q720 230 800 296" stroke-dasharray="4 12" style="animation:flowdash 1.2s linear infinite;"/>
    </g>
    <!-- relais ANTARES -->
    <path d="M490 130 L510 130 L522 260 L478 260 Z" fill="url(#engG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
    <g stroke="#8a94b8" stroke-width="3"><line x1="478" y1="180" x2="522" y2="180"/><line x1="482" y1="220" x2="518" y2="220"/></g>
    <g stroke="#3aa8c9" fill="none" stroke-width="3" opacity=".8"><path d="M470 118 q30 -26 60 0"/><path d="M480 130 q20 -17 40 0"/></g>
    <!-- CODIS -->
    <ellipse cx="870" cy="512" rx="90" ry="11" fill="#000" opacity="0.35"/>
    <rect x="790" y="330" width="160" height="176" rx="10" fill="url(#tankBody)" stroke="#5a6488" stroke-width="4" filter="url(#soft)"/>
    <g fill="#13233a" stroke="#4a5474" stroke-width="2"><rect x="808" y="352" width="52" height="38" rx="4"/><rect x="880" y="352" width="52" height="38" rx="4"/><rect x="808" y="410" width="52" height="38" rx="4"/><rect x="880" y="410" width="52" height="38" rx="4"/></g>
    <text x="870" y="486" text-anchor="middle" fill="#8a94b8" font-family="Chakra Petch" font-weight="700" font-size="22" letter-spacing="3">CODIS 33</text>
    <!-- fil des messages -->
    <g font-family="IBM Plex Mono" font-size="17" fill="#62628a">
      <text x="80" y="80">STATUS 1 · Départ</text>
      <text x="80" y="112">STATUS 2 · Sur les lieux</text>
      <text x="640" y="80">Ambiance → Compte-rendu</text>
      <text x="640" y="112">SVFPD · toutes les 20 min</text>
    </g>
  </svg>` };

  /* --- FLI : dépôt, bac en feu, dispositif mousse --- */
  S['fli'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <line x1="30" y1="540" x2="970" y2="540" stroke="#2a2a4c" stroke-width="3"/>
    <!-- cuvette de rétention -->
    <path d="M560 540 h400 M560 540 v-24 h-14 M960 540 v-24 h14" stroke="#565686" stroke-width="6" fill="none"/>
    <!-- bac en feu -->
    <ellipse cx="762" cy="536" rx="150" ry="12" fill="#000" opacity="0.35"/>
    <rect x="640" y="300" width="245" height="236" rx="8" fill="url(#tankBody)" stroke="#5a6488" stroke-width="4" filter="url(#soft)"/>
    <rect x="656" y="314" width="18" height="208" rx="9" fill="#ffffff" opacity="0.06"/>
    <ellipse cx="762" cy="300" rx="122" ry="20" fill="#1a1a32" stroke="#5a6488" stroke-width="3"/>
    <!-- flammes + fumée -->
    <path d="M762 296 q-46 -76 -10 -132 q8 33 28 45 q-9 -55 28 -90 q-3 50 27 77 q20 22 12 54 q-12 54 -85 46" fill="url(#flameG)"/>
    <ellipse cx="800" cy="96" rx="130" ry="46" fill="#4a4a62" opacity=".5"/>
    <ellipse cx="850" cy="46" rx="90" ry="32" fill="#4a4a62" opacity=".3"/>
    <!-- nappe de mousse -->
    <path d="M648 528 q30 -14 60 0 t60 0 t60 0 t54 0" stroke="#e8e9f3" stroke-width="10" fill="none" stroke-linecap="round" opacity=".85"/>
    <!-- CEEM + lance-canon -->
    <ellipse cx="200" cy="534" rx="130" ry="12" fill="#000" opacity="0.35"/>
    <rect x="90" y="430" width="220" height="100" rx="10" fill="url(#redP)" stroke="#5a1c12" stroke-width="3" filter="url(#soft)"/>
    <rect x="100" y="440" width="14" height="80" rx="7" fill="#ffffff" opacity="0.1"/>
    <g fill="url(#valG)" stroke="#68689a" stroke-width="3"><circle cx="140" cy="532" r="18"/><circle cx="260" cy="532" r="18"/></g>
    <path d="M310 452 L370 420" stroke="#8a94b8" stroke-width="9" stroke-linecap="round"/>
    <path d="M370 420 Q530 300 640 330" stroke="#e8e9f3" stroke-width="6" fill="none" stroke-dasharray="4 10" opacity=".9" style="animation:flowdash 1s linear infinite;"/>
    <!-- périmètre -->
    <path d="M60 300 H520" stroke="#e67e22" stroke-width="3" stroke-dasharray="12 10" opacity=".7"/>
    <text x="70" y="284" fill="#e67e22" font-family="IBM Plex Mono" font-size="18">périmètre 100 m</text>
  </svg>` };

  /* --- Opérations multiples : organisation délocalisée --- */
  S['ops-multiples'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <!-- CODIS salle de crise -->
    <rect x="390" y="50" width="220" height="110" rx="12" fill="url(#engG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
    <text x="500" y="98" text-anchor="middle" fill="#c8d0e8" font-family="Chakra Petch" font-weight="700" font-size="24">CODIS</text>
    <text x="500" y="130" text-anchor="middle" fill="#8a94b8" font-family="IBM Plex Mono" font-size="15">salle de crise</text>
    <!-- liens -->
    <g stroke="#41416a" stroke-width="6" fill="none" stroke-linecap="round">
      <path d="M440 160 L260 250"/><path d="M560 160 L740 250"/>
      <path d="M260 340 L160 430"/><path d="M260 340 L360 430"/>
      <path d="M740 340 L640 430"/><path d="M740 340 L840 430"/>
    </g>
    <!-- PCG x2 -->
    <g fill="url(#tankBody)" stroke="#5a6488" stroke-width="3">
      <rect x="180" y="250" width="160" height="90" rx="10" filter="url(#soft)"/>
      <rect x="660" y="250" width="160" height="90" rx="10" filter="url(#soft)"/>
    </g>
    <text x="260" y="303" text-anchor="middle" fill="#c8d0e8" font-family="Chakra Petch" font-weight="600" font-size="20">PCG</text>
    <text x="740" y="303" text-anchor="middle" fill="#c8d0e8" font-family="Chakra Petch" font-weight="600" font-size="20">PCA</text>
    <!-- équipes -->
    <g fill="url(#valG)" stroke="#8a94b8" stroke-width="3">
      <circle cx="160" cy="470" r="34" filter="url(#soft)"/><circle cx="360" cy="470" r="34" filter="url(#soft)"/>
      <circle cx="640" cy="470" r="34" filter="url(#soft)"/><circle cx="840" cy="470" r="34" filter="url(#soft)"/>
    </g>
    <g text-anchor="middle" fill="#e8e9f3" font-family="IBM Plex Mono" font-size="15">
      <text x="160" y="476">EIL</text><text x="360" y="476">EA</text><text x="640" y="476">EIL</text><text x="840" y="476">EA</text>
    </g>
    <!-- intempéries -->
    <g stroke="#4B8FE0" stroke-width="3.5" stroke-linecap="round" opacity=".7">
      <line x1="80" y1="60" x2="64" y2="96"/><line x1="120" y1="52" x2="104" y2="88"/><line x1="160" y1="62" x2="144" y2="98"/>
    </g>
    <path d="M870 60 l-16 34 h20 l-22 40" stroke="#e8c33a" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>` };

  /* --- Risque électrique : pylône + DLV --- */
  S['risque-electrique'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <line x1="30" y1="540" x2="970" y2="540" stroke="#2a2a4c" stroke-width="3"/>
    <!-- pylône -->
    <g stroke="#68689a" stroke-width="6" fill="none" stroke-linecap="round">
      <path d="M180 540 L230 120 L280 540"/><path d="M196 420 H264"/><path d="M188 480 H272"/>
      <path d="M140 170 H320"/><path d="M155 240 H305"/>
    </g>
    <g stroke="#8a94b8" stroke-width="3"><line x1="210" y1="120" x2="250" y2="170"/><line x1="250" y1="120" x2="210" y2="170"/></g>
    <!-- câbles -->
    <path d="M140 176 Q480 260 960 200" stroke="#41416a" stroke-width="5" fill="none"/>
    <path d="M320 176 Q640 280 960 240" stroke="#41416a" stroke-width="5" fill="none"/>
    <!-- câble tombé + arc -->
    <path d="M660 262 Q700 380 690 470 Q686 520 660 528" stroke="#41416a" stroke-width="5" fill="none"/>
    <g fill="#e8c33a"><path d="M660 528 l14 22 -18 -6 6 24 -20 -26 16 2 z"/></g>
    <g stroke="#e8c33a" stroke-width="2.5" fill="none" opacity=".7">
      <ellipse cx="660" cy="540" rx="46" ry="10"/><ellipse cx="660" cy="540" rx="86" ry="17"/><ellipse cx="660" cy="540" rx="126" ry="24"/>
    </g>
    <!-- porte-lance à distance -->
    <g fill="#3aa8c9"><circle cx="430" cy="500" r="12"/><circle cx="455" cy="512" r="12"/></g>
    <path d="M450 502 L500 480" stroke="#8a94b8" stroke-width="7" stroke-linecap="round"/>
    <path d="M500 480 L560 456" stroke="#4B8FE0" stroke-width="5" stroke-dasharray="3 9" opacity=".85"/>
    <!-- cotes DLV -->
    <g stroke="#e67e22" stroke-width="2.5" opacity=".85">
      <line x1="700" y1="580" x2="960" y2="580"/><line x1="700" y1="570" x2="700" y2="590"/><line x1="960" y1="570" x2="960" y2="590"/>
    </g>
    <text x="830" y="608" text-anchor="middle" fill="#e67e22" font-family="IBM Plex Mono" font-size="17">DLV : 1 m BT · 3 m HTA · 5 m HTB</text>
  </svg>` };

  /* --- NOVI : chaîne des secours --- */
  S['novi'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <!-- flux -->
    <g stroke="#41416a" stroke-width="8" fill="none" stroke-linecap="round">
      <path d="M180 310 H310"/><path d="M470 310 H560"/><path d="M740 310 H850"/>
    </g>
    <g stroke="#27ae60" stroke-width="5" fill="none">
      <path d="M190 310 H300" marker-end="url(#agr)" stroke-dasharray="12 16" style="animation:flowdash 1s linear infinite;"/>
      <path d="M480 310 H550" marker-end="url(#agr)" stroke-dasharray="12 16" style="animation:flowdash 1s linear infinite;"/>
      <path d="M750 310 H840" marker-end="url(#agr)" stroke-dasharray="12 16" style="animation:flowdash 1s linear infinite;"/>
    </g>
    <!-- chantier -->
    <circle cx="110" cy="310" r="80" fill="none" stroke="#c0392b" stroke-width="3" stroke-dasharray="10 8"/>
    <path d="M110 330 q-16 -30 -4 -52 q4 13 13 17 q-4 -22 11 -35 q-1 19 11 30 q8 9 5 21 q-5 22 -36 19" fill="url(#flameG)"/>
    <text x="110" y="416" text-anchor="middle" fill="#8a94b8" font-family="IBM Plex Mono" font-size="16">CHANTIER</text>
    <!-- PRV -->
    <rect x="310" y="240" width="160" height="140" rx="12" fill="url(#tankBody)" stroke="#e67e22" stroke-width="3" filter="url(#soft)"/>
    <text x="390" y="318" text-anchor="middle" fill="#e67e22" font-family="Chakra Petch" font-weight="700" font-size="28">PRV</text>
    <g fill="#e8c39a"><circle cx="350" cy="352" r="8"/><circle cx="390" cy="352" r="8"/><circle cx="430" cy="352" r="8"/></g>
    <!-- PMA -->
    <rect x="560" y="220" width="180" height="180" rx="12" fill="url(#tankBody)" stroke="#27ae60" stroke-width="3" filter="url(#soft)"/>
    <text x="650" y="300" text-anchor="middle" fill="#4cd68a" font-family="Chakra Petch" font-weight="700" font-size="28">PMA</text>
    <g fill="none" stroke="#3a5a48" stroke-width="2.5"><rect x="586" y="322" width="56" height="52" rx="6"/><rect x="658" y="322" width="56" height="52" rx="6"/></g>
    <g text-anchor="middle" fill="#8a94b8" font-family="IBM Plex Mono" font-size="14"><text x="614" y="353">UA</text><text x="686" y="353">UR</text></g>
    <!-- hôpital -->
    <rect x="850" y="230" width="120" height="160" rx="8" fill="url(#tankBody)" stroke="#5a6488" stroke-width="3" filter="url(#soft)"/>
    <g stroke="#c0392b" stroke-width="9" stroke-linecap="round"><line x1="910" y1="280" x2="910" y2="330"/><line x1="885" y1="305" x2="935" y2="305"/></g>
    <!-- norias -->
    <text x="245" y="272" text-anchor="middle" fill="#62628a" font-family="IBM Plex Mono" font-size="15">petite noria</text>
    <text x="795" y="272" text-anchor="middle" fill="#62628a" font-family="IBM Plex Mono" font-size="15">grande noria</text>
    <!-- CAI -->
    <rect x="380" y="470" width="150" height="90" rx="10" fill="url(#tankBody)" stroke="#3aa8c9" stroke-width="3" filter="url(#soft)"/>
    <text x="455" y="522" text-anchor="middle" fill="#3aa8c9" font-family="Chakra Petch" font-weight="600" font-size="22">CAI</text>
    <path d="M400 380 Q400 440 400 462" stroke="#3aa8c9" stroke-width="4" fill="none" stroke-dasharray="8 8"/>
    <!-- dépôt mortuaire -->
    <rect x="620" y="470" width="150" height="90" rx="10" fill="url(#tankBody)" stroke="#565686" stroke-width="3" filter="url(#soft)"/>
    <text x="695" y="522" text-anchor="middle" fill="#8a94b8" font-family="Chakra Petch" font-weight="600" font-size="17">DÉPÔT MORT.</text>
  </svg>` };

  /* --- Nautique : plan d'eau SAV / SAL --- */
  S['nautique'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <!-- eau -->
    <rect x="0" y="300" width="1000" height="320" fill="url(#watr)" opacity=".9"/>
    <path d="M0 300 q60 -14 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t40 0" fill="none" stroke="#4a6f95" stroke-width="5"/>
    <!-- berge -->
    <path d="M0 300 L200 300 L120 620 L0 620 Z" fill="#20203a" stroke="#34345c" stroke-width="3"/>
    <!-- embarcation SAV -->
    <ellipse cx="560" cy="330" rx="130" ry="16" fill="#000" opacity="0.3"/>
    <path d="M440 300 Q450 340 500 344 H640 Q690 336 700 300 Z" fill="url(#redP)" stroke="#5a1c12" stroke-width="3" filter="url(#soft)"/>
    <rect x="530" y="258" width="70" height="42" rx="8" fill="url(#engG)" stroke="#68689a" stroke-width="3"/>
    <g fill="#3aa8c9"><circle cx="640" cy="284" r="11"/><circle cx="500" cy="284" r="11"/></g>
    <!-- victime -->
    <circle cx="850" cy="322" r="13" fill="#e8c39a"/>
    <path d="M838 336 q12 10 24 0" stroke="#e8c39a" stroke-width="5" fill="none" stroke-linecap="round"/>
    <g stroke="#e8e9f3" stroke-width="3" fill="none" opacity=".5"><path d="M810 350 q40 12 80 0"/><path d="M818 366 q32 10 64 0"/></g>
    <!-- bouée lancée -->
    <circle cx="770" cy="330" r="17" fill="none" stroke="#e67e22" stroke-width="7"/>
    <path d="M700 310 Q740 296 764 318" stroke="#e67e22" stroke-width="3" fill="none" stroke-dasharray="5 7"/>
    <!-- plongeur SAL -->
    <circle cx="330" cy="470" r="14" fill="#e8c39a"/>
    <rect x="316" y="484" width="28" height="44" rx="10" fill="#20203a" stroke="#68689a" stroke-width="3"/>
    <rect x="342" y="486" width="14" height="38" rx="7" fill="url(#ariY)" stroke="#6a5210" stroke-width="2"/>
    <g fill="#e8e9f3" opacity=".7"><circle cx="330" cy="440" r="4"/><circle cx="338" cy="418" r="5"/><circle cx="330" cy="394" r="6"/></g>
    <!-- ligne de vie -->
    <path d="M200 320 Q260 380 316 470" stroke="#e67e22" stroke-width="3.5" fill="none" stroke-dasharray="9 8"/>
    <!-- VHF -->
    <g stroke="#3aa8c9" fill="none" stroke-width="3" opacity=".8"><path d="M545 240 q20 -18 40 0"/><path d="M552 250 q13 -11 26 0"/></g>
  </svg>` };

  /* --- RCH : zonage opérationnel --- */
  S['rch-pol'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <!-- zones concentriques -->
    <ellipse cx="330" cy="310" rx="270" ry="230" fill="rgba(192,57,43,.10)" stroke="#c0392b" stroke-width="3" stroke-dasharray="14 10"/>
    <ellipse cx="380" cy="310" rx="420" ry="290" fill="none" stroke="#e67e22" stroke-width="3" stroke-dasharray="14 10"/>
    <!-- fût qui fuit -->
    <ellipse cx="300" cy="392" rx="70" ry="10" fill="#000" opacity="0.35"/>
    <rect x="255" y="250" width="90" height="140" rx="10" fill="url(#engG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
    <ellipse cx="300" cy="250" rx="45" ry="12" fill="#2a2a44" stroke="#68689a" stroke-width="3"/>
    <path d="M345 372 q34 10 52 26" stroke="#7ec36a" stroke-width="6" fill="none" stroke-linecap="round" opacity=".8"/>
    <ellipse cx="420" cy="408" rx="52" ry="12" fill="#7ec36a" opacity=".35"/>
    <!-- nuage -->
    <ellipse cx="330" cy="180" rx="90" ry="34" fill="#7ec36a" opacity=".2"/>
    <ellipse cx="380" cy="140" rx="60" ry="24" fill="#7ec36a" opacity=".14"/>
    <!-- binôme reco -->
    <g fill="#e8c33a" stroke="#8a6a1a" stroke-width="2.5"><circle cx="480" cy="300" r="13"/><circle cx="508" cy="312" r="13"/></g>
    <!-- sas de contrôle -->
    <rect x="640" y="250" width="120" height="120" rx="10" fill="url(#tankBody)" stroke="#e67e22" stroke-width="3" filter="url(#soft)"/>
    <path d="M660 270 h80 M660 300 h80 M660 330 h80" stroke="#41416a" stroke-width="4"/>
    <!-- PC / soutien -->
    <rect x="830" y="240" width="140" height="100" rx="10" fill="url(#engG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
    <text x="900" y="296" text-anchor="middle" fill="#c8d0e8" font-family="Chakra Petch" font-weight="600" font-size="20">PC · COS</text>
    <!-- vent -->
    <g stroke="#3aa8c9" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8">
      <path d="M100 80 H190" marker-end="url(#abl)"/><path d="M80 116 H170" marker-end="url(#abl)"/>
    </g>
    <text x="90" y="62" fill="#3aa8c9" font-family="IBM Plex Mono" font-size="16">vent</text>
  </svg>` };

  /* --- RAD : source + périmètre + sas --- */
  S['rad'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <ellipse cx="320" cy="320" rx="240" ry="210" fill="rgba(212,172,43,.08)" stroke="#d4ac2b" stroke-width="3" stroke-dasharray="14 10"/>
    <!-- source : trèfle -->
    <ellipse cx="320" cy="392" rx="56" ry="9" fill="#000" opacity="0.35"/>
    <rect x="280" y="300" width="80" height="88" rx="10" fill="url(#ariY)" stroke="#6a5210" stroke-width="3" filter="url(#soft)"/>
    <g fill="#1a1a2e" transform="translate(320,344) scale(1.15)">
      <circle r="6"/>
      <path d="M0 -9 A22 22 0 0 1 19 11 L8 4 A9 9 0 0 0 0 -9 Z" transform="rotate(0)"/>
      <path d="M0 -9 A22 22 0 0 1 19 11 L8 4 A9 9 0 0 0 0 -9 Z" transform="rotate(120)"/>
      <path d="M0 -9 A22 22 0 0 1 19 11 L8 4 A9 9 0 0 0 0 -9 Z" transform="rotate(240)"/>
    </g>
    <!-- rayonnement -->
    <g stroke="#d4ac2b" stroke-width="3" opacity=".55" fill="none">
      <path d="M380 310 L450 270"/><path d="M382 344 L460 344"/><path d="M378 372 L448 408"/>
    </g>
    <!-- détecteur porté -->
    <g fill="#e8c33a" stroke="#8a6a1a" stroke-width="2.5"><circle cx="520" cy="300" r="13"/></g>
    <rect x="540" y="312" width="40" height="24" rx="5" fill="#12122a" stroke="#e67e22" stroke-width="2.5"/>
    <!-- sas -->
    <rect x="660" y="240" width="120" height="130" rx="10" fill="url(#tankBody)" stroke="#e67e22" stroke-width="3" filter="url(#soft)"/>
    <path d="M680 262 h80 M680 292 h80 M680 322 h80" stroke="#41416a" stroke-width="4"/>
    <!-- portique -->
    <g stroke="#8a94b8" stroke-width="6" fill="none" stroke-linecap="round"><path d="M850 380 V240 H950 V380"/></g>
    <circle cx="900" cy="270" r="9" fill="#27ae60"/>
    <text x="500" y="560" fill="#62628a" font-family="IBM Plex Mono" font-size="19" text-anchor="middle">protection : TEMPS · DISTANCE · ÉCRAN</text>
  </svg>` };

  /* --- Risques infectieux : l'intervenant équipé --- */
  S['risques-infectieux'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <ellipse cx="380" cy="580" rx="120" ry="13" fill="#000" opacity="0.35"/>
    <!-- silhouette -->
    <circle cx="380" cy="120" r="52" fill="#e8c39a"/>
    <path d="M340 190 Q380 172 420 190 L448 400 H312 Z" fill="#e8f0f8" stroke="#b8c4d8" stroke-width="3" filter="url(#soft)"/>
    <path d="M312 400 L296 560 h44 l18 -140 h24 l18 140 h44 L448 400 Z" fill="#20304a" stroke="#41416a" stroke-width="3"/>
    <!-- bras + gants -->
    <path d="M340 200 Q290 260 280 330" stroke="#e8f0f8" stroke-width="26" fill="none" stroke-linecap="round"/>
    <path d="M420 200 Q470 260 480 330" stroke="#e8f0f8" stroke-width="26" fill="none" stroke-linecap="round"/>
    <circle cx="278" cy="344" r="18" fill="#4a7fb5"/><circle cx="482" cy="344" r="18" fill="#4a7fb5"/>
    <!-- FFP2 -->
    <path d="M348 118 Q380 152 412 118 Q414 96 380 92 Q346 96 348 118 Z" fill="#e8e9f3" stroke="#b8c4d8" stroke-width="3"/>
    <path d="M350 108 L332 100 M410 108 L428 100" stroke="#b8c4d8" stroke-width="2.5"/>
    <!-- lunettes -->
    <path d="M348 88 Q380 76 412 88" stroke="#3aa8c9" stroke-width="9" fill="none" stroke-linecap="round" opacity=".85"/>
    <!-- victime avec masque chirurgical -->
    <circle cx="770" cy="330" r="40" fill="#e8c39a"/>
    <path d="M745 328 Q770 352 795 328 Q796 312 770 308 Q744 312 745 328 Z" fill="#7ec3e0" stroke="#4a90b0" stroke-width="2.5"/>
    <rect x="700" y="378" width="140" height="150" rx="16" fill="#2a3a54" stroke="#41416a" stroke-width="3" filter="url(#soft)"/>
    <!-- flèche transmission barrée -->
    <path d="M540 310 H660" stroke="#c0392b" stroke-width="5" marker-end="url(#ard)" stroke-dasharray="10 12"/>
    <line x1="586" y1="280" x2="616" y2="340" stroke="#27ae60" stroke-width="7" stroke-linecap="round"/>
    <!-- gel hydroalcoolique -->
    <rect x="120" y="440" width="56" height="100" rx="10" fill="url(#tankBody)" stroke="#5a6488" stroke-width="3" filter="url(#soft)"/>
    <rect x="136" y="418" width="24" height="26" rx="4" fill="url(#valG)" stroke="#8a94b8" stroke-width="2.5"/>
    <path d="M148 404 q10 12 0 16" stroke="#3aa8c9" stroke-width="4" fill="none" stroke-linecap="round"/>
  </svg>` };

  /* --- Chaîne de commandement ORSEC : organigramme --- */
  S['chaine-commandement'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <!-- liens -->
    <g stroke="#41416a" stroke-width="6" fill="none" stroke-linecap="round">
      <path d="M500 140 V210"/><path d="M340 280 Q340 330 340 360"/><path d="M660 280 Q660 330 660 360"/>
      <path d="M500 210 H340 V280 M500 210 H660 V280"/>
      <path d="M340 450 V510"/><path d="M180 280 H265"/>
    </g>
    <!-- DOS -->
    <rect x="390" y="50" width="220" height="90" rx="12" fill="url(#redP)" stroke="#5a1c12" stroke-width="3" filter="url(#soft)"/>
    <text x="500" y="90" text-anchor="middle" fill="#fff" font-family="Chakra Petch" font-weight="700" font-size="24">DOS</text>
    <text x="500" y="120" text-anchor="middle" fill="#f0c0b8" font-family="IBM Plex Mono" font-size="14">Préfet / maire — DIRIGE</text>
    <!-- COS -->
    <rect x="240" y="280" width="200" height="90" rx="12" fill="url(#engG)" stroke="#e67e22" stroke-width="3" filter="url(#soft)"/>
    <text x="340" y="320" text-anchor="middle" fill="#e67e22" font-family="Chakra Petch" font-weight="700" font-size="24">COS</text>
    <text x="340" y="350" text-anchor="middle" fill="#8a94b8" font-family="IBM Plex Mono" font-size="14">commande les secours</text>
    <!-- COPG -->
    <rect x="560" y="280" width="200" height="90" rx="12" fill="url(#engG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
    <text x="660" y="320" text-anchor="middle" fill="#c8d0e8" font-family="Chakra Petch" font-weight="700" font-size="24">COPG</text>
    <text x="660" y="350" text-anchor="middle" fill="#8a94b8" font-family="IBM Plex Mono" font-size="14">menant / concourant</text>
    <!-- COD -->
    <rect x="80" y="235" width="100" height="90" rx="12" fill="url(#tankBody)" stroke="#5a6488" stroke-width="3" filter="url(#soft)"/>
    <text x="130" y="286" text-anchor="middle" fill="#c8d0e8" font-family="Chakra Petch" font-weight="600" font-size="22">COD</text>
    <!-- PCO -->
    <rect x="250" y="510" width="180" height="80" rx="12" fill="url(#tankBody)" stroke="#3aa8c9" stroke-width="3" filter="url(#soft)"/>
    <text x="340" y="558" text-anchor="middle" fill="#3aa8c9" font-family="Chakra Petch" font-weight="600" font-size="22">PCO</text>
    <!-- moyens terrain -->
    <g fill="url(#valG)" stroke="#8a94b8" stroke-width="3">
      <circle cx="560" cy="540" r="26" filter="url(#soft)"/><circle cx="650" cy="540" r="26" filter="url(#soft)"/><circle cx="740" cy="540" r="26" filter="url(#soft)"/>
    </g>
    <path d="M660 370 V505" stroke="#41416a" stroke-width="6" fill="none"/>
    <path d="M340 370 V450" stroke="#41416a" stroke-width="6" fill="none"/>
  </svg>` };

  /* --- Évacuation massive : zone → circuits → CARe --- */
  S['evacuation-massive'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <!-- zone à évacuer -->
    <ellipse cx="240" cy="300" rx="200" ry="230" fill="rgba(192,57,43,.10)" stroke="#c0392b" stroke-width="3" stroke-dasharray="14 10"/>
    <g fill="url(#tankBody)" stroke="#5a6488" stroke-width="3">
      <rect x="140" y="180" width="70" height="110" rx="5" filter="url(#soft)"/>
      <rect x="240" y="220" width="80" height="130" rx="5" filter="url(#soft)"/>
      <rect x="160" y="360" width="90" height="80" rx="5" filter="url(#soft)"/>
    </g>
    <!-- danger : eau qui monte -->
    <path d="M60 480 q40 -12 80 0 t80 0 t80 0 t80 0" stroke="#4B8FE0" stroke-width="6" fill="none" opacity=".7"/>
    <path d="M80 510 q40 -12 80 0 t80 0 t80 0" stroke="#4B8FE0" stroke-width="5" fill="none" opacity=".45"/>
    <!-- circuits d'évacuation -->
    <g stroke="#27ae60" stroke-width="6" fill="none">
      <path d="M420 240 Q560 200 660 220" marker-end="url(#agr)" stroke-dasharray="14 16" style="animation:flowdash 1.1s linear infinite;"/>
      <path d="M430 360 Q570 420 660 400" marker-end="url(#agr)" stroke-dasharray="14 16" style="animation:flowdash 1.1s linear infinite;"/>
    </g>
    <!-- population -->
    <g fill="#e8c39a"><circle cx="470" cy="260" r="9"/><circle cx="495" cy="252" r="9"/><circle cx="520" cy="262" r="9"/><circle cx="480" cy="380" r="9"/><circle cx="508" cy="388" r="9"/></g>
    <!-- CARe -->
    <rect x="700" y="150" width="240" height="140" rx="12" fill="url(#tankBody)" stroke="#27ae60" stroke-width="3" filter="url(#soft)"/>
    <text x="820" y="210" text-anchor="middle" fill="#4cd68a" font-family="Chakra Petch" font-weight="700" font-size="26">CARe</text>
    <text x="820" y="244" text-anchor="middle" fill="#8a94b8" font-family="IBM Plex Mono" font-size="15">4 m² / personne</text>
    <!-- point de rassemblement bus -->
    <rect x="700" y="360" width="180" height="80" rx="14" fill="url(#engG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
    <g fill="#13233a" stroke="#4a5474" stroke-width="2"><rect x="714" y="374" width="34" height="26" rx="3"/><rect x="758" y="374" width="34" height="26" rx="3"/><rect x="802" y="374" width="34" height="26" rx="3"/></g>
    <g fill="#12122a" stroke="#565686" stroke-width="3"><circle cx="740" cy="444" r="17"/><circle cx="840" cy="444" r="17"/></g>
    <!-- arrêté -->
    <rect x="60" y="60" width="110" height="76" rx="6" fill="#e8e9f3" opacity=".9"/>
    <g stroke="#62628a" stroke-width="3"><line x1="76" y1="82" x2="154" y2="82"/><line x1="76" y1="98" x2="154" y2="98"/><line x1="76" y1="114" x2="130" y2="114"/></g>
  </svg>` };

  /* --- TMD : citerne + panneau orange --- */
  S['tmd'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <line x1="30" y1="520" x2="970" y2="520" stroke="#2a2a4c" stroke-width="3"/>
    <!-- camion citerne -->
    <ellipse cx="470" cy="512" rx="330" ry="14" fill="#000" opacity="0.35"/>
    <rect x="140" y="360" width="130" height="140" rx="12" fill="url(#engG)" stroke="#68689a" stroke-width="3" filter="url(#soft)"/>
    <rect x="156" y="378" width="80" height="52" rx="6" fill="#13233a" stroke="#4a5474" stroke-width="2"/>
    <rect x="290" y="290" width="500" height="170" rx="72" fill="url(#tankBody)" stroke="#5a6488" stroke-width="4" filter="url(#soft)"/>
    <rect x="312" y="308" width="20" height="134" rx="10" fill="#ffffff" opacity="0.06"/>
    <g fill="#12122a" stroke="#565686" stroke-width="4">
      <circle cx="210" cy="500" r="34"/><circle cx="560" cy="500" r="34"/><circle cx="660" cy="500" r="34"/>
    </g>
    <g fill="url(#valG)" stroke="#68689a" stroke-width="2"><circle cx="210" cy="500" r="12"/><circle cx="560" cy="500" r="12"/><circle cx="660" cy="500" r="12"/></g>
    <!-- panneau orange -->
    <g filter="url(#soft)">
      <rect x="820" y="300" width="150" height="120" rx="6" fill="#e67e22" stroke="#1a1a2e" stroke-width="5"/>
      <line x1="820" y1="360" x2="970" y2="360" stroke="#1a1a2e" stroke-width="5"/>
      <text x="895" y="348" text-anchor="middle" fill="#1a1a2e" font-family="Chakra Petch" font-weight="700" font-size="40">336</text>
      <text x="895" y="408" text-anchor="middle" fill="#1a1a2e" font-family="Chakra Petch" font-weight="700" font-size="40">1230</text>
    </g>
    <!-- losange classe 3 -->
    <g transform="translate(540 200) rotate(45)" filter="url(#soft)">
      <rect x="-46" y="-46" width="92" height="92" rx="6" fill="#c0392b" stroke="#7e2418" stroke-width="3"/>
    </g>
    <path d="M540 178 q-13 -20 -3 -35 q3 9 9 12 q-3 -15 8 -24 q-1 13 8 21 q6 6 4 14 q-4 15 -26 12" fill="#1a1a2e"/>
    <!-- vent -->
    <g stroke="#3aa8c9" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8">
      <path d="M80 100 H170" marker-end="url(#abl)"/><path d="M60 136 H150" marker-end="url(#abl)"/>
    </g>
    <text x="70" y="82" fill="#3aa8c9" font-family="IBM Plex Mono" font-size="16">vent dans le dos</text>
  </svg>` };

  /* --- SSUAP : bilan XABCDE --- */
  S['gdto-ssuap'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <!-- victime allongée -->
    <ellipse cx="470" cy="420" rx="300" ry="16" fill="#000" opacity="0.3"/>
    <circle cx="220" cy="380" r="42" fill="#e8c39a"/>
    <path d="M262 362 Q420 330 560 356 L700 372 Q740 380 740 398 Q740 414 700 416 L270 416 Q250 414 252 396 Z" fill="#2a3a54" stroke="#41416a" stroke-width="3" filter="url(#soft)"/>
    <path d="M560 356 L700 372" stroke="#41416a" stroke-width="3"/>
    <!-- hémorragie (X) -->
    <path d="M620 416 q-8 16 0 24 q8 -8 0 -24" fill="#e74c3c"/>
    <ellipse cx="620" cy="452" rx="26" ry="8" fill="#e74c3c" opacity=".5"/>
    <!-- garrot -->
    <rect x="586" y="380" width="16" height="40" rx="5" fill="#e67e22" stroke="#8a4a10" stroke-width="2.5"/>
    <!-- secouriste -->
    <circle cx="360" cy="230" r="34" fill="#e8c39a"/>
    <path d="M330 262 Q360 250 390 262 L404 350 H316 Z" fill="url(#redP)" stroke="#5a1c12" stroke-width="3" filter="url(#soft)"/>
    <path d="M395 300 Q430 330 440 360" stroke="#c74a3a" stroke-width="18" fill="none" stroke-linecap="round"/>
    <!-- étapes -->
    <g font-family="Chakra Petch" font-weight="700" font-size="26" text-anchor="middle">
      <g fill="url(#valG)" stroke="#8a94b8" stroke-width="3">
        <circle cx="130" cy="110" r="30" filter="url(#soft)"/><circle cx="280" cy="90" r="30" filter="url(#soft)"/><circle cx="430" cy="80" r="30" filter="url(#soft)"/><circle cx="580" cy="90" r="30" filter="url(#soft)"/><circle cx="730" cy="110" r="30" filter="url(#soft)"/><circle cx="870" cy="140" r="30" filter="url(#soft)"/>
      </g>
      <text x="130" y="120" fill="#e74c3c">X</text><text x="280" y="100" fill="#e8e9f3">A</text><text x="430" y="90" fill="#e8e9f3">B</text><text x="580" y="100" fill="#e8e9f3">C</text><text x="730" y="120" fill="#e8e9f3">D</text><text x="870" y="150" fill="#e8e9f3">E</text>
    </g>
    <text x="500" y="580" text-anchor="middle" fill="#62628a" font-family="IBM Plex Mono" font-size="19">bilan circonstanciel → primaire (XABCDE) → secondaire → surveillance</text>
  </svg>` };

  /* --- Valeurs seuils : losange NFPA 704 --- */
  S['valeurs-seuils'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <!-- grand losange NFPA -->
    <g transform="translate(330 300)" filter="url(#soft)">
      <g transform="rotate(45)">
        <rect x="-170" y="-170" width="170" height="170" fill="#c0392b" stroke="#5a1c12" stroke-width="4"/>
        <rect x="0" y="-170" width="170" height="170" fill="#d4ac2b" stroke="#6a5210" stroke-width="4"/>
        <rect x="-170" y="0" width="170" height="170" fill="#2a6fdb" stroke="#12305a" stroke-width="4"/>
        <rect x="0" y="0" width="170" height="170" fill="#e8e9f3" stroke="#8a8aa8" stroke-width="4"/>
      </g>
      <g font-family="Chakra Petch" font-weight="700" font-size="56" text-anchor="middle">
        <text x="-118" y="18" fill="#fff">3</text>
        <text x="0" y="-100" fill="#fff">4</text>
        <text x="118" y="18" fill="#1a1a2e">1</text>
        <text x="0" y="140" fill="#1a1a2e" font-size="40">W̶</text>
      </g>
    </g>
    <!-- échelle des effets -->
    <g stroke-linecap="round">
      <path d="M640 480 H950" stroke="#41416a" stroke-width="8"/>
      <path d="M640 480 H740" stroke="#27ae60" stroke-width="8"/>
      <path d="M740 480 H860" stroke="#e67e22" stroke-width="8"/>
      <path d="M860 480 H950" stroke="#c0392b" stroke-width="8"/>
    </g>
    <g font-family="IBM Plex Mono" font-size="15" fill="#8a94b8" text-anchor="middle">
      <text x="690" y="516">réversibles</text><text x="800" y="516">irréversibles</text><text x="905" y="516">létaux</text>
    </g>
    <!-- familles de seuils -->
    <g fill="url(#tankBody)" stroke="#5a6488" stroke-width="3">
      <rect x="640" y="120" width="140" height="64" rx="9" filter="url(#soft)"/>
      <rect x="800" y="120" width="140" height="64" rx="9" filter="url(#soft)"/>
      <rect x="640" y="210" width="140" height="64" rx="9" filter="url(#soft)"/>
      <rect x="800" y="210" width="140" height="64" rx="9" filter="url(#soft)"/>
      <rect x="640" y="300" width="140" height="64" rx="9" filter="url(#soft)"/>
    </g>
    <g font-family="Chakra Petch" font-weight="600" font-size="21" fill="#c8d0e8" text-anchor="middle">
      <text x="710" y="160">AEGL</text><text x="870" y="160">ERPG</text>
      <text x="710" y="250">IDLH</text><text x="870" y="250">PAC</text>
      <text x="710" y="340">VSTAF</text>
    </g>
  </svg>` };

  /* ================= ENGIN-POMPE : nouveaux schémas ================= */

  /* --- Vue d'ensemble : FPT de profil, zones cliquables --- */
  S['fpt-profil'] = { aspect: '1000 / 560', className: 'schema-realistic', svg: `
  <svg viewBox="0 0 1000 560">
    ${ENV_DEFS}
    <line x1="20" y1="525" x2="980" y2="525" stroke="#2a2a4c" stroke-width="3"/>
    <!-- galerie échelles -->
    <g stroke="#8a94b8" stroke-width="5" stroke-linecap="round"><line x1="180" y1="70" x2="580" y2="70"/><line x1="180" y1="88" x2="580" y2="88"/></g>
    <g stroke="#68689a" stroke-width="4"><line x1="220" y1="64" x2="220" y2="94"/><line x1="320" y1="64" x2="320" y2="94"/><line x1="420" y1="64" x2="420" y2="94"/><line x1="520" y1="64" x2="520" y2="94"/></g>
    <!-- mât replié -->
    <rect x="606" y="52" width="20" height="70" rx="6" fill="url(#valG)" stroke="#8a94b8" stroke-width="3"/>
    <rect x="596" y="40" width="40" height="16" rx="5" fill="#20203a" stroke="#8a94b8" stroke-width="3"/>
    <!-- structure -->
    <ellipse cx="425" cy="512" rx="330" ry="14" fill="#000" opacity=".35"/>
    <rect x="140" y="120" width="560" height="345" rx="14" fill="url(#redP)" stroke="#5a1c12" stroke-width="4" filter="url(#soft)"/>
    <rect x="152" y="132" width="16" height="320" rx="8" fill="#ffffff" opacity=".08"/>
    <!-- rideaux -->
    <g fill="#1c1c30" stroke="#4a4a66" stroke-width="2.5">
      <rect x="170" y="165" width="120" height="270" rx="6"/><rect x="520" y="165" width="150" height="270" rx="6"/>
    </g>
    <g stroke="#33334e" stroke-width="2">${Array.from({length:12},(_,i)=>`<line x1="172" y1="${186+i*20}" x2="288" y2="${186+i*20}"/>`).join('')}${Array.from({length:12},(_,i)=>`<line x1="522" y1="${186+i*20}" x2="668" y2="${186+i*20}"/>`).join('')}</g>
    <!-- découpe : cuves visibles -->
    <rect x="310" y="150" width="200" height="290" rx="8" fill="#14141f" stroke="#4a4a66" stroke-width="2.5"/>
    <rect x="330" y="185" width="160" height="150" rx="8" fill="url(#tankBody)" stroke="#5a6488" stroke-width="3"/>
    <clipPath id="fpcuve"><rect x="334" y="189" width="152" height="142" rx="6"/></clipPath>
    <g clip-path="url(#fpcuve)"><rect x="330" y="225" width="160" height="110" fill="url(#watr)"/><line x1="410" y1="189" x2="410" y2="331" stroke="#8a94b8" stroke-width="3" stroke-dasharray="6 6"/></g>
    <rect x="415" y="158" width="52" height="42" rx="6" fill="url(#tankBody)" stroke="#3aa8c9" stroke-width="2.5"/>
    <text x="441" y="185" text-anchor="middle" fill="#3aa8c9" font-family="IBM Plex Mono" font-size="13">200L</text>
    <!-- compartiment pompe (arrière gauche) -->
    <rect x="150" y="250" width="115" height="185" rx="8" fill="#14141f" stroke="#e67e22" stroke-width="2.5"/>
    <circle cx="207" cy="360" r="34" fill="url(#pumpG)" stroke="#68689a" stroke-width="3"/>
    <circle cx="207" cy="360" r="14" fill="url(#valG)" stroke="#7878aa" stroke-width="2.5"/>
    <!-- dévidoir PS -->
    <circle cx="240" cy="222" r="24" fill="#12122a" stroke="#68689a" stroke-width="4"/>
    <circle cx="240" cy="222" r="12" fill="none" stroke="#41416a" stroke-width="4"/>
    <!-- dévidoirs mobiles (pare-chocs AR) -->
    <g fill="#12122a" stroke="#68689a" stroke-width="4"><circle cx="66" cy="420" r="30"/><circle cx="66" cy="420" r="15" fill="none" stroke-width="3"/></g>
    <path d="M96 430 H140" stroke="#41416a" stroke-width="8" stroke-linecap="round"/>
    <!-- châssis -->
    <rect x="140" y="452" width="700" height="14" rx="7" fill="#22223a" stroke="#44446e" stroke-width="2"/>
    <!-- cabine -->
    <path d="M700 465 V150 Q700 128 726 126 L900 126 Q930 128 940 168 L952 250 Q958 280 958 320 V465 Z" fill="url(#redP)" stroke="#5a1c12" stroke-width="4" filter="url(#soft)"/>
    <path d="M716 148 L900 148 Q920 150 928 184 L938 246 L716 246 Z" fill="#1b2b3e" stroke="#4a5474" stroke-width="3"/>
    <rect x="722" y="270" width="14" height="120" rx="7" fill="#ffffff" opacity=".08"/>
    <circle cx="838" cy="118" r="10" fill="#3a76c9"/>
    <!-- roues -->
    <g fill="#12122a" stroke="#565686" stroke-width="5"><circle cx="330" cy="475" r="52"/><circle cx="840" cy="475" r="52"/></g>
    <g fill="url(#valG)" stroke="#68689a" stroke-width="3"><circle cx="330" cy="475" r="20"/><circle cx="840" cy="475" r="20"/></g>
    <text x="500" y="548" text-anchor="middle" fill="#62628a" font-family="IBM Plex Mono" font-size="15">FPT SR 4 000 · RENAULT D15 P4x2 · touchez une zone numérotée</text>
  </svg>` };

  /* --- Circuit d'eau détaillé : 28 repères (schéma p. 9) --- */
  S['gimaex-hydro'] = { aspect: '1400 / 900', className: 'schema-realistic', svg: (() => {
    const V = (x,y,c) => `<g class="gh-v" id="gh-${c}"><circle cx="${x}" cy="${y}" r="15" fill="url(#valG)" stroke="#8a94b8" stroke-width="3.5"/><line x1="${x-11}" y1="${y}" x2="${x+11}" y2="${y}" stroke="#8a94b8" stroke-width="3"/></g>`;
    const F = (d,col,id) => `<path id="${id}" visibility="hidden" d="${d}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="13 17" marker-end="url(#agr)" style="animation:flowdash .9s linear infinite;"/>`;
    return `
  <svg viewBox="0 0 1400 900">
    ${ENV_DEFS}
    <!-- tuyauteries -->
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <g stroke="#101020" stroke-width="20">
        <path d="M700 260 V585"/><path d="M252 558 H532"/><path d="M532 585 H1344"/>
        <path d="M770 585 V432 Q770 400 740 380 L720 366"/><path d="M1050 450 V310 L920 260"/>
        <path d="M882 324 V740"/><path d="M532 640 V740"/><path d="M1176 585 V702 H1220"/>
        <path d="M300 140 V198 H532 M532 198 H1008 V560"/><path d="M140 252 H240"/>
        <path d="M252 558 V640"/>
      </g>
      <g stroke="#41416a" stroke-width="11">
        <path d="M700 260 V585"/><path d="M252 558 H532"/><path d="M532 585 H1344"/>
        <path d="M770 585 V432 Q770 400 740 380 L720 366"/><path d="M1050 450 V310 L920 260"/>
        <path d="M882 324 V740"/><path d="M532 640 V740"/><path d="M1176 585 V702 H1220"/>
        <path d="M300 140 V198 H532 M532 198 H1008 V560"/><path d="M140 252 H240"/>
        <path d="M252 558 V640"/>
      </g>
    </g>
    <!-- cuve eau -->
    <ellipse cx="700" cy="268" rx="160" ry="13" fill="#000" opacity=".3"/>
    <rect x="560" y="60" width="280" height="200" rx="12" fill="url(#tankBody)" stroke="#5a6488" stroke-width="4" filter="url(#soft)"/>
    <clipPath id="ghcuve"><rect x="565" y="65" width="270" height="190" rx="8"/></clipPath>
    <g clip-path="url(#ghcuve)"><rect x="560" y="110" width="280" height="150" fill="url(#watr)"/><line x1="700" y1="65" x2="700" y2="255" stroke="#8a94b8" stroke-width="4" stroke-dasharray="8 8"/></g>
    <text x="700" y="48" text-anchor="middle" fill="#8a94b8" font-family="Chakra Petch" font-weight="600" font-size="22">CUVE EAU 3 800 L</text>
    <!-- cuve additif -->
    <rect x="150" y="46" width="240" height="94" rx="10" fill="url(#tankBody)" stroke="#3aa8c9" stroke-width="3" filter="url(#soft)"/>
    <clipPath id="ghadd"><rect x="155" y="51" width="230" height="84" rx="7"/></clipPath>
    <g clip-path="url(#ghadd)"><rect x="150" y="80" width="240" height="60" fill="#1e4a44"/></g>
    <text x="270" y="34" text-anchor="middle" fill="#3aa8c9" font-family="Chakra Petch" font-weight="600" font-size="19">ADDITIF 200 L</text>
    <!-- pompe -->
    <ellipse cx="532" cy="660" rx="66" ry="11" fill="#000" opacity=".35"/>
    <circle cx="532" cy="585" r="58" fill="url(#pumpG)" stroke="#68689a" stroke-width="4" filter="url(#soft)"/>
    <path d="M495 548 A58 58 0 0 1 572 556" fill="none" stroke="#a8b4d8" stroke-width="3" opacity=".5" stroke-linecap="round"/>
    <g style="transform-box:fill-box;transform-origin:center;animation:spin 6s linear infinite;" stroke="#3aa8c9" stroke-width="6" fill="none" stroke-linecap="round">
      <path d="M532 585 L532 545"/><path d="M532 585 L567 605"/><path d="M532 585 L497 605"/>
    </g>
    <circle cx="532" cy="585" r="16" fill="url(#valG)" stroke="#7878aaa" stroke-width="3"/>
    <!-- refoulements -->
    <g fill="#20203a" stroke="#5a6488" stroke-width="3">
      <rect x="1074" y="547" width="36" height="26" rx="4"/><rect x="1158" y="547" width="36" height="26" rx="4"/><rect x="1242" y="547" width="36" height="26" rx="4"/><rect x="1326" y="547" width="36" height="26" rx="4"/>
    </g>
    <g font-family="IBM Plex Mono" font-size="14" fill="#62628a" text-anchor="middle">
      <text x="1092" y="538">DN100</text><text x="1176" y="538">DN65</text><text x="1260" y="538">E/M 40</text><text x="1344" y="538">E/M 65</text>
    </g>
    <!-- dévidoir PS -->
    <circle cx="1260" cy="702" r="34" fill="#12122a" stroke="#68689a" stroke-width="4"/>
    <circle cx="1260" cy="702" r="16" fill="none" stroke="#41416a" stroke-width="4"/>
    <!-- GFR -->
    <rect x="96" y="234" width="44" height="36" rx="7" fill="url(#valG)" stroke="#e67e22" stroke-width="3"/>
    <!-- clapets (triangles) -->
    <g fill="#8a94b8"><path d="M688 258 l12 22 12 -22 z"/><path d="M716 186 l12 22 12 -22 z" transform="rotate(-90 728 198)"/></g>
    <!-- vannes -->
    ${V(700,342,'e1')}${V(252,558,'e2')}${V(462,468,'e3')}${V(532,740,'e5')}${V(882,324,'e6')}${V(1050,450,'e7')}${V(770,432,'e8')}
    ${V(1092,585,'e9')}${V(1176,585,'e10')}${V(1260,585,'e11')}${V(1176,650,'e13')}
    ${V(336,198,'e15')}${V(420,198,'e16')}${V(336,306,'e17')}${V(420,306,'e18')}${V(238,198,'e20')}${V(238,306,'e21')}${V(532,198,'e25')}
    <!-- débitmètre + injecteur -->
    <rect x="900" y="563" width="48" height="44" rx="7" fill="url(#engG)" stroke="#3aa8c9" stroke-width="3"/>
    <circle cx="1008" cy="585" r="17" fill="url(#valG)" stroke="#3aa8c9" stroke-width="3"/>
    <!-- clapet thermique + purges -->
    <circle cx="616" cy="702" r="13" fill="url(#valG)" stroke="#e67e22" stroke-width="3"/>
    <g fill="url(#valG)" stroke="#8a94b8" stroke-width="3"><circle cx="728" cy="738" r="12"/><circle cx="840" cy="738" r="12"/></g>
    <!-- flux par situation -->
    ${F('M700 270 V520 Q700 560 640 578 L600 583','#27ae60','gh-tonne')}
    ${F('M260 558 H460 Q510 562 522 575','#27ae60','gh-ext')}
    ${F('M600 585 H1330','#e74c3c','gh-refoul')}
    ${F('M1050 442 V320 L930 268','#4B8FE0','gh-remp-ext')}
    ${F('M770 577 V440 Q770 405 735 378','#e67e22','gh-remp-pompe')}
    ${F('M390 100 Q460 150 530 192 L1000 198 L1008 560','#7ec36a','gh-mousse')}
    ${F('M1176 593 V695 H1215','#e74c3c','gh-dev')}
    ${F('M532 648 V735','#4B8FE0','gh-vid-pompe')}
    ${F('M882 332 V735','#4B8FE0','gh-vid-cuve')}
  </svg>`; })() };

  /* --- Chaîne cinématique : vue de dessus du châssis (p. 3) --- */
  S['chaine-fpt'] = { aspect: '1400 / 700', className: 'schema-realistic', svg: `
  <svg viewBox="0 0 1400 700">
    ${ENV_DEFS}
    <!-- roues -->
    <g fill="#12122a" stroke="#565686" stroke-width="5">
      <rect x="200" y="66" width="120" height="62" rx="24"/><rect x="200" y="572" width="120" height="62" rx="24"/>
      <rect x="940" y="60" width="140" height="68" rx="26"/><rect x="940" y="572" width="140" height="68" rx="26"/>
    </g>
    <!-- châssis : longerons + traverses -->
    <g stroke="#565686" stroke-width="14" stroke-linecap="round"><line x1="90" y1="250" x2="1330" y2="250"/><line x1="90" y1="450" x2="1330" y2="450"/></g>
    <g stroke="#44446e" stroke-width="9"><line x1="350" y1="250" x2="350" y2="450"/><line x1="660" y1="250" x2="660" y2="450"/><line x1="900" y1="250" x2="900" y2="450"/><line x1="1180" y1="250" x2="1180" y2="450"/></g>
    <path d="M90 250 Q40 350 90 450" fill="none" stroke="#565686" stroke-width="10"/>
    <!-- demi-arbres de roues -->
    <g fill="none" stroke-linecap="round"><path d="M1008 128 V572" stroke="#101020" stroke-width="18"/><path d="M1008 128 V572" stroke="#8a6a1a" stroke-width="10"/></g>
    <!-- arbres de transmission -->
    <g fill="none" stroke-linecap="round">
      <path d="M540 380 L940 398" stroke="#101020" stroke-width="20"/><path d="M540 380 L940 398" stroke="#b0483a" stroke-width="11"/>
      <path d="M615 238 H1186" stroke="#101020" stroke-width="18"/><path d="M615 238 H1186" stroke="#b0483a" stroke-width="10"/>
    </g>
    <g fill="#8a94b8"><circle cx="560" cy="381" r="9"/><circle cx="920" cy="397" r="9"/><circle cx="640" cy="238" r="8"/><circle cx="1160" cy="238" r="8"/></g>
    <!-- moteur -->
    <ellipse cx="182" cy="440" rx="90" ry="11" fill="#000" opacity=".3"/>
    <rect x="108" y="268" width="150" height="164" rx="14" fill="url(#engG)" stroke="#68689a" stroke-width="4" filter="url(#soft)" id="cf-eng"/>
    <g stroke="#4a4a78" stroke-width="5" stroke-linecap="round"><line x1="134" y1="290" x2="134" y2="410"/><line x1="160" y1="290" x2="160" y2="410"/><line x1="186" y1="290" x2="186" y2="410"/><line x1="212" y1="290" x2="212" y2="410"/><line x1="236" y1="290" x2="236" y2="410"/></g>
    <!-- embrayage -->
    <path d="M258 350 L322 312 V388 Z" fill="url(#valG)" stroke="#7878aa" stroke-width="4" filter="url(#soft)"/>
    <!-- boîte de vitesses -->
    <rect x="395" y="300" width="140" height="100" rx="12" fill="url(#engG)" stroke="#68689a" stroke-width="4" filter="url(#soft)"/>
    <g stroke="#4a4a78" stroke-width="4" stroke-linecap="round"><line x1="420" y1="316" x2="420" y2="384"/><line x1="446" y1="316" x2="446" y2="384"/><line x1="472" y1="316" x2="472" y2="384"/></g>
    <path d="M322 350 H395" stroke="#41416a" stroke-width="12" stroke-linecap="round"/>
    <!-- PDM -->
    <path d="M500 300 L540 268" stroke="#41416a" stroke-width="11" stroke-linecap="round"/>
    <rect x="540" y="208" width="72" height="60" rx="10" fill="url(#engG)" stroke="#e67e22" stroke-width="3.5" filter="url(#soft)"/>
    <!-- pont -->
    <circle cx="1008" cy="400" r="46" fill="url(#pumpG)" stroke="#9b59b6" stroke-width="4" filter="url(#soft)"/>
    <circle cx="1008" cy="400" r="18" fill="url(#valG)" stroke="#8a94b8" stroke-width="3"/>
    <!-- pompe -->
    <circle cx="1240" cy="238" r="46" fill="url(#pumpG)" stroke="#3aa8c9" stroke-width="4" filter="url(#soft)"/>
    <g id="cf-imp" visibility="hidden" style="transform-box:fill-box;transform-origin:center;animation:spin 1.1s linear infinite;" stroke="#3aa8c9" stroke-width="5" fill="none" stroke-linecap="round">
      <path d="M1240 238 L1240 206"/><path d="M1240 238 L1268 254"/><path d="M1240 238 L1212 254"/>
    </g>
    <circle cx="1240" cy="238" r="14" fill="url(#valG)" stroke="#7878aa" stroke-width="3"/>
    <!-- couches animées -->
    <g id="cf-run" visibility="hidden" fill="none" stroke-linecap="round">
      <path d="M258 350 H395" stroke="#4B8FE0" stroke-width="5" stroke-dasharray="4 16" style="animation:flowdash .5s linear infinite;"/>
    </g>
    <g id="cf-run-roues" visibility="hidden" fill="none" stroke-linecap="round">
      <path d="M540 380 L940 398" stroke="#4B8FE0" stroke-width="5" stroke-dasharray="4 16" style="animation:flowdash .5s linear infinite;"/>
      <path d="M1008 354 V128 M1008 446 V572" stroke="#4B8FE0" stroke-width="4" stroke-dasharray="4 14" style="animation:flowdash .55s linear infinite;"/>
    </g>
    <g id="cf-run-pdm" visibility="hidden" fill="none" stroke-linecap="round">
      <path d="M500 300 L546 262" stroke="#4B8FE0" stroke-width="5" stroke-dasharray="4 14" style="animation:flowdash .5s linear infinite;"/>
      <path d="M615 238 H1186" stroke="#4B8FE0" stroke-width="5" stroke-dasharray="4 16" style="animation:flowdash .5s linear infinite;"/>
    </g>
    <g font-family="IBM Plex Mono" font-size="17" fill="#62628a" text-anchor="middle">
      <text x="182" y="470">MOTEUR</text><text x="465" y="428">BOÎTE</text><text x="576" y="196">PDM</text><text x="1008" y="478">PONT AR</text><text x="1240" y="312">POMPE</text>
    </g>
  </svg>` };

  /* --- Simulateur de régulation de pression GIMAEX --- */
  S['regulation'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <rect x="30" y="30" width="940" height="560" rx="16" fill="#15151f" stroke="#3a3a4c" stroke-width="3" filter="url(#soft)"/>
    <!-- manomètre -->
    <circle cx="330" cy="320" r="180" fill="url(#valG)" stroke="#68689a" stroke-width="5" filter="url(#soft)"/>
    <circle cx="330" cy="320" r="150" fill="#0c1218" stroke="#3a4652" stroke-width="3"/>
    <g stroke="#4a5a6a" stroke-width="3">${Array.from({length:13},(_,i)=>{const a=(-210+i*20)*Math.PI/180;const x1=330+Math.cos(a)*138,y1=320+Math.sin(a)*138,x2=330+Math.cos(a)*124,y2=320+Math.sin(a)*124;return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;}).join('')}</g>
    <g font-family="IBM Plex Mono" font-size="15" fill="#62628a" text-anchor="middle"><text x="230" y="420">0</text><text x="216" y="268">5</text><text x="330" y="192">10</text><text x="444" y="268">15</text><text x="432" y="420">20</text></g>
    <line id="rg-nd" x1="330" y1="320" x2="330" y2="200" stroke="#e8e9f3" stroke-width="6" stroke-linecap="round" style="transform-origin:330px 320px;transform:rotate(-120deg);transition:transform .8s cubic-bezier(.3,1.4,.4,1);"/>
    <circle cx="330" cy="320" r="14" fill="url(#valG)" stroke="#8a94b8" stroke-width="3"/>
    <text id="rg-press" x="330" y="470" text-anchor="middle" fill="#e8e9f3" font-family="IBM Plex Mono" font-size="26">0,0 bar</text>
    <text x="330" y="540" text-anchor="middle" fill="#62628a" font-family="IBM Plex Mono" font-size="15">PRESSION DE REFOULEMENT</text>
    <!-- bandeau consigne -->
    <rect x="590" y="120" width="350" height="86" rx="10" fill="#0c1218" stroke="#3a4652" stroke-width="3"/>
    <text id="rg-cons" x="765" y="162" text-anchor="middle" fill="#3aa8c9" font-family="Chakra Petch" font-weight="700" font-size="27">Consigne : — </text>
    <text id="rg-mode" x="765" y="192" text-anchor="middle" fill="#62628a" font-family="IBM Plex Mono" font-size="15">MODE MANUEL</text>
    <!-- message -->
    <rect x="590" y="240" width="350" height="70" rx="10" fill="#0c1218" stroke="#e67e22" stroke-width="2.5"/>
    <text id="rg-msg" x="765" y="283" text-anchor="middle" fill="#e67e22" font-family="IBM Plex Mono" font-size="19">Arrêt régulation</text>
    <!-- bouton REGULATION -->
    <circle id="rg-light" cx="650" cy="400" r="26" fill="#1f4a2e" stroke="#0e4a30" stroke-width="4"/>
    <text x="650" y="452" text-anchor="middle" fill="#62628a" font-family="IBM Plex Mono" font-size="14">RÉGULATION</text>
    <!-- voyant température -->
    <circle id="rg-temp" cx="880" cy="400" r="20" fill="#2a2a3a" stroke="#4a4a5c" stroke-width="3"/>
    <text x="880" y="452" text-anchor="middle" fill="#62628a" font-family="IBM Plex Mono" font-size="14">T° POMPE</text>
    <text x="765" y="540" text-anchor="middle" fill="#62628a" font-family="IBM Plex Mono" font-size="14">consigne d'attente 3 bar · ±1 bar par impulsion · surpression 20 bar</text>
  </svg>` };

  /* --- Production de mousse : circuit CTD --- */
  S['mousse-usage'] = { aspect: '1000 / 620', className: 'schema-realistic', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <defs><linearGradient id="mu-foam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffde0"/><stop offset="1" stop-color="#b8d7d2"/></linearGradient><linearGradient id="mu-red" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fa5542"/><stop offset="1" stop-color="#72100b"/></linearGradient><filter id="mu-shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="9" stdDeviation="9" flood-color="#000" flood-opacity=".5"/></filter></defs>
    <text x="500" y="49" text-anchor="middle" fill="#e8e9f3" font-family="Chakra Petch" font-size="28" font-weight="700">QUEL FOISONNEMENT POUR QUEL SINISTRE ?</text>
    <!-- bas foisonnement : nappe hydrocarbure extérieure -->
    <g id="mu-low" transform="translate(55 110)" filter="url(#mu-shadow)"><ellipse cx="145" cy="300" rx="132" ry="34" fill="#13191d" stroke="#4b5a62" stroke-width="4"/><ellipse cx="145" cy="286" rx="115" ry="25" fill="#6f321c"/><g fill="url(#mu-foam)" stroke="#8ca7a4" stroke-width="2">${[[58,274,32],[104,265,38],[151,270,43],[198,264,36],[236,278,29],[82,292,34],[132,290,38],[184,290,39],[218,294,30]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g><path d="M18 210H82" stroke="#aeb9be" stroke-width="18" stroke-linecap="round"/><path d="M78 210Q154 172 252 216" stroke="#e9f5ef" stroke-width="15" stroke-linecap="round" stroke-dasharray="12 10"/><text x="145" y="390" text-anchor="middle" fill="#8ceab5" font-family="Chakra Petch" font-size="23" font-weight="700">BAS &lt; 20</text><text x="145" y="416" text-anchor="middle" fill="#9dacb4" font-family="IBM Plex Mono" font-size="13">hydrocarbures · extérieur · longue portée</text></g>
    <!-- moyen : VL / écoulement -->
    <g id="mu-medium" transform="translate(355 110)" filter="url(#mu-shadow)"><path d="M26 270L62 190H226L264 270V316H26Z" fill="url(#mu-red)" stroke="#65100b" stroke-width="6"/><path d="M82 202H202L224 251H62Z" fill="#17303d" stroke="#6c7c84" stroke-width="4"/><circle cx="78" cy="314" r="31" fill="#090c0e" stroke="#5f6b72" stroke-width="6"/><circle cx="216" cy="314" r="31" fill="#090c0e" stroke="#5f6b72" stroke-width="6"/><g fill="url(#mu-foam)" stroke="#8ca7a4" stroke-width="2">${[[45,342,24],[80,346,29],[120,340,31],[160,346,32],[202,341,29],[242,346,23]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g><text x="145" y="390" text-anchor="middle" fill="#f3bd72" font-family="Chakra Petch" font-size="23" font-weight="700">MOYEN 20–200</text><text x="145" y="416" text-anchor="middle" fill="#9dacb4" font-family="IBM Plex Mono" font-size="13">VL · poubelle · écoulement préventif</text></g>
    <!-- haut : volume clos -->
    <g id="mu-high" transform="translate(655 110)" filter="url(#mu-shadow)"><path d="M22 112L145 50L268 112V326H22Z" fill="#20282e" stroke="#75838b" stroke-width="6"/><path d="M145 50V326M22 112H268" stroke="#56636a" stroke-width="4"/><rect x="80" y="148" width="130" height="178" fill="#0b1014" stroke="#65727a" stroke-width="5"/><g fill="url(#mu-foam)" stroke="#8ca7a4" stroke-width="2">${Array.from({length:30},(_,i)=>`<circle cx="${92+(i%5)*28}" cy="${304-Math.floor(i/5)*27}" r="${17+(i%3)*2}"/>`).join('')}</g><text x="145" y="390" text-anchor="middle" fill="#73d6f8" font-family="Chakra Petch" font-size="23" font-weight="700">HAUT &gt; 200</text><text x="145" y="416" text-anchor="middle" fill="#9dacb4" font-family="IBM Plex Mono" font-size="13">espace clos · entrepôt · remplissage volumique</text></g>
    <g transform="translate(120 548)"><rect width="760" height="48" rx="10" fill="#101923" stroke="#2b3b49" stroke-width="2"/><text id="mu-choice" x="380" y="30" text-anchor="middle" fill="#cbd6dc" font-family="IBM Plex Mono" font-size="14">Sélectionnez un foisonnement pour isoler son cas d’emploi.</text></g>
  </svg>` };

  S['mousse-ctd'] = { aspect: '1000 / 620', className: 'schema-realistic', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <!-- ligne eau -->
    <g fill="none" stroke-linecap="round">
      <path d="M120 360 H930" stroke="#101020" stroke-width="20"/><path d="M120 360 H930" stroke="#41416a" stroke-width="11"/>
      <path d="M220 200 V300 M220 300 V409 M220 470 H120 M300 409 Q400 400 420 368 M80 496 Q140 480 190 430" stroke="#101020" stroke-width="16"/>
      <path d="M220 200 V409 M220 470 H120 M300 409 Q400 400 420 368 M80 496 Q140 480 190 430" stroke="#2a5a52" stroke-width="9"/>
    </g>
    <!-- cuve additif -->
    <rect x="120" y="90" width="200" height="110" rx="10" fill="url(#tankBody)" stroke="#3aa8c9" stroke-width="3" filter="url(#soft)"/>
    <clipPath id="msadd"><rect x="125" y="95" width="190" height="100" rx="7"/></clipPath>
    <g clip-path="url(#msadd)"><rect id="ms-niveau" x="120" y="130" width="200" height="70" fill="#1e4a44"/></g>
    <text x="220" y="78" text-anchor="middle" fill="#3aa8c9" font-family="Chakra Petch" font-weight="600" font-size="18">MOUILLANT 200 L</text>
    <!-- pompe de dosage -->
    <ellipse cx="245" cy="452" rx="60" ry="9" fill="#000" opacity=".3"/>
    <rect x="190" y="380" width="110" height="64" rx="10" fill="url(#engG)" stroke="#3aa8c9" stroke-width="3" filter="url(#soft)" id="ms-pompe"/>
    <text x="245" y="470" text-anchor="middle" fill="#62628a" font-family="IBM Plex Mono" font-size="13">POMPE DE DOSAGE</text>
    <!-- GFR -->
    <rect x="46" y="480" width="44" height="34" rx="7" fill="url(#valG)" stroke="#e67e22" stroke-width="3"/>
    <text x="68" y="536" text-anchor="middle" fill="#62628a" font-family="IBM Plex Mono" font-size="13">GFR (rep 19)</text>
    <!-- débitmètre / injecteur -->
    <rect x="396" y="338" width="48" height="44" rx="7" fill="url(#engG)" stroke="#3aa8c9" stroke-width="3"/>
    <circle cx="520" cy="360" r="17" fill="url(#valG)" stroke="#3aa8c9" stroke-width="3"/>
    <g font-family="IBM Plex Mono" font-size="13" fill="#62628a" text-anchor="middle"><text x="420" y="412">DÉBITMÈTRE</text><text x="520" y="412">INJECTEUR</text></g>
    <!-- refoulements mousse -->
    <g fill="#20203a" stroke="#5a6488" stroke-width="3"><rect x="800" y="322" width="36" height="26" rx="4"/><rect x="866" y="322" width="36" height="26" rx="4"/><rect x="932" y="322" width="36" height="26" rx="4"/></g>
    <g font-family="IBM Plex Mono" font-size="13" fill="#62628a" text-anchor="middle"><text x="818" y="312">E/M 40</text><text x="884" y="312">E/M 65</text><text x="950" y="312">DÉV. PS</text></g>
    <!-- pupitre -->
    <rect x="580" y="80" width="360" height="150" rx="12" fill="#15151f" stroke="#3a3a4c" stroke-width="3" filter="url(#soft)"/>
    <text id="ms-pct" x="760" y="135" text-anchor="middle" fill="#7ec36a" font-family="Chakra Petch" font-weight="700" font-size="34">0,0 %</text>
    <text id="ms-info" x="760" y="172" text-anchor="middle" fill="#62628a" font-family="IBM Plex Mono" font-size="16">0 L/min · 0,0 bar</text>
    <text id="ms-sysmsg" x="760" y="205" text-anchor="middle" fill="#e67e22" font-family="IBM Plex Mono" font-size="14">SÉLECTIONNER INTERVENTION</text>
    <!-- flux -->
    <path id="ms-f-eau" visibility="hidden" d="M130 360 H795" fill="none" stroke="#4B8FE0" stroke-width="6" stroke-dasharray="13 17" marker-end="url(#abl)" style="animation:flowdash .8s linear infinite;"/>
    <path id="ms-f-add" visibility="hidden" d="M220 205 V400 M245 412 Q380 402 420 370 L512 362" fill="none" stroke="#7ec36a" stroke-width="5" stroke-dasharray="10 14" style="animation:flowdash 1s linear infinite;"/>
    <path id="ms-f-ext" visibility="hidden" d="M86 490 Q150 472 196 424" fill="none" stroke="#e67e22" stroke-width="5" stroke-dasharray="10 14" style="animation:flowdash 1s linear infinite;"/>
    <path id="ms-f-mousse" visibility="hidden" d="M540 360 H930" fill="none" stroke="#e8e9a0" stroke-width="7" stroke-dasharray="12 14" style="animation:flowdash .8s linear infinite;" opacity=".85"/>
  </svg>` };

  /* --- Écran principal GIMAEX (p. 15) --- */
  S['gimaex-ecran-legacy'] = { aspect: '1000 / 760', svg: `
  <svg viewBox="0 0 1000 760">
    ${ENV_DEFS}
    <rect x="20" y="20" width="960" height="720" rx="14" fill="#22262c" stroke="#3a3a4c" stroke-width="4" filter="url(#soft)"/>
    <text x="500" y="66" text-anchor="middle" fill="#8a94b8" font-family="Chakra Petch" font-weight="700" font-size="30" letter-spacing="5">GIMAEX</text>
    <rect x="50" y="84" width="900" height="28" rx="4" fill="#10161e"/>
    <text x="66" y="104" fill="#c8d0e8" font-family="IBM Plex Mono" font-size="15">08/09/2020 - 08:35:05</text>
    <text x="934" y="104" text-anchor="end" fill="#c8d0e8" font-family="IBM Plex Mono" font-size="15">⛁ 23.8 V</text>
    <!-- niveaux cuves (15-16) -->
    <circle cx="170" cy="289" r="118" fill="#171b21" stroke="#3a4652" stroke-width="3"/>
    <path d="M78 240 A105 105 0 0 1 262 240" fill="none" stroke="#27ae60" stroke-width="10" stroke-linecap="round" stroke-dasharray="10 7"/>
    <path d="M84 350 A105 105 0 0 0 256 350" fill="none" stroke="#7ec36a" stroke-width="10" stroke-linecap="round" stroke-dasharray="10 7"/>
    <rect x="112" y="272" width="116" height="24" rx="4" fill="#0e1319"/>
    <text x="170" y="289" text-anchor="middle" fill="#c8d0e8" font-family="IBM Plex Mono" font-size="13" dy="4">Niveaux cuves</text>
    <text x="170" y="226" text-anchor="middle" fill="#27ae60" font-family="IBM Plex Mono" font-size="14">EAU 100 %</text>
    <text x="170" y="366" text-anchor="middle" fill="#7ec36a" font-family="IBM Plex Mono" font-size="14">MOUILLANT 90 %</text>
    <!-- central (17-22) -->
    <circle cx="500" cy="300" r="165" fill="#171b21" stroke="#3a4652" stroke-width="3"/>
    <g stroke="#4a5a6a" stroke-width="3">${Array.from({length:11},(_,i)=>{const a=(-200+i*20)*Math.PI/180;const x1=500+Math.cos(a)*152,y1=300+Math.sin(a)*152,x2=500+Math.cos(a)*140,y2=300+Math.sin(a)*140;return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;}).join('')}</g>
    <text x="500" y="222" text-anchor="middle" fill="#e8e9f3" font-family="IBM Plex Mono" font-size="21">⚲ 0.0 Bar</text>
    <rect x="410" y="308" width="180" height="30" rx="5" fill="#0e1319" stroke="#3a4652" stroke-width="1.5"/>
    <text x="500" y="329" text-anchor="middle" fill="#c8d0e8" font-family="IBM Plex Mono" font-size="14">arrêt régulation · 20°C · 0 B</text>
    <text x="500" y="410" text-anchor="middle" fill="#c8d0e8" font-family="IBM Plex Mono" font-size="18">-0.1 Bar</text>
    <!-- alerte (23) -->
    <circle cx="660" cy="198" r="17" fill="#3a1512" stroke="#5c2018" stroke-width="3"/>
    <!-- droite (24-27) -->
    <circle cx="800" cy="240" r="92" fill="#171b21" stroke="#3a4652" stroke-width="3"/>
    <text x="800" y="236" text-anchor="middle" fill="#e8e9f3" font-family="IBM Plex Mono" font-size="19">0 Tr/mn</text>
    <g fill="#0e1319" stroke="#3a4652" stroke-width="2"><rect x="742" y="300" width="116" height="24" rx="4"/><rect x="742" y="330" width="116" height="24" rx="4"/><rect x="742" y="360" width="116" height="24" rx="4"/></g>
    <g fill="#c8d0e8" font-family="IBM Plex Mono" font-size="13" text-anchor="middle"><text x="800" y="317">⏱ 0 h</text><text x="800" y="347">🌡 21°C</text><text x="800" y="377">⛽ 26 %</text></g>
    <!-- voyants P / N / PMT (28-30) -->
    <g stroke-width="3"><circle cx="620" cy="398" r="17" fill="#1f4a2e" stroke="#0e4a30"/><circle cx="664" cy="412" r="17" fill="#1f4a2e" stroke="#0e4a30"/><circle cx="708" cy="398" r="17" fill="#2a2a3a" stroke="#4a4a5c"/></g>
    <g fill="#e8e9f3" font-family="IBM Plex Mono" font-size="12" text-anchor="middle"><text x="620" y="403">P</text><text x="664" y="417">N</text><text x="708" y="403">M</text></g>
    <!-- voyants état gauche (31-33) / droite (34-36) -->
    <g fill="#2a2024" stroke="#5c2018" stroke-width="3"><circle cx="100" cy="532" r="20"/><circle cx="160" cy="532" r="20"/><circle cx="220" cy="532" r="20"/></g>
    <g fill="#242a24" stroke="#3a4652" stroke-width="3"><circle cx="700" cy="532" r="20"/><circle cx="760" cy="532" r="20"/><circle cx="820" cy="532" r="20"/></g>
    <!-- bandeau CTD (38-41) -->
    <rect x="280" y="500" width="360" height="64" rx="8" fill="#0e1319" stroke="#3a4652" stroke-width="2.5"/>
    <text x="380" y="540" text-anchor="middle" fill="#e8e9f3" font-family="IBM Plex Mono" font-size="19">0 L/min</text>
    <text x="540" y="530" text-anchor="middle" fill="#e8e9f3" font-family="IBM Plex Mono" font-size="16">0.0 %</text>
    <text x="540" y="552" text-anchor="middle" fill="#62628a" font-family="IBM Plex Mono" font-size="13">0.0 Bar</text>
    <text x="460" y="586" text-anchor="middle" fill="#62628a" font-family="IBM Plex Mono" font-size="12">SÉLECTIONNER INTERVENTION</text>
    <!-- rangée touches (37, 42-44) -->
    <g fill="#171b21" stroke="#3a4652" stroke-width="2.5">
      <rect x="66" y="612" width="52" height="52" rx="7"/><rect x="180" y="612" width="52" height="52" rx="7"/>
      <rect x="290" y="612" width="52" height="52" rx="7"/><rect x="360" y="612" width="52" height="52" rx="7"/><rect x="430" y="612" width="52" height="52" rx="7"/><rect x="500" y="612" width="52" height="52" rx="7"/><rect x="570" y="612" width="52" height="52" rx="7"/><rect x="640" y="612" width="52" height="52" rx="7"/>
      <rect x="880" y="612" width="70" height="52" rx="7"/>
    </g>
    <g fill="#8a94b8" font-family="IBM Plex Mono" font-size="15" text-anchor="middle"><text x="92" y="644">🔧</text><text x="206" y="644">CTD</text><text x="915" y="644">EXT</text></g>
  </svg>` };

  /* Vue active : photographie réelle de l'écran principal arrière.
     Les overlays restent masqués tant qu'aucune simulation n'est lancée. */
  S['gimaex-ecran'] = {
    aspect: '1000 / 760',
    className: 'schema-photo schema-gimaex-screen schema-gimaex-main-photo',
    svg: `
  <svg viewBox="0 0 1000 760" data-photo-base-height="760" role="img" aria-labelledby="gxe-photo-title" preserveAspectRatio="xMidYMid meet">
    <title id="gxe-photo-title">Écran principal GIMAEX FT du tableau arrière</title>
    <rect data-photo-background width="1000" height="760" fill="#05090d"/>
    <text x="500" y="370" text-anchor="middle" fill="#6f7d87" font-family="IBM Plex Mono" font-size="18">Image attendue :</text>
    <text x="500" y="402" text-anchor="middle" fill="#9ba9b2" font-family="IBM Plex Mono" font-size="17">assets/gimaex/ecran-principal-gimaex.png</text>
    <image id="gxe-photo" class="gimaex-screen-photo" href="assets/gimaex/ecran-principal-gimaex.png"
      x="0" y="0" width="1000" height="760" preserveAspectRatio="xMidYMid meet"/>
    <rect id="gxe-night-overlay" data-photo-background width="1000" height="760" fill="#020810" opacity="0" pointer-events="none"/>

    <!-- Valeurs ciblées : volontairement invisibles au repos pour laisser la photo intacte. -->
    <g id="gxe-live-overlays" visibility="hidden" pointer-events="none"
       font-family="IBM Plex Mono, monospace" text-anchor="middle">
      <g class="gxe-live-value"><rect x="405" y="174" width="190" height="36" rx="7"/><text id="gxe-pressure" x="500" y="198">6,0 bar</text></g>
      <g class="gxe-live-value"><rect x="410" y="396" width="180" height="34" rx="7"/><text id="gxe-vacuum" x="500" y="419">−0,1 bar</text></g>
      <g class="gxe-live-value"><rect x="735" y="210" width="132" height="34" rx="7"/><text id="gxe-rpm" x="801" y="233">1 200 tr/min</text></g>
      <g class="gxe-live-value"><rect x="412" y="294" width="176" height="40" rx="7"/><text id="gxe-regulation" x="500" y="319">RÉGUL. 6 bar</text></g>
      <g class="gxe-state-lamps" font-size="15" font-weight="700">
        <circle id="gxe-park" cx="620" cy="398" r="15"/><text x="620" y="404">P</text>
        <circle id="gxe-neutral" cx="665" cy="414" r="15"/><text x="665" y="420">N</text>
        <circle id="gxe-pto" cx="710" cy="398" r="15"/><text x="710" y="404">M</text>
      </g>
      <g class="gxe-live-value"><rect x="294" y="503" width="150" height="42" rx="7"/><text id="gxe-flow" x="369" y="530">250 L/min</text></g>
      <g class="gxe-live-value"><rect x="460" y="503" width="150" height="42" rx="7"/><text id="gxe-dose" x="535" y="530">0,5 %</text></g>
    </g>
  </svg>`
  };

  /* --- Coffre arrière gauche (p. 16) --- */
  S['gimaex-coffre'] = { aspect: '1000 / 620', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <rect x="40" y="30" width="920" height="560" rx="14" fill="#3a3f45" stroke="#23272c" stroke-width="4" filter="url(#soft)"/>
    <g stroke="#4a5058" stroke-width="2" opacity=".5">${Array.from({length:10},(_,i)=>`<line x1="${80+i*90}" y1="40" x2="${40+i*90}" y2="580"/>`).join('')}</g>
    <!-- plaque attention -->
    <rect x="90" y="70" width="290" height="70" rx="6" fill="#e8e9f3"/>
    <text x="235" y="100" text-anchor="middle" fill="#c0392b" font-family="Chakra Petch" font-weight="700" font-size="17">⚠ ATTENTION</text>
    <text x="235" y="124" text-anchor="middle" fill="#1a1a2e" font-family="IBM Plex Mono" font-size="13">NE PAS RESTER SOUS LE PORTE-ÉCHELLES</text>
    <!-- commande porte-échelles -->
    <rect x="150" y="330" width="300" height="180" rx="10" fill="#c0392b" stroke="#7e2418" stroke-width="4" filter="url(#soft)"/>
    <text x="300" y="368" text-anchor="middle" fill="#fff" font-family="Chakra Petch" font-weight="700" font-size="19">ÉCHELLES · MONTÉE</text>
    <circle id="gc-pe" cx="300" cy="434" r="34" fill="#7e2418" stroke="#4a120a" stroke-width="4"/>
    <circle cx="292" cy="424" r="8" fill="#ffffff" opacity=".25"/>
    <text x="300" y="498" text-anchor="middle" fill="#fff" font-family="Chakra Petch" font-weight="600" font-size="15">DESCENTE</text>
    <!-- bloc mât -->
    <text x="640" y="130" text-anchor="middle" fill="#c8d0e8" font-family="Chakra Petch" font-weight="600" font-size="17">MÂT DÉPLOYÉ</text>
    <circle id="gc-voy" cx="640" cy="186" r="18" fill="#3a1512" stroke="#5c2018" stroke-width="4"/>
    <text x="640" y="286" text-anchor="middle" fill="#c8d0e8" font-family="Chakra Petch" font-weight="600" font-size="17">MANŒUVRE MÂT</text>
    <circle id="gc-knob" cx="640" cy="341" r="32" fill="url(#valG)" stroke="#181820" stroke-width="4" filter="url(#soft)"/>
    <line id="gc-knob-l" x1="640" y1="341" x2="640" y2="315" stroke="#c8d0e8" stroke-width="5" stroke-linecap="round" style="transform-origin:640px 341px;transition:transform .3s;"/>
    <g fill="#8a94b8" font-family="IBM Plex Mono" font-size="13" text-anchor="middle"><text x="588" y="320">▲</text><text x="692" y="320">▼</text></g>
    <text x="640" y="430" text-anchor="middle" fill="#c8d0e8" font-family="Chakra Petch" font-weight="600" font-size="17">ÉCLAIRAGE MÂT</text>
    <rect id="gc-ecl" x="612" y="456" width="56" height="30" rx="8" fill="#141414" stroke="#2e2e2e" stroke-width="3"/>
    <circle id="gc-ecl-dot" cx="628" cy="471" r="8" fill="#3a3a3a"/>
    <!-- purge -->
    <rect x="800" y="330" width="110" height="60" rx="9" fill="url(#valG)" stroke="#8a94b8" stroke-width="3"/>
    <text x="855" y="410" text-anchor="middle" fill="#62628a" font-family="IBM Plex Mono" font-size="12">PURGE (coffre AV droit)</text>
  </svg>` };

  /* --- Annexes mécaniques : transmission, différentiel et ralentisseur --- */
  S['annexes-transmission'] = { aspect: '1000 / 620', className: 'schema-realistic', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <defs><linearGradient id="at-steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e4e9eb"/><stop offset=".2" stop-color="#68747b"/><stop offset=".48" stop-color="#c8d0d4"/><stop offset=".75" stop-color="#313a40"/><stop offset="1" stop-color="#89949a"/></linearGradient><radialGradient id="at-gear"><stop offset="0" stop-color="#b9c3c8"/><stop offset=".35" stop-color="#58656c"/><stop offset="1" stop-color="#11171b"/></radialGradient><filter id="at-shadow" x="-35%" y="-35%" width="170%" height="180%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#000" flood-opacity=".55"/></filter></defs>
    <text x="500" y="50" text-anchor="middle" fill="#e8e9f3" font-family="Chakra Petch" font-size="28" font-weight="700">TRANSMISSION ET FREINAGE D’ENDURANCE</text>
    <!-- boîte de transfert -->
    <g transform="translate(190 300)" filter="url(#at-shadow)"><path d="M-122-105H82L124-62V80L78 112H-120Z" fill="url(#at-steel)" stroke="#20282d" stroke-width="7"/><circle cx="-78" cy="-12" r="50" fill="url(#at-gear)" stroke="#c0c8cc" stroke-width="6"/><circle cx="54" cy="-40" r="37" fill="url(#at-gear)" stroke="#c0c8cc" stroke-width="6"/><circle cx="53" cy="60" r="43" fill="url(#at-gear)" stroke="#c0c8cc" stroke-width="6"/><path d="M-25-18L22-38M-22 7L18 50" stroke="#c28b42" stroke-width="16"/><circle cx="-78" cy="-12" r="15" fill="#151b1f"/><circle cx="54" cy="-40" r="12" fill="#151b1f"/><circle cx="53" cy="60" r="12" fill="#151b1f"/></g><text x="190" y="468" text-anchor="middle" fill="#f3bd72" font-family="Chakra Petch" font-size="21" font-weight="700">BOÎTE DE TRANSFERT</text><text x="190" y="492" text-anchor="middle" fill="#8d9ca5" font-family="IBM Plex Mono" font-size="13">4×4 · GV/PV · renvoi accessoires</text>
    <!-- différentiel -->
    <g transform="translate(500 300)" filter="url(#at-shadow)"><circle r="128" fill="url(#at-steel)" stroke="#20282d" stroke-width="8"/><circle r="94" fill="none" stroke="#303b42" stroke-width="25" stroke-dasharray="26 9"/><circle r="54" fill="url(#at-gear)" stroke="#b7c0c4" stroke-width="6"/><g fill="url(#at-gear)" stroke="#c1c9cd" stroke-width="4"><circle cx="-30" r="27"/><circle cx="30" r="27"/><circle cy="-30" r="23"/><circle cy="30" r="23"/></g><path d="M-160 0H-112M112 0H160" stroke="url(#at-steel)" stroke-width="24" stroke-linecap="round"/></g><text x="500" y="468" text-anchor="middle" fill="#c99ce1" font-family="Chakra Petch" font-size="21" font-weight="700">DIFFÉRENTIEL / PONT</text><text x="500" y="492" text-anchor="middle" fill="#8d9ca5" font-family="IBM Plex Mono" font-size="13">satellites · planétaires · blocage</text>
    <!-- ralentisseur hydrodynamique -->
    <g transform="translate(810 300)" filter="url(#at-shadow)"><circle r="128" fill="url(#at-steel)" stroke="#20282d" stroke-width="8"/><circle r="100" fill="#172129" stroke="#65747c" stroke-width="5"/><g id="at-retarder" style="transform-box:fill-box;transform-origin:center;animation:spin 5s linear infinite;">${Array.from({length:10},(_,i)=>`<path d="M0 0Q42-15 75-62" transform="rotate(${i*36})" stroke="#4aaed1" stroke-width="15" stroke-linecap="round" fill="none"/>`).join('')}<circle r="25" fill="url(#at-steel)"/></g><path d="M-164 0H-125M125 0H164" stroke="url(#at-steel)" stroke-width="24" stroke-linecap="round"/></g><text x="810" y="468" text-anchor="middle" fill="#73d6f8" font-family="Chakra Petch" font-size="21" font-weight="700">RALENTISSEUR</text><text x="810" y="492" text-anchor="middle" fill="#8d9ca5" font-family="IBM Plex Mono" font-size="13">hydraulique · sans frottement</text>
    <text x="500" y="574" text-anchor="middle" fill="#6e7e88" font-family="IBM Plex Mono" font-size="14">Mise en œuvre des crabots : à l’arrêt ou à très faible vitesse · jamais en patinage.</text>
  </svg>` };

  /* --- Annexes d'entretien : turbo et pneumatique en coupe --- */
  S['annexes-service'] = { aspect: '1000 / 620', className: 'schema-realistic', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <defs><linearGradient id="as-steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8edef"/><stop offset=".2" stop-color="#68747b"/><stop offset=".5" stop-color="#cbd2d5"/><stop offset=".76" stop-color="#313a40"/><stop offset="1" stop-color="#89949a"/></linearGradient><filter id="as-shadow" x="-35%" y="-35%" width="170%" height="180%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#000" flood-opacity=".55"/></filter></defs>
    <text x="500" y="50" text-anchor="middle" fill="#e8e9f3" font-family="Chakra Petch" font-size="28" font-weight="700">TURBO-COMPRESSEUR ET PNEUMATIQUE</text>
    <!-- turbo double volute -->
    <g transform="translate(270 300)" filter="url(#as-shadow)"><path d="M-190 0Q-188-142-52-151Q57-158 93-76Q126-6 67 55Q15 108-76 66L-41 22Q-2 45 28 16Q58-18 36-54Q12-94-55-88Q-116-83-121-20Q-126 42-75 73L-110 126Q-194 84-190 0Z" fill="url(#as-steel)" stroke="#20282d" stroke-width="8"/><circle cx="-56" cy="-12" r="65" fill="#172129" stroke="#6b7981" stroke-width="5"/><g id="as-compressor" style="transform-box:fill-box;transform-origin:center;animation:spin 3s linear infinite;">${Array.from({length:9},(_,i)=>`<path d="M-56-12Q-20-26 3-59" transform="rotate(${i*40} -56 -12)" stroke="#46bfe8" stroke-width="11" stroke-linecap="round" fill="none"/>`).join('')}<circle cx="-56" cy="-12" r="18" fill="url(#as-steel)"/></g><path d="M10-12H142" stroke="#8f5b2d" stroke-width="20"/><path d="M16-18H142" stroke="#d09a58" stroke-width="6"/><circle cx="144" cy="-12" r="75" fill="#3b2119" stroke="#8b4c2e" stroke-width="8"/><g id="as-turbine" style="transform-box:fill-box;transform-origin:center;animation:spin 3s linear infinite;">${Array.from({length:9},(_,i)=>`<path d="M144-12Q174-28 191-58" transform="rotate(${i*40} 144 -12)" stroke="#e47645" stroke-width="11" stroke-linecap="round" fill="none"/>`).join('')}<circle cx="144" cy="-12" r="18" fill="url(#as-steel)"/></g></g><text x="270" y="493" text-anchor="middle" fill="#73d6f8" font-family="Chakra Petch" font-size="21" font-weight="700">TURBO-COMPRESSEUR</text><text x="270" y="518" text-anchor="middle" fill="#8d9ca5" font-family="IBM Plex Mono" font-size="13">air comprimé ← axe lubrifié → échappement</text>
    <!-- pneu en coupe -->
    <g transform="translate(740 300)" filter="url(#as-shadow)"><circle r="175" fill="#090b0d" stroke="#505b61" stroke-width="8"/><circle r="118" fill="#171d21" stroke="#89949a" stroke-width="8"/><circle r="69" fill="url(#as-steel)" stroke="#343d42" stroke-width="7"/><circle r="25" fill="#14191c"/><path d="M-130-112Q0-165 130-112M-154-68Q0-120 154-68" fill="none" stroke="#343d42" stroke-width="17" stroke-dasharray="33 13"/><path d="M-168 0Q-170 95-115 140M168 0Q170 95 115 140" fill="none" stroke="#30383d" stroke-width="20"/><path d="M-102-72Q0-108 102-72" fill="none" stroke="#bac3c7" stroke-width="5" stroke-dasharray="5 8"/><path d="M-119 95Q0 138 119 95" fill="none" stroke="#bac3c7" stroke-width="5" stroke-dasharray="5 8"/></g><text x="740" y="493" text-anchor="middle" fill="#8ceab5" font-family="Chakra Petch" font-size="21" font-weight="700">PNEUMATIQUE TUBELESS</text><text x="740" y="518" text-anchor="middle" fill="#8d9ca5" font-family="IBM Plex Mono" font-size="13">bande · carcasse · flanc · bourrelet</text>
    <text x="500" y="574" text-anchor="middle" fill="#6e7e88" font-family="IBM Plex Mono" font-size="14">À froid : pression constructeur · contrôler flancs, usure, valves et fuites.</text>
  </svg>` };

  /* --- Accessoires hydrauliques issus de la mise en œuvre COD 1 --- */
  S['accessoires-hydro'] = { aspect: '1000 / 620', className: 'schema-realistic', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <defs><linearGradient id="ac-steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#edf1f2"/><stop offset=".2" stop-color="#69757b"/><stop offset=".48" stop-color="#d0d7da"/><stop offset=".75" stop-color="#323b40"/><stop offset="1" stop-color="#8d979c"/></linearGradient><linearGradient id="ac-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2ca73"/><stop offset=".45" stop-color="#a76b25"/><stop offset="1" stop-color="#593214"/></linearGradient><filter id="ac-shadow" x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="9" stdDeviation="8" flood-color="#000" flood-opacity=".55"/></filter></defs>
    <text x="500" y="48" text-anchor="middle" fill="#e8e9f3" font-family="Chakra Petch" font-size="28" font-weight="700">ACCESSOIRES HYDRAULIQUES ET D’ALIMENTATION</text>
    <!-- division -->
    <g transform="translate(150 205)" filter="url(#ac-shadow)"><path d="M-80 0H40M35 0L95-55M35 0L95 55" stroke="url(#ac-steel)" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/><g fill="#1f272c" stroke="#c2c9cc" stroke-width="5"><circle cx="-80" r="29"/><circle cx="95" cy="-55" r="29"/><circle cx="95" cy="55" r="29"/></g><path d="M22-20V20" stroke="#db3d2d" stroke-width="12"/></g><text x="150" y="318" text-anchor="middle" fill="#d7e0e4" font-family="IBM Plex Mono" font-size="15">DIVISION</text>
    <!-- coude d'alimentation -->
    <g transform="translate(400 200)" filter="url(#ac-shadow)"><path d="M-78 65V-20Q-78-76-22-76H70" fill="none" stroke="#171d21" stroke-width="64" stroke-linecap="round"/><path d="M-78 65V-20Q-78-76-22-76H70" fill="none" stroke="url(#ac-steel)" stroke-width="48" stroke-linecap="round"/><circle cx="-78" cy="65" r="31" fill="#20282d" stroke="#c2c9cc" stroke-width="6"/><circle cx="70" cy="-76" r="31" fill="#20282d" stroke="#c2c9cc" stroke-width="6"/></g><text x="400" y="318" text-anchor="middle" fill="#d7e0e4" font-family="IBM Plex Mono" font-size="15">COUDE D’ALIMENTATION</text>
    <!-- retenue BI -->
    <g transform="translate(650 200)" filter="url(#ac-shadow)"><path d="M-80 0H80" stroke="url(#ac-brass)" stroke-width="54" stroke-linecap="round"/><circle cx="-80" r="33" fill="#2c2518" stroke="#e1b35d" stroke-width="6"/><circle cx="80" r="33" fill="#2c2518" stroke="#e1b35d" stroke-width="6"/><path d="M0-70V0" stroke="#d74231" stroke-width="15"/><path d="M-44-70H44" stroke="#d74231" stroke-width="13" stroke-linecap="round"/><circle r="14" fill="#171b1d"/></g><text x="650" y="318" text-anchor="middle" fill="#d7e0e4" font-family="IBM Plex Mono" font-size="15">RETENUE DE BI</text>
    <!-- bouchon obturateur -->
    <g transform="translate(875 200)" filter="url(#ac-shadow)"><circle r="72" fill="url(#ac-steel)" stroke="#1c2327" stroke-width="8"/><circle r="43" fill="#252d32" stroke="#c2c9cc" stroke-width="6"/><path d="M-25-52L25 52M25-52L-25 52" stroke="#59656b" stroke-width="9"/></g><text x="875" y="318" text-anchor="middle" fill="#d7e0e4" font-family="IBM Plex Mono" font-size="15">BOUCHON Ø70</text>
    <!-- crépine -->
    <g transform="translate(170 470)" filter="url(#ac-shadow)"><path d="M-75-58H52Q82-58 82-28V28Q82 58 52 58H-75Z" fill="url(#ac-steel)" stroke="#1c2327" stroke-width="7"/><g stroke="#354047" stroke-width="5">${[-50,-25,0,25,50].map(x=>`<path d="M${x}-48V48"/>`).join('')}<path d="M-66-24H70M-66 0H70M-66 24H70"/></g><circle cx="83" r="29" fill="#252d32" stroke="#c2c9cc" stroke-width="6"/></g><text x="170" y="575" text-anchor="middle" fill="#d7e0e4" font-family="IBM Plex Mono" font-size="15">CRÉPINE D’ASPIRATION</text>
    <!-- aspiral -->
    <g transform="translate(470 470)" filter="url(#ac-shadow)"><path d="M-120 0Q-75-95 0 0Q75 95 120 0" fill="none" stroke="#11171a" stroke-width="54" stroke-linecap="round"/><path d="M-120 0Q-75-95 0 0Q75 95 120 0" fill="none" stroke="#46525a" stroke-width="40" stroke-linecap="round"/><path d="M-120 0Q-75-95 0 0Q75 95 120 0" fill="none" stroke="#89959b" stroke-width="5" stroke-dasharray="7 10"/><circle cx="-120" r="28" fill="#20282d" stroke="#c2c9cc" stroke-width="6"/><circle cx="120" r="28" fill="#20282d" stroke="#c2c9cc" stroke-width="6"/></g><text x="470" y="575" text-anchor="middle" fill="#d7e0e4" font-family="IBM Plex Mono" font-size="15">ASPIRAL Ø110</text>
    <!-- canne plongeuse GFR -->
    <g transform="translate(775 470)" filter="url(#ac-shadow)"><path d="M-92-70H66V70H-92Z" fill="#37454d" stroke="#8b989e" stroke-width="6"/><path d="M-72-48H46V48H-72Z" fill="#1c2a30"/><path d="M70-100V40Q70 66 44 66H20" fill="none" stroke="url(#ac-steel)" stroke-width="22" stroke-linecap="round"/><path d="M70-100H116" stroke="url(#ac-steel)" stroke-width="22" stroke-linecap="round"/><circle cx="116" cy="-100" r="22" fill="#252d32" stroke="#c2c9cc" stroke-width="5"/></g><text x="775" y="575" text-anchor="middle" fill="#d7e0e4" font-family="IBM Plex Mono" font-size="15">CANNE GFR / BIDON</text>
  </svg>` };

  /* --- Équipements de mise en œuvre générale du COD 1 --- */
  S['accessoires-operation'] = { aspect: '1000 / 620', className: 'schema-realistic', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <defs><linearGradient id="ao-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef2f3"/><stop offset=".25" stop-color="#68757c"/><stop offset=".5" stop-color="#d1d8db"/><stop offset=".78" stop-color="#333d42"/><stop offset="1" stop-color="#8e999e"/></linearGradient><linearGradient id="ao-yellow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe77a"/><stop offset=".48" stop-color="#e5a526"/><stop offset="1" stop-color="#7d4b0a"/></linearGradient><filter id="ao-shadow" x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="9" stdDeviation="8" flood-color="#000" flood-opacity=".58"/></filter></defs>
    <text x="500" y="48" text-anchor="middle" fill="#e8e9f3" font-family="Chakra Petch" font-size="28" font-weight="700">ÉQUIPEMENTS DE MISE EN ŒUVRE — COD 1</text>
    <!-- cale de roue -->
    <g transform="translate(150 210)" filter="url(#ao-shadow)"><path d="M-100 58H98V24H54V-10H10V-44H-36V-78H-100Z" fill="url(#ao-yellow)" stroke="#6d440e" stroke-width="7"/><path d="M-83 40H80M-34-58V38M12-25V38M56 8V38" stroke="#fff0a0" stroke-width="5" opacity=".55"/></g><text x="150" y="330" text-anchor="middle" fill="#f3bd72" font-family="IBM Plex Mono" font-size="15">CALAGE</text>
    <!-- balisage -->
    <g transform="translate(380 210)" filter="url(#ao-shadow)"><path d="M-72 80H72L56 46H-56Z" fill="#313940" stroke="#929da3" stroke-width="5"/><path d="M-42 46L-17-86H17L42 46Z" fill="#ef5a2c" stroke="#89230f" stroke-width="6"/><path d="M-28-22H28L37 20H-37Z" fill="#f4e5c0"/><rect x="-48" y="-122" width="96" height="34" rx="17" fill="#1966a6" stroke="#69bff0" stroke-width="5"/><path d="M-33-105H33" stroke="#bdeaff" stroke-width="5"/></g><text x="380" y="330" text-anchor="middle" fill="#f0a36a" font-family="IBM Plex Mono" font-size="15">BALISAGE / GYRO</text>
    <!-- kit pression hydrant -->
    <g transform="translate(620 210)" filter="url(#ao-shadow)"><path d="M0 68V18" stroke="url(#ao-metal)" stroke-width="31"/><path d="M0 64H95" stroke="url(#ao-metal)" stroke-width="27" stroke-linecap="round"/><circle r="82" fill="url(#valG)" stroke="#9aa6ac" stroke-width="7"/><circle r="62" fill="#0b1218" stroke="#344650" stroke-width="4"/><g stroke="#7b8c95" stroke-width="3">${Array.from({length:9},(_,i)=>{const a=(-140+i*35)*Math.PI/180;return `<path d="M${Math.cos(a)*48} ${Math.sin(a)*48}L${Math.cos(a)*57} ${Math.sin(a)*57}"/>`;}).join('')}</g><line y2="-48" stroke="#48c58a" stroke-width="6" stroke-linecap="round" transform="rotate(42)"/><circle r="9" fill="#d8dfe2"/><circle cx="95" cy="64" r="25" fill="#20292e" stroke="#bcc5c9" stroke-width="5"/></g><text x="620" y="330" text-anchor="middle" fill="#86e1b0" font-family="IBM Plex Mono" font-size="15">CONTRÔLE HYDRANT</text>
    <!-- outils de forcement -->
    <g transform="translate(855 210)" filter="url(#ao-shadow)"><path d="M-86 90L70-88" stroke="#c53c2d" stroke-width="19" stroke-linecap="round"/><path d="M53-98L96-52L77-32L34-78Z" fill="url(#ao-metal)" stroke="#252d31" stroke-width="5"/><path d="M-84-86L78 92" stroke="#77502e" stroke-width="18" stroke-linecap="round"/><path d="M-110-106Q-64-137-23-102L-45-72Q-76-89-98-62Z" fill="url(#ao-metal)" stroke="#252d31" stroke-width="5"/></g><text x="855" y="330" text-anchor="middle" fill="#e7a08f" font-family="IBM Plex Mono" font-size="15">OUTILS DE FORCEMENT</text>
    <!-- parc-échelles -->
    <g transform="translate(280 480)" filter="url(#ao-shadow)"><g stroke="url(#ao-metal)" stroke-width="16" stroke-linecap="round"><path d="M-180-52H180"/><path d="M-180 52H180"/></g><g stroke="#8f9ba1" stroke-width="9">${[-135,-90,-45,0,45,90,135].map(x=>`<path d="M${x}-48V48"/>`).join('')}</g><path d="M-24-80V80M24-80V80" stroke="#e1ae3b" stroke-width="13"/><rect x="-46" y="-100" width="92" height="36" rx="9" fill="#b72a1e" stroke="#67100b" stroke-width="5"/></g><text x="280" y="585" text-anchor="middle" fill="#c9d3d8" font-family="IBM Plex Mono" font-size="15">PARC-ÉCHELLES · VERROUILLAGE</text>
    <!-- reconditionnement -->
    <g transform="translate(745 480)" filter="url(#ao-shadow)"><path d="M-154-42Q-75-110 0-42T154-42" fill="none" stroke="#33434c" stroke-width="48" stroke-linecap="round"/><path d="M-154-42Q-75-110 0-42T154-42" fill="none" stroke="#74838b" stroke-width="6" stroke-dasharray="8 11"/><g transform="translate(0 30)"><rect x="-95" y="-32" width="190" height="78" rx="10" fill="#172129" stroke="#596872" stroke-width="5"/><path d="M-95-4H95" stroke="#596872" stroke-width="4"/><path d="M0-32V46" stroke="#596872" stroke-width="4"/><path d="M-54 12h18M36 12h18" stroke="#d9e0e3" stroke-width="5" stroke-linecap="round"/></g></g><text x="745" y="585" text-anchor="middle" fill="#7ed6ed" font-family="IBM Plex Mono" font-size="15">RECONDITIONNEMENT</text>
  </svg>` };

  /* --- Mât & porte-échelles : arrière du véhicule --- */
  S['mat-pe'] = { aspect: '1000 / 620', className: 'schema-realistic', svg: `
  <svg viewBox="0 0 1000 620">
    ${ENV_DEFS}
    <line x1="20" y1="560" x2="980" y2="560" stroke="#2a2a4c" stroke-width="3"/>
    <!-- arrière du FPT -->
    <ellipse cx="440" cy="552" rx="200" ry="12" fill="#000" opacity=".35"/>
    <rect x="300" y="170" width="280" height="390" rx="12" fill="url(#redP)" stroke="#5a1c12" stroke-width="4" filter="url(#soft)"/>
    <g stroke="#e8c33a" stroke-width="13">${Array.from({length:5},(_,i)=>`<line x1="${310+i*58}" y1="545" x2="${350+i*58}" y2="440"/>`).join('')}</g>
    <rect x="360" y="200" width="160" height="120" rx="8" fill="#15151f" stroke="#3a3a4c" stroke-width="3"/>
    <circle id="mp-voy" cx="440" cy="372" r="14" fill="#e74c3c" stroke="#7e2418" stroke-width="3"/>
    <text x="440" y="405" text-anchor="middle" fill="#f0c0b8" font-family="IBM Plex Mono" font-size="12">voyant mât</text>
    <!-- mât -->
    <rect x="238" y="180" width="26" height="380" rx="9" fill="url(#valG)" stroke="#8a94b8" stroke-width="4" filter="url(#soft)"/>
    <g id="mp-mast-ext" visibility="hidden">
      <rect x="242" y="80" width="18" height="120" rx="7" fill="url(#valG)" stroke="#8a94b8" stroke-width="3"/>
      <rect x="222" y="52" width="58" height="26" rx="7" fill="#20203a" stroke="#8a94b8" stroke-width="3"/>
      <g id="mp-glow" visibility="hidden">
        <g fill="#ffe9a0"><circle cx="232" cy="65" r="7"/><circle cx="248" cy="65" r="7"/><circle cx="264" cy="65" r="7"/><circle cx="272" cy="65" r="7"/></g>
        <path d="M222 78 L150 240 M280 78 L352 240" stroke="#ffe9a0" stroke-width="3" opacity=".4"/>
      </g>
    </g>
    <!-- porte-échelles -->
    <g id="mp-pe-up">
      <g stroke="#8a94b8" stroke-width="8" stroke-linecap="round"><line x1="600" y1="160" x2="900" y2="160"/><line x1="600" y1="186" x2="900" y2="186"/></g>
      <g stroke="#68689a" stroke-width="5">${Array.from({length:7},(_,i)=>`<line x1="${630+i*40}" y1="154" x2="${630+i*40}" y2="192"/>`).join('')}</g>
      <path d="M600 173 L580 240" stroke="#565686" stroke-width="9" stroke-linecap="round"/>
    </g>
    <g id="mp-pe-down" visibility="hidden">
      <g stroke="#8a94b8" stroke-width="8" stroke-linecap="round"><line x1="620" y1="300" x2="880" y2="520"/><line x1="600" y1="322" x2="860" y2="542"/></g>
      <g stroke="#68689a" stroke-width="5">${Array.from({length:6},(_,i)=>`<line x1="${628+i*44}" y1="${300+i*38}" x2="${610+i*44}" y2="${324+i*38}"/>`).join('')}</g>
    </g>
    <!-- bras de manœuvre -->
    <path id="mp-bras" d="M590 240 Q680 300 830 340" fill="none" stroke="#e8c33a" stroke-width="10" stroke-linecap="round" filter="url(#soft)"/>
    <circle cx="590" cy="240" r="11" fill="url(#valG)" stroke="#8a94b8" stroke-width="3"/>
    <!-- commande coffre -->
    <rect x="560" y="452" width="130" height="76" rx="9" fill="#c0392b" stroke="#7e2418" stroke-width="3" filter="url(#soft)"/>
    <circle cx="600" cy="490" r="16" fill="#7e2418" stroke="#4a120a" stroke-width="3"/>
    <text x="648" y="482" fill="#fff" font-family="IBM Plex Mono" font-size="12">MONTÉE</text>
    <text x="648" y="504" fill="#fff" font-family="IBM Plex Mono" font-size="12">DESCENTE</text>
  </svg>` };

  /* ---------------------------------------------------------
     Couche interactive : contrôleurs par schéma (boutons, vannes
     cliquables, séquences animées, simulations de panne).
     --------------------------------------------------------- */
  const INTERACT = {};
  function schControls(stage){
    const panel = document.createElement('section');
    panel.className = 'schema-bottom-panel schema-interaction-panel';
    panel.innerHTML =
      '<div class="schema-bottom-head"><span><b>Mode interactif</b><small>Manipulez les commandes et observez la réaction du système.</small></span><span class="schema-live-badge">ACTIF</span></div>' +
      '<div class="schema-panel-tabs"><span class="active">Commandes</span><span>États système</span></div>';
    const b = document.createElement('div');
    b.className = 'sch-controls schema-panel-actions';
    panel.appendChild(b);
    /* Les commandes restent dans le flux, immédiatement au-dessus du schéma. */
    if (stage.parentElement) stage.parentElement.insertBefore(panel, stage);
    else stage.appendChild(panel);
    return b;
  }
  function schChip(bar, label, on, fn){
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'scenario-btn' + (on ? ' active' : '');
    c.innerHTML = '<span class="dot"></span>' + label;
    c.setAttribute('aria-pressed', String(!!on));
    c.addEventListener('click', event => {
      fn(c, event);
      c.setAttribute('aria-pressed', String(c.classList.contains('active')));
    });
    bar.appendChild(c); return c;
  }
  function schMsg(stage){
    const m = document.createElement('div');
    m.className = 'sch-msg';
    m.hidden = true;
    m.setAttribute('role', 'status');
    m.setAttribute('aria-live', 'polite');
    if ((stage.classList.contains('schema-photo') || stage.classList.contains('schema-realistic')) && stage.parentElement){
      m.classList.add('sch-msg-flow');
      stage.insertAdjacentElement('afterend', m);
    } else {
      stage.appendChild(m);
    }
    return (t, color) => { if (!t){ m.hidden = true; return; } m.hidden = false; m.innerHTML = t; m.style.borderLeftColor = color || 'var(--cyan)'; };
  }
  function schShow(stage, sel, on){ const g = stage.querySelector(sel); if (g) g.setAttribute('visibility', on ? 'visible' : 'hidden'); }
  function schValve(g, open, partial){
    if (!g) return;
    g.style.transformBox = 'fill-box'; g.style.transformOrigin = 'center'; g.style.transition = 'transform .35s';
    g.style.transform = open ? 'rotate(0deg)' : 'rotate(45deg)';
    g.querySelectorAll('circle').forEach(c => c.setAttribute('stroke', open ? (partial ? '#f39c4a' : '#4cd68a') : '#e8695c'));
  }

  /* Écran principal : la photographie reste intacte au repos. Les seules
     modifications sont un filtre jour/nuit et quelques valeurs superposées
     lorsque l'utilisateur lance volontairement la simulation. */
  INTERACT['gimaex-ecran'] = (stage) => {
    const say = schMsg(stage), bar = schControls(stage);
    const overlay = stage.querySelector('#gxe-live-overlays');
    const state = { night:false, live:false, regulation:false, setpoint:6, pto:true, foam:false };
    const get = id => stage.querySelector(id);
    const buttons = {};

    function setLamp(id, on){
      const lamp = get(id);
      if (!lamp) return;
      lamp.style.fill = on ? '#17472b' : '#231b1b';
      lamp.style.stroke = on ? '#62ec9e' : '#8b4a43';
    }
    function apply(announce = true){
      stage.classList.toggle('schema-night', state.night);
      overlay?.setAttribute('visibility', state.live ? 'visible' : 'hidden');
      const pressure = state.regulation ? state.setpoint : (state.pto ? 3 : 0);
      if (get('#gxe-pressure')) get('#gxe-pressure').textContent = pressure.toFixed(1).replace('.', ',') + ' bar';
      if (get('#gxe-vacuum')) get('#gxe-vacuum').textContent = state.pto ? '−0,1 bar' : '0,0 bar';
      if (get('#gxe-rpm')) get('#gxe-rpm').textContent = (state.pto ? '1 200' : '800') + ' tr/min';
      if (get('#gxe-regulation')) get('#gxe-regulation').textContent = state.regulation ? 'RÉGUL. ' + state.setpoint + ' bar' : 'ARRÊT RÉGULATION';
      if (get('#gxe-flow')) get('#gxe-flow').textContent = state.foam ? '250 L/min' : '0 L/min';
      if (get('#gxe-dose')) get('#gxe-dose').textContent = state.foam ? '0,5 %' : '0,0 %';
      setLamp('#gxe-park', state.live);
      setLamp('#gxe-neutral', state.live);
      setLamp('#gxe-pto', state.live && state.pto);
      buttons.day?.classList.toggle('active', !state.night);
      buttons.night?.classList.toggle('active', state.night);
      buttons.live?.classList.toggle('active', state.live);
      buttons.regulation?.classList.toggle('active', state.live && state.regulation);
      buttons.foam?.classList.toggle('active', state.live && state.foam);
      Object.values(buttons).forEach(button => button?.setAttribute('aria-pressed', String(button.classList.contains('active'))));
      if (!announce) return;
      if (!state.live) say('Image réelle affichée sans superposition. Activez la simulation pour faire apparaître les valeurs dynamiques.', 'var(--mut)');
      else if (state.regulation) say(`Régulation active : consigne <b>${state.setpoint} bar</b>. Les overlays restent limités aux valeurs variables.`, 'var(--ok)');
      else say('Simulation active : PDM engagée, frein de parc serré et boîte au neutre.', 'var(--cyan)');
    }

    buttons.day = schChip(bar, '☀ Mode jour', true, () => { state.night = false; apply(false); say('Mode jour : photographie originale.', 'var(--cyan)'); });
    buttons.night = schChip(bar, '☾ Mode nuit', false, () => { state.night = true; apply(false); say('Mode nuit : luminosité et contraste réduits sans inversion des couleurs.', 'var(--cyan)'); });
    buttons.live = schChip(bar, 'Afficher la simulation', false, button => {
      state.live = !state.live;
      button.innerHTML = '<span class="dot"></span>' + (state.live ? 'Masquer la simulation' : 'Afficher la simulation');
      apply();
    });
    buttons.regulation = schChip(bar, 'Régulation', false, () => { state.live = true; state.regulation = !state.regulation; apply(); });
    buttons.plus = schChip(bar, 'Consigne +', false, () => {
      state.live = true; state.regulation = true; state.setpoint = Math.min(15, state.setpoint + 1); apply();
    });
    buttons.foam = schChip(bar, 'Débit mousse', false, () => { state.live = true; state.foam = !state.foam; apply(); });
    apply(false);
  };

  /* Hydraulique : trois calculs COD 1 pour matérialiser l'effet du débit et de Z. */
  INTERACT.hydro = (stage) => {
    const say = schMsg(stage), bar = schControls(stage);
    const result = stage.querySelector('#hy-result');
    const examples = [
      { label:'250 L/min · 100 m', po:6, j:1.5, z:0, text:'Ø45 à 250 L/min sur 100 m : J = 1,5 bar.' },
      { label:'Même ligne · +25 m', po:6, j:1.5, z:2.5, text:'La lance est 25 m plus haut : Z = +2,5 bar.' },
      { label:'500 L/min · 100 m', po:6, j:6, z:0, text:'Débit doublé : les pertes sont multipliées par quatre, J = 6 bar.' }
    ];
    const buttons = [];
    function apply(index){
      const current = examples[index];
      const pr = current.po + current.j + current.z;
      result.textContent = `Pr = ${current.po.toFixed(1).replace('.',',')} + ${current.j.toFixed(1).replace('.',',')} + ${current.z.toFixed(1).replace('.',',')} = ${pr.toFixed(1).replace('.',',')} bar`;
      say(`<b>${current.text}</b><br>Po ${current.po.toFixed(1).replace('.',',')} + J ${current.j.toFixed(1).replace('.',',')} + Z ${current.z.toFixed(1).replace('.',',')} = <b>${pr.toFixed(1).replace('.',',')} bar à la pompe</b>.`, index === 2 ? 'var(--orange)' : 'var(--cyan)');
      buttons.forEach((button, i) => {
        button.classList.toggle('active', i === index);
        button.setAttribute('aria-pressed', String(i === index));
      });
    }
    examples.forEach((example, index) => buttons.push(schChip(bar, example.label, index === 0, () => apply(index))));
    apply(0);
  };

  /* Hydrant : comparaison pression statique / dynamique et estimation Qmax. */
  INTERACT['hydro-hydrant'] = (stage) => {
    const say = schMsg(stage), bar = schControls(stage);
    const states = [
      { label:'Au repos', q:0, ps:7.5, pd:7.5 },
      { label:'Essai 500 L/min', q:500, ps:7.5, pd:5 },
      { label:'Essai 750 L/min', q:750, ps:7.5, pd:3.5 },
      { label:'Limite réseau', q:900, ps:7.5, pd:2 }
    ];
    const needles = [stage.querySelector('#hh-static-needle'), stage.querySelector('#hh-dynamic-needle')];
    const pressureText = stage.querySelector('#hh-pressures');
    const flowText = stage.querySelector('#hh-flow');
    const qmaxText = stage.querySelector('#hh-qmax');
    const angle = value => -130 + Math.max(0, Math.min(10, value)) / 10 * 260;
    const buttons = [];
    function apply(index){
      const current = states[index];
      if (needles[0]) needles[0].style.transform = `rotate(${angle(current.ps)}deg)`;
      if (needles[1]) needles[1].style.transform = `rotate(${angle(current.pd)}deg)`;
      pressureText.textContent = `Pstat ${current.ps.toFixed(1).replace('.',',')} bar · Pdyn ${current.pd.toFixed(1).replace('.',',')} bar`;
      flowText.textContent = current.q ? `Débit utilisé : ${current.q} L/min` : 'Hydrant au repos · débit nul';
      if (!current.q){
        qmaxText.textContent = 'Ouvrez un débit connu pour estimer Qmax';
        say('La pression statique se mesure eau au repos, refoulements fermés.', 'var(--cyan)');
      } else {
        const drop = current.ps - current.pd;
        const qmax = Math.round(current.q * Math.sqrt(current.ps / drop));
        qmaxText.textContent = `Qmax estimé ≈ ${qmax} L/min`;
        say(`Chute de pression : <b>${drop.toFixed(1).replace('.',',')} bar</b>. Plus Pdyn chute, plus le réseau approche de sa limite.`, drop >= 4 ? 'var(--orange)' : 'var(--ok)');
      }
      buttons.forEach((button, i) => {
        button.classList.toggle('active', i === index);
        button.setAttribute('aria-pressed', String(i === index));
      });
    }
    states.forEach((state, index) => buttons.push(schChip(bar, state.label, index === 0, () => apply(index))));
    apply(0);
  };

  /* Choix opérationnel du foisonnement selon le volume et la portée. */
  INTERACT['mousse-usage'] = (stage) => {
    const say = schMsg(stage), bar = schControls(stage);
    const choice = stage.querySelector('#mu-choice');
    const configs = [
      { id:'mu-low', label:'Bas foisonnement', text:'Hydrocarbures ou liquides inflammables en extérieur, fort rayonnement, besoin de portée.', color:'var(--ok)' },
      { id:'mu-medium', label:'Moyen foisonnement', text:'Feu de VL ou poubelle, écoulement d’hydrocarbure en préventif, consolidation d’un tapis.', color:'var(--orange)' },
      { id:'mu-high', label:'Haut foisonnement', text:'Remplissage d’un espace clos ou d’un entrepôt. Très sensible au vent : usage protégé.', color:'var(--cyan)' }
    ];
    const buttons = [];
    function apply(index){
      configs.forEach((config, i) => {
        const group = stage.querySelector('#' + config.id);
        if (group){ group.style.opacity = i === index ? '1' : '.18'; group.style.filter = i === index ? 'none' : 'grayscale(.8)'; }
      });
      choice.textContent = configs[index].text;
      say(`<b>${configs[index].label}</b> — ${configs[index].text}`, configs[index].color);
      buttons.forEach((button, i) => {
        button.classList.toggle('active', i === index);
        button.setAttribute('aria-pressed', String(i === index));
      });
    }
    configs.forEach((config, index) => buttons.push(schChip(bar, config.label, index === 0, () => apply(index))));
    apply(0);
  };

  /* Environnement de la pompe : moteur + 3 vannes manipulables */
  INTERACT.env = (stage) => {
    const say = schMsg(stage), bar = schControls(stage);
    const st = { motor: true, iso: true, alim: false, retour: false };
    const imp = stage.querySelector('#env-imp');
    function apply(){
      schValve(stage.querySelector('#v-iso'), st.iso);
      schValve(stage.querySelector('#v-alim'), st.alim);
      schValve(stage.querySelector('#v-retour'), st.retour, true);
      const fed = st.iso || st.alim;
      schShow(stage, '#f-cuve', st.motor && st.iso);
      schShow(stage, '#f-ext', st.motor && st.alim);
      schShow(stage, '#f-retour', st.motor && st.retour && fed);
      schShow(stage, '#f-drive', st.motor);
      if (imp) imp.style.animationPlayState = st.motor ? 'running' : 'paused';
      chips.motor.classList.toggle('active', st.motor);
      chips.iso.classList.toggle('active', st.iso);
      chips.alim.classList.toggle('active', st.alim);
      chips.retour.classList.toggle('active', st.retour);
      if (!st.motor) say('Moteur coupé : la PDM n’entraîne plus la pompe — aucun débit.', 'var(--mut)');
      else if (!fed) say('⚠ Pompe non alimentée (tonne isolée, pas de source extérieure) : échauffement, risque de cavitation.', 'var(--red-hi)');
      else if (st.iso && st.alim) say('Tonne ET alimentation ouvertes : sur alimentation extérieure, fermez la vanne d’isolation pompe-tonne.', 'var(--orange)');
      else say();
    }
    const chips = {
      motor: schChip(bar, '▶ Moteur + PDM', true, () => { st.motor = !st.motor; apply(); }),
      iso: schChip(bar, 'Vanne tonne-pompe', true, () => { st.iso = !st.iso; apply(); }),
      alim: schChip(bar, 'Vanne alimentation', false, () => { st.alim = !st.alim; apply(); }),
      retour: schChip(bar, 'Sauterelle (retour)', false, () => { st.retour = !st.retour; apply(); }),
    };
    stage._scenarioSync = scen => {
      st.motor = true;
      st.iso = scen === 'cuve';
      st.alim = scen === 'aspi' || scen === 'hydrant';
      st.retour = scen === 'hydrant';
      apply();
    };
    apply();
  };

  /* Chaîne cinématique : démarrer le moteur, enclencher la PDM */
  INTERACT.chaine = (stage) => {
    const say = schMsg(stage), bar = schControls(stage);
    let motor = false, pdm = false;
    const eng = stage.querySelector('#ch-eng');
    function apply(){
      schShow(stage, '#ch-run', motor);
      schShow(stage, '#ch-pdm-run', motor && pdm);
      if (eng) eng.style.animation = motor ? 'engshake .18s linear infinite' : 'none';
      bMotor.classList.toggle('active', motor);
      bPdm.classList.toggle('active', motor && pdm);
      bPdm.style.opacity = motor ? '1' : '.45';
      if (!motor) say('Moteur à l’arrêt. Démarrez-le pour animer la chaîne cinématique.', 'var(--mut)');
      else if (!pdm) say('Moteur en marche : l’énergie mécanique arrive à la boîte. Enclenchez la PDM (NEUTRE + frein de parc) pour entraîner la pompe.', 'var(--cyan)');
      else say('✓ PDM enclenchée : l’arbre de transmission entraîne la pompe et l’amorceur — prêt pour l’amorçage (débrayage à 3 bars).', 'var(--ok)');
    }
    const bMotor = schChip(bar, '▶ Démarrer le moteur', false, () => { motor = !motor; if (!motor) pdm = false; apply(); });
    const bPdm = schChip(bar, '⚙ Enclencher la PDM', false, () => {
      if (!motor){ say('✗ Impossible : démarrez d’abord le moteur.', 'var(--red-hi)'); return; }
      pdm = !pdm; apply();
    });
    apply();
  };

  /* Amorçage : séquence animée + panne classique (vanne ouverte) */
  INTERACT.amorcage = (stage) => {
    const say = schMsg(stage), bar = schControls(stage);
    let isoOpen = false, running = false, timer = null;
    const gauge = stage.querySelector('#am-bar');
    const amo = stage.querySelector('#am-amorceur');
    const clapet = stage.querySelector('#am-clapet');
    function reset(){
      clearInterval(timer);
      schShow(stage, '#am-air', false); schShow(stage, '#am-eau', false);
      if (amo) amo.style.animation = 'none';
      if (clapet){ clapet.style.transition = 'none'; clapet.style.transform = 'none'; }
      if (gauge) gauge.textContent = '0,0 bar';
    }
    schChip(bar, 'Vanne tonne-pompe : FERMÉE', false, c => {
      isoOpen = !isoOpen;
      c.innerHTML = '<span class="dot"></span>Vanne tonne-pompe : ' + (isoOpen ? 'OUVERTE' : 'FERMÉE');
      c.classList.toggle('active', isoOpen);
    });
    schChip(bar, '▶ Lancer l’amorçage', false, () => {
      if (running) return;
      reset(); running = true;
      if (isoOpen){
        schShow(stage, '#am-air', true);
        say('✗ Amorçage impossible : la vanne d’isolation pompe-tonne est restée OUVERTE — le vide ne peut pas se créer. Fermez-la et recommencez.', 'var(--red-hi)');
        setTimeout(() => { schShow(stage, '#am-air', false); running = false; }, 2600);
        return;
      }
      say('L’amorceur aspire l’air du corps de pompe et de la ligne d’aspiration…', 'var(--cyan)');
      schShow(stage, '#am-air', true);
      if (amo) amo.style.animation = 'engshake .15s linear infinite';
      let p = 0;
      timer = setInterval(() => {
        p += 0.15;
        if (gauge) gauge.textContent = p.toFixed(1).replace('.', ',') + ' bar';
        if (p >= 0.9) schShow(stage, '#am-eau', true);
        if (p >= 3){
          clearInterval(timer); running = false;
          if (amo) amo.style.animation = 'none';
          schShow(stage, '#am-air', false);
          if (clapet){ clapet.style.transformBox = 'fill-box'; clapet.style.transformOrigin = 'center'; clapet.style.transition = 'transform .4s'; clapet.style.transform = 'rotate(90deg)'; }
          say('✓ 3 bars : l’eau est à la pompe, le clapet se FERME, l’amorceur DÉBRAYE automatiquement. Amorçage terminé.', 'var(--ok)');
        }
      }, 120);
    });
    say('Testez : lancez l’amorçage (vanne fermée = normal), puis refaites-le avec la vanne tonne-pompe OUVERTE pour voir la panne classique.', 'var(--cyan)');
  };

  /* Mise hors gel : procédure ordonnée avec erreur pédagogique */
  INTERACT.horsgel = (stage) => {
    const say = schMsg(stage), bar = schControls(stage);
    let isoClosed = false, r1 = false, r2 = false;
    const iso = stage.querySelector('#hg-iso');
    const drops = () => schShow(stage, '#hg-drops', r1 || r2);
    schChip(bar, '1 · Fermer la vanne Tonne-Pompe', false, c => {
      isoClosed = !isoClosed;
      schValve(iso, !isoClosed);
      c.classList.toggle('active', isoClosed);
      if (isoClosed) say('Vanne Tonne-Pompe fermée — vous pouvez maintenant ouvrir les robinets de vidange.', 'var(--ok)');
      else { r1 = r2 = false; b1.classList.remove('active'); b2.classList.remove('active'); drops(); say(); }
    });
    const openR = (which, c) => {
      if (!isoClosed){
        c.style.animation = 'engshake .12s linear 5';
        setTimeout(() => c.style.animation = '', 700);
        say('✗ ERREUR : fermez D’ABORD la vanne Tonne-Pompe, sinon toute la tonne se vide par les vidanges !', 'var(--red-hi)');
        return;
      }
      if (which === 1) r1 = !r1; else r2 = !r2;
      c.classList.toggle('active', which === 1 ? r1 : r2);
      drops();
      if (r1 && r2) say('✓ Mise hors gel complète : laissez égoutter. Les organes ne gèleront pas.', 'var(--ok)');
    };
    const b1 = schChip(bar, '2 · Vidange corps de pompe', false, c => openR(1, c));
    const b2 = schChip(bar, '3 · Vidange amorceur', false, c => openR(2, c));
    schValve(iso, true);
    say('Par temps froid : exécutez la procédure DANS L’ORDRE. Essayez de vous tromper pour comprendre pourquoi l’ordre est impératif.', 'var(--cyan)');
  };

  /* FPT GIMAEX : conditions cabine + commandes directement sur le pupitre */
  INTERACT['gimaex-tableau'] = (stage) => {
    const say = schMsg(stage);
    const bar = schControls(stage);
    bar.classList.add('gx-cabin-panel');
    bar.innerHTML = '<div class="gx-condition-head"><span><b>CONDITIONS CABINE</b><small>Moteur, neutre, frein de parc et PDM conditionnent les fonctions pompe et mouvements.</small></span><span class="gx-system-state">EN ATTENTE</span></div>';

    const conditionRow = document.createElement('div');
    conditionRow.className = 'gx-condition-row';
    bar.appendChild(conditionRow);

    const hit = id => stage.querySelector('.hotspot[data-id="' + id + '"]');
    const svg = id => stage.querySelector('#' + id);
    const rpmText = svg('gx-rpm');
    const pressureText = svg('gx-pressure');
    const systemState = bar.querySelector('.gx-system-state');
    const state = {
      engineRunning: true,
      neutral: false,
      parkingBrake: false,
      pto: false,
      rpm: 800,
      regulation: false,
      setpoint: 3,
      emergency: false,
      pumpLight: false,
      repliAlarm: false,
      panelLight: false,
      ldt: false,
      leftReel: 0,
      rightReel: 0,
      airAutomatic: true
    };
    let ptoHold = null;

    const bEngine = schChip(conditionRow, 'Moteur en marche', true, () => {
      if (state.emergency){
        say('Réarmez d’abord l’arrêt d’urgence avant de redémarrer le moteur.', 'var(--red-hi)');
        return;
      }
      cancelPtoHold(false);
      state.engineRunning = !state.engineRunning;
      if (!state.engineRunning) disengagePto('Moteur arrêté : PDM désengagée et mouvements stoppés.');
      else {
        state.rpm = 800;
        update();
        say('Moteur redémarré au régime de ralenti.', 'var(--ok)');
      }
    });
    const bNeutral = schChip(conditionRow, 'Boîte au neutre', false, () => {
      cancelPtoHold(false);
      state.neutral = !state.neutral;
      if (!state.neutral && state.pto) disengagePto('PDM désengagée : la boîte n’est plus au neutre.');
      else update();
    });
    const bBrake = schChip(conditionRow, 'Frein de parc serré', false, () => {
      cancelPtoHold(false);
      state.parkingBrake = !state.parkingBrake;
      if (!state.parkingBrake && state.pto) disengagePto('PDM désengagée : le frein de parc a été desserré.');
      else update();
    });
    const bPto = schChip(conditionRow, 'PDM — maintenir pour engager', false, () => {});

    function cabinReady(){
      return state.engineRunning && state.neutral && state.parkingBrake && state.pto && !state.emergency;
    }

    function missingConditions(){
      const missing = [];
      if (!state.engineRunning) missing.push('moteur en marche');
      if (!state.neutral) missing.push('boîte au neutre');
      if (!state.parkingBrake) missing.push('frein de parc');
      if (!state.pto) missing.push('PDM engagée');
      return missing;
    }

    function requireReady(){
      if (state.emergency){
        say('Arrêt d’urgence enclenché : réarmez le bouton avant toute manœuvre.', 'var(--red-hi)');
        return false;
      }
      if (!cabinReady()){
        say('Pupitre indisponible — conditions manquantes : ' + missingConditions().join(', ') + '.', 'var(--orange)');
        return false;
      }
      return true;
    }

    function setLamp(id, on, color){
      const lamp = svg(id);
      if (!lamp) return;
      lamp.setAttribute('fill', on ? color : (id === 'gx-reg-light' || id === 'gx-emergency-state' ? 'transparent' : '#351711'));
      lamp.style.filter = on ? 'drop-shadow(0 0 9px ' + color + ')' : '';
    }

    function setPressed(id, on, tone){
      const control = hit(id);
      if (!control) return;
      control.classList.toggle('control-active', on && !tone);
      control.classList.toggle('warning-active', on && tone === 'warning');
      control.classList.toggle('danger-active', on && tone === 'danger');
      control.setAttribute('aria-pressed', String(!!on));
    }

    function reelLabel(value){
      return value > 0 ? 'montée' : value < 0 ? 'descente' : 'neutre';
    }

    function update(){
      const ready = cabinReady();
      bEngine.classList.toggle('active', state.engineRunning);
      bEngine.classList.toggle('control-active', state.engineRunning);
      bNeutral.classList.toggle('active', state.neutral);
      bNeutral.classList.toggle('control-active', state.neutral);
      bBrake.classList.toggle('active', state.parkingBrake);
      bBrake.classList.toggle('control-active', state.parkingBrake);
      bPto.classList.toggle('active', state.pto);
      bPto.classList.toggle('control-active', state.pto);
      bPto.innerHTML = '<span class="dot"></span>' + (state.pto ? 'PDM engagée — appuyer pour couper' : 'PDM — maintenir pour engager');
      [bEngine, bNeutral, bBrake, bPto].forEach(button =>
        button.setAttribute('aria-pressed', String(button.classList.contains('active'))));

      if (systemState){
        systemState.textContent = state.emergency ? 'ARRÊT URGENCE' : ready ? 'PRÊT' : 'EN ATTENTE';
        systemState.classList.toggle('ready', ready);
        systemState.classList.toggle('danger', state.emergency);
      }

      if (rpmText){
        rpmText.textContent = state.emergency
          ? 'ARRÊT D’URGENCE — MOTEUR COUPÉ'
          : !state.engineRunning
            ? 'MOTEUR À L’ARRÊT · PDM non engagée'
          : state.pto
            ? state.rpm + ' tr/min · PDM engagée'
            : state.rpm + ' tr/min · PDM non engagée';
        rpmText.setAttribute('fill', state.emergency ? '#ff7568' : ready ? '#dce8df' : '#a6b3b8');
      }
      if (pressureText){
        pressureText.textContent = state.regulation
          ? 'Régulation active · consigne ' + state.setpoint + ' bar'
          : 'Mode manuel · consigne attente ' + state.setpoint + ' bar';
      }

      setLamp('gx-pump-state', state.pumpLight, '#ffd34b');
      setLamp('gx-repli-state', state.repliAlarm, '#ff7a32');
      setLamp('gx-table-light', state.panelLight, '#ffe382');
      setLamp('gx-reg-light', state.regulation, '#35df78');
      setLamp('gx-emergency-state', state.emergency, 'rgba(255, 62, 42, .48)');
      setLamp('gx-ldt-state', state.ldt, '#55c7e8');

      const tableLever = svg('gx-table-lever');
      if (tableLever){
        tableLever.style.transformBox = 'view-box';
        tableLever.style.transformOrigin = '687px 677px';
        tableLever.style.transition = 'transform .2s';
        tableLever.style.transform = state.panelLight ? 'rotate(24deg)' : '';
      }
      const leftReel = svg('gx-dev-g');
      const rightReel = svg('gx-dev-d');
      if (leftReel){ leftReel.style.transition = 'transform .2s'; leftReel.style.transform = 'rotate(' + (state.leftReel * 17) + 'deg)'; }
      if (rightReel){ rightReel.style.transition = 'transform .2s'; rightReel.style.transform = 'rotate(' + (state.rightReel * 17) + 'deg)'; }
      const isoLever = svg('gx-iso-lever');
      if (isoLever){
        isoLever.style.transition = 'transform .25s';
        isoLever.style.transform = state.airAutomatic ? '' : 'rotate(-58deg)';
      }

      setPressed('ecl-pompe', state.pumpLight);
      setPressed('repli', state.repliAlarm, 'warning');
      setPressed('ecl-tb', state.panelLight);
      setPressed('dev-g', state.leftReel !== 0);
      setPressed('regul', state.regulation);
      setPressed('au', state.emergency, 'danger');
      setPressed('ldt', state.ldt);
      setPressed('dev-d', state.rightReel !== 0);
      setPressed('iso-air', !state.airAutomatic, 'warning');
      stage.classList.toggle('gx-emergency', state.emergency);
    }

    function disengagePto(message){
      state.pto = false;
      state.regulation = false;
      state.rpm = state.engineRunning ? 800 : 0;
      state.panelLight = false;
      state.ldt = false;
      state.leftReel = 0;
      state.rightReel = 0;
      update();
      if (message) say(message, 'var(--mut)');
    }

    function startPtoHold(event){
      if (event && event.type === 'keydown' && event.repeat) return;
      if (event && event.type === 'pointerdown' && (event.isPrimary === false || event.button !== 0)) return;
      if (state.emergency){
        say('Impossible d’engager la PDM : arrêt d’urgence enclenché.', 'var(--red-hi)');
        return;
      }
      if (state.pto){
        disengagePto('PDM désengagée. Le pupitre revient au régime de ralenti.');
        return;
      }
      if (!state.engineRunning || !state.neutral || !state.parkingBrake){
        say('Refus PDM : moteur en marche, boîte au neutre et frein de parc serré sont obligatoires.', 'var(--red-hi)');
        return;
      }
      if (event?.pointerId != null && bPto.setPointerCapture){
        try { bPto.setPointerCapture(event.pointerId); } catch (_) {}
      }
      say('Maintenez la commande PDM…', 'var(--cyan)');
      clearTimeout(ptoHold);
      ptoHold = setTimeout(() => {
        ptoHold = null;
        if (!state.engineRunning || !state.neutral || !state.parkingBrake || state.emergency){
          say('Engagement PDM annulé : une condition de sécurité a changé.', 'var(--red-hi)');
          update();
          return;
        }
        state.pto = true;
        state.rpm = 800;
        update();
        say('PDM engagée : état système prêt, commandes arrière disponibles.', 'var(--ok)');
      }, 800);
    }

    function cancelPtoHold(announce = true){
      if (ptoHold){
        clearTimeout(ptoHold);
        ptoHold = null;
        if (announce) say('Appui trop court : maintenez la commande PDM pendant 0,8 s.', 'var(--orange)');
      }
    }

    bPto.addEventListener('pointerdown', startPtoHold);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(name => bPto.addEventListener(name, cancelPtoHold));
    bPto.addEventListener('lostpointercapture', cancelPtoHold);
    bPto.addEventListener('blur', () => cancelPtoHold(false));
    bPto.addEventListener('contextmenu', event => event.preventDefault());
    bPto.addEventListener('keydown', event => {
      if (event.key === ' ' || event.key === 'Enter'){
        event.preventDefault();
        startPtoHold(event);
      }
    });
    bPto.addEventListener('keyup', event => {
      if (event.key === ' ' || event.key === 'Enter') cancelPtoHold();
    });

    hit('ecran')?.addEventListener('click', () => {
      say(state.emergency ? 'L’écran signale l’arrêt d’urgence.' : 'Écran principal : régime, état PDM et mode de régulation.', 'var(--cyan)');
    });
    hit('capteur')?.addEventListener('click', () => {
      say('Capteur de luminosité : bascule automatique jour / nuit de l’affichage.', 'var(--mut)');
    });
    hit('ecl-pompe')?.addEventListener('click', () => {
      state.pumpLight = !state.pumpLight;
      update();
      say(state.pumpLight ? 'Éclairage de la zone pompe activé.' : 'Éclairage de la zone pompe coupé.', state.pumpLight ? 'var(--ok)' : 'var(--mut)');
    });
    hit('repli')?.addEventListener('click', () => {
      state.repliAlarm = !state.repliAlarm;
      update();
      say(state.repliAlarm ? 'Alarme sonore de repli activée.' : 'Alarme sonore de repli arrêtée.', state.repliAlarm ? 'var(--orange)' : 'var(--mut)');
    });
    hit('ecl-tb')?.addEventListener('click', () => {
      if (!requireReady()) return;
      state.panelLight = !state.panelLight;
      update();
      say(state.panelLight ? 'Éclairage du tableau de bord activé.' : 'Éclairage du tableau de bord coupé.', state.panelLight ? 'var(--ok)' : 'var(--mut)');
    });

    function cycleReel(key, label){
      if (!requireReady()) return;
      if (!state.airAutomatic){
        say('Commande pneumatique indisponible : isolement d’air en mode manuel.', 'var(--red-hi)');
        return;
      }
      state[key] = state[key] === 0 ? 1 : state[key] === 1 ? -1 : 0;
      update();
      say(label + ' : ' + reelLabel(state[key]) + '.', state[key] ? 'var(--cyan)' : 'var(--mut)');
    }
    hit('dev-g')?.addEventListener('click', () => cycleReel('leftReel', 'Dévidoir gauche'));
    hit('dev-d')?.addEventListener('click', () => cycleReel('rightReel', 'Dévidoir droit'));

    hit('regul')?.addEventListener('click', () => {
      if (!requireReady()) return;
      state.regulation = !state.regulation;
      update();
      say(state.regulation ? 'Régulation mise en service à ' + state.setpoint + ' bar.' : 'Régulation arrêtée : retour au réglage manuel du régime.', state.regulation ? 'var(--ok)' : 'var(--mut)');
    });
    hit('reg-moins')?.addEventListener('click', () => {
      if (!requireReady()) return;
      if (state.regulation) state.setpoint = Math.max(1, state.setpoint - 1);
      else state.rpm = Math.max(800, state.rpm - 100);
      update();
      say(state.regulation ? 'Consigne abaissée à ' + state.setpoint + ' bar.' : 'Régime moteur : ' + state.rpm + ' tr/min.', 'var(--cyan)');
    });
    hit('reg-plus')?.addEventListener('click', () => {
      if (!requireReady()) return;
      if (state.regulation) state.setpoint = Math.min(15, state.setpoint + 1);
      else state.rpm = Math.min(2200, state.rpm + 100);
      update();
      say(state.regulation ? 'Consigne portée à ' + state.setpoint + ' bar.' : 'Régime moteur : ' + state.rpm + ' tr/min.', 'var(--cyan)');
    });

    const ldt = hit('ldt');
    function startLdt(event){
      if (event && event.type === 'pointerdown' && (event.isPrimary === false || event.button !== 0)) return;
      if (!requireReady()) return;
      if (!state.airAutomatic){
        say('Enroulement impossible : alimentation pneumatique isolée.', 'var(--red-hi)');
        return;
      }
      if (event?.pointerId != null && ldt?.setPointerCapture){
        try { ldt.setPointerCapture(event.pointerId); } catch (_) {}
      }
      state.ldt = true;
      update();
      say('Enroulement de la LDT en cours… Relâchez la commande pour arrêter.', 'var(--cyan)');
    }
    function stopLdt(){
      if (!state.ldt) return;
      state.ldt = false;
      update();
      say('Enroulement de la LDT arrêté.', 'var(--mut)');
    }
    ldt?.addEventListener('pointerdown', startLdt);
    ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture'].forEach(name => ldt?.addEventListener(name, stopLdt));
    ldt?.addEventListener('keydown', event => {
      if ((event.key === ' ' || event.key === 'Enter') && !event.repeat){
        event.preventDefault();
        startLdt(event);
      }
    });
    ldt?.addEventListener('keyup', event => {
      if (event.key === ' ' || event.key === 'Enter') stopLdt();
    });
    ldt?.addEventListener('blur', stopLdt);
    ldt?.addEventListener('contextmenu', event => event.preventDefault());

    hit('iso-air')?.addEventListener('click', () => {
      state.airAutomatic = !state.airAutomatic;
      if (!state.airAutomatic){
        state.ldt = false;
        state.leftReel = 0;
        state.rightReel = 0;
      }
      update();
      say(state.airAutomatic ? 'Vannes pneumatiques en mode automatique.' : 'Alimentation pneumatique isolée : mode manuel de dépannage.', state.airAutomatic ? 'var(--ok)' : 'var(--orange)');
    });

    hit('au')?.addEventListener('click', () => {
      clearTimeout(ptoHold);
      ptoHold = null;
      if (state.emergency){
        state.emergency = false;
        state.rpm = 0;
        update();
        say('Arrêt d’urgence réarmé. Le moteur reste arrêté : redémarrez-le avant de réengager la PDM.', 'var(--orange)');
        return;
      }
      state.emergency = true;
      state.engineRunning = false;
      state.pto = false;
      state.regulation = false;
      state.rpm = 0;
      state.panelLight = false;
      state.ldt = false;
      state.leftReel = 0;
      state.rightReel = 0;
      update();
      say('ARRÊT D’URGENCE — moteur coupé, PDM désengagée et mouvements stoppés.', 'var(--red-hi)');
    });

    update();
    say('Préparez la cabine : boîte au neutre, frein de parc serré, puis maintenez la PDM. Les commandes se manipulent ensuite directement sur le pupitre.', 'var(--cyan)');
  };

  /* Tableau CAMIVA : régulation, consigne, cavitation simulée */
  INTERACT.tableau = (stage) => {
    const say = schMsg(stage), bar = schControls(stage);
    let reg = false, consigne = 6, cav = false;
    const hp = stage.querySelector('#tb-hp'), cavV = stage.querySelector('#tb-cav'), potl = stage.querySelector('#tb-potl');
    const upd = () => {
      const p = reg ? (cav ? consigne * 0.45 : consigne) : 0;
      if (hp){ hp.style.transformOrigin = '600px 174px'; hp.style.transition = 'transform .8s cubic-bezier(.3,1.5,.4,1)'; hp.style.transform = 'rotate(' + ((p - 7.5) * 13) + 'deg)'; }
      if (potl){ potl.style.transformOrigin = '500px 470px'; potl.style.transition = 'transform .3s'; potl.style.transform = 'rotate(' + ((consigne - 6) * 14) + 'deg)'; }
      if (cavV){ cavV.setAttribute('fill', cav ? '#e74c3c' : '#3a1512'); cavV.style.animation = cav ? 'blinkred .45s linear infinite' : 'none'; }
      bReg.classList.toggle('active', reg); bCav.classList.toggle('active', cav);
      if (cav) say('⚠ CAVITATION : débit d’alimentation insuffisant — le tuyau s’écrase, la pression chute. Améliorez l’alimentation ou réduisez le débit demandé.', 'var(--red-hi)');
      else if (reg) say('Régulation EN SERVICE : consigne ' + consigne + ' bar maintenue quel que soit le débit demandé.', 'var(--ok)');
      else say('Régulation coupée. Mettez-la en service puis réglez la consigne au potentiomètre.', 'var(--cyan)');
    };
    const bReg = schChip(bar, 'Régulation ON/OFF', false, () => { reg = !reg; upd(); });
    schChip(bar, 'Consigne −', false, () => { consigne = Math.max(0, consigne - 1); upd(); });
    schChip(bar, 'Consigne +', false, () => { consigne = Math.min(15, consigne + 1); upd(); });
    const bCav = schChip(bar, 'Simuler une cavitation', false, () => { cav = !cav; upd(); });
    upd();
  };

  /* Chaîne cinématique vue de dessus : moteur / rouler / PDM */
  INTERACT['chaine-fpt'] = (stage) => {
    const say = schMsg(stage), bar = schControls(stage);
    let motor = false, rouler = false, pdm = false;
    const eng = stage.querySelector('#cf-eng');
    function apply(){
      schShow(stage, '#cf-run', motor);
      schShow(stage, '#cf-run-roues', motor && rouler);
      schShow(stage, '#cf-run-pdm', motor && pdm);
      schShow(stage, '#cf-imp', motor && pdm);
      if (eng) eng.style.animation = motor ? 'engshake .18s linear infinite' : 'none';
      bM.classList.toggle('active', motor);
      bR.classList.toggle('active', rouler); bR.style.opacity = motor ? '1' : '.45';
      bP.classList.toggle('active', pdm); bP.style.opacity = motor ? '1' : '.45';
      if (!motor) say('Moteur à l\u2019arrêt. Démarrez-le, puis choisissez : ROULER ou POMPER.', 'var(--mut)');
      else if (rouler) say('Propulsion : moteur → embrayage → boîte → arbre de transmission → pont arrière (renvoi à 90°, différentiel) → \u00bd arbres → roues.', 'var(--cyan)');
      else if (pdm) say('\u2713 PDM enclenchée (NEUTRE + frein de parc, appui long) : boîte → PDM → arbre de transmission → POMPE. Elle ouvre aussi la vanne aspiration cuve.', 'var(--ok)');
      else say('Moteur en marche, boîte au neutre. Enclenchez la PDM pour entraîner la pompe, ou passez en ROULER.', 'var(--cyan)');
    }
    const bM = schChip(bar, '\u25b6 Démarrer le moteur', false, () => { motor = !motor; if (!motor){ rouler = false; pdm = false; } apply(); });
    const bR = schChip(bar, '\u21e5 Rouler', false, () => {
      if (!motor){ say('\u2717 Démarrez d\u2019abord le moteur.', 'var(--red-hi)'); return; }
      rouler = !rouler; if (rouler && pdm){ pdm = false; }
      apply();
    });
    const bP = schChip(bar, '\u2699 Enclencher la PDM', false, () => {
      if (!motor){ say('\u2717 Démarrez d\u2019abord le moteur.', 'var(--red-hi)'); return; }
      if (rouler){ say('\u2717 Refus : la PDM exige le POINT MORT + frein de parc — arrêtez-vous d\u2019abord.', 'var(--red-hi)'); return; }
      pdm = !pdm; apply();
    });
    apply();
  };

  /* Circuit d'eau 28 repères : situations réelles GIMAEX */
  INTERACT['gimaex-hydro'] = (stage) => {
    const say = schMsg(stage), bar = schControls(stage);
    const SITS = {
      tonne:   { l:'Sur citerne', f:['#gh-tonne','#gh-refoul'], open:['e1','e9','e10'],
        m:'PDM enclenchée + aspirations extérieures fermées → la vanne motorisée rep 1 s\u2019OUVRE automatiquement : la cuve alimente la pompe.' },
      pression:{ l:'Source sous pression', f:['#gh-ext','#gh-refoul'], open:['e2','e9','e10'],
        m:'Ouverture de la vanne rep 2 → FERMETURE automatique de rep 1 (+ clapet anti-retour rep 14 : la cuve ne se remplit pas par la tuyauterie).' },
      aspi:    { l:'Aspiration (sans pression)', f:['#gh-ext','#gh-refoul'], open:['e2','e3','e9'],
        m:'Rep 2 ouverte + PDM. Pression < 0,5 bar → l\u2019amorceur à PISTONS se met en action AUTOMATIQUEMENT (rep 3). Régime \u2248 1 000 tr/min, max 1 minute.' },
      rempext: { l:'Remplissage cuve par l\u2019extérieur', f:['#gh-remp-ext'], open:['e7'],
        m:'Hydrant → vanne rep 7 → cuve, sans passer par la pompe.' },
      remppmp: { l:'Remplissage par la pompe', f:['#gh-ext','#gh-remp-pompe'], open:['e2','e8'],
        m:'Pompe alimentée par une source externe → ouvrir rep 8 (sauterelle). LIMITER À 5 BAR, ralentir à 90 % et attendre l\u2019écoulement par la surverse.' },
      mousse:  { l:'Refoulement eau/mousse', f:['#gh-tonne','#gh-refoul','#gh-mousse'], open:['e1','e11','e15','e16'],
        m:'L\u2019additif est prélevé (rep 15-16), injecté (rep 23) selon le débit mesuré (rep 22) → refoulements Eau/Mousse. Dosage CTD 0,2 à 1 %.' },
      dev:     { l:'Dévidoir PS', f:['#gh-tonne','#gh-dev'], open:['e1','e13'],
        m:'La vanne rep 13 alimente le dévidoir de premier secours (40 m + lance 150 L/min).' },
      vidpompe:{ l:'Vidange pompe', f:['#gh-vid-pompe'], open:['e5'],
        m:'Mise hors gel : refoulements 9-12 + purge pompe rep 5 + aspirations rep 2 ouvertes, puis cran de pompe 15 s pour vider l\u2019amorceur. Vannes à 45° pour remisage.' },
      vidcuve: { l:'Vidange cuve', f:['#gh-vid-cuve'], open:['e6'],
        m:'Après purge pompe/tuyauteries : ouvrir la vidange cuve rep 6, fermer rep 2, cran de pompe 15 s, tout refermer.' },
    };
    const allF = ['#gh-tonne','#gh-ext','#gh-refoul','#gh-remp-ext','#gh-remp-pompe','#gh-mousse','#gh-dev','#gh-vid-pompe','#gh-vid-cuve'];
    const chips = {};
    let cur = null;
    function apply(){
      allF.forEach(sel => schShow(stage, sel, cur ? SITS[cur].f.includes(sel) : false));
      stage.querySelectorAll('.gh-v circle').forEach(c => c.setAttribute('stroke', '#8a94b8'));
      if (cur) SITS[cur].open.forEach(id => { const g = stage.querySelector('#gh-' + id + ' circle'); if (g) g.setAttribute('stroke', '#4cd68a'); });
      Object.keys(chips).forEach(k => chips[k].classList.toggle('active', k === cur));
      if (cur) say('<b>' + SITS[cur].l + '</b> — ' + SITS[cur].m, 'var(--cyan)');
      else say('Choisissez une situation : le trajet de l\u2019eau s\u2019affiche et les vannes concernées passent au vert.', 'var(--mut)');
    }
    Object.keys(SITS).forEach(k => { chips[k] = schChip(bar, SITS[k].l, false, () => { cur = cur === k ? null : k; apply(); }); });
    apply();
  };

  /* Simulateur de régulation de pression GIMAEX */
  INTERACT.regulation = (stage) => {
    const say = schMsg(stage), bar = schControls(stage);
    let reg = false, consigne = 3, p = 0, scen = null, blinkInt = null, phase = 'off';
    const nd = stage.querySelector('#rg-nd'), press = stage.querySelector('#rg-press'),
          cons = stage.querySelector('#rg-cons'), mode = stage.querySelector('#rg-mode'),
          msg = stage.querySelector('#rg-msg'), light = stage.querySelector('#rg-light'),
          temp = stage.querySelector('#rg-temp');
    const setP = v => { p = Math.max(0, v);
      if (nd) nd.style.transform = 'rotate(' + (-120 + (Math.min(p, 21) / 20) * 240) + 'deg)';
      if (press) press.textContent = p.toFixed(1).replace('.', ',') + ' bar'; };
    const setMsg = (t, c) => { if (msg){ msg.textContent = t; msg.setAttribute('fill', c || '#e67e22'); } };
    const setLight = on => { if (light){ light.setAttribute('fill', on ? '#2ecc71' : '#1f4a2e'); clearInterval(blinkInt);
      if (on === 'blink'){ let v = false; light.setAttribute('fill', '#2ecc71'); blinkInt = setInterval(() => { v = !v; light.setAttribute('fill', v ? '#2ecc71' : '#1f4a2e'); }, 350); } } };
    function upd(){
      if (cons) cons.textContent = 'Consigne : ' + (reg ? consigne + ' bar' : '—');
      if (mode) mode.textContent = reg ? 'MODE RÉGULATION' : 'MODE MANUEL';
      bReg.classList.toggle('active', reg);
    }
    function stopReg(reason, color){ reg = false; phase = 'off'; setLight(false); setP(scen === 'capteur' ? p : 0); setMsg(reason || 'Arrêt régulation', color); upd(); }
    function engage(){
      if (scen === 'temp'){ setMsg('Sécurité pompe activée', '#e74c3c'); say('\u2717 Température eau pompe trop élevée (voyant rouge à 54 °C) : régulation IMPOSSIBLE tant que le voyant n\u2019est pas redevenu gris.', 'var(--red-hi)'); return; }
      reg = true; phase = 'amorcage'; upd(); setLight('blink'); setMsg('Amorçage en cours');
      say('Le voyant clignote : montée à 1 200 tr/min jusqu\u2019à 3 bar de refoulement (amorçage de préférence en mode MANUEL).', 'var(--cyan)');
      setTimeout(() => {
        if (!reg) return;
        if (scen === 'amorcage'){ stopReg('Défaut amorçage', '#e74c3c'); say('\u2717 Délai de 60 secondes de la phase d\u2019amorçage dépassé — anomalie sur le circuit.', 'var(--red-hi)'); return; }
        phase = 'reg'; setLight(true); run();
      }, 1800);
    }
    function run(){
      if (!reg) return;
      if (scen === 'capteur'){ stopReg('Défaut capteur de pression', '#e74c3c'); say('\u2717 Résistance du capteur modifiée (débranché ou cassé) : retour en mode manuel.', 'var(--red-hi)'); return; }
      if (consigne > 20){ setP(21); setMsg('Sécurité surpression 20 bar', '#e74c3c'); say('\u2717 La pression de refoulement dépasse 20 bar : la sécurité coupe la régulation.', 'var(--red-hi)'); setTimeout(() => stopReg(), 900); return; }
      if (scen === 'cavitation'){ setP(consigne * 0.45); setMsg('Cavitation', '#e74c3c');
        say('\u26a0 La pompe n\u2019atteint pas la consigne : elle prend la pression réelle comme consigne puis remonte PAS À PAS (tant que P > 3 bar). Installation amont insuffisante → rester en mode manuel.', 'var(--orange)'); return; }
      setP(consigne); setMsg('Régulation en cours', '#4cd68a');
      say('\u2713 Pompe amorcée, consigne respectée quel que soit le débit demandé.', 'var(--ok)');
    }
    const bReg = schChip(bar, 'REGULATION marche/arrêt', false, () => { if (reg){ stopReg(); say('Arrêt régulation : mode manuel actif (boutons +/- = régime moteur).', 'var(--mut)'); } else engage(); });
    schChip(bar, 'Consigne \u2212', false, () => { consigne = Math.max(0, consigne - 1); upd(); if (reg && phase === 'reg') run(); });
    schChip(bar, 'Consigne +', false, () => { consigne = consigne + 1; upd(); if (reg && phase === 'reg') run(); });
    const scChip = (label, key) => schChip(bar, label, false, c => {
      scen = scen === key ? null : key;
      bar.querySelectorAll('[data-sc]').forEach(x => x.classList.remove('active'));
      if (scen) c.classList.add('active');
      if (key === 'temp'){ if (temp) temp.setAttribute('fill', scen ? '#e74c3c' : '#2a2a3a'); if (temp) temp.style.animation = scen ? 'blinkred .5s linear infinite' : 'none'; }
      if (reg && phase === 'reg') run();
    });
    ['Alimentation insuffisante', 'Défaut amorçage', 'Surchauffe pompe', 'Défaut capteur'].forEach((l, i) => {
      const c = scChip(l, ['cavitation', 'amorcage', 'temp', 'capteur'][i]); c.dataset.sc = '1';
    });
    upd(); setP(0);
    say('Simulez : mettez la régulation en marche, réglez la consigne, puis activez une panne pour voir le message réel du système.', 'var(--cyan)');
  };

  /* Dosage mousse CTD */
  INTERACT['mousse-ctd'] = (stage) => {
    const say = schMsg(stage), bar = schControls(stage);
    let target = 0, real = 0, ext = false, tick = null, rince = null;
    const pct = stage.querySelector('#ms-pct'), info = stage.querySelector('#ms-info'), sys = stage.querySelector('#ms-sysmsg');
    const chips = [];
    function upd(){
      if (pct) pct.textContent = real.toFixed(1).replace('.', ',') + ' %';
      if (info) info.textContent = (target > 0 ? '420 L/min · ' + (7 + real * 2).toFixed(1).replace('.', ',') + ' bar' : '0 L/min · 0,0 bar');
    }
    function stopFlows(){ ['#ms-f-eau', '#ms-f-add', '#ms-f-ext', '#ms-f-mousse'].forEach(s => schShow(stage, s, false)); }
    function select(t, c){
      clearInterval(tick); clearTimeout(rince);
      target = t;
      chips.forEach(x => x.classList.remove('active')); if (c) c.classList.add('active');
      if (sys) sys.textContent = 'DOSAGE ' + t.toFixed(1).replace('.', ',') + ' % ' + (ext ? '(SOURCE EXT)' : '');
      schShow(stage, '#ms-f-eau', true); schShow(stage, '#ms-f-mousse', true);
      schShow(stage, '#ms-f-add', !ext); schShow(stage, '#ms-f-ext', ext);
      say('La vanne du produit s\u2019ouvre automatiquement. Le système amorce en projetant du produit au sol, puis le % réel converge vers la consigne.', 'var(--cyan)');
      tick = setInterval(() => { real += (target - real) * 0.25; if (Math.abs(target - real) < 0.02) real = target; upd(); }, 250);
    }
    [0.2, 0.5, 1].forEach(t => { const c = schChip(bar, 'Dosage ' + String(t).replace('.', ',') + ' %', false, cc => select(t, cc)); chips.push(c); });
    const bExt = schChip(bar, 'EXT (bidon externe)', false, c => {
      ext = !ext; c.classList.toggle('active', ext);
      say(ext ? 'Source externe : bidon raccordé au raccord GFR (rep 19) + canne plongeuse. Sélectionnez ensuite la concentration.' : 'Retour sur la cuve mouillant embarquée (200 L).', 'var(--orange)');
      if (target > 0){ schShow(stage, '#ms-f-add', !ext); schShow(stage, '#ms-f-ext', ext); }
    });
    schChip(bar, '\u25a0 STOP (rinçage 30 s)', false, () => {
      clearInterval(tick); target = 0;
      chips.forEach(x => x.classList.remove('active'));
      schShow(stage, '#ms-f-add', false); schShow(stage, '#ms-f-ext', false);
      if (sys) sys.textContent = 'RINÇAGE EN COURS…';
      say('Phase de rinçage automatique : 30 secondes (accélérée ici). Pensez aussi au rinçage de la canne plongeuse (eau de la cuve par gravité).', 'var(--cyan)');
      rince = setTimeout(() => { real = 0; upd(); stopFlows(); if (sys) sys.textContent = 'SÉLECTIONNER INTERVENTION'; say('\u2713 Rinçage terminé.', 'var(--ok)'); }, 3000);
    });
    upd();
  };

  /* Coffre AR gauche : mât avec conditions + porte-échelles */
  INTERACT['gimaex-coffre'] = (stage) => {
    const say = schMsg(stage), bar = schControls(stage);
    let moteur = false, air = false, matHaut = false, ecl = false, tempo = false;
    const voy = stage.querySelector('#gc-voy'), knob = stage.querySelector('#gc-knob-l'),
          eclDot = stage.querySelector('#gc-ecl-dot');
    const upd = () => {
      if (voy){ voy.setAttribute('fill', matHaut ? '#e74c3c' : '#3a1512'); voy.style.animation = matHaut ? 'blinkred 1s linear infinite' : 'none'; }
      if (eclDot) eclDot.setAttribute('fill', ecl ? '#ffe9a0' : '#3a3a3a');
      bEcl.classList.toggle('active', ecl);
    };
    const bMot = schChip(bar, 'Moteur en fonctionnement', false, c => { moteur = !moteur; c.classList.toggle('active', moteur); if (moteur) setTimeout(() => { air = true; bAir.classList.add('active'); }, 1200); else { air = false; bAir.classList.remove('active'); } });
    const bAir = schChip(bar, 'Pression d\u2019air servitudes', false, c => { air = !air; c.classList.toggle('active', air); });
    schChip(bar, '\u25b2 Monter le mât', false, () => {
      if (!moteur || !air){ say('\u2717 Refus — conditions manquantes : ' + (!moteur ? 'MOTEUR EN FONCTIONNEMENT' : '') + (!moteur && !air ? ' + ' : '') + (!air ? 'PRESSION D\u2019AIR châssis' : '') + '.', 'var(--red-hi)'); return; }
      matHaut = true; if (knob) knob.style.transform = 'rotate(-45deg)'; upd();
      say('\u2713 Mât déployé (4,95 m) — le voyant rouge s\u2019allume. Vous pouvez éclairer les 4 projecteurs LED.', 'var(--ok)');
    });
    const bEcl = schChip(bar, '\ud83d\udca1 Éclairage mât', false, () => {
      if (!matHaut){ say('Montez d\u2019abord le mât.', 'var(--orange)'); return; }
      ecl = !ecl; tempo = false; upd();
      if (!ecl){ say('Éclairage coupé — TEMPORISATION 2 minutes avant la descente (accélérée ici)…', 'var(--cyan)'); setTimeout(() => { tempo = true; say('\u2713 Temporisation écoulée : la descente est autorisée.', 'var(--ok)'); }, 3000); }
    });
    schChip(bar, '\u25bc Descendre le mât', false, () => {
      if (!matHaut) return;
      if (ecl){ say('\u2717 Refus : COUPEZ L\u2019ÉCLAIRAGE puis patientez 2 minutes avant la descente.', 'var(--red-hi)'); return; }
      if (!tempo){ say('\u2717 Refus : temporisation de 2 minutes en cours après l\u2019extinction.', 'var(--red-hi)'); return; }
      matHaut = false; tempo = false; if (knob) knob.style.transform = 'rotate(45deg)'; upd();
      say('\u2713 Mât rangé : le voyant rouge s\u2019éteint (= bon rangement). Purge hebdomadaire : vanne du coffre avant droit, depuis la position haute.', 'var(--ok)');
    });
    schChip(bar, 'Porte-échelles \u25b2\u25bc', false, () => say('Commande montée/descente du porte-échelles basculant — procédure complète au module Mât & porte-échelles.', 'var(--cyan)'));
    upd();
    say('Testez les refus : essayez de monter le mât sans conditions, ou de le descendre éclairage allumé.', 'var(--cyan)');
  };

  /* Mât & porte-échelles : procédures séquentielles validées */
  INTERACT['mat-pe'] = (stage) => {
    const say = schMsg(stage), bar = schControls(stage);
    const PROCS = {
      matup: { l:'\u25b6 Mât : déployer', steps: [
        ['Vérifier les CONDITIONS : moteur du véhicule en fonctionnement + pression d\u2019air dans les bouteilles de servitude châssis.', null],
        ['Commander la MONTÉE du mât télescopique (coffre arrière gauche).', s => { schShow(s, '#mp-mast-ext', true); }],
        ['Éclairer les projecteurs LED (4 × 55 W, pré-réglables en inclinaison).', s => { schShow(s, '#mp-glow', true); }],
        ['Pour la descente : COUPER l\u2019éclairage, patienter 2 MINUTES, puis commander la descente.', s => { schShow(s, '#mp-glow', false); }],
        ['Contrôler le rangement : le voyant rouge s\u2019ÉTEINT. Purge hebdomadaire depuis la position haute (vanne du coffre avant droit).', s => { schShow(s, '#mp-mast-ext', false); const v = s.querySelector('#mp-voy'); if (v) v.setAttribute('fill', '#3a1512'); }]
      ]},
      pedown: { l:'\u25b6 Porte-échelles : descendre', steps: [
        ['Prendre le BRAS (rep 1), le placer sur le VERROU (rep 2) et pivoter vers l\u2019extérieur (côté gauche) SANS FORCER pour déverrouiller.', null],
        ['Tirer le bras pour sortir complètement le porte-échelles.', null],
        ['Actionner la commande de DESCENTE dans le compartiment arrière gauche (rep 3). Ne jamais rester sous le porte-échelles !', s => { schShow(s, '#mp-pe-up', false); schShow(s, '#mp-pe-down', true); }],
        ['Une fois au sol : appuyer sur la pièce mobile centrale (rep 4), soulever le rond et le faire pivoter pour LIBÉRER l\u2019échelle.', null]
      ]},
      peup: { l:'\u25b6 Porte-échelles : ranger', steps: [
        ['Remettre l\u2019échelle sur le berceau en l\u2019engageant bien dans le blocage AVANT ; pivoter le rond au-dessus du barreau et le baisser au contact de l\u2019empreinte.', null],
        ['Actionner la commande de MONTÉE (rep 3).', s => { schShow(s, '#mp-pe-down', false); schShow(s, '#mp-pe-up', true); }],
        ['À l\u2019horizontale : pousser sur le bras jusqu\u2019à la butée du berceau.', null],
        ['VÉRIFIER en tirant sur le bras (sans le pivoter à gauche) que le verrou supérieur est bien engagé.', null],
        ['Ranger le bras dans son support.', null]
      ]}
    };
    let proc = null, step = 0;
    const bNext = schChip(bar, 'Valider l\u2019étape \u203a', false, () => {
      if (!proc) return;
      const st = PROCS[proc].steps;
      if (step < st.length){ const fx = st[step][1]; if (fx) fx(stage); step++; }
      if (step >= st.length){ say('\u2713 Procédure terminée : « ' + PROCS[proc].l.replace('\u25b6 ', '') + ' ».', 'var(--ok)'); proc = null; bNext.style.display = 'none'; chips.forEach(c => c.classList.remove('active')); return; }
      say('<b>Étape ' + (step + 1) + '/' + st.length + '</b> — ' + st[step][0], 'var(--cyan)');
    });
    bNext.style.display = 'none';
    const chips = Object.keys(PROCS).map(k => schChip(bar, PROCS[k].l, false, c => {
      proc = k; step = 0;
      chips.forEach(x => x.classList.remove('active')); c.classList.add('active');
      bNext.style.display = '';
      say('<b>Étape 1/' + PROCS[k].steps.length + '</b> — ' + PROCS[k].steps[0][0], 'var(--cyan)');
    }));
    say('Choisissez une procédure : chaque étape doit être VALIDÉE avant de passer à la suivante.', 'var(--mut)');
  };

  /* ---------------------------------------------------------
     Rendu d'un schéma : SVG de fond + points chauds cliquables.
     opts.onSelect(id) — clic sur un point chaud.
     Retourne un handle { setSelected, setScenario, setDrillResult }
     --------------------------------------------------------- */
  function render(container, schemaId, elements, opts = {}){
    const def = S[schemaId];
    if (!def) return null;

    const stage = document.createElement('div');
    stage.className = ['schema-stage', def.className || '', opts.mode ? 'schema-mode-' + opts.mode : '']
      .filter(Boolean).join(' ');
    stage.dataset.mode = opts.mode || 'fiche';
    stage.dataset.schemaId = schemaId;
    stage.style.aspectRatio = def.aspect;
    stage.innerHTML = def.svg;
    container.appendChild(stage);

    /* Les vues photographiques GIMAEX adoptent automatiquement le ratio
       intrinsèque du PNG dès qu'il est disponible. Les coordonnées des
       hotspots restent en pourcentages ; les rares overlays SVG sont remis à
       l'échelle verticalement sans déformer la photographie. */
    const screenPhoto = stage.querySelector('.gimaex-screen-photo');
    if (screenPhoto && stage.classList.contains('schema-gimaex-screen')){
      const source = screenPhoto.getAttribute('href');
      const probe = new Image();
      probe.decoding = 'async';
      probe.onerror = () => screenPhoto.setAttribute('visibility', 'hidden');
      probe.onload = () => {
        if (!probe.naturalWidth || !probe.naturalHeight) return;
        screenPhoto.setAttribute('visibility', 'visible');
        const svg = stage.querySelector('svg');
        const baseHeight = Number(svg?.dataset.photoBaseHeight) || 620;
        const photoHeight = 1000 * probe.naturalHeight / probe.naturalWidth;
        stage.style.aspectRatio = `${probe.naturalWidth} / ${probe.naturalHeight}`;
        svg?.setAttribute('viewBox', `0 0 1000 ${photoHeight}`);
        screenPhoto.setAttribute('height', String(photoHeight));
        stage.querySelectorAll('[data-photo-background]').forEach(node => node.setAttribute('height', String(photoHeight)));
        const overlays = stage.querySelector('#gxe-live-overlays');
        if (overlays) overlays.setAttribute('transform', `scale(1 ${photoHeight / baseHeight})`);
      };
      probe.src = source;
    }

    const hotspots = {};
    elements.forEach(el => {
      const b = document.createElement('button');
      const isArea = el.w != null && el.h != null && Number(el.w) > 0 && Number(el.h) > 0;
      b.type = 'button';
      b.className = isArea ? 'hotspot hotspot-area' : 'hotspot';
      b.style.left = el.x + '%';
      b.style.top  = el.y + '%';
      if (isArea){
        b.style.width = el.w + '%';
        b.style.height = el.h + '%';
        const badge = document.createElement('span');
        badge.className = 'hotspot-badge';
        badge.textContent = el.n;
        b.appendChild(badge);
      } else {
        b.textContent = el.n;
      }
      b.dataset.id = el.id;
      if (el.type) b.dataset.type = el.type;
      if (!['drill', 'ident', 'test'].includes(opts.mode)) b.title = el.label;
      b.setAttribute('aria-label', el.n + ' — ' + el.label);
      b.addEventListener('click', () => opts.onSelect && opts.onSelect(el.id));
      stage.appendChild(b);
      hotspots[el.id] = b;
    });

    function setSelected(id, showLabel){
      Object.values(hotspots).forEach(h => {
        h.classList.toggle('sel', h.dataset.id === id);
        const old = h.querySelector('.hs-label');
        if (old) old.remove();
      });
      if (id && showLabel !== false){
        const el = elements.find(e => e.id === id);
        const h = hotspots[id];
        if (el && h){
          const lab = document.createElement('span');
          lab.className = 'hs-label';
          lab.textContent = el.label;
          h.appendChild(lab);
        }
      }
    }

    /* affichage des flux du schéma env selon le scénario */
    function setScenario(scen){
      if (stage._scenarioSync){ stage._scenarioSync(scen); return; }
      const show = (sel, on) => {
        const g = stage.querySelector(sel);
        if (g) g.setAttribute('visibility', on ? 'visible' : 'hidden');
      };
      show('#f-cuve',   scen === 'cuve');
      show('#f-ext',    scen === 'aspi' || scen === 'hydrant');
      show('#f-retour', scen === 'hydrant');
      show('#f-drive',  true);
    }

    /* marquage réussite / erreur pendant l'exercice à blanc */
    function markOk(id){ if (hotspots[id]) hotspots[id].classList.add('ok'); }
    function reset(){
      Object.values(hotspots).forEach(h => { h.classList.remove('ok','sel'); });
    }

    if (opts.interactive !== false && INTERACT[schemaId]) INTERACT[schemaId](stage);

    return { setSelected, setScenario, markOk, reset, stage };
  }

  return { render, has: id => !!S[id] };
})();
