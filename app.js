const THUMBS = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/';
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const fileName = p => p.path.split('/').pop();
const imageUrl = (p, width) => `${THUMBS}${p.path}/${width}px-${fileName(p)}`;
const ms = duration => (reduced ? 0 : duration);

const root = document.documentElement;
const wall = document.querySelector('.wall');
const viewer = document.querySelector('.viewer');
const veil = viewer.querySelector('.veil');
const stage = viewer.querySelector('.stage');
const art = viewer.querySelector('.art');
const info = viewer.querySelector('.info');
const infoBody = viewer.querySelector('.info-body');

let index = 0;
let busy = false;

/* Hero */

const slides = document.querySelector('.hero-slides');
[1, 2, 4].forEach((paintingIndex, i) => {
  const slide = document.createElement('div');
  slide.className = 'hero-slide';
  slide.style.setProperty('--i', i);
  slide.style.backgroundImage = `url("${imageUrl(paintings[paintingIndex], 1920)}")`;
  slides.prepend(slide);
});

/* Gallery wall */

const tiles = paintings.map((p, i) => {
  const tile = document.createElement('li');
  tile.className = 'tile';
  tile.style.setProperty('--ar', (p.w / p.h).toFixed(3));
  tile.style.setProperty('--col', i % 4);

  const button = document.createElement('button');
  button.className = 'work';
  button.type = 'button';
  button.setAttribute('aria-haspopup', 'dialog');

  const img = document.createElement('img');
  img.src = imageUrl(p, 500);
  img.srcset = `${imageUrl(p, 500)} 500w, ${imageUrl(p, 960)} 960w`;
  img.sizes = '(max-width: 860px) 90vw, 33vw';
  img.alt = `${p.title} by ${p.artist}`;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.width = 500;
  img.height = Math.round((500 * p.h) / p.w);
  img.addEventListener('load', () => img.classList.add('loaded'));
  if (img.complete) img.classList.add('loaded');

  const label = document.createElement('span');
  label.className = 'label';
  const title = document.createElement('span');
  title.className = 'label-title';
  title.textContent = p.title;
  const meta = document.createElement('span');
  meta.className = 'label-meta';
  meta.textContent = `${p.artist}, ${p.date}`;
  label.append(title, meta);

  button.append(img, label);
  button.addEventListener('click', () => openViewer(i));
  tile.append(button);
  wall.append(tile);
  return tile;
});

const revealer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('in');
    revealer.unobserve(entry.target);
  });
}, { rootMargin: '0px 0px -8% 0px' });

tiles.forEach(tile => revealer.observe(tile));

/* Viewer */

const thumbOf = i => tiles[i].querySelector('img');

function fitArt() {
  const p = paintings[index];
  const style = getComputedStyle(stage);
  const maxW = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const maxH = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const scale = Math.min(maxW / p.w, maxH / p.h);
  art.style.width = `${Math.round(p.w * scale)}px`;
  art.style.height = `${Math.round(p.h * scale)}px`;
}

function addFact(list, term, value) {
  const dt = document.createElement('dt');
  dt.textContent = term;
  const dd = document.createElement('dd');
  dd.textContent = value;
  list.append(dt, dd);
}

