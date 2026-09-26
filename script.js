document.getElementById('year').textContent = new Date().getFullYear();

// header scroll state + progress bar
const header = document.getElementById('siteHeader');
const progressBar = document.getElementById('progressBar');

function onScroll() {
  const scrollY = window.scrollY;
  header.classList.toggle('scrolled', scrollY > 40);

  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
  progressBar.style.width = pct + '%';
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// mobile nav
const navToggle = document.getElementById('navToggle');
const nav = document.getElementById('nav');
navToggle.addEventListener('click', () => {
  nav.classList.toggle('open');
});
nav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => nav.classList.remove('open'));
});

// shared reveal-on-scroll observer (reused for dynamically added gallery items)
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ---------- Gallery (masonry + lightbox) ----------
const TOTAL_PHOTOS = 108;
const PAGE_SIZE = 24;

const photos = Array.from({ length: TOTAL_PHOTOS }, (_, i) => {
  const num = String(i + 1).padStart(3, '0');
  return { src: `assets/img/gallery/full-${num}.jpg`, alt: `Ana Campos — atendimento e bastidores ${i + 1}` };
});

const masonry = document.getElementById('galleryMasonry');
const galleryCount = document.getElementById('galleryCount');
const loadMoreBtn = document.getElementById('galleryMore');

let renderedCount = 0;

function renderNextPage() {
  const next = photos.slice(renderedCount, renderedCount + PAGE_SIZE);
  const frag = document.createDocumentFragment();

  next.forEach((photo, i) => {
    const globalIndex = renderedCount + i;
    const item = document.createElement('figure');
    item.className = 'gallery-item reveal';
    item.dataset.index = String(globalIndex);
    item.innerHTML = `
      <img src="${photo.src}" alt="${photo.alt}" loading="lazy" decoding="async">
      <div class="gallery-item-overlay">
        <span class="gallery-item-expand" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6"/>
          </svg>
        </span>
      </div>
    `;
    item.addEventListener('click', () => openLightbox(globalIndex));
    revealObserver.observe(item);
    frag.appendChild(item);
  });

  masonry.appendChild(frag);
  renderedCount += next.length;
  galleryCount.textContent = String(renderedCount);
  loadMoreBtn.hidden = renderedCount >= photos.length;
}

loadMoreBtn.addEventListener('click', renderNextPage);
renderNextPage();

// ---------- Lightbox ----------
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCount = document.getElementById('lightboxCount');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');

let currentIndex = 0;

function openLightbox(index) {
  currentIndex = index;
  updateLightbox();
  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('is-open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function updateLightbox() {
  const photo = photos[currentIndex];
  lightboxImg.src = photo.src;
  lightboxImg.alt = photo.alt;
  lightboxCount.textContent = `${currentIndex + 1} / ${photos.length}`;
}

function showPrev() {
  currentIndex = (currentIndex - 1 + photos.length) % photos.length;
  updateLightbox();
}

function showNext() {
  currentIndex = (currentIndex + 1) % photos.length;
  updateLightbox();
}

lightboxClose.addEventListener('click', closeLightbox);
lightboxPrev.addEventListener('click', showPrev);
lightboxNext.addEventListener('click', showNext);

lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('is-open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') showPrev();
  if (e.key === 'ArrowRight') showNext();
});
