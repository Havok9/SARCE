// ARI — Appareil Respiratoire Isolant à Circuit Ouvert
// Données alignées sur la fiche technique JSP Bassens-Ambès (Sap. Julie Pinto)
// + Rhino Evac (matériel d'auto-évacuation porteur)
// Photos réelles : photos/{id}.png

// photoBox = position et taille de la photo sur le schéma (viewBox 0 0 1400 900)
// point    = position du hotspot numéroté (sur ou à côté de la photo)
// label    = position du tag de callout

window.ARI_DATA = [
  {
    id: "bouteille",
    num: "01",
    name: "Bouteille d'air",
    short: "Réserve d'air comprimé — 6 L / 300 bar",
    family: "Source d'air",
    photo: "photos/bouteille.png",
    photoBox: { x: 820, y: 270, w: 170, h: 220 },
    point: { x: 905, y: 460 },
    label: { x: 1050, y: 460 },
    description: "Réservoir cylindrique de couleur jaune (pour la visibilité en intervention et en progression dans un air opaque). Contenance 6 L d'eau, capacité 300 bar pour les bouteilles à fond plat avec sabot de protection, ou 200 bar pour celles à fond rond. Remplie d'air respirable : 78% diazote (N₂), 21% dioxygène (O₂), 1% gaz rares.",
    fonction: "Constituer la réserve d'air disponible pour l'exploration et le travail en atmosphère irrespirable. Elle est surmontée d'un robinet qui permet de la fixer de manière étanche au bâti-dossard.",
    verifications: [
      "Pression avant engagement ≥ pression nominale – 10% (≥ 270 bar pour une 300 bar, ≥ 170 bar pour une 200 bar)",
      "Couleur jaune visible, marquages de collerette lisibles",
      "Sabot de protection présent (fond plat) ou intégrité du fond rond",
      "Date de ré-épreuve périodique valide",
      "Absence de déformation, choc, coupure sur le composite"
    ],
    pannes: [
      "Pression < 90% nominal : ne pas engager, recharger",
      "Bouteille déformée : retrait définitif (condition de réforme)",
      "Robinet altéré : retrait définitif"
    ],
    procedure: "Ouverture LENTE puis franche à fond, retour d'un quart de tour. Vérifier la montée en pression et l'absence de fuite. Fixation étanche sur le dossard avant engagement."
  },
  {
    id: "robinet",
    num: "02",
    name: "Robinet de bouteille",
    short: "Vanne HP — fixation étanche au dossard",
    family: "Source d'air",
    // pas de photo séparée — hotspot positionné sur la photo bouteille
    point: { x: 845, y: 470 },
    label: { x: 1050, y: 540 },
    description: "Robinet haute pression monté sur le col de la bouteille, équipé d'un volant. Permet la fixation étanche au bâti-dossard et l'ouverture/fermeture de la réserve d'air. Sortie HP qui alimente la jonction de répartition vers les 4 flexibles.",
    fonction: "Isoler ou mettre en service la bouteille. Assurer l'étanchéité avec le bâti-dossard via raccord normalisé.",
    verifications: [
      "Volant tourne librement, sans point dur",
      "Filetage propre, sans corrosion ni altération",
      "Raccord au dossard correctement serré, sans fuite audible"
    ],
    pannes: [
      "Volant grippé : retrait du service",
      "Robinet altéré (filetage, étanchéité) : retrait définitif (réforme)"
    ],
    procedure: "Ouvrir d'un geste franc et complet, puis retour d'un quart de tour pour libérer le siège. Jamais à demi-ouvert."
  },
  {
    id: "dorsal",
    num: "03",
    name: "Harnais / Dossard",
    short: "Bâti porteur + jonction des 4 flexibles",
    family: "Portage",
    photo: "photos/dorsal.png",
    photoBox: { x: 580, y: 320, w: 200, h: 320 },
    point: { x: 680, y: 410 },
    label: { x: 340, y: 410 },
    description: "Châssis dorsal rigide équipé d'un harnais (bretelles + ceinture ventrale à boucle rapide). Supporte la bouteille et abrite la jonction de répartition d'où partent les 4 flexibles vers le sifflet HP, le manomètre/bodyguard, la soupape à la demande et la prise auxiliaire.",
    fonction: "Supporter et répartir le poids de l'ARI sur les épaules et le bassin. Servir de point de fixation au robinet et de cheminement aux flexibles HP et MP.",
    verifications: [
      "Sangles non brûlées, déchirées, souillées (condition de réforme)",
      "Boucles fonctionnelles, déverrouillage rapide sous tension",
      "Sangle bouteille bien serrée, robinet bien fixé",
      "Cheminement des 4 flexibles sans pliure ni écrasement"
    ],
    pannes: [
      "Textile brûlé, déchiré ou souillé : retrait définitif",
      "Boucle rapide défaillante : retrait du service"
    ],
    procedure: "Endosser bretelles desserrées, fermer la ceinture sur les hanches, puis serrer les bretelles. Vérifier la mobilité des 4 flexibles."
  },
  {
    id: "detendeur",
    num: "04",
    name: "Détendeur Haute Pression (HP)",
    short: "Abaisse 300 bar → 6-7 bar constants",
    family: "Pneumatique",
    photo: "photos/detendeur.png",
    photoBox: { x: 840, y: 130, w: 120, h: 120 },
    point: { x: 900, y: 190 },
    label: { x: 1010, y: 130 },
    description: "Détendeur piloté placé sur la sortie HP, en aval de la jonction de répartition. Un ressort réglé à une certaine force retient l'air via un piston, ce qui permet de faire sortir l'air à 6-7 bar de manière constante et régulière vers les deux flexibles MP. Seuls 2 des 4 flexibles passent par ce détendeur.",
    fonction: "Réduire la pression bouteille (300 ou 200 bar) à une pression moyenne constante de 6-7 bar, en conservant un débit continu et régulier vers la SAD et la prise auxiliaire.",
    verifications: [
      "Pas de fuite audible en charge",
      "Pression de sortie stable lors d'une chute de pression amont",
      "Raccord HP correctement serré"
    ],
    pannes: [
      "Sifflement permanent : défaut interne, retour atelier",
      "Pression MP dérive : retour atelier"
    ],
    procedure: "Aucune action porteur. Contrôle d'étanchéité bouteille fermée, circuit en charge — chute de pression admissible selon constructeur."
  },
  {
    id: "soupape",
    num: "05",
    name: "Soupape à la Demande (SAD)",
    short: "Détendeur BP : 6-7 bar → ~1 mbar de surpression",
    family: "Pneumatique",
    photo: "photos/sad.png",
    photoBox: { x: 430, y: 200, w: 100, h: 120 },
    point: { x: 480, y: 260 },
    label: { x: 290, y: 260 },
    description: "Détendeur basse pression (BP) fixé sur la pièce faciale. Abaisse la pression de 6-7 bar (MP) à une pression légèrement supérieure à 1 mbar, afin de maintenir une légère surpression dans le masque. Les fumées ne peuvent alors pas s'immiscer dans la pièce faciale, la pression étant plus haute à l'intérieur.",
    fonction: "Délivrer l'air à la demande du porteur en maintenant une surpression positive permanente. Bouton rouge de verrouillage pour stopper le débit lors du retrait du masque. Système by-pass délivrant 300 L/min minimum en cas d'effort violent ou de panique.",
    verifications: [
      "Test de surpression au masque : aucun appel de fumée lors d'une décollée brève",
      "By-pass délivre un débit franc (≥ 300 L/min)",
      "Bouton rouge de verrouillage fonctionnel",
      "Embout de jonction au masque propre, joint torique intègre"
    ],
    pannes: [
      "Pas de surpression : retrait du service",
      "By-pass bloqué ouvert ou inopérant : retrait",
      "Bouton rouge inopérant : retrait"
    ],
    procedure: "Connexion à la pièce faciale après enfilage du masque. Première inspiration profonde déclenche la surpression. En cas d'urgence respiratoire : presser le by-pass. Avant retrait du masque : actionner le bouton rouge pour stopper le débit."
  },
  {
    id: "masque",
    num: "06",
    name: "Pièce faciale",
    short: "Masque panoramique — protège, isole, canalise l'air",
    family: "Interface porteur",
    photo: "photos/masque.png",
    photoBox: { x: 600, y: 30, w: 160, h: 250 },
    point: { x: 680, y: 155 },
    label: { x: 340, y: 130 },
    description: "Masque complet couvrant la totalité du visage. Composé de 5 éléments : (1) Logement SAD avec soupapes d'inspiration et d'expiration ; (2) Demi-masque large adapté à tous les visages, équipé de soupapes et d'une membrane phonique pour la communication binôme ; (3) Jupe d'étanchéité en caoutchouc à doubles lèvres ; (4) Fixation rapide (griffes sur casque F1 ou araignée sous cagoule) ; (5) Visière panoramique offrant 96% de champ de vision.",
    fonction: "Protéger et isoler le porteur des fumées et vapeurs toxiques. Canaliser l'air fourni par la SAD. L'air frais passe entre la visière et le demi-masque pour éviter la formation de buée, puis traverse les soupapes d'inspiration. L'air vicié est expiré directement dans le demi-masque puis rejeté à l'extérieur via la soupape d'expiration.",
    verifications: [
      "Étanchéité : test de mise en dépression (paume sur le raccord) → le masque colle au visage",
      "Soupapes d'inspiration et d'expiration mobiles et propres (vital)",
      "Membrane phonique en place",
      "Jupe d'étanchéité double lèvres souple, sans coupure",
      "Visière sans rayure (manipulation soigneuse au stockage)",
      "Fixation rapide (griffes F1 ou araignée) opérationnelle"
    ],
    pannes: [
      "Soupape inspiration/expiration bloquée : retrait — VITAL",
      "Jupe coupée, déchirée ou souillée : retrait définitif (réforme)",
      "Visière rayée gênant la vision : remplacement"
    ],
    procedure: "Sangles desserrées au maximum, menton dans la jupe en premier, puis tirer la coiffe sur la tête. Serrer les sangles inférieures, puis temporales, jamais frontales en premier. Test d'étanchéité avant connexion de la SAD. Sur casque F1 : griffes ; sous cagoule : araignée."
  },
  {
    id: "manometre",
    num: "07",
    name: "Manomètre / Bodyguard",
    short: "Surveillance pression + DSU + balise détresse",
    family: "Contrôle",
    photo: "photos/bodyguard.png",
    photoBox: { x: 1010, y: 280, w: 120, h: 160 },
    point: { x: 1070, y: 360 },
    label: { x: 1150, y: 360 },
    description: "Dispositif alimenté par flexible HP direct (sans détendeur). Combine la surveillance de la pression bouteille avec un calcul de l'autonomie théorique, une alarme sonore et lumineuse à l'ouverture de la bouteille, et une balise de détresse intégrée (« homme mort »). Une clé de désactivation montée sur la bretelle permet l'utilisation en phase d'attente ou la désactivation du capteur d'immobilité.",
    fonction: "Permettre l'estimation du temps d'engagement. Surveiller l'immobilité du porteur : après 21 secondes sans mouvement → pré-alarme. Après 8 secondes supplémentaires (29 s total) → déclenchement automatique de l'alarme « homme mort ».",
    verifications: [
      "Auto-test à la mise en pression (sonore, lumineuse)",
      "Niveau de pile suffisant",
      "Clé de désactivation présente sur la bretelle",
      "Capteur d'immobilité : test de la pré-alarme à 21 s",
      "Cohérence affichage / pression réelle"
    ],
    pannes: [
      "Pas d'auto-test : retrait du service",
      "Pile faible : remplacement avant engagement",
      "Capteur d'immobilité défaillant : retrait"
    ],
    procedure: "S'allume à l'ouverture de la bouteille. AVANT engagement : remettre la clé de désactivation au contrôleur (au tableau de contrôle). En cas de détresse : déclenchement manuel possible. Repli au sifflet."
  },
  {
    id: "sifflet",
    num: "08",
    name: "Sifflet HP — alarme fin de charge",
    short: "Alarme pneumatique passive < 50 bar",
    family: "Contrôle",
    // pas de photo — petit pictogramme schématique dessiné dans le svg
    point: { x: 580, y: 670 },
    label: { x: 340, y: 670 },
    description: "Dispositif mécanique pneumatique alimenté par flexible HP direct (sans passage par le détendeur HP). Se met en fonction lorsque la pression de la bouteille passe en dessous de 50 bar. Fonctionne sans énergie électrique — sécurité passive.",
    fonction: "Alerter le porteur et son binôme par un signal sonore continu lorsque le seuil de réserve est atteint et qu'il faut commencer le repli.",
    verifications: [
      "Test au gonflage / purge : sifflement bref",
      "Orifice non encrassé",
      "Seuil de déclenchement conforme (vérification atelier)"
    ],
    pannes: [
      "Pas de signal à la purge : retrait du service",
      "Encrassement : nettoyage atelier"
    ],
    procedure: "Au déclenchement : annoncer à la radio (TPH), débuter le repli IMMÉDIAT. Ne jamais poursuivre la mission sous sifflet — c'est une réserve, pas un budget d'engagement."
  },
  {
    id: "prise_aux",
    num: "09",
    name: "Prise auxiliaire (narguilé)",
    short: "Sortie MP femelle — 2ème SAD ou cagoule d'évacuation",
    family: "Pneumatique",
    photo: "photos/narguile.png",
    photoBox: { x: 1010, y: 470, w: 220, h: 130 },
    point: { x: 1110, y: 535 },
    label: { x: 1240, y: 470 },
    description: "Prise femelle reliée à un flexible MP (en aval du détendeur HP, donc à 6-7 bar). Permet de brancher par une prise mâle soit une deuxième SAD (pour un autre porteur), soit la cagoule d'évacuation pour la mise en sécurité d'une victime.",
    fonction: "Offrir un point de connexion d'urgence sur le circuit MP pour partager l'air respirable avec une victime ou un binôme en difficulté.",
    verifications: [
      "Prise femelle propre, sans corrosion",
      "Joints d'étanchéité intègres",
      "Capot de protection présent",
      "Test de connexion / déconnexion d'une prise mâle"
    ],
    pannes: [
      "Fuite à la connexion : remplacement du joint",
      "Verrouillage défaillant : retrait du service"
    ],
    procedure: "Connexion d'urgence uniquement. ATTENTION : dès branchement → retour immédiat vers le point d'accès car deux personnes consommeront la même bouteille."
  },
  {
    id: "cagoule",
    num: "10",
    name: "Cagoule d'évacuation",
    short: "Capuche d'évacuation victime — 40 L/min continu",
    family: "Sauvetage",
    photo: "photos/cagoule.png",
    photoBox: { x: 60, y: 100, w: 230, h: 170 },
    point: { x: 175, y: 185 },
    label: { x: 310, y: 130 },
    description: "Cagoule reliée à un tuyau MP de 1,5 m terminé par une prise mâle qui se branche sur la prise auxiliaire de l'ARI du sauveteur. Mise en place sur la tête de la victime avec une cordelette de serrage autour du cou. Un flux constant d'air est envoyé à débit continu de 40 L/min.",
    fonction: "Évacuer une victime lors d'un sauvetage ou d'une mise en sécurité, en la maintenant en dehors de l'atmosphère viciée pendant le repli.",
    verifications: [
      "Cagoule sans déchirure, jupe d'étanchéité intègre",
      "Tuyau MP de 1,5 m sans coupure",
      "Cordelette de serrage présente et fonctionnelle",
      "Prise mâle compatible avec la prise auxiliaire"
    ],
    pannes: [
      "Cagoule percée : retrait définitif",
      "Tuyau MP coupé / écrasé : retrait"
    ],
    procedure: "Brancher la prise mâle sur la prise auxiliaire de son propre ARI. Placer la cagoule sur la tête de la victime, serrer la cordelette autour du cou. ATTENTION : retour IMMÉDIAT vers le point d'accès — deux personnes consomment la même bouteille, autonomie divisée."
  },
  {
    id: "lp",
    num: "11",
    name: "Liaison personnelle (LP)",
    short: "Cordelette 6 m / Ø 4 mm — courte 1,25 m ou longue 6 m",
    family: "Sécurité collective",
    photo: "photos/lp.png",
    photoBox: { x: 80, y: 730, w: 240, h: 160 },
    point: { x: 215, y: 800 },
    label: { x: 340, y: 800 },
    description: "Cordelette d'une longueur totale de 6 mètres et d'un diamètre de 4 millimètres. Permet le déplacement le long de la ligne guide et assure un lien constant entre le chef et l'équipier du même binôme. Peut être utilisée en version courte (1,25 m) ou en version longue (6 m).",
    fonction: "Maintenir le binôme connecté à la ligne guide et entre eux. Permet la progression contrôlée et le retour assuré.",
    verifications: [
      "Cordelette sans coupure, brûlure, souillure",
      "Coutures intactes",
      "Mousqueton terminal verrouillable",
      "Longueurs courte (1,25 m) et longue (6 m) accessibles"
    ],
    pannes: [
      "Brûlure, déchirure ou souillure : retrait définitif (réforme)",
      "Mousqueton qui ne verrouille plus : retrait"
    ],
    procedure: "ATTENTION : le chef et l'équipier NE PEUVENT PAS être tous les deux simultanément en liaison longue (6 m + 6 m + 6 m entre équipier et ligne guide = 18 m TROP LONG, perte de contact). En binôme : un seul en longue à la fois."
  },
  {
    id: "ligne",
    num: "12",
    name: "Ligne guide",
    short: "Ligne 50–60 m / Ø 6–8 mm — repères de progression (olives)",
    family: "Sécurité collective",
    photo: "photos/ligne-guide.png",
    photoBox: { x: 410, y: 720, w: 165, h: 175 },
    point: { x: 490, y: 800 },
    label: { x: 595, y: 800 },
    description: "Ligne enroulée sur un tambour ou lovée dans un sac. Longueur 50 à 60 mètres, diamètre 6 à 8 millimètres. Comporte des repères de progression — les « olives » — qui facilitent le travail du binôme.",
    fonction: "Matérialiser physiquement le chemin parcouru. Repères mnémotechniques : « 13 vers le feu, signe de malheur » (un seul double-repère pointe vers le sinistre) et « être sur son 31 pour sortir » (trois repères-un repère pointent vers la sortie). Peut être remplacée par une ligne guide sur tuyau, limitée à 40 m dans le feu (2 tuyaux de 45).",
    verifications: [
      "Gaine sans coupure ni fonte",
      "Repères (olives) en place et lisibles au toucher avec gants",
      "Longueur conforme (50–60 m)",
      "Mousquetons d'extrémité fonctionnels",
      "Lovage / enroulement permettant un déploiement sans nœud"
    ],
    pannes: [
      "Gaine fondue / âme apparente : retrait définitif",
      "Olive manquante ou illisible : remarquage ou remplacement"
    ],
    procedure: "Amarrée au point d'engagement. Binôme connecté via la LP. Sens de lecture : 13 (olive seule + double) → feu ; 31 (double + olive seule) → sortie. Variante sur tuyau : 40 m maximum dans le feu, collier d'amarrage pour faciliter la progression."
  },
  {
    id: "rhino",
    num: "13",
    name: "Rhino Evac",
    short: "Système d'auto-évacuation porteur — sangle + descendeur",
    family: "Sauvetage",
    photo: "photos/rhino-descendeur.png",
    photoBox: { x: 70, y: 320, w: 200, h: 180 },
    secondaryPhoto: "photos/rhino-sangle.png",
    point: { x: 165, y: 415 },
    label: { x: 310, y: 360 },
    description: "Système individuel d'auto-évacuation d'urgence composé de deux éléments : (1) la sangle avec mousqueton (rouge, bandes réfléchissantes) qui s'amarre à un point fixe résistant ; (2) le descendeur cylindrique qui contient la corde lovée et permet une descente freinée et contrôlée. Utilisable en dernier recours pour franchir une fenêtre, un balcon, lorsque le retour normal est impossible.",
    fonction: "Procédure de dernier recours : permettre au porteur de s'auto-évacuer en descente freinée lorsque la voie de retour est coupée (escalier impraticable, embrasement imminent, flashover).",
    verifications: [
      "Sangle sans coupure, brûlure, fil tiré, souillure",
      "Bandes réfléchissantes en place",
      "Mousqueton à verrouillage automatique fonctionnel",
      "Descendeur : corde lovée sans nœud, gaine sans trace de fonte",
      "Visu : corde visible par la fenêtre du descendeur",
      "Date de visite périodique valide"
    ],
    pannes: [
      "Trace de fonte sur la corde ou la sangle : retrait définitif",
      "Descendeur dur ou qui patine : retour atelier",
      "Utilisé en charge même 1 fois : retrait pour expertise"
    ],
    procedure: "DERNIER RECOURS. Annoncer Mayday au TPH. Amarrer le mousqueton de la sangle sur point fixe résistant (charpente métallique, radiateur fonte, structure). Passer la fenêtre dos au vide. Descente freinée par la main libre. Jambes fléchies à l'arrivée."
  },
  {
    id: "tableau",
    num: "14",
    name: "Tableau de contrôle",
    short: "Regroupement des clés DSU — suivi des engagements",
    family: "Commandement",
    photo: "photos/tableau.png",
    photoBox: { x: 1115, y: 620, w: 200, h: 270 },
    point: { x: 1215, y: 780 },
    label: { x: 1075, y: 870 },
    description: "Tableau tenu par le contrôleur ARI à la base arrière. Regroupe les plaques (et clés de désactivation DSU) de chaque porteur engagé. Permet la surveillance du nombre de personnes en zone dangereuse et le suivi du temps d'engagement.",
    fonction: "Centraliser le contrôle des binômes engagés. Le porteur qui s'engage laisse sa clé de désactivation au contrôleur — qui ne peut plus désactiver son DSU à distance. Le contrôleur chronométre l'engagement et déclenche le repli avant le sifflet.",
    verifications: [
      "Tableau et chronomètre disponibles avant tout engagement",
      "Plaques d'identification de chaque porteur",
      "Clés de désactivation correspondant à chaque ARI"
    ],
    pannes: [
      "Clé absente ou non identifiée : engagement refusé"
    ],
    procedure: "À l'engagement : porteur remet sa clé et sa plaque au contrôleur. Contrôleur démarre chronomètre, note pression de départ. Au repli : retour de la clé au porteur après désengagement."
  },
  {
    id: "tph",
    num: "15",
    name: "TPH — radio binôme",
    short: "Communication binôme ↔ contrôleur / COS",
    family: "Commandement",
    photo: "photos/tph.png",
    photoBox: { x: 1265, y: 60, w: 85, h: 290 },
    point: { x: 1305, y: 200 },
    label: { x: 1145, y: 200 },
    description: "Terminal Portatif Hertzien. Système de communication qui fait le relai entre le binôme engagé, le contrôleur ARI et le Commandant des Opérations de Secours (COS). Canal GTCE 214.",
    fonction: "Sécuriser le binôme par le maintien d'une liaison vocale permanente avec l'extérieur. Transmettre les comptes-rendus, demandes de renfort, alertes.",
    verifications: [
      "Niveau de batterie suffisant",
      "Canal réglé sur GTCE 214",
      "Test radio binôme ↔ contrôleur AVANT engagement",
      "Touche # de verrouillage testée"
    ],
    pannes: [
      "Pas de phonie : retour, remplacement",
      "Verrouillage clavier inopérant : retour"
    ],
    procedure: "Maintien de la touche # pour verrouiller le TPH (éviter changement de canal accidentel sous gants). Comptes-rendus réguliers : entrée en zone, à la mi-pression, à chaque palier, au sifflet, au repli."
  }
];

// Trajet de l'air — depuis la jonction sortie robinet
window.ARI_CIRCUIT = [
  { from: "bouteille", to: "robinet", kind: "hp", label: "300 bar" },
  { from: "robinet", to: "junction", kind: "hp" },
  { from: "junction", to: "sifflet", kind: "hp", label: "HP" },
  { from: "junction", to: "manometre", kind: "hp", label: "HP" },
  { from: "junction", to: "detendeur", kind: "hp" },
  { from: "detendeur", to: "soupape", kind: "mp", label: "6-7 bar (MP)" },
  { from: "detendeur", to: "prise_aux", kind: "mp", label: "6-7 bar (MP)" },
  { from: "soupape", to: "masque", kind: "bp", label: "~1 mbar surpression" },
  { from: "prise_aux", to: "cagoule", kind: "mp", label: "40 L/min continu" },
];
