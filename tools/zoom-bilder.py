"""
Luftbilder fuer den Zoom von der Erde bis auf euer Dach erstellen.

Benutzung (im Projektordner):
    python tools/zoom-bilder.py 49.8038829 11.4718935
    python tools/zoom-bilder.py 49.8038829 11.4718935 --ohne-download   (nur neu rechnen)

Was passiert:
  - 9 quadratische Ausschnitte um den Punkt werden geladen (Web-Mercator, Norden oben):
      z1-z5  Europa bis Ortsgegend: EOxCloudless 2024 (Sentinel-2), CC BY-NC-SA 4.0
      z6-z9  Dorf bis Hausdach: Digitale Orthophotos 20 cm der Bayerischen
             Vermessungsverwaltung, CC BY 4.0 (gibt es nur fuer Bayern!)
  - jede Stufe wird auf 1024 px gerechnet und an den Raendern farblich an die
    groebere Stufe angeglichen (keine sichtbaren Kanten beim Ueberblenden)
  - Ergebnis: assets/zoom/z1.webp ... z9.webp (zusammen ca. 2 MB)

Danach in config.js bei "zuhause" dieselben Koordinaten eintragen.
Die Rohdaten landen in tools/zoom-rohdaten/ (nicht im Git).
Benoetigt: pip install pillow numpy  und  curl (ist in Windows 10/11 enthalten)
"""
import math
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "tools" / "zoom-rohdaten"
OUT = ROOT / "assets" / "zoom"
R = 6378137.0
N = 1024
UA = "fuer-amelie-zoom/1.0"
EOX = "https://tiles.maps.eox.at/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=s2cloudless-2024_3857&STYLES=&SRS=EPSG:3857"
BY = "https://geoservices.bayern.de/od/wms/dop/v1/dop20?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=by_dop20c&STYLES=&SRS=EPSG:3857"
# Name, halbe Breite am Boden (m), Quelle. Muss zu ZOOM_LEVELS in js/scene/earth.js passen.
LEVELS = [("z1", 1250e3, EOX), ("z2", 320e3, EOX), ("z3", 80e3, EOX), ("z4", 20e3, EOX), ("z5", 5e3, EOX),
          ("z6", 1250, BY), ("z7", 410, BY), ("z8", 205, BY), ("z9", 102.5, BY)]


def download(url, dst):
    """curl nutzt den Zertifikatsspeicher von Windows (Pythons eigener ist manchmal veraltet)"""
    subprocess.run(["curl", "-s", "-S", "-f", "-m", "240", "-A", UA, "-o", str(dst), url], check=True)
    if dst.stat().st_size < 20000:
        raise SystemExit(f"{dst.name}: Antwort zu klein, ist der Ort ausserhalb des Kartendienstes?")


def lowpass(a, cells=32):
    h, w, c = a.shape
    s = a.reshape(cells, h // cells, cells, w // cells, c).mean(axis=(1, 3))
    return np.stack([np.asarray(Image.fromarray(s[..., k].astype(np.float32), "F").resize((w, h), Image.BICUBIC)) for k in range(c)], -1)


def globe_parent(lat, lon, half):
    """die Erdkarte (Globus) im Ausschnitt von z1, als Farbvorlage fuer dessen Raender"""
    g = np.asarray(Image.open(ROOT / "assets" / "textures" / "earth.webp").convert("RGB"), np.float32)
    gh, gw, _ = g.shape
    m = 128
    x0 = R * math.radians(lon)
    y0 = R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    h = half / math.cos(math.radians(lat))
    j = (np.arange(m) + .5) / m
    lons = np.degrees((x0 - h + j * 2 * h) / R)[None, :].repeat(m, 0)
    lats = np.degrees(2 * np.arctan(np.exp((y0 + h - j * 2 * h) / R)) - math.pi / 2)[:, None].repeat(m, 1)
    u = ((lons + 180) / 360 * gw).astype(int) % gw
    v = np.clip(((90 - lats) / 180 * gh).astype(int), 0, gh - 1)
    small = g[v, u]
    return np.stack([np.asarray(Image.fromarray(small[..., k], "F").resize((N, N), Image.BICUBIC)) for k in range(3)], -1)


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    lat, lon = float(sys.argv[1].replace(",", ".")), float(sys.argv[2].replace(",", "."))
    RAW.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    x0 = R * math.radians(lon)
    y0 = R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    k = 1 / math.cos(math.radians(lat))

    for name, half, src in LEVELS:
        if "--ohne-download" in sys.argv:
            break
        h = half * k
        url = f"{src}&BBOX={x0 - h:.3f},{y0 - h:.3f},{x0 + h:.3f},{y0 + h:.3f}&WIDTH=2048&HEIGHT=2048&FORMAT=image/jpeg"
        dst = RAW / f"{name}.jpg"
        print(f"lade {name} ({2 * half / 1000:g} km breit) ...")
        download(url, dst)
        time.sleep(1)

    yy, xx = np.mgrid[0:N, 0:N]
    rinf = np.maximum(np.abs((xx + .5) / N - .5), np.abs((yy + .5) / N - .5))
    t = np.clip((rinf - .2) / (.48 - .2), 0, 1)
    edge = (t * t * (3 - 2 * t))[..., None]
    prev = None
    for name, half, _ in LEVELS:
        a = np.asarray(Image.open(RAW / f"{name}.jpg").convert("RGB").resize((N, N), Image.LANCZOS), np.float32)
        if prev is None:
            parent = globe_parent(lat, lon, half)
        else:
            phalf, pimg = prev
            f = half / phalf
            c = N / 2
            parent = np.asarray(pimg.resize((N, N), Image.BICUBIC, box=(c - f * c, c - f * c, c + f * c, c + f * c)), np.float32)
        a = np.clip(a + edge * (lowpass(parent) - lowpass(a)), 0, 255)
        img = Image.fromarray(a.round().astype(np.uint8), "RGB")
        img.save(OUT / f"{name}.webp", "WEBP", quality=80, method=6)
        print(f"  assets/zoom/{name}.webp  {(OUT / f'{name}.webp').stat().st_size // 1024} KB")
        prev = (half, img)
    print(f"\nFertig. Jetzt in config.js bei zuhause eintragen:  breite: {lat}, laenge: {lon}")


if __name__ == "__main__":
    main()
