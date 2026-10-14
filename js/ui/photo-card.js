import { photoUrl, thumbUrl } from '../core/utils.js';

/** Big photo card with title and text. Close with X, Escape or a tap next to it. Swipe or arrows to browse. */
export class PhotoCard {
  constructor({ photos, onOpen, onClose }) {
    this.photos = photos;
    this.root = document.getElementById('photoCard');
    this.img = document.getElementById('pcImg');
    this.title = document.getElementById('pcTitle');
    this.text = document.getElementById('pcText');
    this.idx = document.getElementById('pcIndex');
    this.onOpen = onOpen; this.onClose = onClose;
    this.isOpen = false; this.i = 0;
    this.root.querySelector('.ov-close').addEventListener('click', () => this.close());
    document.getElementById('pcPrev').addEventListener('click', () => this.show(this.i - 1));
    document.getElementById('pcNext').addEventListener('click', () => this.show(this.i + 1));
    this.root.addEventListener('pointerdown', e => { this.downBg = e.target === this.root || e.target.classList.contains('ov-backdrop'); this.sx = e.clientX; });
    this.root.addEventListener('pointerup', e => {
      if (this.downBg && (e.target === this.root || e.target.classList.contains('ov-backdrop'))) { this.close(); return; }
      const dx = e.clientX - this.sx;
      if (Math.abs(dx) > 60 && e.target.closest('.pc-img')) this.show(this.i + (dx < 0 ? 1 : -1));
    });
    window.addEventListener('keydown', e => {
      if (!this.isOpen) return;
      if (e.key === 'Escape') this.close();
      if (e.key === 'ArrowRight') this.show(this.i + 1);
      if (e.key === 'ArrowLeft') this.show(this.i - 1);
    });
  }

  open(i) {
    this.root.hidden = false;
    this.root.classList.remove('closing');
    this.isOpen = true;
    document.body.classList.add('overlay-open');
    this.show(i);
    this.onOpen && this.onOpen();
  }

  show(i) {
    const n = this.photos.length;
    this.i = (i + n) % n;
    const p = this.photos[this.i];
    this.img.classList.remove('loaded');
    this.img.alt = p.titel || '';
    // show the thumbnail instantly, then swap in the big version
    this.img.src = thumbUrl(p.datei);
    this.img.classList.add('loaded');
    const big = new Image();
    big.onload = () => { if (this.photos[this.i] === p) this.img.src = big.src; };
    big.src = photoUrl(p.datei);
    this.title.textContent = p.titel || '';
    this.text.textContent = p.text || '';
    this.idx.textContent = `${this.i + 1} / ${n}`;
  }

  close() {
    if (!this.isOpen) return;
    this.root.classList.add('closing');
    setTimeout(() => {
      this.root.hidden = true; this.root.classList.remove('closing');
      this.isOpen = false;
      document.body.classList.remove('overlay-open');
      this.onClose && this.onClose();
    }, 300);
  }
}