function renderInfo(p) {
  viewer.querySelector('.count').textContent = `${index + 1} / ${paintings.length}`;
  viewer.querySelector('h2').textContent = p.title;
  viewer.querySelector('.byline').textContent = `${p.artist} (${p.life})`;
  viewer.querySelector('.story').textContent = p.story;
  viewer.querySelector('.source').href = `https://commons.wikimedia.org/wiki/File:${fileName(p)}`;

  const facts = viewer.querySelector('.facts');
  facts.replaceChildren();
  addFact(facts, 'Painted by', p.artist);
  addFact(facts, 'Date', p.date);
  addFact(facts, 'Made in', p.painted);
  addFact(facts, 'Now at', p.location);
  addFact(facts, 'Medium', p.medium);
  addFact(facts, 'Size', p.size);

  infoBody.scrollTop = 0;
  [...infoBody.children].forEach((el, i) => {
    el.animate(
      [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
      { duration: ms(600), delay: ms(120 + i * 55), easing: EASE, fill: 'backwards' }
    );
  });
}

function upgradeArt(p) {
  const full = new Image();
  full.src = imageUrl(p, 1920);
  full.decode()
    .then(() => { if (paintings[index] === p) art.src = full.src; })
    .catch(() => {});

  // Warm the neighbours so stepping through feels instant
  const n = paintings.length;
  new Image().src = imageUrl(paintings[(index + 1) % n], 960);
  new Image().src = imageUrl(paintings[(index - 1 + n) % n], 960);
}

// Flies the viewer image between its place on the wall and its place on stage
function flight(thumb, toWall) {
  const a = thumb.getBoundingClientRect();
  const b = art.getBoundingClientRect();
  const onWall = {
    transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})`
  };
  const onStage = { transform: 'translate(0, 0) scale(1, 1)' };
  thumb.style.visibility = 'hidden';
  return art.animate(toWall ? [onStage, onWall] : [onWall, onStage], {
    duration: ms(toWall ? 520 : 680),
    easing: EASE,
    fill: 'both'
  }).finished;
}

function fade(el, from, to, duration) {
  return el.animate([{ opacity: from }, { opacity: to }], {
    duration: ms(duration),
    easing: 'ease',
    fill: 'both'
  }).finished;
}

async function openViewer(i) {
  if (busy) return;
  busy = true;
  index = i;
  const p = paintings[i];
  const thumb = thumbOf(i);

  art.src = thumb.currentSrc || thumb.src;
  art.alt = thumb.alt;
  root.classList.add('viewing');
  viewer.showModal();
  viewer.scrollTop = 0;
  fitArt();
  renderInfo(p);
  upgradeArt(p);

  fade(veil, 0, 1, 500);
  fade(info, 0, 1, 500);
  await flight(thumb, false);
  busy = false;
}

async function closeViewer() {
  if (busy || !viewer.open) return;
  busy = true;
  const tile = tiles[index];
  const thumb = thumbOf(index);

  // The viewer may have been stepped to a painting that is off screen
  const rect = tile.getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > innerHeight) {
    tile.scrollIntoView({ block: 'center', behavior: 'instant' });
  }
  tile.classList.add('in', 'now');

  fade(info, 1, 0, 260);
  fade(veil, 1, 0, 460);
  fade(viewer.querySelector('.close'), 1, 0, 200);
  await flight(thumb, true);
  viewer.close();
}

async function step(by) {
  if (busy) return;
  busy = true;
  const n = paintings.length;
  const direction = Math.sign(by);
  thumbOf(index).style.visibility = '';
  index = (index + by + n) % n;
  const p = paintings[index];
  const thumb = thumbOf(index);

  const out = art.animate(
    [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${direction * -36}px)` }],
    { duration: ms(200), easing: 'ease-in', fill: 'forwards' }
  );
  await out.finished;

  art.src = imageUrl(p, 960);
  art.alt = thumb.alt;
  fitArt();
  await art.decode().catch(() => {});
  renderInfo(p);
  upgradeArt(p);
  viewer.scrollTop = 0;

  const back = art.animate(
    [{ opacity: 0, transform: `translateX(${direction * 36}px)` }, { opacity: 1, transform: 'none' }],
    { duration: ms(420), easing: EASE, fill: 'backwards' }
  );
  out.cancel();
  await back.finished;
  busy = false;
}

// Runs for every way the dialog can close, including a native Esc
viewer.addEventListener('close', () => {
  viewer.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
  root.classList.remove('viewing');
  const thumb = thumbOf(index);
  thumb.style.visibility = '';
  tiles[index].querySelector('.work').focus({ preventScroll: true });
  art.removeAttribute('src');
  busy = false;
});

viewer.addEventListener('cancel', event => {
  event.preventDefault();
  closeViewer();
});

viewer.addEventListener('click', event => {
  if (event.target === viewer || event.target === veil || event.target === stage) closeViewer();
});

viewer.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') step(1);
  if (event.key === 'ArrowLeft') step(-1);
});

viewer.querySelector('.close').addEventListener('click', closeViewer);
viewer.querySelector('.next').addEventListener('click', () => step(1));
viewer.querySelector('.prev').addEventListener('click', () => step(-1));

addEventListener('resize', () => { if (viewer.open) fitArt(); });
