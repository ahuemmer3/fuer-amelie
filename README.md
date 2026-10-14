# Galaxie der Liebe ♥

Eine interaktive 3D-Webseite als Geschenk: Startkarte, Warp-Flug, eine Galaxie mit
schwarzem Loch und Partikelherz, kreisende Fotos, 11 Spiele, Überraschungen und ein
finaler Liebesbrief mit Feuerwerk. Läuft am iPhone und am Laptop, ganz ohne Build-Tool.

---

## 1. Inhalte anpassen

**Alles Persönliche steht in [`config.js`](config.js).** Ändere nur die Texte zwischen den
Anführungszeichen `'...'`. Kommas und Klammern bitte stehen lassen.

| Was | Wo in `config.js` |
|---|---|
| Ihr Name (taucht in Texten auf, ist auch ein Easter-Egg-Codewort) | `ihrName` |
| Deine Unterschrift | `deinName` |
| **Euer Startdatum für den Zähler** | `zusammenSeit: '2025-06-14'` |
| Initialen fürs Sternbild-Spiel | `initialen: ['A', 'L']` |
| Startkarte (Titel, Untertitel, Datum, Button) | `karte` |
| Großer Schriftzug | `titel` |
| Farben | `farben` |
| Musik | `musik.datei` |
| Liebesbotschaften auf den Ringen | `botschaften` |
| Fotos mit Überschrift und Text | `fotos` |
| Memory-Fotos, Puzzle-Foto | `memoryFotos`, `puzzleFoto` |
| Quizfragen und Ergebnis-Texte | `quiz`, `quizErgebnisse` |
| Gutscheine | `rubbellos`, `gluecksrad`, `herzenFangen.belohnung` |
| Passwort-Frage und Antwort | `geheimnis` |
| Zeitstrahl | `zeitstrahl` |
| Gründe, warum du sie liebst | `gruende` |
| Finaler Liebesbrief | `liebesbrief` |
| Easter-Egg-Texte | `easterEggs` |

> **Unbedingt vor dem Verschicken anpassen:**
> - `zusammenSeit`: Ohne Datum fragt der Zähler sie danach.
> - `geheimnis.frage` und `geheimnis.passwort`: Der Platzhalter ist „liebe“.
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
`geheimnis.foto` und `liebesbrief.foto` eintragen. Die ersten Fotos der Liste kreisen in
der Galaxie: am Laptop 16, am Handy 9–12.

### Musik

Lege eine MP3 in `assets/music/` (Dateiname klein, ohne Leerzeichen, z. B. `unser-lied.mp3`)
und trage sie ein: `musik: { datei: './assets/music/unser-lied.mp3', lautstaerke: 0.7 }`.
Ohne MP3 spielt automatisch eine sanfte, erzeugte Klangfläche. Die Musik startet mit
dem Tippen auf „Öffnen“, denn Browser erlauben keinen automatischen Ton.

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

WhatsApp braucht für das Vorschaubild eine **vollständige Adresse**. Ersetze nach dem
Veröffentlichen in `index.html` diese Zeile:

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
  Seite ist für Suchmaschinen auf `noindex` gestellt, aber das ist kein Passwortschutz. Das
  Passwort fürs Geheimfach steht lesbar in `config.js`. Nimm also nur Fotos, mit denen ihr
  beide einverstanden seid.
- **Fortschritt** (erledigte Spiele, Wünsche, Easter Eggs) speichert ihr Browser lokal.
  Auf einem anderen Gerät beginnt sie von vorn.
- **Leistung:** Die Seite erkennt das Gerät (Laptop: ca. 170.000 Galaxie-Partikel,
  iPhone: ca. 100.000). Sinkt die Bildrate unter 50 FPS, senkt sie die Qualität
  automatisch, um flüssig zu bleiben.
- **Neigen am iPhone:** Beim Tippen auf „Öffnen“ fragt Safari, ob die Seite die
  Bewegungssensoren nutzen darf. Mit „Erlauben“ bewegt sich die Galaxie leicht mit.

### Easter Eggs (Spoiler, nur für dich)

1. Fünfmal schnell auf das Herz tippen: Es wird golden und es regnet Herzen.
2. Eine Sternschnuppe antippen.
3. Lange auf das schwarze Loch drücken: Das Herz wird hineingezogen.
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
js/scene/             Galaxie, schwarzes Loch, Herz, Ringe, Fotos, Planeten, Feuerwerk …
js/intro/             Karte → Partikel, Warp-Tunnel
js/ui/                Overlay, Foto-Karte, Hinweise, Konfetti
js/games/             ein Modul pro Spiel
js/pages/             Zähler, Zeitstrahl, Gründe, Liebesbrief
assets/               Fotos (WebP), Musik, Vorschaubild, Icons
tools/                Foto-Optimierer und Playwright-Tests (für die Seite nicht nötig)
```

Technik: Three.js 0.186 über eine Importmap (jsDelivr), eigene GLSL-Shader für alle
Partikel, EffectComposer mit UnrealBloom, ACES-Tonemapping, Vignette und Filmkorn.
