# Galaxie der Liebe ♥

**Live:** <https://ahuemmer3.github.io/fuer-amelie/>

Eine interaktive 3D-Webseite als Geschenk: Startkarte, ein Intro-Film (Blick von oben aufs
Sonnensystem, dann fliegt ihr zwei als animierte Figuren im eigenen Raumschiff an Saturn, Jupiter
und Mars vorbei zur Erde und zoomt bis auf euer Hausdach), eine Galaxie mit der Erde in der Mitte
und einem Partikelherz darüber, kreisende Fotos, 5 aufwendige Spiele, Überraschungen und ein
finaler Liebesbrief mit Feuerwerk. Läuft am iPhone und am Laptop, ganz ohne Build-Tool.

---

## 1. Inhalte anpassen

**Alles Persönliche steht in [`config.js`](config.js).** Ändere nur die Texte zwischen den
Anführungszeichen `'...'`. Kommas und Klammern bitte stehen lassen.

> **Testmodus:** Ganz oben in `config.js` steht `testModus: true`. Dann wird der Spielstand bei
> jedem Laden der Seite zurückgesetzt, praktisch zum Ausprobieren. **Bevor du Amelie den Link
> schickst: auf `false` stellen**, sonst verliert sie ihren Fortschritt beim Neuladen. Solange der
> Testmodus an ist, steht oben links ein kleiner gelber Hinweis.

| Was | Wo in `config.js` |
|---|---|
| Ihr Name (taucht in Texten auf, ist auch ein Easter-Egg-Codewort) | `ihrName` |
| Deine Unterschrift | `deinName` |
| **Euer Startdatum für den Zähler** | `zusammenSeit: '2025-12-24'` |
| Initialen fürs Sternbild-Spiel | `initialen: ['A', 'A']` |
| Startkarte (Titel, Untertitel, Datum, Button) | `karte` |
| Großer Schriftzug (wechselt) | `titel` |
| Texte im Intro-Film (Flug, Sturzflug, Ankunft) | `intro.flug`, `intro.heimweg`, `intro.ankunft` |
| Euer Zuhause: Koordinaten, Beschriftung, Ortsnamen beim Zoom | `zuhause` |
| Geburtstagstorte (Kerzen, Wunsch) | `geburtstag` |
| Farben | `farben` |
| Musik | `musik.datei` |
| Liebesbotschaften auf den Ringen | `botschaften` |
| Fotos mit Überschrift und Text | `fotos` |
| Memory-Fotos | `memoryFotos` |
| Quizfragen und Ergebnis-Texte | `quiz`, `quizErgebnisse` |
| Gutscheine | `rubbellos`, `herzenFangen.belohnung` |
| Zeitstrahl | `zeitstrahl` |
| Gründe, warum du sie liebst | `gruende` |
| Finaler Liebesbrief | `liebesbrief` |
| Easter-Egg-Texte | `easterEggs` |

> **Unbedingt vor dem Verschicken anpassen:**
> - `zusammenSeit`: Ohne Datum fragt der Zähler sie danach.
> - Die Quiz-Antworten (`richtig` = Nummer der richtigen Antwort, gezählt ab 0).
> - Der erste Eintrag im `zeitstrahl` („Wie alles begann“).

### Fotos austauschen

Die Fotos liegen in `assets/photos/` (groß, max. 1600 px) und `assets/photos/thumbs/`
(klein und quadratisch für Galaxie und Memory). So bereitest du neue Fotos vor:

```bash
pip install pillow
python tools/fotos-optimieren.py "C:/Pfad/zu/deinen/fotos"
```

Das Skript dreht die Fotos richtig herum und **entfernt GPS-Standort und alle Metadaten**.
Es speichert die Fotos als WebP und gibt eine Liste `foto-01.webp …` aus. Danach die
Dateinamen in `config.js` bei `fotos`, `memoryFotos`, `puzzleFoto`, `zeitstrahl`,
`liebesbrief.foto` eintragen. Die ersten Fotos der Liste kreisen in
der Galaxie: am Laptop 16, am Handy 9–12.

### Musik

Lege eine MP3 in `assets/music/` (Dateiname klein, ohne Leerzeichen, z. B. `unser-lied.mp3`)
und trage sie ein: `musik: { datei: './assets/music/unser-lied.mp3', lautstaerke: 0.7 }`.
Ohne MP3 spielt automatisch eine sanfte, erzeugte Klangfläche. Die Musik startet mit
dem Tippen auf „Öffnen“, denn Browser erlauben keinen automatischen Ton.

### Euer Zuhause (Zoom von der Erde bis aufs Dach)

