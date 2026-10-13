const dialog = document.getElementById('figure-dialog');
const image = document.getElementById('figure-image');
const triggers = [...document.querySelectorAll('.data-figure-trigger')];
const pages = [...document.querySelectorAll('[data-figure-page]')];
const position = document.getElementById('figure-position');
const dataTabs = [...document.querySelectorAll('[data-data-tab]')];
const dataPanels = [...document.querySelectorAll('[data-mobile-panel]')];
const dataPosition = document.getElementById('data-mobile-position');
const pairTrack = document.getElementById('data-pair-track');
const pairPanels = [...document.querySelectorAll('.data-pair-panel')];
const pairStage = document.querySelector('.data-pair-stage');
const pairCaption = document.getElementById('data-pair-caption');
const pairPosition = document.getElementById('data-pair-position');
const pairToggle = document.getElementById('switch-data-pair');
let activeIndex = 0;
let dataIndex = 0;

function selectDataPanel(index, focus = false) {
  dataIndex = (index + dataPanels.length) % dataPanels.length;
  dataTabs.forEach((tab, i) => {
    tab.setAttribute('aria-selected', String(i === dataIndex));
    tab.tabIndex = i === dataIndex ? 0 : -1;
  });
  dataPanels.forEach((panel, i) => { panel.hidden = i !== dataIndex; });
  dataPosition.textContent = `${dataIndex + 1} / ${dataPanels.length}`;
  const pairIndex = Math.floor(dataIndex / 2);
  pairTrack.style.transform = `translateX(-${pairIndex * 100}%)`;
  pairPanels.forEach((panel, i) => {
    panel.inert = i !== pairIndex;
    panel.setAttribute('aria-hidden', String(i !== pairIndex));
  });
  pairCaption.textContent = pairPanels[pairIndex].dataset.caption;
  pairPosition.textContent = `${pairIndex + 1} / ${pairPanels.length}`;
  pairToggle.textContent = `${pairPanels[1 - pairIndex].dataset.caption} ${pairIndex === 0 ? '→' : '←'}`;
  if (focus) dataTabs[dataIndex].focus();
}

pairToggle.addEventListener('click', () => selectDataPanel((1 - Math.floor(dataIndex / 2)) * 2));
function handlePairKeys(event) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2
    : Math.floor(dataIndex / 2) * 2 + (event.key === 'ArrowLeft' ? -2 : 2);
  selectDataPanel(next);
  if (event.currentTarget === pairStage) pairStage.focus();
}
pairToggle.addEventListener('keydown', handlePairKeys);
pairStage.addEventListener('keydown', handlePairKeys);

function selectFigure(index) {
  activeIndex = (index + triggers.length) % triggers.length;
  const { panel, title } = triggers[activeIndex].dataset;
  image.src = `assets/data-panel-${panel}.svg`;
  image.alt = `(${panel}) ${title}`;
  dialog.setAttribute('aria-label', `Dataset figure gallery: (${panel}) ${title}`);
  position.textContent = `${activeIndex + 1} / ${triggers.length}`;
  pages.forEach(page => page.setAttribute('aria-pressed', String(page.dataset.figurePage === panel)));
  selectDataPanel(activeIndex);
}

function openFigure(index) {
  selectFigure(index);
  dialog.showModal();
  document.body.classList.add('modal-open');
}

triggers.forEach((trigger, index) => {
  trigger.addEventListener('click', () => openFigure(index));
});

dataTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectDataPanel(index));
  tab.addEventListener('keydown', event => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? dataTabs.length - 1
      : dataIndex + (event.key === 'ArrowLeft' ? -1 : 1);
    selectDataPanel(next, true);
  });
});
document.getElementById('enlarge-data-panel').addEventListener('click', () => openFigure(dataIndex));
document.getElementById('previous-data-panel').addEventListener('click', () => selectDataPanel(dataIndex - 1));
document.getElementById('next-data-panel').addEventListener('click', () => selectDataPanel(dataIndex + 1));

function enableSwipe(element, select, current) {
  let start;
  element.addEventListener('pointerdown', event => {
    if (event.isPrimary && event.button === 0) start = { x: event.clientX, y: event.clientY };
  });
  element.addEventListener('pointerup', event => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = undefined;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) select(current() + (dx < 0 ? 1 : -1));
  });
  element.addEventListener('pointercancel', () => { start = undefined; });
}
enableSwipe(document.querySelector('.data-mobile-stage'), selectDataPanel, () => dataIndex);
enableSwipe(document.querySelector('.figure-view'), selectFigure, () => activeIndex);

document.getElementById('previous-figure').addEventListener('click', () => selectFigure(activeIndex - 1));
document.getElementById('next-figure').addEventListener('click', () => selectFigure(activeIndex + 1));
pages.forEach((page, index) => page.addEventListener('click', () => selectFigure(index)));
dialog.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  selectFigure(activeIndex + (event.key === 'ArrowLeft' ? -1 : 1));
});

document.getElementById('close-figure').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  document.body.classList.toggle('modal-open', !!document.querySelector('dialog[open]'));
  const target = triggers[activeIndex].getBoundingClientRect().width
    ? triggers[activeIndex] : document.getElementById('enlarge-data-panel');
  target.focus();
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
    dialog.close();
  }
});
