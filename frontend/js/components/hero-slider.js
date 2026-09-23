/**
 * PRAMAN Cinematic 5-Slide Hero Slider
 * Features:
 * - Ken Burns Zoom transitions across 5 high-resolution Indian infrastructure scenes
 * - Independent, one-time content entrance
 * - Interactive glassmorphic Prev / Next controls
 * - Pill pagination indicators
 * - Real-time animated countdown progress bar
 * - Pause on hover / resume on leave
 * - Touch swipe and keyboard (ArrowLeft / ArrowRight) navigation
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

  if (slides.length === 0) return;

  // Keep the initial viewport fitted when fonts or navbar dimensions change.
  const navbar = document.getElementById('navbar-root');
  if (navbar && document.body.classList.contains('home-page')) {
    const updateNavbarHeight = () => {
      document.body.style.setProperty('--home-navbar-height', navbar.getBoundingClientRect().height + 'px');
    };
    updateNavbarHeight();
    const navbarObserver = new ResizeObserver(updateNavbarHeight);
    navbarObserver.observe(navbar);
  }

  // Preload all 5 hero images to prevent flicker
  const heroImages = [
    '/assets/images/hero/hero-01.jpg',
    '/assets/images/hero/hero-02.jpg',
    '/assets/images/hero/hero-03.jpg',
    '/assets/images/hero/hero-04.jpg',
    '/assets/images/hero/hero-05.jpg'
  ];
  heroImages.forEach(src => {
    const img = new Image();
    img.src = src;
  });

  let currentIndex = 0;
  let isPlaying = true;
  let progressInterval = null;
  const slideDuration = 6000; // 6 seconds per slide
  let elapsed = 0;
  const stepMs = 50;

  // Reduced motion check
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
      elapsed += stepMs;
      const pct = Math.min(100, (elapsed / slideDuration) * 100);
      if (progressBar) progressBar.style.width = `${pct}%`;

      if (elapsed >= slideDuration) {
        nextSlide();
      }
    }, stepMs);
  }

  function stopAutoplay() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }

  function togglePlayPause() {
    if (isPlaying) {
      stopAutoplay();
      isPlaying = false;
      if (btnPlayPause) btnPlayPause.textContent = '▶';
    } else {
      isPlaying = true;
      if (btnPlayPause) btnPlayPause.textContent = '⏸';
      startAutoplay();
    }
  }

  // Prev / Next button listeners
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      nextSlide();
      if (isPlaying) startAutoplay();
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      prevSlide();
      if (isPlaying) startAutoplay();
    });
  }

  if (btnPlayPause) {
    btnPlayPause.addEventListener('click', togglePlayPause);
  }

  // Dots selection listeners
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      goToSlide(index);
      if (isPlaying) startAutoplay();
    });
  });

  // Pause on hover
  container.addEventListener('mouseenter', () => {
    if (isPlaying) stopAutoplay();
  });

  container.addEventListener('mouseleave', () => {
    if (isPlaying) startAutoplay();
  });

  // Keyboard navigation when hero section is in view
  window.addEventListener('keydown', (e) => {
    const rect = container.getBoundingClientRect();
    const inView = rect.top <= window.innerHeight && rect.bottom >= 0;
    if (!inView) return;

    if (e.key === 'ArrowRight') {
      nextSlide();
      if (isPlaying) startAutoplay();
    } else if (e.key === 'ArrowLeft') {
      prevSlide();
      if (isPlaying) startAutoplay();
    }
  });

  // Touch swipe support for mobile
  let touchStartX = 0;
  let touchEndX = 0;

  container.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
      nextSlide();
      if (isPlaying) startAutoplay();
    } else if (touchEndX > touchStartX + swipeThreshold) {
      prevSlide();
      if (isPlaying) startAutoplay();
    }
  }

  // Initial activation
  goToSlide(0);
  if (isPlaying) {
    startAutoplay();
  }
}