Am Ende des Intro-Films fliegt euer Raumschiff mit der Kamera über Europa, Deutschland und die
Fränkische Schweiz bis zu eurem Haus in Püttlach und landet dort. Dann fällt ein Herz-Pin mit
„Unser Zuhause“ auf das Haus, das leuchtend umrandet ist. Danach startet das Schiff wieder, kommt
euch winkend entgegen, steigt mit hoch hinaus und fliegt direkt ins Herz eurer Galaxie: Die Party
beginnt. Der Film dauert gut eine Minute, mit Triebwerksgeräusch, Vorbeiflug-Sounds und Wind beim
Sturzflug. Später startet ein Tipp auf die Erde in der Mitte den Zoom noch einmal.

- Koordinaten, Beschriftung, Hausumriss und Ortsnamen stehen in `config.js` bei `zuhause`.
- Die Luftbilder liegen in `assets/zoom/` (9 Stufen, zusammen ca. 1,8 MB) und sind genau für
  diesen Punkt erstellt. Für einen anderen Ort neu erzeugen (Hausdach-Bilder gibt es nur für Bayern):
  ```bash
  pip install pillow numpy
  python tools/zoom-bilder.py 49.8038829 11.4718935
  ```

---

## 2. Lokal testen

Die Seite nutzt JavaScript-Module und funktioniert deshalb **nicht per Doppelklick**
auf `index.html`. Starte einen kleinen Server im Projektordner:

```bash
python -m http.server 8000
```

Dann im Browser <http://localhost:8000> öffnen.

Nützliche Adress-Zusätze zum Testen:

| Zusatz | Wirkung |
|---|---|
| `?reset` | löscht den gespeicherten Fortschritt (vor dem Verschicken einmal aufrufen!) |
| `?skip` | überspringt die Startkarte |
| `?q=low` / `?q=medium` / `?q=high` | erzwingt eine Qualitätsstufe |
| `?debug` | zeigt in der Konsole, wenn die Qualität automatisch gesenkt wird |

Optional gibt es automatische Tests mit Screenshots (Desktop, iPhone, Safari-Engine):

```bash
cd tools
npm install
npx playwright install chromium webkit
node test.mjs            # alle Tests, Screenshots in tools/screenshots/
node test.mjs og         # Vorschaubild assets/og-image.jpg neu erzeugen
```

---

## 3. Auf GitHub hochladen und veröffentlichen

1. Auf <https://github.com/new> ein neues Repository anlegen, z. B. `galaxie-der-liebe`.
   **Ohne** README, .gitignore oder Lizenz, das Repo muss leer sein.
2. Im Projektordner:
   ```bash
   git remote add origin https://github.com/DEINNAME/galaxie-der-liebe.git
   git push -u origin main
   ```
3. Auf GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch →
   Branch: `main` / `/ (root)` → Save**.
4. Nach ein bis zwei Minuten ist die Seite live unter
   `https://DEINNAME.github.io/galaxie-der-liebe/`.

Spätere Änderungen veröffentlichst du so:

```bash
git add -A
git commit -m "Texte angepasst"
git push
```

### Hübsche Link-Vorschau (WhatsApp, iMessage)

Ist bereits auf `https://ahuemmer3.github.io/fuer-amelie/` eingestellt. Falls du das Repo umbenennst oder für eine andere
Adresse nutzt: WhatsApp braucht für das Vorschaubild eine **vollständige Adresse**. Ersetze in `index.html` diese Zeile:

```html
<meta property="og:image" content="./assets/og-image.jpg">
```

durch:

```html
<meta property="og:image" content="https://DEINNAME.github.io/galaxie-der-liebe/assets/og-image.jpg">
```

Danach committen und pushen. WhatsApp speichert Vorschauen eine Weile zwischen. Teste die
Vorschau deshalb am besten erst, wenn alles fertig ist (z. B. indem du dir selbst den Link schickst).

---

## 4. Gut zu wissen

- **Datenschutz:** GitHub Pages ist öffentlich. Jeder, der den Link kennt, kann die Seite und
  die Fotos sehen, und beim kostenlosen GitHub-Plan ist auch das Repository öffentlich. Die
  Seite ist für Suchmaschinen auf `noindex` gestellt, aber das ist kein Passwortschutz. Nimm
  also nur Fotos, mit denen ihr beide einverstanden seid. Das gilt auch für euer Zuhause: Die
  Adresse und die Luftbilder eures Hauses sind über den Link und im Repository sichtbar.
- **Fortschritt** (erledigte Spiele, Wünsche, Easter Eggs) speichert ihr Browser lokal.
  Auf einem anderen Gerät beginnt sie von vorn.
