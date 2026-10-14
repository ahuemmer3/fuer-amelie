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

  /* ---------- Namen ---------- */
  ihrName: 'Amelie',                 // Ihr Vorname
  deinName: 'Aaron',                 // Dein Name (Unterschrift)
  initialen: ['A', 'A'],             // Für das Sternbild-Spiel (Aaron + Amelie). Zweites Feld leer = Unendlich-Zeichen

  /* ---------- Datum ---------- */
  zusammenSeit: '2025-12-24',        // euer Startdatum als 'JJJJ-MM-TT'

  /* ---------- Startkarte ---------- */
  karte: {
    titel: 'Für Amelie',
    untertitel: 'Alles Liebe zum Geburtstag. Eine kleine Galaxie, nur für dich.',
    datum: 'Zu deinem Geburtstag',   // kleine Zeile über dem Titel (leer = heutiges Datum)
    button: 'Öffnen'
  },

  /* ---------- Großer Schriftzug in der Galaxie (wechselt alle paar Sekunden) ---------- */
  titel: ['Happy Birthday, Amelie', 'Ich liebe dich'],

  /* ---------- Intro-Reise: Texte, die beim Flug durchs Universum erscheinen ----------
     Die zwei Porträts liegen in assets/photos/thumbs/ (portrait-aaron.webp, portrait-amelie.webp) */
  intro: {
    zeilen: [
      'Irgendwo zwischen Milliarden von Sternen …',
      '… haben sich zwei gefunden.',
      'Amelie & Aaron',
      'Seit dem 24. Dezember 2025',
      'Und heute ist dein Tag.'
    ],
    portraits: ['portrait-aaron.webp', 'portrait-amelie.webp']
  },

  /* ---------- Geburtstagstorte (Planet „Torte“) ---------- */
  geburtstag: {
    kerzen: 5,                       // Anzahl Kerzen (oder ihr Alter eintragen)
    wunsch: 'Alles Gute zum Geburtstag, mein Schatz! Ich hoffe, all deine Wünsche gehen in Erfüllung. Einer davon bin hoffentlich ich.'
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
     Leer lassen = eine sanfte, automatisch erzeugte Klangfläche spielt. */
  musik: {
    datei: '',
    lautstaerke: 0.7
  },

  /* ---------- Textringe, die mit der Galaxie kreisen (innen → außen) ---------- */
  botschaften: [
    ['Happy Birthday, Amelie', 'Du bist mein Zuhause', 'Mein Lieblingsmensch', 'Für immer wir'],
    ['Mit dir ist alles schöner', 'Danke, dass es dich gibt', 'Du + Ich', 'Mein Herz gehört dir'],
    ['Alles Gute zum Geburtstag', 'Jeder Tag mit dir ist ein Geschenk', 'Du bist mein Universum', 'Ich würde dich immer wieder wählen', 'Bis zum Ende der Galaxie']
  ],

  /* ---------- Fotos ----------
     datei: Dateiname in assets/photos/   titel: Überschrift   text: kurzer Text
     Die ersten Fotos kreisen in der Galaxie (am Handy etwas weniger). */
  fotos: [
    { datei: 'foto-53.webp', titel: 'Wir zwei', text: 'Goldenes Licht, dein Kleid und ich mittendrin. Eins meiner liebsten Fotos von uns.' },
    { datei: 'foto-24.webp', titel: 'Erwischt', text: 'Ein Kuss auf die Wange, bevor du abdrücken konntest.' },
    { datei: 'foto-31.webp', titel: 'Meerblick', text: 'Das Meer war schön. Du warst schöner.' },
    { datei: 'foto-34.webp', titel: 'Ganz seriös', text: 'Unser Versuch, mal ernst zu gucken. Hat ungefähr drei Sekunden gehalten.' },
    { datei: 'foto-37.webp', titel: 'Lieblingsmensch', text: 'Dein Kopf an meiner Schulter. Da gehört er hin.' },
    { datei: 'foto-51.webp', titel: 'Lautstärke 100 %', text: 'Palmen, Sonne und ein Schrei, den man bis nach Hause gehört hat.' },
    { datei: 'foto-40.webp', titel: 'Blaue Stunde', text: 'Kurz bevor die Sonne ganz weg war. Und ich wollte, dass der Abend nie aufhört.' },
    { datei: 'foto-47.webp', titel: 'Erwachsen sein? Morgen.', text: 'Kein Spielplatz ist vor dir sicher. Und ich liebe das.' },
    { datei: 'foto-35.webp', titel: 'Überraschung!', text: 'Keine Ahnung mehr, was da passiert ist. Unsere Gesichter erzählen es trotzdem.' },
    { datei: 'foto-39.webp', titel: 'Sommerabend', text: 'Du, das Meer und dieser Abend. Mehr braucht es nicht.' },
    { datei: 'foto-15.webp', titel: 'Easy Rider', text: 'Helm auf, Sonnenbrille an, Abenteuer los.' },
    { datei: 'foto-49.webp', titel: 'Kuschelprofi', text: 'Du und die Katze: das gemütlichste Duo der Welt.' },
    { datei: 'foto-23.webp', titel: 'Spiegel-Selfie, Urlaubsedition', text: 'Du machst das Foto, ich mach das Gesicht.' },
    { datei: 'foto-03.webp', titel: 'Prost!', text: 'Dieser Blick, wenn das Getränk noch nicht da ist.' },
    { datei: 'foto-06.webp', titel: '„Nur kurz ausruhen“', text: 'Zwei Stunden später …' },
    { datei: 'foto-44.webp', titel: 'Spieglein, Spieglein', text: '… wer ist die Schönste im ganzen Land? Die Antwort steht fest.' },
    { datei: 'foto-13.webp', titel: 'Waldspaziergang', text: 'Ich lauf dir überallhin hinterher. Auch in den Wald.' },
    { datei: 'foto-19.webp', titel: 'Frisur-Notfall', text: 'Haare machen dauert bei mir manchmal länger. Du hast es dokumentiert.' },
    { datei: 'foto-25.webp', titel: 'Urlaubsmodus', text: 'Sonne, Pool, du. Status: perfekt.' },
    { datei: 'foto-45.webp', titel: 'Volle Fahrt', text: 'Höchstgeschwindigkeit: 2 km/h. Spaßfaktor: unendlich.' },
    { datei: 'foto-36.webp', titel: 'Wir', text: 'Einfach wir. Mehr muss man nicht sagen.' }
  ],

  /* ---------- Spiele ---------- */
  memoryFotos: ['foto-53.webp', 'foto-24.webp', 'foto-34.webp', 'foto-51.webp', 'foto-47.webp', 'foto-15.webp', 'foto-37.webp', 'foto-35.webp'],
  puzzleFoto: 'foto-53.webp',

  herzenFangen: {
    ziel: 60,                                               // ab dieser Punktzahl gibt es die Belohnung
    belohnung: 'Gutschein: Ein Abend, an dem du den Film aussuchst. Ohne Diskussion.'
  },

  // richtig = Nummer der richtigen Antwort (0 = erste, 1 = zweite, ...)
  quiz: [
    { frage: 'Wer von uns schläft auf dem Sofa schneller ein?', antworten: ['Du', 'Ich', 'Beide gleichzeitig', 'Die Katze'], richtig: 1, kommentar: 'Beweisfoto liegt in der Galaxie.' },
    { frage: 'Was ist unser Lieblingsort für Fotos?', antworten: ['Vor dem Spiegel', 'Am Meer', 'Auf dem Spielplatz', 'Überall'], richtig: 3, kommentar: 'Unsere Galerie spricht für sich.' },
    { frage: 'Wer braucht morgens länger im Bad?', antworten: ['Du', 'Ich', 'Kommt drauf an', 'Darüber reden wir nicht'], richtig: 3, kommentar: 'Manche Geheimnisse bleiben in der Galaxie.' },
    { frage: 'Was mache ich, wenn du traurig bist?', antworten: ['Dich in den Arm nehmen', 'Essen besorgen', 'Dich zum Lachen bringen', 'Alles davon'], richtig: 3, kommentar: 'Immer. Alles davon.' },
    { frage: 'Wie viel liebe ich dich?', antworten: ['Ein bisschen', 'Ziemlich viel', 'Bis zum Mond', 'Mehr als Sterne in dieser Galaxie'], richtig: 3, kommentar: 'Und hier kreisen über 100.000 Sterne.' }
  ],
  quizErgebnisse: [
    { ab: 0, text: 'Hmm. Wir müssen dringend mehr Zeit zusammen verbringen. Ich hätte da Ideen.' },
    { ab: 3, text: 'Gar nicht schlecht! Du kennst uns ziemlich gut.' },
    { ab: 5, text: 'Volle Punktzahl. Du kennst uns besser als jeder andere Mensch im Universum.' }
  ],

  rubbellos: [
    'Ein Abend Kochen von mir',
    'Eine Massage, so lange du willst',
    'Ein Date nach deiner Wahl',
    'Frühstück ans Bett'
  ],

  gluecksrad: [
    'Kinoabend',
    'Lieblingsessen',
    '10 Küsse',
    'Spaziergang bei Sonnenuntergang',
    'Ein Tag ohne Abwasch',
    'Überraschungsdate',
    'Kuscheltag',
    'Wunsch frei'
  ],

  geheimnis: {
    frage: 'Wie heißt das Restaurant von unserem ersten Date?',   // Hinweis-Frage, die nur sie beantworten kann
    passwort: ['liebe'],                                          // eine oder mehrere erlaubte Antworten (Groß-/Kleinschreibung egal)
    titel: 'Du hast es geschafft',
    text: 'Das hier ist nur für dich: Ich bin so dankbar, dass du in mein Leben gekommen bist. Mit dir fühlt sich alles leichter an, und ich freu mich auf jedes Abenteuer, das noch kommt.',
    foto: 'foto-24.webp'
  },

  /* ---------- Zeitstrahl ---------- */
  zeitstrahl: [
    { datum: '24. Dezember 2025', titel: 'Der Anfang', text: 'An Heiligabend hat alles angefangen. Das schönste Geschenk, das ich je bekommen habe, war kein Paket.', foto: 'foto-53.webp' },
    { datum: 'Sommer', titel: 'Unser Urlaub am Meer', text: 'Sonne, Meer, viel zu viele Fotos und ein Schrei unter Palmen.', foto: 'foto-31.webp' },
    { datum: 'Sommer', titel: 'Easy Rider', text: 'Mit Helm, Sonnenbrille und dir hintendrauf sieht jede Straße nach Abenteuer aus.', foto: 'foto-15.webp' },
    { datum: 'Sommer', titel: 'Blaue Stunde', text: 'Einer dieser Abende, die man nie vergisst.', foto: 'foto-40.webp' },
    { datum: 'Heute', titel: 'Dein Geburtstag', text: 'Alles Gute, mein Schatz. Das hier ist erst der Anfang von allem, was noch kommt.', foto: 'foto-37.webp' }
  ],

  /* ---------- Gründe, warum ich dich liebe (Planet "Gründe") ---------- */
  gruende: [
    'Wie du lachst, wenn du eigentlich ernst bleiben willst.',
    'Dass du mich manchmal besser kennst als ich mich selbst.',
    'Wie ruhig alles wird, wenn du neben mir bist.',
    'Dass du aus einem normalen Dienstag ein kleines Abenteuer machst.',
    'Dass du auch meine komischen Seiten magst.',
    'Deine Umarmungen. Die besten im bekannten Universum.',
    'Wie sehr du dich über Kleinigkeiten freuen kannst.',
    'Dass sich überall wie Zuhause anfühlt, wo du bist.',
    'Dein Lachen um zwei Uhr nachts.',
    'Dass ich mit dir über alles reden und auch einfach schweigen kann.',
    'Wie du mich anschaust, wenn du denkst, ich merk es nicht.',
    'Dass du mutiger bist, als du glaubst.',
    'Dass kein Spielplatz vor dir sicher ist.',
    'Deine Hand in meiner.',
    'Dass mit dir sogar Warten Spaß macht.',
    'Einfach du. Ganz und gar du.'
  ],

  /* ---------- Finaler Liebesbrief (wird frei, wenn alle Spiele geschafft sind) ---------- */
  liebesbrief: {
    anrede: 'Alles Gute zum Geburtstag, mein Schatz,',
    absaetze: [
      'du hast jedes Spiel in dieser kleinen Galaxie geschafft. Natürlich hast du das.',
      'Seit dem 24. Dezember ist mein Leben heller, lauter, wärmer und viel lustiger. Du bist das schönste Geschenk, das ich je bekommen habe, und heute ist der Tag, an dem ich dir etwas zurückgeben will.',
      'Danke für jedes Lachen, jede Umarmung, jedes alberne Foto und jeden ruhigen Moment. Ich wünsche dir ein neues Lebensjahr voller Abenteuer, Sonne, Meer und ganz viel uns.',
      'Ich liebe dich. Heute, morgen und bis zum Ende dieser Galaxie.'
    ],
    gruss: 'Für immer dein',
    foto: 'foto-37.webp'
  },

  /* ---------- Easter Eggs ---------- */
  easterEggs: {
    codewort: 'liebe',               // dieses Wort auf der Tastatur tippen
    herz: 'Goldenes Herz entdeckt! Du hast mein Herz fünfmal angetippt. Es gehört eh schon dir.',
    sternschnuppe: 'Sternschnuppe gefangen! Du darfst dir etwas wünschen. Sag es mir einfach.',
    schwarzesLoch: 'Vorsicht, Spaghettifizierung! Zum Glück zieht mich nur eine Sache so stark an: du.',
    konami: 'Cheat-Code aktiviert: unendlich viele Küsse freigeschaltet.',
    wort: 'Du hast das geheime Wort gefunden. Ich dich auch.'
  }
};
