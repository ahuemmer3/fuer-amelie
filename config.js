/* =====================================================================
   HIER PASST DU ALLES AN.
   Du musst nichts programmieren: Ändere nur die Texte zwischen den
   Anführungszeichen '...'. Achte darauf, dass jedes Anführungszeichen
   und jedes Komma stehen bleibt.

   Fotos:  liegen in  assets/photos/  (groß)  und  assets/photos/thumbs/ (klein)
           Neue Fotos?  →  python tools/fotos-optimieren.py "Ordner/mit/fotos"
           Danach hier unten bei "fotos" die Dateinamen eintragen.
   ===================================================================== */

export const CONFIG = {

  /* ---------- TESTMODUS ----------
     true  = bei jedem Laden der Seite wird der Spielstand zurückgesetzt (zum Ausprobieren).
     WICHTIG: Bevor du Amelie den Link schickst, auf false stellen! */
  testModus: true,

  /* ---------- Namen ---------- */
  ihrName: 'Amelie',                 // Ihr Vorname
  deinName: 'Aaron',                 // Dein Name (Unterschrift)
  initialen: ['A', 'A'],             // Für das Sternbild-Spiel (Aaron + Amelie). Zweites Feld leer = Unendlich-Zeichen

  /* ---------- Datum ---------- */
  zusammenSeit: '2025-12-24',        // euer Startdatum als 'JJJJ-MM-TT'

  /* ---------- Startkarte ---------- */
  karte: {
    titel: 'Für Amelie',
    untertitel: 'Alles Liebe zum Geburtstag! Ton an, es wird episch.',
    datum: 'Zu deinem Geburtstag',   // kleine Zeile über dem Titel (leer = heutiges Datum)
    button: 'Öffnen'
  },

  /* ---------- Großer Schriftzug in der Galaxie (wechselt alle paar Sekunden) ---------- */
  titel: ['Happy Birthday, Amelie', 'Ich liebe dich', 'Meine Lieblings-Nervensäge'],

  /* ---------- Intro-Film: Texte beim Flug ----------
     himmel  = beim Märchenflug durch die Wolken (4 Zeilen)
     weltall = beim Flug durchs All (3 Zeilen, eine Zeile mit „&“ wird groß angezeigt)
     Die zwei Porträts liegen in assets/photos/thumbs/ (portrait-aaron.webp, portrait-amelie.webp) */
  intro: {
    himmel: [
      'Es war einmal …',
      '… ein Mädchen und ein Junge, die zusammen aufgewachsen sind.',
      'Sie kannten sich ihr ganzes Leben lang …',
      '… und haben sich trotzdem erst viel später richtig gefunden.'
    ],
    weltall: [
      'Am 24. Dezember 2025 hat es endlich Klick gemacht.',
      'Amelie & Aaron',
      'Und heute ist dein Tag.'
    ],
    portraits: ['portrait-aaron.webp', 'portrait-amelie.webp']
  },

  /* ---------- Geburtstagstorte (Planet „Torte“) ---------- */
  geburtstag: {
    kerzen: 5,                       // Anzahl Kerzen (oder ihr Alter eintragen)
    wunsch: 'Alles Gute zum Geburtstag, mein Schatz! Mögen all deine Wünsche in Erfüllung gehen. Und falls einer davon Essen ist: Den erfüllen wir sofort.'
  },

  /* ---------- Farben (Hex-Codes) ---------- */
  farben: {
    galaxieInnen: '#fff2f8',
    galaxieMitte: '#ff9ccc',
    galaxieAussen: '#ff2e93',
    galaxieRand:  '#8a3cff',
    herz1: '#ff2f6d',
    herz2: '#ff9fc6',
    akzent: '#ff4fa3'
  },

  /* ---------- Musik ----------
     Lege eine MP3 unter assets/music/ ab und trage sie ein, z. B. './assets/music/unser-lied.mp3'
     Leer lassen = eine sanfte, automatisch erzeugte Klangfläche spielt.
     (Intro-Musik, Happy Birthday und der Song „Amelie“ werden immer live erzeugt.) */
  musik: {
    datei: '',
    lautstaerke: 0.7
  },

  /* ---------- Textringe, die mit der Galaxie kreisen (innen → außen) ---------- */
  botschaften: [
    ['Happy Birthday, Amelie', 'Seit dem Sandkasten', 'Mein Lieblingsmensch', 'Für immer wir'],
    ['Hast du schon was gegessen?', 'Nur Augen für dich', 'Danke, dass es dich gibt', 'Jammern ist heute erlaubt', 'Mein Herz gehört dir'],
    ['Alles Gute zum Geburtstag', 'Beste Nervensäge im Universum', 'Du bist mein Zuhause', 'Ich würde dich immer wieder wählen', 'Bis zum Ende der Galaxie']
  ],

  /* ---------- Fotos ----------
     datei: Dateiname in assets/photos/   titel: Überschrift   text: kurzer Text
     Die ersten Fotos kreisen in der Galaxie (am Handy etwas weniger). */
  fotos: [
    { datei: 'foto-53.webp', titel: 'Wir zwei', text: 'Früher Sandkasten, heute das hier. Eins meiner liebsten Fotos von uns.' },
    { datei: 'foto-24.webp', titel: 'Erwischt', text: 'Ein Kuss auf die Wange, bevor du abdrücken konntest.' },
    { datei: 'foto-31.webp', titel: 'Meerblick', text: 'Das Meer war schön. Du warst schöner.' },
    { datei: 'foto-34.webp', titel: 'Ganz seriös', text: 'Unser Versuch, mal ernst zu gucken. Hat ungefähr drei Sekunden gehalten.' },
    { datei: 'foto-37.webp', titel: 'Lieblingsmensch', text: 'Dein Kopf an meiner Schulter. Da gehört er hin. Schon immer eigentlich.' },
    { datei: 'foto-51.webp', titel: 'Lautstärke 100 %', text: 'So klingt es übrigens, wenn du Hunger hast.' },
    { datei: 'foto-40.webp', titel: 'Blaue Stunde', text: 'Kurz bevor die Sonne ganz weg war. Und ich wollte, dass der Abend nie aufhört.' },
    { datei: 'foto-47.webp', titel: 'Erwachsen sein? Morgen.', text: 'Wir kennen uns seit dem Spielplatz. Manche Dinge ändern sich nie.' },
    { datei: 'foto-35.webp', titel: 'Überraschung!', text: 'Ungefähr so wirst du gleich gucken.' },
    { datei: 'foto-39.webp', titel: 'Sommerabend', text: 'Du, das Meer und dieser Abend. Mehr braucht es nicht.' },
    { datei: 'foto-15.webp', titel: 'Easy Rider', text: 'Helm auf, Sonnenbrille an, Abenteuer los.' },
    { datei: 'foto-49.webp', titel: 'Kuschelprofi', text: 'Du und die Katze: das gemütlichste Duo der Welt.' },
    { datei: 'foto-23.webp', titel: 'Spiegel-Selfie, Urlaubsedition', text: 'Du machst das Foto, ich mach das Gesicht.' },
    { datei: 'foto-03.webp', titel: 'Wann kommt das Essen?', text: 'Dieser Blick, wenn das Essen noch nicht da ist. Ich kenne ihn seit dem Kindergarten.' },
    { datei: 'foto-06.webp', titel: '„Nur kurz ausruhen“', text: 'Zwei Stunden später …' },
    { datei: 'foto-44.webp', titel: 'Spieglein, Spieglein', text: '… wer hat den besten Durchblick im ganzen Land? Die MFA mit Brille natürlich.' },
    { datei: 'foto-13.webp', titel: 'Waldspaziergang', text: 'Ich lauf dir überallhin hinterher. Auch in den Wald. Vor allem, wenn am Ende Essen wartet.' },
    { datei: 'foto-19.webp', titel: 'Frisur-Notfall', text: 'Haare machen dauert bei mir manchmal länger. Du hast es dokumentiert.' },
    { datei: 'foto-25.webp', titel: 'Urlaubsmodus', text: 'Sonne, Pool, du. Status: perfekt. Jammer-Level: null.' },
    { datei: 'foto-45.webp', titel: 'Volle Fahrt', text: 'Wir haben schon als Kinder zusammen gespielt. Heute sieht es genauso aus.' },
    { datei: 'foto-36.webp', titel: 'Wir', text: 'Einfach wir. Mehr muss man nicht sagen.' }
  ],

  /* ---------- Spiele ---------- */
  memoryFotos: ['foto-53.webp', 'foto-24.webp', 'foto-34.webp', 'foto-51.webp', 'foto-47.webp', 'foto-15.webp', 'foto-37.webp', 'foto-35.webp'],
  puzzleFoto: 'foto-53.webp',

  herzenFangen: {
    ziel: 60,                                               // ab dieser Punktzahl gibt es die Belohnung
    belohnung: 'Gutschein: Ein Essen deiner Wahl. Ich zahle. Und du darfst sogar von meinem Teller essen.'
  },

  // richtig = Nummer der richtigen Antwort (0 = erste, 1 = zweite, ...)
  quiz: [
    { frage: 'Seit wann kennen wir uns?', antworten: ['Seit dem Sandkasten', 'Seit einer Party', 'Seit letztem Jahr', 'Seit Tinder'], richtig: 0, kommentar: 'Wir kennen uns unser ganzes Leben. Gefunden haben wir uns trotzdem erst später.' },
    { frage: 'Wann hat es endlich Klick gemacht?', antworten: ['An Silvester', 'Am 24. Dezember 2025', 'Im Sommerurlaub', 'Hat es noch nicht'], richtig: 1, kommentar: 'Heiligabend. Das schönste Geschenk lag nicht unterm Baum.' },
    { frage: 'Was ist Amelies Lieblingsbeschäftigung?', antworten: ['Essen', 'Aaron auf die Nerven gehen', 'Rumjammern', 'Alles gleichzeitig'], richtig: 3, kommentar: 'Und ich liebe jede einzelne davon. Fast.' },
    { frage: 'Was macht Amelie beruflich?', antworten: ['Pilotin', 'MFA in der Augenklinik', 'Profi-Esserin', 'Astronautin'], richtig: 1, kommentar: 'Den ganzen Tag schaut sie anderen in die Augen. Am schönsten schaut sie aber mich an.' },
    { frage: 'Was passiert, wenn Amelie Hunger hat?', antworten: ['Nichts', 'Sie wird ein kleines bisschen ungemütlich', 'Die ganze Welt erfährt davon', 'Antwort 2 und 3'], richtig: 3, kommentar: 'Deshalb sollte man immer einen Snack dabeihaben.' },
    { frage: 'Wie sehr liebt Aaron Amelie?', antworten: ['Ein bisschen', 'Ziemlich', 'Bis zum Mond', 'Mehr als Amelie Essen liebt'], richtig: 3, kommentar: 'Und das will was heißen.' }
  ],
  quizErgebnisse: [
    { ab: 0, text: 'Hmm. Wir kennen uns seit dem Sandkasten und dann das? Nachsitzen!' },
    { ab: 4, text: 'Gut! Aber da ist noch Luft nach oben. Ich gebe dir Nachhilfe. Mit Snacks.' },
    { ab: 6, text: 'Volle Punktzahl! Du kennst uns besser als jeder andere Mensch im Universum.' }
  ],

  rubbellos: [
    'Ein Essen deiner Wahl (ich zahle)',
    'Eine Massage, so lange du willst',
    '30 Minuten Jammern, ohne dass ich widerspreche',
    'Frühstück ans Bett'
  ],

  gluecksrad: [
    'Pizza-Abend',
    'Lieblingsessen',
    '10 Küsse',
    'Jammer-Freifahrtschein',
    'Ein Tag ohne Abwasch',
    'Überraschungsdate',
    'Kuscheltag',
    'Wunsch frei'
  ],

  geheimnis: {
    frage: 'Wann hat es bei uns endlich Klick gemacht? (Tag und Monat)',
    passwort: ['24.12', '24.12.', '24.12.2025', '24.12.25', '2412', '24. dezember', '24 dezember', 'heiligabend'],
    titel: 'Unser Geheimnis',
    text: 'Wir kennen uns schon so lange, dass ich mich an keine Zeit ohne dich erinnern kann. Und trotzdem hat es bis Heiligabend 2025 gedauert, bis wir verstanden haben, was da die ganze Zeit war. Das beste Weihnachtsgeschenk meines Lebens bist du.',
    foto: 'foto-24.webp'
  },

  /* ---------- Zeitstrahl ---------- */
  zeitstrahl: [
    { datum: 'Kindheit', titel: 'Wir zwei, schon damals', text: 'Wir sind zusammen aufgewachsen und kennen uns, seit wir denken können. (Foto nachgestellt.)', foto: 'foto-47.webp' },
    { datum: 'Viele Jahre', titel: 'Immer da', text: 'Wir waren uns immer nah. Dass da mehr ist, haben wir erst später gemerkt. Manchmal braucht man eben ein paar Jahre länger.', foto: 'foto-34.webp' },
    { datum: '24. Dezember 2025', titel: 'Klick!', text: 'An Heiligabend hat es endlich Klick gemacht. Das schönste Geschenk lag nicht unterm Baum.', foto: 'foto-53.webp' },
    { datum: 'Sommer 2026', titel: 'Unser Urlaub am Meer', text: 'Sonne, Meer, viel zu viele Fotos und ein Schrei unter Palmen (Hunger).', foto: 'foto-31.webp' },
    { datum: 'Sommer 2026', titel: 'Blaue Stunde', text: 'Einer dieser Abende, die man nie vergisst.', foto: 'foto-40.webp' },
    { datum: 'Heute', titel: 'Dein Geburtstag', text: 'Alles Gute, mein Schatz! Ich hab dich schon mein ganzes Leben lang gern, aber noch nie so sehr wie jetzt.', foto: 'foto-37.webp' }
  ],

  /* ---------- Gründe, warum ich dich liebe (Planet "Gründe") ---------- */
  gruende: [
    'Dass du mich kennst, seit wir Kinder waren, und trotzdem geblieben bist.',
    'Dass du den ganzen Tag anderen in die Augen schaust und mich trotzdem am schönsten anschaust.',
    'Wie du jammerst. Ehrlich, sogar das ist irgendwie süß.',
    'Dass du mir auf die Nerven gehst wie niemand sonst und mir trotzdem am meisten fehlst.',
    'Wie glücklich du aussiehst, wenn das Essen kommt.',
    'Deine Brille. Und den Blick dahinter.',
    'Dass wir schon als Kinder zusammen gelacht haben und es heute immer noch tun.',
    'Wie du lachst, wenn du eigentlich ernst bleiben willst.',
    'Wie ruhig alles wird, wenn du neben mir bist.',
    'Dass du auch meine komischen Seiten magst.',
    'Deine Umarmungen. Die besten im bekannten Universum.',
    'Dass sich überall wie Zuhause anfühlt, wo du bist.',
    'Dass kein Spielplatz vor dir sicher ist.',
    'Deine Hand in meiner.',
    'Dass mit dir sogar Warten Spaß macht. Außer aufs Essen.',
    'Einfach du. Ganz und gar du.'
  ],

  /* ---------- Finaler Liebesbrief (wird frei, wenn alle Spiele geschafft sind) ---------- */
  liebesbrief: {
    anrede: 'Alles Gute zum Geburtstag, mein Schatz,',
    absaetze: [
      'du hast jedes Spiel in dieser kleinen Galaxie geschafft. Natürlich hast du das. (Oder jemand hat dir ein bisschen geholfen. Ich sag nichts.)',
      'Wir kennen uns, seit wir Kinder waren. Ich kann mich an keine Zeit ohne dich erinnern. Und trotzdem hat es bis Heiligabend 2025 gedauert, bis wir verstanden haben, was da die ganze Zeit war.',
      'Du isst gern, du jammerst gern und du gehst mir gern auf die Nerven. Ich würde nichts davon hergeben. Danke, dass du so bist, wie du bist.',
      'Ich wünsche dir ein neues Lebensjahr voller Abenteuer, gutem Essen, wenig Grund zum Jammern und ganz viel uns.',
      'Ich liebe dich. Heute, morgen und bis zum Ende dieser Galaxie.'
    ],
    gruss: 'Für immer dein',
    foto: 'foto-37.webp'
  },

  /* ---------- Easter Eggs ---------- */
  easterEggs: {
    codewort: 'hunger',              // dieses Wort auf der Tastatur tippen (ihr Name funktioniert auch)
    herz: 'Goldenes Herz entdeckt! Du hast mein Herz fünfmal angetippt. Es gehört eh schon dir.',
    sternschnuppe: 'Sternschnuppe gefangen! Du darfst dir etwas wünschen. Sag es mir einfach. (Nein, nicht schon wieder Pizza. Okay, doch.)',
    schwarzesLoch: 'Vorsicht, Spaghettifizierung! Mmh, Spaghetti … Zum Glück zieht mich nur eine Sache so stark an: du.',
    konami: 'Cheat-Code aktiviert: unendlich viele Küsse freigeschaltet.',
    wort: 'Hunger? Natürlich. Das Essen ist schon unterwegs. Und ich liebe dich.'
  }
};
