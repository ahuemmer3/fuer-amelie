/** Glass overlay that hosts games and surprises. */
export class Overlay {
  constructor({ onOpen, onClose } = {}) {
    this.root = document.getElementById('overlay');
    this.body = document.getElementById('ovBody');
    this.titleEl = document.getElementById('ovTitle');
    this.kickerEl = document.getElementById('ovKicker');
    this.onOpen = onOpen; this.onClose = onClose;
    this.cleanup = null; this.isOpen = false; this.closing = false;
    this.root.querySelector('.ov-close').addEventListener('click', () => this.close());
    let downOnBackdrop = false;
    this.root.addEventListener('pointerdown', e => { downOnBackdrop = e.target === this.root || e.target.classList.contains('ov-backdrop'); });
    this.root.addEventListener('pointerup', e => {
      if (downOnBackdrop && (e.target === this.root || e.target.classList.contains('ov-backdrop'))) this.close();
      downOnBackdrop = false;
    });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && this.isOpen) this.close(); });
  }

  open({ id, title, kicker = '', live = false, render, api }) {
    if (this.isOpen) this.close(true);
    this.id = id;
    this.titleEl.textContent = title;
    this.kickerEl.textContent = kicker;
    this.body.innerHTML = '';
    this.body.scrollTop = 0;
    this.root.classList.toggle('live', live);
    this.root.classList.remove('closing');
    this.root.hidden = false;
    this.isOpen = true; this.live = live;
    document.body.classList.add('overlay-open');
    try { this.cleanup = render(this.body, api) || null; } catch (err) { console.error(err); this.body.textContent = 'Hier ist leider etwas schiefgegangen.'; }
    this.onOpen && this.onOpen(id);
    setTimeout(() => this.root.querySelector('.ov-close').focus({ preventScroll: true }), 80);
  }

  close(immediate = false) {
    if (!this.isOpen || this.closing) return;
    const finish = () => {
      if (this.cleanup) { try { this.cleanup(); } catch (e) { console.error(e); } }
      this.cleanup = null;
      this.root.hidden = true;
      this.root.classList.remove('closing');
      this.body.innerHTML = '';
      this.isOpen = false; this.closing = false;
      document.body.classList.remove('overlay-open');
      const id = this.id; this.id = null;
      this.onClose && this.onClose(id);
    };
    if (immediate) { finish(); return; }
    this.closing = true;
    this.root.classList.add('closing');
    setTimeout(finish, 300);
  }
}
