/* Coquin · visualizador 3D (Three.js)
   - Abas de cena (Coco / Carrinho) e alternância "Por fora / Por dentro".
   - Marcadores numerados sobre o modelo + card com Anterior / Próximo (a câmera vai até o ponto).
   - Carrega os .glb listados em /models/models.json. Enquanto não existem (null), monta um
     modelo provisório em código (placeholder), para o site já funcionar.
   - No .glb, objetos chamados "fora" e "dentro" são mostrados/ocultados pela alternância.
   Os textos dos marcadores ficam em SCENES, logo abaixo. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const SCENES = {
  coco: {
    fora: [
      { t: 'Quenga do coco', d: 'O gelato é servido na casca do coco natural, a quenga. Bonito, sustentável e único.', p: [0.95, -0.35, 0.55], c: [2.6, 0.6, 2.4] },
      { t: 'Gelato tailandês', d: 'Cremoso e leve, preparado de forma artesanal pela Coquin.', p: [0.0, 0.95, 0.35], c: [0.4, 2.4, 2.9] },
      { t: 'Coco tostado', d: 'Finalização com lascas de coco tostado, para dar crocância.', p: [-0.42, 0.78, 0.42], c: [-1.8, 2.2, 2.4] },
      { t: 'Sem lactose e sem glúten', d: 'Testado e aprovado: todo mundo da mesa pode aproveitar.', p: [0.42, 0.62, -0.5], c: [1.6, 1.9, -2.6] },
    ],
    dentro: [
      { t: 'Polpa do coco', d: 'Por dentro, a casca guarda a polpa branca da própria fruta.', p: [0.0, -0.2, 0.62], c: [0.2, 2.6, 2.2] },
      { t: 'Gelato servido em bolas', d: 'Bolas de gelato tailandês montadas na hora, sobre o coco.', p: [0.0, 1.55, 0.5], c: [0.6, 2.8, 3.0] },
      { t: 'Casca natural', d: 'A espessura da casca mantém o gelato firme por mais tempo.', p: [-1.04, 0.0, 0.0], c: [-3.0, 1.0, 1.2] },
    ],
  },
  carrinho: {
    fora: [
      { t: 'Carrinho Coquin', d: 'O carrinho verde oliva é a identidade da Coquin nos pontos de venda e eventos.', p: [0.0, 0.25, 0.48], c: [0.6, 1.6, 4.2] },
      { t: 'Guarda-sol', d: 'Sombra para o produto e para quem atende, em qualquer ponto ao ar livre.', p: [0.0, 2.35, 0.0], c: [2.4, 3.6, 3.0] },
      { t: 'Rodas', d: 'Fácil de levar para beach clubs, festas e eventos.', p: [-0.9, -0.55, 0.42], c: [-3.0, 0.6, 2.6] },
    ],
    dentro: [
      { t: 'Freezer', d: 'Mantém o gelato na temperatura certa durante todo o atendimento.', p: [0.0, 0.62, 0.0], c: [0.0, 3.2, 2.2] },
      { t: 'Cubas de gelato', d: 'O gelato fica pronto para ser servido, direto na quenga.', p: [0.42, 0.66, 0.05], c: [1.6, 2.8, 2.0] },
      { t: 'Tampa', d: 'Abre para servir e fecha para conservar.', p: [0.0, 1.25, -0.6], c: [-1.2, 2.6, 3.0] },
    ],
  },
};

const $ = (s, r = document) => r.querySelector(s);
const root = $('#visualizador');
const stage = $('.stage', root), panel = $('.panel', root);
let renderer, scene, camera, controls, current = 'coco', mode = 'fora', active = 0;
const models = {}; let markerEls = [];
let tween = null, lastUser = 0, visible = true;

const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ---------------- texturas feitas no navegador (sem baixar nada) ---------------- */
function fiberTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#7A4A26'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * 512, y = Math.random() * 256, l = 8 + Math.random() * 30;
    g.strokeStyle = `rgba(${40 + Math.random() * 90},${20 + Math.random() * 45},${8 + Math.random() * 20},${.25 + Math.random() * .5})`;
    g.lineWidth = .6 + Math.random() * 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 4, y + l); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 10, 128, 128, 128); r.addColorStop(0, 'rgba(60,40,20,.45)'); r.addColorStop(1, 'rgba(60,40,20,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
}
const groundShadow = (w, y) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = y; return m;
};

