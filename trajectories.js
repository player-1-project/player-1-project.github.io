import { createTrajectoryPreviews } from './trajectory-previews.js';

const tabs = [...document.querySelectorAll('.trajectory-tabs [role="tab"]')];
const rows = document.querySelector('#trajectory-rows');
const panel = document.querySelector('#trajectory-table-panel');
const previews = createTrajectoryPreviews();
let index = null;

function cell(className = '') {
  const element = document.createElement('td');
  if (className) element.className = className;
  return element;
}

function render(benchmark) {
  const selected = index.filter(item => item.benchmark === benchmark);
  previews.reset();
  rows.replaceChildren();
  selected.forEach((item, position) => {
    const row = document.createElement('tr');
    const task = cell('trajectory-task');
    const taskContent = document.createElement('div');
    taskContent.className = 'trajectory-task-content';
    const image = document.createElement('img');
    image.src = `trajectories/${item.thumbnail}`;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    const taskCopy = document.createElement('div');
    const number = document.createElement('span');
    number.className = 'trajectory-number';
    number.textContent = String(position + 1).padStart(2, '0');
    const title = document.createElement('strong');
    const titleLink = document.createElement('a');
    titleLink.href = `trajectory.html?id=${encodeURIComponent(item.id)}`;
    titleLink.textContent = item.title;
    title.append(titleLink);
    const subtitle = document.createElement('small');
    subtitle.textContent = item.task;
    taskCopy.append(number, title, subtitle);
    taskContent.append(image, taskCopy);
    task.append(taskContent);

    const stepsCell = cell('trajectory-steps');
    const steps = document.createElement('span');
    steps.className = 'trajectory-step-count';
    steps.textContent = `${item.totalSteps.toLocaleString()} steps`;
    stepsCell.append(steps);

    const outcome = cell('trajectory-outcome');
    if (item.benchmark === 'vizdoom') {
      const scores = document.createElement('div');
      scores.className = 'trajectory-scores';
      for (const [label, value] of [
        ['Return', Number(item.episodeReturn).toLocaleString('en-US', {maximumFractionDigits: 3})],
        ['Scaled return', Number(item.scaledReturn).toFixed(4)],
      ]) {
        const line = document.createElement('span');
        line.textContent = `${label} ${value}`;
        scores.append(line);
      }
      outcome.append(scores);
    }
    const badge = document.createElement('span');
    badge.className = 'trajectory-result';
    badge.textContent = item.result;
    outcome.append(badge);

    const linkCell = cell('trajectory-link-cell');
    const link = document.createElement('a');
    link.href = `trajectory.html?id=${encodeURIComponent(item.id)}`;
    const linkLabel = document.createElement('span');
    linkLabel.className = 'trajectory-link-label';
    linkLabel.textContent = 'View trajectory';
    const linkArrow = document.createElement('span');
    linkArrow.className = 'trajectory-link-arrow';
    linkArrow.textContent = '↗';
    linkArrow.setAttribute('aria-hidden', 'true');
    link.append(linkLabel, ' ', linkArrow);
    link.setAttribute('aria-label', `View ${item.title} trajectory`);
    linkCell.append(link);
    row.append(task, stepsCell, outcome, linkCell);
    rows.append(row);
    previews.observe(image, item.id);
  });
}

function select(tab, focus = false) {
  tabs.forEach(item => {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
  });
  panel.setAttribute('aria-labelledby', tab.id);
  if (index) render(tab.dataset.benchmark);
  if (focus) tab.focus();
}

tabs.forEach((tab, indexInList) => {
  tab.addEventListener('click', () => select(tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 :
      (indexInList + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    select(tabs[next], true);
  });
});

document.querySelectorAll('[data-cases-benchmark]').forEach(link => {
  link.addEventListener('click', () => {
    const tab = tabs.find(item => item.dataset.benchmark === link.dataset.casesBenchmark);
    select(tab, true);
  });
});

try {
  const response = await fetch('trajectories/index.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  index = await response.json();
  tabs.forEach(tab => {
    tab.querySelector('span').textContent = index.filter(item => item.benchmark === tab.dataset.benchmark).length;
  });
  select(tabs.find(tab => tab.getAttribute('aria-selected') === 'true'));
} catch (error) {
  rows.replaceChildren();
  const row = document.createElement('tr');
  const message = cell();
  message.colSpan = 4;
  message.textContent = 'Trajectories are temporarily unavailable.';
  row.append(message);
  rows.append(row);
  console.error('Could not load trajectories', error);
}