- **Leistung:** Die Seite erkennt das Gerät (Laptop: ca. 170.000 Galaxie-Partikel,
  iPhone: ca. 100.000). Sinkt die Bildrate unter 50 FPS, senkt sie die Qualität
  automatisch, um flüssig zu bleiben.
- **Neigen am iPhone:** Beim Tippen auf „Öffnen“ fragt Safari, ob die Seite die
  Bewegungssensoren nutzen darf. Mit „Erlauben“ bewegt sich die Galaxie leicht mit.

### Der Song „Amelie“

Text, Melodie und Arrangement stehen in [`js/core/songs.js`](js/core/songs.js). Jede Zeile hat das
Format `silbe:NOTE:DAUER`. Du kannst Wörter austauschen, solange jede Zeile gleich viele Silben
behält. Die Musik wird live im Browser erzeugt, es gibt keine Musikdatei.

### Geheime Abkürzungen (nur ihr zwei wisst davon)

- **Alles lösen:** 3 Sekunden auf den Planeten-Zähler unten rechts (z. B. „2/5“) drücken.
  Alle Spiele gelten als geschafft und das letzte Geheimnis (der Brief) öffnet sich.
- **Ein Spiel lösen:** In einem offenen Spiel 2 Sekunden auf die Überschrift drücken.
  Nur dieses Spiel gilt dann als geschafft.
- **Intro überspringen:** Während des Films erscheint unten rechts „Überspringen“. Damit geht es
  direkt zur Überraschungsparty mit Happy Birthday und Song.

### Easter Eggs (Spoiler, nur für dich)

1. Fünfmal schnell auf das Herz tippen: Es wird golden und es regnet Herzen.
2. Eine Sternschnuppe antippen.
3. Auf die Erde in der Mitte tippen: Zoom bis zu eurem Haus.
4. Am Laptop das Codewort aus `config.js` oder ihren Namen tippen.
5. Konami-Code: ↑ ↑ ↓ ↓ ← → ← → B A

---

## Projektaufbau

```
index.html            Einstieg, Meta-Tags, Ladebildschirm
config.js             ALLE Inhalte zum Anpassen
css/style.css         Gestaltung (Glas, Glow, Spiele)
js/main.js            Ablauf, Kamera, Eingaben, Planeten
js/core/              Renderer + Post-Processing, Qualität, Audio, Fortschritt
js/scene/             Galaxie, Erde (Shader mit Zoom bis aufs Dach), Herz, Ringe, Fotos, Planeten, Feuerwerk …
js/intro/             Karte → Partikel, Flug durchs Sonnensystem, Raumschiff mit euch beiden, Zoom zum Haus
js/ui/                Overlay, Foto-Karte, Hinweise, Konfetti
js/games/             ein Modul pro Spiel
js/pages/             Zähler, Zeitstrahl, Gründe, Liebesbrief
assets/               Fotos (WebP), Planetentexturen, Luftbilder für den Zoom, Musik, Vorschaubild, Icons
tools/                Foto-Optimierer, Luftbild-Werkzeug und Playwright-Tests (für die Seite nicht nötig)
```

Technik: Three.js 0.186 über eine Importmap (jsDelivr), eigene GLSL-Shader für alle
Partikel, EffectComposer mit UnrealBloom, ACES-Tonemapping, Vignette und Filmkorn.

---

## Credits

- Planetentexturen (auch die fiktive Eris) und Milchstraße: [Solar System Scope](https://www.solarsystemscope.com/textures/), Lizenz [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Luftbilder Dorf bis Hausdach: [Bayerische Vermessungsverwaltung](https://geodaten.bayern.de), Digitale Orthophotos 20 cm, Lizenz [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Satellitenbilder Europa bis Ortsgegend: [EOxCloudless 2024](https://cloudless.eox.at) von EOX IT Services GmbH, enthält modifizierte Copernicus-Sentinel-Daten 2024, Lizenz [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) (die Ausschnitte in `assets/zoom/z1–z5` stehen unter derselben Lizenz)
- Hausumriss: © [OpenStreetMap](https://www.openstreetmap.org/copyright)-Mitwirkende (ODbL)
- 3D: [three.js](https://threejs.org) (MIT)
- Das Raumschiff und die beiden Figuren sind ein eigener Entwurf (Star-Wars-Stil, keine Kopie), komplett im Code gebaut.
- Alle Musikstücke (Intro, Spielmusik, der Song „Amelie“) sind eigene Kompositionen, die live im Browser erzeugt werden. „Happy Birthday to You“ ist gemeinfrei.
