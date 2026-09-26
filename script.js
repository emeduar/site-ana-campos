document.getElementById('year').textContent = new Date().getFullYear();

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Header, progress bar ----------
const header = document.getElementById('siteHeader');
const progressBar = document.getElementById('progressBar');

function onScroll() {
  const y = window.scrollY;
  header.classList.toggle('scrolled', y > 30);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ---------- Mobile nav ----------
const navToggle = document.getElementById('navToggle');
const nav = document.getElementById('nav');

function setNav(open) {
  nav.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
}
navToggle.addEventListener('click', () => setNav(!nav.classList.contains('open')));
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setNav(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setNav(false); });

// ---------- Active nav link ----------
const navLinks = [...nav.querySelectorAll('a[href^="#"]')];
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + entry.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
navLinks.forEach(a => {
  const s = document.querySelector(a.getAttribute('href'));
  if (s) sectionObserver.observe(s);
});

// ---------- Reveal on scroll ----------
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ---------- WhatsApp FAB: hide while the contact section is on screen ----------
const fab = document.querySelector('.whatsapp-fab');
new IntersectionObserver(([entry]) => {
  fab.classList.toggle('is-hidden', entry.isIntersecting);
}, { threshold: 0.3 }).observe(document.getElementById('contato'));

// ---------- Treatment preview following the cursor (desktop only) ----------
const preview = document.getElementById('treatmentPreview');
const previewImg = preview.querySelector('img');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (finePointer && !reduceMotion) {
  let targetX = 0, targetY = 0, x = 0, y = 0, raf = null;
  const follow = () => {
    x += (targetX - x) * 0.18;
    y += (targetY - y) * 0.18;
    preview.style.left = x + 'px';
    preview.style.top = y + 'px';
    raf = requestAnimationFrame(follow);
  };
  document.querySelectorAll('.treatment-list a').forEach(link => {
    link.addEventListener('mouseenter', e => {
      previewImg.src = link.dataset.preview;
      x = targetX = e.clientX + 140;
      y = targetY = e.clientY;
      preview.classList.add('is-visible');
      if (!raf) raf = requestAnimationFrame(follow);
    });
    link.addEventListener('mousemove', e => { targetX = e.clientX + 140; targetY = e.clientY; });
    link.addEventListener('mouseleave', () => {
      preview.classList.remove('is-visible');
      cancelAnimationFrame(raf);
      raf = null;
    });
  });
}

// ---------- Gallery ----------
const CATEGORY_LABEL = { atendimento: 'Atendimento', retrato: 'Retrato', editorial: 'Editorial' };
const masonry = document.getElementById('galleryMasonry');
let photos = [];

function buildGallery(list) {
  photos = list.map(p => ({
    ...p,
    thumb: `assets/img/g/${p.name}-sm.webp`,
    full: `assets/img/g/${p.name}.webp`,
    alt: `Ana Campos — ${CATEGORY_LABEL[p.cat].toLowerCase()}`,
  }));

  const frag = document.createDocumentFragment();
  photos.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.className = 'gallery-item';
    btn.type = 'button';
    btn.dataset.cat = p.cat;
    btn.setAttribute('aria-label', `Ampliar foto ${i + 1}: ${CATEGORY_LABEL[p.cat]}`);

    const img = document.createElement('img');
    img.src = p.thumb;
    img.alt = p.alt;
    img.width = p.w;
    img.height = p.h;
    img.loading = 'lazy';
    img.decoding = 'async';

    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = CATEGORY_LABEL[p.cat];

    btn.append(img, tag);
    btn.addEventListener('click', () => openLightbox(i));
    revealObserver.observe(btn);
    frag.appendChild(btn);
  });
  masonry.appendChild(frag);
}

fetch('assets/img/g/manifest.json')
  .then(r => r.json())
  .then(list => {
    // interleave categories so the default view feels varied
    const byCat = {};
    list.forEach(p => (byCat[p.cat] ||= []).push(p));
    const mixed = [];
    const cats = Object.keys(byCat);
    while (cats.some(c => byCat[c].length)) cats.forEach(c => byCat[c].length && mixed.push(byCat[c].shift()));
    buildGallery(mixed);
  });

document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const filter = chip.dataset.filter;
    document.querySelectorAll('.filter-chip').forEach(c => {
      const active = c === chip;
      c.classList.toggle('is-active', active);
      c.setAttribute('aria-pressed', String(active));
    });
    masonry.querySelectorAll('.gallery-item').forEach(item => {
      item.classList.toggle('is-hidden', filter !== 'all' && item.dataset.cat !== filter);
    });
  });
});

// ---------- Lightbox (navigates only the photos currently shown) ----------
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCount = document.getElementById('lightboxCount');
let visibleIdx = [];
let pos = 0;
let lastFocus = null;

function openLightbox(photoIndex) {
  visibleIdx = [...masonry.querySelectorAll('.gallery-item')]
    .map((el, i) => (el.classList.contains('is-hidden') ? -1 : i))
    .filter(i => i >= 0);
  pos = visibleIdx.indexOf(photoIndex);
  lastFocus = document.activeElement;
  render();
  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  document.getElementById('lightboxClose').focus();
}

function closeLightbox() {
  lightbox.classList.remove('is-open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (lastFocus) lastFocus.focus();
}

function render() {
  const p = photos[visibleIdx[pos]];
  lightboxImg.src = p.full;
  lightboxImg.alt = p.alt;
  lightboxCount.textContent = `${pos + 1} / ${visibleIdx.length}`;
}

function step(d) {
  pos = (pos + d + visibleIdx.length) % visibleIdx.length;
  render();
}

document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
document.getElementById('lightboxPrev').addEventListener('click', () => step(-1));
document.getElementById('lightboxNext').addEventListener('click', () => step(1));
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('is-open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') step(-1);
  if (e.key === 'ArrowRight') step(1);
});

let touchX = null;
lightbox.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
lightbox.addEventListener('touchend', e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  touchX = null;
});

// ---------- Testimonials ----------
const quotes = [...document.querySelectorAll('.quote')];
const dotsWrap = document.getElementById('quoteDots');
let q = 0;
let quoteTimer = null;

const dots = quotes.map((_, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('role', 'tab');
  b.setAttribute('aria-label', `Depoimento ${i + 1}`);
  b.setAttribute('aria-selected', String(i === 0));
  b.addEventListener('click', () => { showQuote(i); restartQuotes(); });
  dotsWrap.appendChild(b);
  return b;
});

function showQuote(i) {
  quotes[q].classList.remove('is-active');
  dots[q].setAttribute('aria-selected', 'false');
  q = i;
  quotes[q].classList.add('is-active');
  dots[q].setAttribute('aria-selected', 'true');
}

function restartQuotes() {
  clearInterval(quoteTimer);
  if (!reduceMotion) quoteTimer = setInterval(() => showQuote((q + 1) % quotes.length), 6000);
}
const stage = document.getElementById('quoteStage');
stage.addEventListener('mouseenter', () => clearInterval(quoteTimer));
stage.addEventListener('mouseleave', restartQuotes);
restartQuotes();
