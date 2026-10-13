const section = document.getElementById('method');
const tabs = [...section.querySelectorAll('[role=tab]')];
const cards = [...section.querySelectorAll('.method-card')];
const dialogs = [...document.querySelectorAll('dialog')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let activeIndex = 0;
let visible = !('IntersectionObserver' in window);

const previews = cards.map((card, index) => {
  const media = [...card.querySelectorAll('video')];
  const state = {media, active: false, failed: false};
  for (const video of media) {
    video.addEventListener('error', () => {
      state.failed = true;
      freezePreview(state);
    });
  }
  media[0].addEventListener('timeupdate', () => {
    if (state.active && media[1].readyState >= 2 && Math.abs(media[0].currentTime - media[1].currentTime) > .18) {
      media[1].currentTime = media[0].currentTime;
    }
  });
  media[0].addEventListener('ended', () => {
    if (index !== activeIndex || !state.active) return;
    // Keep the chosen case in place during keyboard interaction.
    const keyboardFocus = section.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
    selectCase(keyboardFocus ? index : (index + 1) % cards.length);
  });
  return state;
});

function freezePreview(state) {
  state.media.forEach(video => video.pause());
  state.active = false;
}

function syncPreview() {
  previews.forEach((state, index) => {
    const active = index === activeIndex && visible && !document.hidden && !dialogs.some(dialog => dialog.open) && !reduceMotion.matches && !state.failed;
    if (active && !state.active) {
      state.active = true;
      for (const video of state.media) {
        video.play().catch(error => {
          if (error.name === 'AbortError' || !state.active) return;
          state.failed = true;
          freezePreview(state);
        });
      }
    } else if (!active && state.active) {
      freezePreview(state);
    }
  });
}

function selectCase(index, focus = false) {
  freezePreview(previews[activeIndex]);
  activeIndex = index;
  cards.forEach((card, current) => {
    const selected = current === index;
    card.classList.toggle('is-active', selected);
    card.setAttribute('aria-hidden', String(!selected));
    card.inert = !selected;
    tabs[current].setAttribute('aria-selected', String(selected));
    tabs[current].tabIndex = selected ? 0 : -1;
  });
  previews[index].media.forEach(video => { video.currentTime = 0; });
  if (focus) tabs[index].focus();
  syncPreview();
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectCase(index));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    selectCase(next, true);
  });
});

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    syncPreview();
  }, {threshold: .15});
  observer.observe(section);
}

document.addEventListener('visibilitychange', syncPreview);
const dialogObserver = new MutationObserver(syncPreview);
dialogs.forEach(dialog => dialogObserver.observe(dialog, {attributes: true, attributeFilter: ['open']}));
reduceMotion.addEventListener('change', syncPreview);
window.addEventListener('pagehide', () => previews.forEach(freezePreview));
window.addEventListener('pageshow', syncPreview);
syncPreview();
