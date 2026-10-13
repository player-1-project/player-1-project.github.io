export function setupResults(root = document.querySelector('.results-lead')) {
  const models = JSON.parse(root.dataset.resultsModels);
  const digits = root.querySelector('[data-results-value]');
  const value = root.querySelector('.results-value');
  const label = root.querySelector('[data-results-model-label]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  let selected = 0;
  let visible = false;
  let timer = null;

  function cancelAnimations() {
    animations.forEach(animation => animation.cancel());
    animations.clear();
  }
  function animate(element, frames, options, finish) {
    const animation = element.animate(frames, options);
    animations.add(animation);
    animation.onfinish = () => {
      animation.cancel();
      animations.delete(animation);
      finish?.();
    };
  }
  function renderDigits(previous, next, motion) {
    const before = previous.toFixed(2);
    const after = next.toFixed(2);
    const direction = next >= previous ? 1 : -1;
    digits.replaceChildren();
    [...after].forEach((character, position) => {
      if (character === '.') {
        const dot = document.createElement('span');
        dot.className = 'results-decimal';
        dot.textContent = character;
        digits.append(dot);
        return;
      }
      const slot = document.createElement('span');
      slot.className = 'results-digit';
      const reel = document.createElement('span');
      reel.className = 'results-digit-reel';
      const start = Number(before[position]);
      const end = Number(character);
      const distance = motion ? (direction * (end - start) + 10) % 10 : 0;
      const sequence = distance ? Array.from({length: distance + 1}, (_, i) => (start + direction * i + 10) % 10) : [end];
      if (direction < 0) sequence.reverse();
      const cells = sequence.map(number => {
        const cell = document.createElement('span');
        cell.textContent = number;
        return cell;
      });
      reel.append(...cells);
      slot.append(reel);
      digits.append(slot);
      if (distance) {
        const offset = `translateY(-${distance * 1.1}em)`;
        animate(reel, [
          {transform: direction > 0 ? 'translateY(0)' : offset},
          {transform: direction > 0 ? offset : 'translateY(0)'},
        ], {duration: 850, delay: position * 45, easing: 'cubic-bezier(.22,.75,.2,1)', fill: 'both'}, () => {
          const final = document.createElement('span');
          final.textContent = end;
          reel.replaceChildren(final);
        });
      }
    });
  }
  function render(index, motion = true) {
    const previous = models[selected];
    const model = models[index];
    selected = index;
    cancelAnimations();
    const animated = motion && !reduced.matches;
    renderDigits(previous.rl, model.rl, animated);
    label.textContent = `PLAYER-1-${model.label}`;
    root.querySelector('strong[data-results-sft]').textContent = `${model.sft.toFixed(2)}%`;
    root.querySelector('strong[data-results-rl]').textContent = `${model.rl.toFixed(2)}%`;
    root.querySelector('[data-results-gain]').textContent = `+${(model.rl - model.sft).toFixed(2)} percentage-point`;
    value.setAttribute('aria-label', `${model.rl.toFixed(2)}% task success after RL`);
    root.querySelector('[data-results-status]').textContent = `Player-1-${model.label}: ${model.rl.toFixed(2)}% task success after RL.`;
    if (animated) {
      animate(label, [{opacity: 0, transform: 'translateY(4px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 380});
      animate(root.querySelector('.results-lead-copy'), [{opacity: .45}, {opacity: 1}], {duration: 380});
    }
  }
  function syncAuto() {
    clearTimeout(timer);
    timer = null;
    if (visible && !document.hidden) {
      timer = setTimeout(() => {
        render((selected + 1) % models.length);
        syncAuto();
      }, 5000);
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) render(selected, false);
    syncAuto();
  });
  reduced.addEventListener('change', () => {
    render(selected, false);
    syncAuto();
  });
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) render(selected, false);
    syncAuto();
  }, {threshold: .25}).observe(root);
  window.addEventListener('pagehide', () => {
    render(selected, false);
    clearTimeout(timer);
    timer = null;
  });
  window.addEventListener('pageshow', syncAuto);
  render(0, false);
  syncAuto();
}
