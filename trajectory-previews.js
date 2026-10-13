export function createTrajectoryPreviews() {
  const previews = new Map();
  const frameCache = new Map();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer = null;

  function paused() {
    return document.hidden || reduceMotion.matches || !!document.querySelector('dialog[open]');
  }

  function active(preview) {
    return preview.visible && !preview.hovered && !paused();
  }

  function framesFor(id) {
    if (!frameCache.has(id)) {
      const frames = fetch(`trajectories/${encodeURIComponent(id)}.json`)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then(trace => {
          const count = Math.min(8, trace.frames.length);
          return Array.from({length: count}, (_, i) => {
            const position = count === 1 ? 0 : Math.round(i * (trace.frames.length - 1) / (count - 1));
            return `trajectories/${trace.frames[position].image}`;
          });
        })
        .catch(() => []);
      frameCache.set(id, frames);
    }
    return frameCache.get(id);
  }

  async function load(preview) {
    preview.loading = true;
    const frames = await framesFor(preview.id);
    if (previews.get(preview.image) !== preview) return;
    preview.frames = frames;
    preview.loading = false;
    sync();
  }

  async function advance(preview) {
    if (!active(preview) || preview.busy || !preview.frames || preview.frames.length < 2) return;
    preview.busy = true;
    const position = (preview.position + 1) % preview.frames.length;
    const next = new Image();
    next.decoding = 'async';
    next.src = preview.frames[position];
    try {
      await next.decode();
      if (previews.get(preview.image) === preview && active(preview)) {
        preview.image.src = next.src;
        preview.position = position;
      }
    } catch {
      preview.frames = [];
    } finally {
      preview.busy = false;
      sync();
    }
  }

  function sync() {
    let playing = false;
    for (const preview of previews.values()) {
      if (!active(preview)) continue;
      if (preview.frames === null && !preview.loading) load(preview);
      if (preview.frames?.length > 1) playing = true;
    }
    if (playing && timer === null) {
      timer = setInterval(() => previews.forEach(advance), 1400);
    } else if (!playing && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const preview = previews.get(entry.target);
      if (preview) preview.visible = entry.isIntersecting;
    }
    sync();
  }, {threshold: 0.1});
  document.addEventListener('visibilitychange', sync);
  reduceMotion.addEventListener('change', sync);
  const dialogs = new MutationObserver(sync);
  document.querySelectorAll('dialog').forEach(dialog => {
    dialogs.observe(dialog, {attributes: true, attributeFilter: ['open']});
  });

  return {
    observe(image, id) {
      const preview = {image, id, visible: false, hovered: false, loading: false,
        busy: false, frames: null, position: 0};
      previews.set(image, preview);
      image.addEventListener('mouseenter', () => { preview.hovered = true; sync(); });
      image.addEventListener('mouseleave', () => { preview.hovered = false; sync(); });
      observer.observe(image);
    },
    reset() {
      observer.disconnect();
      previews.clear();
      sync();
    },
  };
}
