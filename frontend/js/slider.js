/**
 * PRAMAN Interactive 4-Slide Hero Background Slider
 * Synchronizes background visual scenes & floating product cards across 4 steps:
 * 1. STEP 1 — UNDERSTAND (Requirement extraction)
 * 2. STEP 2 — DISCOVER (Standards matching 94%, 87%, 78%)
 * 3. STEP 3 — REVIEW EVIDENCE (Match rationale & references)
 * 4. STEP 4 — NATIONWIDE COVERAGE (28 States · 8 UTs · 1 Unified Platform)
 */

export function initHeroSlider() {
  const container = document.getElementById('hero-slider-container');
  if (!container) return;

  const slides = container.querySelectorAll('.hero-slide');
  const dots = container.querySelectorAll('.slider-dot');
  const btnPrev = container.querySelector('.slider-arrow-prev');
  const btnNext = container.querySelector('.slider-arrow-next');
  const btnPlayPause = container.querySelector('.slider-play-pause');
  const progressBar = container.querySelector('.slider-progress-fill');
  const eyebrowLabel = document.getElementById('hero-eyebrow-text');

  if (slides.length === 0) return;

  const eyebrowTexts = [
    'STEP 1 — UNDERSTAND',
    'STEP 2 — DISCOVER',
    'STEP 3 — REVIEW EVIDENCE',
    'STEP 4 — NATIONWIDE COVERAGE'
  ];

  let currentIndex = 0;
  let isPlaying = true;
  let timer = null;
  let progressInterval = null;
  const slideDuration = 6500; // 6.5s
  let elapsed = 0;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    isPlaying = false;
    if (btnPlayPause) btnPlayPause.textContent = '▶';
  }

  function goToSlide(index) {
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;

    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });

    if (eyebrowLabel && eyebrowTexts[index]) {
      eyebrowLabel.textContent = eyebrowTexts[index];
    }

    currentIndex = index;
    resetProgress();
  }

  function nextSlide() {
    goToSlide(currentIndex + 1);
  }

  function prevSlide() {
    goToSlide(currentIndex - 1);
  }

  function resetProgress() {
    elapsed = 0;
    if (progressBar) progressBar.style.width = '0%';
  }

  function startAutoplay() {
    if (prefersReducedMotion) return;
    stopAutoplay();

    isPlaying = true;
    if (btnPlayPause) btnPlayPause.textContent = '⏸';

    resetProgress();

    progressInterval = setInterval(() => {
      elapsed += 100;
      const pct = Math.min(100, (elapsed / slideDuration) * 100);
      if (progressBar) progressBar.style.width = `${pct}%`;

      if (elapsed >= slideDuration) {
        nextSlide();
      }
    }, 100);
  }

  function stopAutoplay() {
    if (progressInterval) clearInterval(progressInterval);
    if (timer) clearInterval(timer);
    progressInterval = null;
    timer = null;
    isPlaying = false;
    if (btnPlayPause) btnPlayPause.textContent = '▶';
  }

  function togglePlayPause() {
    if (isPlaying) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  }

  // Event Listeners
  if (btnNext) btnNext.addEventListener('click', () => { nextSlide(); if (isPlaying) startAutoplay(); });
  if (btnPrev) btnPrev.addEventListener('click', () => { prevSlide(); if (isPlaying) startAutoplay(); });
  if (btnPlayPause) btnPlayPause.addEventListener('click', togglePlayPause);

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      goToSlide(index);
      if (isPlaying) startAutoplay();
    });
  });

  // Pause on hover
  container.addEventListener('mouseenter', () => { if (progressInterval) clearInterval(progressInterval); });
  container.addEventListener('mouseleave', () => { if (isPlaying) startAutoplay(); });

  // Initial Start
  goToSlide(0);
  if (isPlaying) {
    startAutoplay();
  }
}