/* ---------------- modelo provisório: gelato no coco ---------------- */
function buildCoco() {
  const g = new THREE.Group();
  const prof = (r, depth, rim) => { const pts = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * r, -Math.cos(a) * depth + rim)); } return pts; };
  const shell = new THREE.Mesh(new THREE.LatheGeometry(prof(1.05, 0.95, 0.05), 72),
    new THREE.MeshStandardMaterial({ map: fiberTexture(), roughness: .95, side: THREE.FrontSide }));
  const pulp = new THREE.Mesh(new THREE.LatheGeometry(prof(0.97, 0.87, 0.05), 72),
    new THREE.MeshStandardMaterial({ color: '#F4EEE2', roughness: .7, side: THREE.BackSide }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.01, 0.045, 12, 96), new THREE.MeshStandardMaterial({ color: '#EFE6D6', roughness: .8 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.05;
  const bowl = new THREE.Group(); bowl.add(shell, pulp, rim); bowl.name = 'casca'; g.add(bowl);

  const scoopMat = new THREE.MeshStandardMaterial({ color: '#F1E1C8', roughness: .9 });
  const toastMat = new THREE.MeshStandardMaterial({ color: '#B8763C', roughness: .8 });
  const scoops = new THREE.Group(); scoops.name = 'gelato';
  const place = [[-0.36, 0.3, 0.2], [0.38, 0.3, 0.18], [0.0, 0.32, -0.36], [0.0, 0.78, 0.0]];
  place.forEach(([x, y, z], i) => {
    const geo = new THREE.SphereGeometry(i === 3 ? 0.44 : 0.46, 48, 32); const pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) { const v = new THREE.Vector3().fromBufferAttribute(pos, k); const n = 1 + (Math.sin(v.x * 23) * Math.cos(v.y * 19) * Math.sin(v.z * 17)) * 0.025; pos.setXYZ(k, v.x * n, v.y * n * 0.92, v.z * n); }
    geo.computeVertexNormals();
    const s = new THREE.Mesh(geo, scoopMat); s.position.set(x, y, z); scoops.add(s);
    for (let k = 0; k < 40; k++) {
      const th = Math.random() * Math.PI * 2, ph = Math.random() * 0.9; const r = i === 3 ? 0.44 : 0.46;
      const flake = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.03), toastMat);
      flake.position.set(x + Math.sin(ph) * Math.cos(th) * r, y + Math.cos(ph) * r * 0.92, z + Math.sin(ph) * Math.sin(th) * r);
      flake.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); scoops.add(flake);
    }
  });
  const stick = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.85, 0.03, 3, 0.03), new THREE.MeshStandardMaterial({ color: '#E2B97F', roughness: .85 }));
  stick.position.set(0.32, 1.15, -0.1); stick.rotation.z = -0.35; scoops.add(stick);
  g.add(scoops);
  g.add(groundShadow(3.4, -0.92));
  g.userData.setMode = (m, t) => {   // por dentro: as bolas sobem e a casca fica à mostra
    scoops.position.y = THREE.MathUtils.lerp(scoops.position.y, m === 'dentro' ? 0.85 : 0, t);
    scoops.position.z = THREE.MathUtils.lerp(scoops.position.z, m === 'dentro' ? 0.15 : 0, t);
  };
  return g;
}

