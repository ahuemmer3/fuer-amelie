"""
Fotos fuer die Webseite vorbereiten.

Benutzung (im Projektordner):
    python tools/fotos-optimieren.py  "C:/Pfad/zu/deinen/fotos"

Was passiert:
  - Bilder werden richtig gedreht (iPhone-Ausrichtung)
  - alle Metadaten (auch GPS-Standort!) werden entfernt
  - assets/photos/foto-01.webp ...        max. 1600 px, fuer grosse Ansichten
  - assets/photos/thumbs/foto-01.webp ... 512 px quadratisch, fuer Galaxie und Memory
  - Reihenfolge nach Aufnahmedatum (falls vorhanden), sonst nach Dateiname

Danach in config.js bei "fotos" die Ueberschriften und Texte anpassen.
Benoetigt: pip install pillow
"""
import sys
from pathlib import Path

from PIL import Image, ImageOps

EXTS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_SIDE = 1600
THUMB = 512
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "photos"
OUT_THUMB = OUT / "thumbs"


def taken_at(path: Path) -> str:
    try:
        with Image.open(path) as im:
            exif = im.getexif()
            value = exif.get_ifd(0x8769).get(36867) or exif.get(306)
            if value:
                return str(value)
    except Exception:
        pass
    return ""


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    src = Path(sys.argv[1])
    files = [p for p in src.iterdir() if p.suffix.lower() in EXTS]
    files.sort(key=lambda p: (taken_at(p) or "9999", p.name.lower()))
    OUT.mkdir(parents=True, exist_ok=True)
    OUT_THUMB.mkdir(parents=True, exist_ok=True)

    for i, path in enumerate(files, 1):
        name = f"foto-{i:02d}.webp"
        with Image.open(path) as im:
            im = ImageOps.exif_transpose(im).convert("RGB")
            big = im.copy()
            big.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
            big.save(OUT / name, "WEBP", quality=80, method=6)
            # Gesichter sitzen meist im oberen Drittel, daher etwas hoeher zuschneiden
            thumb = ImageOps.fit(im, (THUMB, THUMB), Image.LANCZOS, centering=(0.5, 0.38))
            thumb.save(OUT_THUMB / name, "WEBP", quality=78, method=6)
        date = taken_at(path)[:10].replace(":", "-") or "unbekannt"
        print(f"{name}  <-  {path.name:45s}  {date}  {big.width}x{big.height}")

    print(f"\n{len(files)} Fotos gespeichert in {OUT}")


if __name__ == "__main__":
    main()
