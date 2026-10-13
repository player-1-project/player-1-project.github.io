export function setupRandomization() {
  const panel = document.getElementById('gym-randomization');
  if (!panel) return;
  const images = [...panel.querySelectorAll('img[data-gif]')];
  const visible = new Set();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dialogs = [...document.querySelectorAll('dialog')];

  function show(image, source) {
    if (image.getAttribute('src') === source) return;
    image.classList.remove('is-ready');
    image.src = source;
  }

  function refresh() {
    const playing = !document.hidden && !reduceMotion.matches && !dialogs.some(dialog => dialog.open);
    for (const image of images) {
      if (panel.open && visible.has(image) && !document.hidden) {
        image.parentElement.style.backgroundImage = `url("${image.dataset.poster}")`;
        show(image, playing ? image.dataset.gif : image.dataset.poster);
      } else if (image.hasAttribute('src')) {
        show(image, image.dataset.poster);
      }
    }
  }

  for (const image of images) {
    image.addEventListener('load', () => image.classList.add('is-ready'));
    image.addEventListener('error', () => {
      if (image.getAttribute('src') === image.dataset.gif) show(image, image.dataset.poster);
    });
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio > 0) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    refresh();
  }, {rootMargin: '100px', threshold: .01});
  images.forEach(image => observer.observe(image));
  panel.addEventListener('toggle', refresh);
  document.addEventListener('visibilitychange', refresh);
  reduceMotion.addEventListener('change', refresh);
  const dialogObserver = new MutationObserver(refresh);
  dialogs.forEach(dialog => dialogObserver.observe(dialog, {attributes: true, attributeFilter: ['open']}));
}
