import { setupReplay } from './replay.js?v=aea1be82a13f';
import { setupShowcase } from './showcase.js?v=5e3ba32f4635';
import { setupResults } from './results.js?v=353f1d975dbf';
import { setupRandomization } from './randomization.js?v=6887f449d192';

const $ = (id) => document.getElementById(id);
let catalog = [];
let selected = null;
let frame = null;
let generation = 0;
let poll = null;
let state = 'idle';
let working = false;
const SEED = 42;

function setStatus(label, value) {
  state = value;
  $('status').textContent = label;
  $('status').dataset.state = value;
  $('pause').disabled = !['playing', 'paused'].includes(value) || working;
  $('reset').disabled = !frame || !['playing', 'paused'].includes(value) || working;
  $('perturb').disabled = !frame || !['playing', 'paused'].includes(value) || working;
  $('pause').textContent = value === 'paused' ? 'Resume' : 'Pause';
}
function clearMetrics() {
  for (const id of ['score', 'episode-reward', 'step-reward']) $(id).textContent = '—';
  $('details').replaceChildren();
  $('seed-label').textContent = '';
}
function showCover(caption, action, note) {
  $('stage-cover').hidden = false;
  $('cover-caption').textContent = caption;
  $('start').textContent = action;
  $('cover-note').textContent = note;
  $('start').disabled = state === 'loading';
}
function release() {
  generation += 1;
  clearInterval(poll);
  poll = null;
  frame?.remove();
  frame = null;
  working = false;
}
function choose(game, autoplay = true) {
  release();
  selected = game;
  clearMetrics();
  setStatus('Ready to play', 'idle');
  $('game-title').textContent = game.title;
  $('game-number').textContent = `${String(catalog.indexOf(game) + 1).padStart(2, '0')} / 16`;
  $('controls').textContent = game.controls;
  $('game-poster').src = `assets/${game.id}.webp`;
  $('game-poster').alt = `${game.title} environment preview`;
  showCover('PLAY THE TRAINING ENVIRONMENT', `Play ${game.title} →`, 'Click to begin · Mouse & keyboard');
  if (autoplay) {
    $('game-dialog').showModal();
    document.body.classList.add('modal-open');
    launch();
  }
}
function format(value) {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-US', {maximumFractionDigits: 3}) : '—';
}
function renderMetrics(data) {
  $('score').textContent = format(data.primaryScore);
  $('episode-reward').textContent = format(data.episodeReward);
  $('step-reward').textContent = format(data.stepReward);
  const items = (data.details || []).map(([label, value]) => {
    const item = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = value;
    item.append(dt, dd);
    return item;
  });
  $('details').replaceChildren(...items);
  $('seed-label').textContent = `Seed ${data.seed} · Difficulty ${data.difficulty}`;
}
function sample() {
  if (!frame || working) return;
  const data = frame.contentWindow.Player1Embed?.read();
  if (!data) return;
  renderMetrics(data);
  if (data.status === 'paused' && state !== 'paused') {
    setStatus('Paused', 'paused');
    showCover('TAKE YOUR TIME', 'Resume playing →', 'Click Resume to return to the game.');
  }
}
function fail(error) {
  console.error('Player-1 environment:', error);
  release();
  setStatus('Load failed', 'error');
  showCover('COULD NOT LOAD THIS ENVIRONMENT', 'Try again →', 'Please retry. This demo requires a browser with WebGL enabled.');
}
async function launch() {
  if (!selected || state === 'loading') return;
  if (state === 'paused') return togglePause();
  release();
  const token = generation;
  setStatus('Loading…', 'loading');
  showCover('LOADING ENVIRONMENT', 'Loading…', 'Preparing the scene and assets.');
  const next = document.createElement('iframe');
  frame = next;
  next.title = `${selected.title} playable environment`;
  next.allow = "fullscreen 'none'";
  next.src = `games/${selected.id}/index.html?fullscreen=1&seed=${SEED}&autostart=0`;
  $('game-window').prepend(next);
  const started = performance.now();
  poll = setInterval(async () => {
    if (token !== generation) return;
    const win = next.contentWindow;
    if (win.__gameGymLoadError) return fail(new Error(String(win.__gameGymLoadError)));
    if (!win.Player1Embed?.ready) {
      if (performance.now() - started > 20000) fail(new Error('Environment readiness timed out'));
      return;
    }
    clearInterval(poll);
    working = true;
    try {
      await win.gameAPI.init({seed: SEED, difficulty: 1, autostart: true});
      if (token !== generation) return;
      const result = await win.gameAPI.resume();
      if (!result.ok) throw new Error('The environment could not resume');
      working = false;
      setStatus('Playing', 'playing');
      $('stage-cover').hidden = true;
      next.contentWindow.focus();
      sample();
      poll = setInterval(sample, 100);
    } catch (error) { if (token === generation) fail(error); }
  }, 100);
}
async function togglePause(forcePause = false) {
  if (!frame || working || !['playing', 'paused'].includes(state)) return;
  const token = generation;
  const pause = forcePause || state !== 'paused';
  working = true;
  setStatus(pause ? 'Pausing…' : 'Resuming…', state);
  try {
    const result = await frame.contentWindow.gameAPI[pause ? 'pause' : 'resume']();
    if (token !== generation) return;
    if (!result.ok) throw new Error('Pause control unavailable');
    working = false;
    setStatus(pause ? 'Paused' : 'Playing', pause ? 'paused' : 'playing');
    if (pause) showCover('TAKE YOUR TIME', 'Resume playing →', 'Your progress is saved in this session.');
    else { $('stage-cover').hidden = true; frame.contentWindow.focus(); }
    sample();
  } catch (error) { if (token === generation) fail(error); }
}
async function restart() {
  if (!frame || working) return;
  const token = generation;
  working = true;
  setStatus('Restarting…', state);
  try {
    await frame.contentWindow.gameAPI.reset({seed: SEED, difficulty: 1, autostart: true});
    if (token !== generation) return;
    await frame.contentWindow.gameAPI.resume();
    if (token !== generation) return;
    working = false;
    setStatus('Playing', 'playing');
    $('stage-cover').hidden = true;
    frame.contentWindow.focus();
    sample();
  } catch (error) { if (token === generation) fail(error); }
}
function perturb() {
  if (!frame || working || !['playing', 'paused'].includes(state)) return;
  try {
    const data = frame.contentWindow.Player1Embed.perturb();
    if (!data) throw new Error('Perturbation control unavailable');
    const paused = data.status === 'paused';
    setStatus(paused ? 'Paused' : 'Playing', paused ? 'paused' : 'playing');
    if (paused) showCover('TAKE YOUR TIME', 'Resume playing →', 'Click Resume to return to the game.');
    else { $('stage-cover').hidden = true; frame.contentWindow.focus(); }
    renderMetrics(data);
  } catch (error) { fail(error); }
}
function buildCatalog() {
  const list = $('environment-list');
  for (const game of catalog) {
    const button = document.createElement('button');
    button.className = 'gym-card';
    button.dataset.game = game.id;
    button.dataset.family = game.family;
    button.setAttribute('aria-label', `Play ${game.title}`);
    button.setAttribute('aria-haspopup', 'dialog');
    const img = document.createElement('img');
    img.src = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? `assets/${game.id}.webp` : game.preview;
    img.alt = '';
    img.width = 854;
    img.height = 480;
    img.loading = 'lazy';
    const copy = document.createElement('span');
    copy.className = 'card-copy';
    const text = document.createElement('span');
    text.className = 'card-labels';
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = game.title;
    const family = document.createElement('span');
    family.className = 'family';
    family.textContent = game.family;
    const arrow = document.createElement('span');
    arrow.className = 'card-arrow';
    arrow.textContent = '↗';
    arrow.setAttribute('aria-hidden', 'true');
    text.append(label, family);
    copy.append(text, arrow);
    button.append(img, copy);
    button.addEventListener('click', () => choose(game));
    list.append(button);
  }
}
function setFilter(family) {
  for (const button of document.querySelectorAll('.family-filters button')) {
    button.setAttribute('aria-pressed', String(button.dataset.family === family));
  }
  for (const button of document.querySelectorAll('.gym-card')) {
    button.hidden = family !== 'All' && button.dataset.family !== family;
  }
}
function setupIntroHighlights() {
  const updateVisibility = () => {
    document.documentElement.classList.toggle('intro-highlights-paused', document.hidden);
  };
  document.addEventListener('visibilitychange', updateVisibility);
  updateVisibility();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const visible = entry.isIntersecting && entry.intersectionRatio >= 0.65;
      entry.target.classList.toggle('is-highlight-visible', visible);
      if (visible) entry.target.classList.add('is-highlighted');
    }
  }, {threshold: 0.65, rootMargin: '0px 0px -10% 0px'});
  document.querySelectorAll('.section-intro').forEach((intro) => observer.observe(intro));
}
document.querySelectorAll('.family-filters button').forEach((button) => button.addEventListener('click', () => setFilter(button.dataset.family)));
$('start').addEventListener('click', launch);
$('pause').addEventListener('click', () => togglePause());
$('reset').addEventListener('click', restart);
$('perturb').addEventListener('click', perturb);
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') togglePause(true); });
$('close-game').addEventListener('click', () => $('game-dialog').close());
$('game-dialog').addEventListener('close', () => {
  release();
  document.body.classList.toggle('modal-open', !!document.querySelector('dialog[open]'));
  setStatus('Ready to play', 'idle');
});
$('game-dialog').addEventListener('click', (event) => {
  if (event.target !== $('game-dialog')) return;
  const rect = $('game-dialog').getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
    $('game-dialog').close();
  }
});
setupShowcase(setupReplay());
setupResults();
setupRandomization();
setupIntroHighlights();
window.addEventListener('pagehide', release);
$('copy-citation').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('bibtex').textContent);
    $('copy-citation').textContent = 'Copied';
    $('copy-status').textContent = 'BibTeX copied to clipboard.';
  } catch {
    $('copy-status').textContent = 'Select the BibTeX text below to copy it.';
    $('copy-citation').textContent = 'Select text below';
  }
});
try {
  const response = await fetch('games.json?v=b13aa274695e');
  if (!response.ok) throw new Error('Catalog unavailable');
  catalog = await response.json();
  buildCatalog();
  choose(catalog[0], false);
} catch (error) { fail(error); }