/* ---------------- modelo provisório: carrinho verde oliva ---------------- */
function buildCart() {
  const g = new THREE.Group();
  const olive = new THREE.MeshStandardMaterial({ color: '#5F6E45', roughness: .55, metalness: .05 });
  const cream = new THREE.MeshStandardMaterial({ color: '#F1E9DA', roughness: .8 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2A2F27', roughness: .6 });
  const metal = new THREE.MeshStandardMaterial({ color: '#C9C6BE', roughness: .3, metalness: .8 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.95, 0.95, 4, 0.08), olive); body.position.y = 0.05; g.add(body);
  const base = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.08, 1.02, 3, 0.03), cream); base.position.y = -0.46; g.add(base);
  // logo na frente
  const tex = new THREE.TextureLoader().load('/img/logo-coquin-oficial-branca.png'); tex.colorSpace = THREE.SRGBColorSpace;
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.29), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  logo.position.set(0, 0.08, 0.481); g.add(logo);
  // freezer (por dentro)
  const well = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, 0.7), dark); well.position.y = 0.535; g.add(well);
  [-0.42, 0, 0.42].forEach(x => { const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.12, 32), new THREE.MeshStandardMaterial({ color: '#F5EBDB', roughness: .9 })); tub.position.set(x, 0.6, 0.02); g.add(tub); });
  // tampa com dobradiça atrás
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.585, -0.47);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(1.92, 0.06, 0.96, 3, 0.03), cream); lid.position.set(0, 0, 0.47); lidPivot.add(lid); g.add(lidPivot);
  // rodas e pés
  [[-0.8, 0.5], [-0.8, -0.5]].forEach(([x, z]) => {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 14, 40), dark); w.position.set(x, -0.62, z); g.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16), metal); hub.rotation.x = Math.PI / 2; hub.position.set(x, -0.62, z); g.add(hub);
  });
  [[0.85, 0.42], [0.85, -0.42]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.36, 12), metal); l.position.set(x, -0.66, z); g.add(l); });
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 10, 30, Math.PI), metal); handle.rotation.set(0, Math.PI / 2, Math.PI / 2); handle.position.set(1.1, 0.1, 0); g.add(handle);
  // guarda-sol
  const umbrella = new THREE.Group(); g.add(umbrella);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 12), metal); pole.position.set(0, 1.45, -0.3); umbrella.add(pole);
  const canopyGeo = new THREE.ConeGeometry(1.35, 0.42, 16, 1, true); const cols = []; const pos = canopyGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const a = Math.atan2(pos.getZ(i), pos.getX(i)); const s = Math.floor((a + Math.PI) / (Math.PI / 4)) % 2; const c = new THREE.Color(s ? '#F1E9DA' : '#4E6B50'); cols.push(c.r, c.g, c.b); }
  canopyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const canopy = new THREE.Mesh(canopyGeo.toNonIndexed(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, side: THREE.DoubleSide, flatShading: true }));
  canopy.position.set(0, 2.35, -0.3); umbrella.add(canopy);
  g.add(groundShadow(4.2, -0.84));
  g.position.y = -0.1;
  g.userData.setMode = (m, t) => { lidPivot.rotation.x = THREE.MathUtils.lerp(lidPivot.rotation.x, m === 'dentro' ? -1.25 : 0, t); umbrella.visible = m !== 'dentro'; };
  return g;
}

/* ---------------- .glb real (quando existir) ---------------- */
async function tryGlb(url) {
  if (!url) return null;
  const gltf = await new GLTFLoader().loadAsync(url); const m = gltf.scene;
  const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  const k = 2.2 / Math.max(size.x, size.y, size.z); m.scale.setScalar(k); m.position.sub(ctr.multiplyScalar(k));
  const g = new THREE.Group(); g.add(m); g.add(groundShadow(3.6, -size.y * k / 2));
  const fora = m.getObjectByName('fora'), dentro = m.getObjectByName('dentro');
  g.userData.setMode = mm => { if (fora) fora.visible = mm === 'fora' || !dentro; if (dentro) dentro.visible = mm === 'dentro'; };
  return g;
}

