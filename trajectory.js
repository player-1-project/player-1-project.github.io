const elements = Object.fromEntries([
  'trace-benchmark', 'trace-title', 'trace-task', 'trace-result',
  'trace-image', 'trace-frame-label', 'trace-prev', 'trace-next', 'trace-seek',
  'trace-step-note', 'trace-counter', 'trace-thinking', 'trace-action',
].map(id => [id, document.getElementById(id)]));
const names = {minecraft: 'MINECRAFT / MINEDOJO', vizdoom: 'VIZDOOM', gameworld: 'GAMEWORLD'};
const id = new URLSearchParams(location.search).get('id');
let trace;
let position = 0;

function show(index) {
  position = Math.max(0, Math.min(index, trace.frames.length - 1));
  const frame = trace.frames[position];
  elements['trace-image'].src = `trajectories/${frame.image}`;
  elements['trace-image'].alt = `${trace.title} observation at decision ${frame.step}`;
  elements['trace-frame-label'].textContent = `OBSERVATION · STEP ${frame.step}`;
  elements['trace-thinking'].textContent = frame.thinking || 'No thinking text recorded for this decision.';
  elements['trace-action'].textContent = frame.action || 'No action text recorded for this decision.';
  elements['trace-counter'].textContent = `${String(position + 1).padStart(2, '0')} / ${String(trace.frames.length).padStart(2, '0')}`;
  elements['trace-step-note'].textContent = `Decision ${frame.step} of ${trace.totalSteps} · ${trace.sampledFrames} observation frames shown`;
  elements['trace-seek'].value = position;
  elements['trace-prev'].disabled = position === 0;
  elements['trace-next'].disabled = position === trace.frames.length - 1;
}

if (!id || !/^(minecraft|vizdoom|gameworld)-\d{2}$/.test(id)) {
  elements['trace-title'].textContent = 'Trajectory not found';
} else {
  try {
    const response = await fetch(`trajectories/${id}.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    trace = await response.json();
    document.title = `${trace.title} · Player-1 trajectory`;
    elements['trace-benchmark'].textContent = names[trace.benchmark] || trace.benchmark;
    elements['trace-title'].textContent = trace.title;
    elements['trace-task'].textContent = trace.task;
    elements['trace-result'].textContent = trace.result;
    elements['trace-seek'].max = trace.frames.length - 1;
    show(0);
    elements['trace-prev'].addEventListener('click', () => show(position - 1));
    elements['trace-next'].addEventListener('click', () => show(position + 1));
    elements['trace-seek'].addEventListener('input', event => show(Number(event.target.value)));
    document.addEventListener('keydown', event => {
      if (event.target.matches('input, button, a')) return;
      if (event.key === 'ArrowLeft') show(position - 1);
      if (event.key === 'ArrowRight') show(position + 1);
    });
  } catch (error) {
    elements['trace-title'].textContent = 'Trajectory unavailable';
    console.error('Could not load trajectory', error);
  }
}
