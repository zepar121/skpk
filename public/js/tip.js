/*
 * Tooltip cepat (dari To-Be): semua keterangan tetap ditulis di atribut title. Saat pertama di-hover, title dipindah ke
 * data-tip supaya tooltip bawaan peramban tidak dobel; tooltip tampil ±350 ms (langsung bila tooltip lain baru saja tampil)
 * dan juga saat fokus keyboard. Tidak tampil di mode komentar.
 */
(function () {
  'use strict';

  const tip = document.createElement('div');
  tip.id = 'tip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.appendChild(tip);

  let tipEl = null, jeda = 0, terakhir = 0;
  function sasaran(t) {
    const el = t && t.closest ? t.closest('[title], [data-tip]') : null;
    if (!el || el.tagName === 'OPTION' || el.tagName === 'SELECT' || document.body.classList.contains('kmt-mode')) return null;
    if (el.hasAttribute('title')) {
      const v = el.getAttribute('title');
      el.removeAttribute('title');
      if (v) {
        el.dataset.tip = v;
        if (!el.hasAttribute('aria-label') && !el.textContent.trim()) el.setAttribute('aria-label', v);
      } else delete el.dataset.tip;
    }
    return el.dataset.tip ? el : null;
  }
  function tampil(el) {
    tip.textContent = el.dataset.tip;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth, h = tip.offsetHeight;
    const x = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8));
    const y = r.bottom + 6 + h > innerHeight - 8 ? r.top - h - 6 : r.bottom + 6;
    tip.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    tip.classList.add('tampil');
  }
  function sembunyi() {
    clearTimeout(jeda);
    if (!tip.hidden) terakhir = Date.now();
    tipEl = null;
    tip.hidden = true;
    tip.classList.remove('tampil');
  }
  function arahkan(el) {
    if (el === tipEl) return;
    sembunyi();
    if (!el) return;
    tipEl = el;
    jeda = setTimeout(() => { if (tipEl === el && el.isConnected) tampil(el); }, Date.now() - terakhir < 400 ? 0 : 350);
  }
  document.addEventListener('mouseover', e => arahkan(sasaran(e.target)));
  document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches(':focus-visible')) arahkan(sasaran(e.target)); });
  document.addEventListener('focusout', sembunyi);
  document.addEventListener('mousedown', sembunyi, true);
  document.addEventListener('scroll', sembunyi, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' || !tip.hidden) sembunyi(); }, true);
})();