/* ---------------- interface ---------------- */
function markers() { return SCENES[current][mode]; }
function buildMarkers() {
  markerEls.forEach(b => b.remove());
  markerEls = markers().map((m, i) => {
    const b = document.createElement('button'); b.className = 'mk'; b.type = 'button'; b.textContent = i + 1;
    b.setAttribute('aria-label', (i + 1) + '. ' + m.t); b.addEventListener('click', () => go(i)); stage.appendChild(b); return b;
  });
}
function renderPanel() {
  const ms = markers(), m = ms[active];
  $('.pn', panel).textContent = active + 1;
  $('.pc', panel).textContent = (active + 1) + ' de ' + ms.length;
  $('h3', panel).textContent = m.t; $('p', panel).textContent = m.d;
  $('.dots', panel).innerHTML = ms.map((_, i) => '<i class="' + (i === active ? 'on' : '') + '"></i>').join('');
  markerEls.forEach((b, i) => b.classList.toggle('on', i === active));
}
function flyTo(m) {
  if (!camera) return;
  tween = { t0: performance.now(), d: 1100, p0: camera.position.clone(), p1: (() => { const v = new THREE.Vector3(...m.c); return v.setLength(Math.max(v.length(), 5.6 * Math.max(1, 1.12 / camera.aspect))); })(), q0: controls.target.clone(), q1: new THREE.Vector3(...m.p).multiplyScalar(.35) };
}
function go(i) { const n = markers().length; active = (i + n) % n; renderPanel(); flyTo(markers()[active]); }
function setScene(id) {
  current = id; active = 0;
  Object.entries(models).forEach(([k, m]) => m.visible = k === id);
  root.querySelectorAll('[data-scene]').forEach(b => b.setAttribute('aria-pressed', b.dataset.scene === id));
  buildMarkers(); renderPanel(); flyTo(markers()[0]);
}
function setMode(m) {
  mode = m; active = 0;
  root.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
  buildMarkers(); renderPanel(); flyTo(markers()[0]);
}

const _v = new THREE.Vector3(), _w = new THREE.Vector3();
function placeMarkers() {
  const w = stage.clientWidth, h = stage.clientHeight; const ms = markers(); const model = models[current];
  ms.forEach((m, i) => {
    const el = markerEls[i]; if (!el) return;
    _v.set(...m.p); if (model) _v.add(model.position);
    _w.copy(_v).sub(camera.position).normalize();
    const nrm = new THREE.Vector3(m.p[0], m.p[1] * 0.4, m.p[2]).normalize();
    const facing = nrm.dot(_w) < 0.25 || i === active;
    _v.project(camera);
    el.style.transform = `translate(${(_v.x + 1) / 2 * w}px,${(1 - _v.y) / 2 * h}px)`;
    el.classList.toggle('hidden', !facing || _v.z > 1);
  });
}

function loop(now) {
  requestAnimationFrame(loop);
  if (!visible) return;
  if (tween) {
    const k = Math.min(1, (now - tween.t0) / tween.d), e = easeInOut(k);
    camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.q0, tween.q1, e);
    if (k >= 1) tween = null;
  }
  controls.autoRotate = !tween && now - lastUser > 5000;
  controls.update();
  Object.values(models).forEach(m => m.userData.setMode && m.userData.setMode(mode, 0.08));
  placeMarkers();
  renderer.render(scene, camera);
}

export async function start() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  stage.prepend(renderer.domElement);
  scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const sun = new THREE.DirectionalLight('#fff4e6', 1.6); sun.position.set(3, 5, 4); scene.add(sun, new THREE.HemisphereLight('#fff8ee', '#d9c6a8', 0.5));
  camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100); camera.position.set(3.4, 2.4, 4.4);
  controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: .08, enablePan: false, minDistance: 2.4, maxDistance: 8, maxPolarAngle: Math.PI * 0.62, autoRotateSpeed: 0.6 });
  controls.addEventListener('start', () => { tween = null; lastUser = performance.now(); });
  controls.addEventListener('end', () => { lastUser = performance.now(); });
  const resize = () => { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(stage); resize();
  new IntersectionObserver(es => es.forEach(e => visible = e.isIntersecting)).observe(stage);

  let list = {}; try { list = await (await fetch('/models/models.json', { cache: 'no-cache' })).json(); } catch (_) {}
  const glb = id => list[id] ? tryGlb('/models/' + list[id]).catch(() => null) : null;
  const [coco, cart] = await Promise.all([glb('coco'), glb('carrinho')]);
  models.coco = coco || buildCoco(); models.carrinho = cart || buildCart();
  Object.values(models).forEach(m => scene.add(m));
  setScene('coco'); requestAnimationFrame(loop);
  stage.classList.add('ready');
}

root.querySelectorAll('[data-scene]').forEach(b => b.addEventListener('click', () => setScene(b.dataset.scene)));
root.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
$('.pv', panel).addEventListener('click', () => go(active - 1));
$('.nx', panel).addEventListener('click', () => go(active + 1));
stage.addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(active + 1); if (e.key === 'ArrowLeft') go(active - 1); });
