export function initHeroSlider() {
  const layer1 = document.getElementById('hero-bg-1');
  const layer2 = document.getElementById('hero-bg-2');
  if (!layer1 || !layer2) return;

  const images = [
    '/assets/images/hero/hero-01.jpg',
    '/assets/images/hero/hero-02.jpg',
    '/assets/images/hero/hero-03.jpg',
    '/assets/images/hero/hero-04.jpg',
    '/assets/images/hero/hero-05.jpg'
  ];

  // Preload all images to prevent loading flashes
  images.forEach(src => {
    const img = new Image();
    img.src = src;
  });

  let currentIndex = 0;
  let activeLayer = 1;

  // Set initial background image immediately
  layer1.style.backgroundImage = `url('${images[0]}')`;
  layer1.classList.add('hero-bg-active');

  // Check user preference for reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const transitionInterval = prefersReducedMotion ? 12000 : 7000;

  // Continuous background atmosphere crossfade loop
  setInterval(() => {
    const nextIndex = (currentIndex + 1) % images.length;
    const nextImage = images[nextIndex];

    if (activeLayer === 1) {
      layer2.style.backgroundImage = `url('${nextImage}')`;
      layer2.classList.add('hero-bg-active');
      layer1.classList.remove('hero-bg-active');
      activeLayer = 2;
    } else {
      layer1.style.backgroundImage = `url('${nextImage}')`;
      layer1.classList.add('hero-bg-active');
      layer2.classList.remove('hero-bg-active');
      activeLayer = 1;
    }

    currentIndex = nextIndex;
  }, transitionInterval);
}

