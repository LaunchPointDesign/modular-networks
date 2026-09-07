import * as THREE from 'three';

(() => {
  const section = document.getElementById('solutions');
  const wrap = document.getElementById('traceWrap');
  const pin = document.getElementById('tracePin');
  const canvas = document.getElementById('traceCanvas');
  const head = document.getElementById('traceHead');
  const cards = [...document.querySelectorAll('#traceCards .sol-card')];
  const dots = [...document.querySelectorAll('#traceProgress .dot')];
  const hint = section?.querySelector('.trace-hint');
  const hud = document.getElementById('traceHud');
  const hudIdx = document.getElementById('traceIdx');
  const hudTitle = document.getElementById('traceTitle');
  const hudCoord = document.getElementById('traceCoord');
  if (!section || !wrap || !pin || !canvas) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => matchMedia('(max-width: 820px)').matches;
  let hasGL = false;
  try { const c = document.createElement('canvas'); hasGL = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { hasGL = false; }
  if (reduce || !hasGL) return;

  /* ---------- tokens (match hero grid) ---------- */
  const NAVY = new THREE.Color(0x0B1E3F), ACCENT = new THREE.Color(0x19C8CD), FOG = 0xf7f8fa;
  const SEGS = 4, INTRO = 0.1, SEG = (1 - INTRO) / SEGS, DRAW = 0.6, SCROLL_VH = 5.4;
  const S = 2.2, TH = 0.055; // lattice spacing, trace thickness
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const titles = cards.map(c => c.querySelector('.sol-title')?.textContent.trim() || '');

  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(FOG, 16, 68);
  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 220);

  /* ---------- lattice: 3D version of the hero dot grid ---------- */
  const L = { x: [-7, 7], y: [-11, 3], z: [-7, 7] };
  const latticePts = [];
  for (let i = L.x[0]; i <= L.x[1]; i++) for (let j = L.y[0]; j <= L.y[1]; j++) for (let k = L.z[0]; k <= L.z[1]; k++) latticePts.push([i, j, k]);
  {
    const pos = new Float32Array(latticePts.length * 3);
    latticePts.forEach(([i, j, k], n) => { pos[n * 3] = i * S; pos[n * 3 + 1] = j * S; pos[n * 3 + 2] = k * S; });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: NAVY, size: 0.075, sizeAttenuation: true, transparent: true, opacity: 0.24, depthWrite: false })));
  }
  // a few lit dots scattered through the field
  {
    const picks = [], seen = new Set();
    while (picks.length < 26) { const n = Math.floor(Math.random() * latticePts.length); if (seen.has(n)) continue; seen.add(n); picks.push(latticePts[n]); }
    const pos = new Float32Array(picks.length * 3);
    picks.forEach(([i, j, k], n) => { pos[n * 3] = i * S; pos[n * 3 + 1] = j * S; pos[n * 3 + 2] = k * S; });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: ACCENT, size: 0.14, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false })));
  }
  // sparse orthogonal connections, same restraint as the hero SVG
  {
    const verts = [];
    const push = (a, b) => { verts.push(a[0] * S, a[1] * S, a[2] * S, b[0] * S, b[1] * S, b[2] * S); };
    for (const [i, j, k] of latticePts) {
      if (i < L.x[1] && Math.random() < 0.14) push([i, j, k], [i + 1, j, k]);
      if (j < L.y[1] && Math.random() < 0.07) push([i, j, k], [i, j + 1, k]);
      if (k < L.z[1] && Math.random() < 0.07) push([i, j, k], [i, j, k + 1]);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: NAVY, transparent: true, opacity: 0.07, depthWrite: false })));
  }

  /* ---------- route: right-angle path along the lattice ---------- */
  // each leg is an explicit chain of lattice waypoints, so every route has its own
  // rhythm: number of turns, which axis leads, and how far it dives through Z
  const ROUTE = [
    // 01 — short step out and toward the viewer
    [[0, 0, 0], [-2, 0, 0], [-2, -1, 0], [-2, -1, 3], [-3, -1, 3], [-3, -2, 3]],
    // 02 — long descent, then a deep push away into Z
    [[-3, -2, 3], [-3, -4, 3], [1, -4, 3], [1, -4, -2], [1, -5, -2], [-1, -5, -2]],
    // 03 — wide lateral sweep with a staircase down
    [[-1, -5, -2], [-1, -6, -2], [4, -6, -2], [4, -6, 2], [4, -7, 2], [4, -7, 5], [3, -7, 5]],
    // 04 — spiral back across and below the start
    [[3, -7, 5], [3, -9, 5], [3, -9, 0], [-1, -9, 0], [-1, -10, 0], [-1, -10, -3], [0, -10, -3]],
  ];
  const v3 = ([i, j, k]) => new THREE.Vector3(i * S, j * S, k * S);
  const W = [ROUTE[0][0], ...ROUTE.map(r => r[r.length - 1])];
  const legs = ROUTE.map(chain => {
    const edges = [];
    for (let n = 0; n < chain.length - 1; n++) {
      const a = chain[n], b = chain[n + 1];
      const ax = a[0] !== b[0] ? 0 : a[1] !== b[1] ? 1 : 2;
      edges.push({ a: v3(a), b: v3(b), ax });
    }
    return { edges, len: edges.reduce((s, e) => s + e.a.distanceTo(e.b), 0) };
  });

  // faint ghost of the whole route
  {
    const verts = [];
    legs.forEach(l => l.edges.forEach(e => verts.push(e.a.x, e.a.y, e.a.z, e.b.x, e.b.y, e.b.z)));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: NAVY, transparent: true, opacity: 0.14 })));
  }

  // lit trace: one square-section bar per edge, grown from its start
  const traceMat = new THREE.MeshBasicMaterial({ color: ACCENT });
  const glowMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false });
  legs.forEach(leg => leg.edges.forEach(e => {
    const len = e.a.distanceTo(e.b), dir = Math.sign((e.ax === 0 ? e.b.x - e.a.x : e.ax === 1 ? e.b.y - e.a.y : e.b.z - e.a.z));
    const mk = (t, m) => {
      const dim = [t, t, t]; dim[e.ax] = len;
      const g = new THREE.BoxGeometry(dim[0], dim[1], dim[2]);
      const off = [0, 0, 0]; off[e.ax] = (len / 2) * dir;
      g.translate(off[0], off[1], off[2]);
      const mesh = new THREE.Mesh(g, m); mesh.position.copy(e.a); scene.add(mesh); return mesh;
    };
    e.bar = mk(TH, traceMat); e.halo = mk(TH * 4.5, glowMat); e.len = len;
  }));
  const setEdge = (e, f) => {
    const s = ['scale'][0], k = e.ax === 0 ? 'x' : e.ax === 1 ? 'y' : 'z';
    e.bar.scale[k] = Math.max(0.0001, f); e.halo.scale[k] = Math.max(0.0001, f);
    e.bar.visible = e.halo.visible = f > 0.001;
  };
  const pointOnLeg = (n, f) => {
    const leg = legs[n]; let d = f * leg.len;
    for (const e of leg.edges) { if (d <= e.len) return e.a.clone().lerp(e.b, e.len ? d / e.len : 0); d -= e.len; }
    return leg.edges[leg.edges.length - 1].b.clone();
  };
  const drawLeg = (n, f) => { const leg = legs[n]; let d = f * leg.len; leg.edges.forEach(e => { const t = Math.min(1, Math.max(0, d / e.len)); setEdge(e, t); d -= e.len; }); };

  /* ---------- glow sprite ---------- */
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.22, 'rgba(255,255,255,.5)'); r.addColorStop(0.6, 'rgba(255,255,255,.12)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const glowSprite = (scale, opacity, color = ACCENT) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(scale); return s; };

  const pulse = new THREE.Group();
  pulse.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 20), new THREE.MeshBasicMaterial({ color: 0xffffff })));
  const pulseGlow = glowSprite(1.3, 0.75); pulse.add(pulseGlow); scene.add(pulse);

  /* ---------- node markers: wireframe cage + flat icon, echoing the accent dots ---------- */
  const iconTex = cards.map(card => {
    const svg = card.querySelector('.sol-visual svg'); if (!svg) return null;
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', '256'); clone.setAttribute('height', '256');
    clone.querySelectorAll('*').forEach(el => { if (el.getAttribute('stroke')) el.setAttribute('stroke', '#ffffff'); if (el.getAttribute('fill') && el.getAttribute('fill') !== 'none') el.setAttribute('fill', '#ffffff'); });
    clone.setAttribute('stroke', '#ffffff');
    const tex = new THREE.Texture(); const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 256; c.getContext('2d').drawImage(img, 0, 0, 256, 256); tex.image = c; tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true; };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
    return tex;
  });

  const nodes = [];
  const addNode = (pos, isHub, texIdx) => {
    const g = new THREE.Group(); g.position.copy(pos);
    const size = isHub ? 0.11 : 0.09;
    const core = new THREE.Mesh(new THREE.SphereGeometry(size, 24, 24), new THREE.MeshBasicMaterial({ color: NAVY.clone() })); g.add(core);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(size * 2.4, 24, 24), new THREE.MeshBasicMaterial({ color: NAVY.clone(), transparent: true, opacity: 0.1, depthWrite: false })); g.add(halo);
    let icon = null;
    if (texIdx != null && iconTex[texIdx]) {
      icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex[texIdx], color: NAVY.clone(), transparent: true, opacity: 0.9, depthWrite: false }));
      icon.scale.setScalar(0.62); icon.position.y = 0.7; g.add(icon);
    }
    const glow = glowSprite(2.6, 0); g.add(glow);
    scene.add(g);
    nodes.push({ g, halo, core, icon, glow, lit: isHub ? 1 : 0, target: isHub ? 1 : 0, baseY: pos.y, isHub, size });
  };
  addNode(v3(W[0]), true, null);
  for (let n = 1; n <= SEGS; n++) addNode(v3(W[n]), false, n - 1);

  /* ---------- packets on lit legs ---------- */
  const packets = Array.from({ length: SEGS * 3 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    m.add(glowSprite(0.7, 0.5)); m.visible = false; scene.add(m);
    return { m, leg: Math.floor(i / 3), off: (i % 3) / 3, speed: 0.1 + Math.random() * 0.05 };
  });

  /* ---------- state ---------- */
  let pTarget = 0, p = 0, active = false, running = false, last = performance.now(), initialised = false, hudSeg = -2;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), desiredPos = new THREE.Vector3(), desiredLook = new THREE.Vector3();
  const offset = new THREE.Vector3(), tmp = new THREE.Vector3(), lookOff = new THREE.Vector3();
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { mouse.tx = (e.clientX / innerWidth - 0.5) * 2; mouse.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });

  const onScreen = () => { const r = wrap.getBoundingClientRect(); return r.bottom > -innerHeight * 0.25 && r.top < innerHeight * 1.25; };
  const kick = () => { if (running) return; running = true; active = true; last = performance.now(); requestAnimationFrame(frame); };
  const readScroll = () => {
    const rect = wrap.getBoundingClientRect(), total = wrap.offsetHeight - innerHeight;
    pTarget = total > 0 ? Math.min(Math.max(-rect.top, 0), total) / total : 0;
    if (onScreen()) kick();
  };
  const stateAt = (q) => { if (q < INTRO) return { seg: -1, t: 0, drawT: 0 }; const s = (q - INTRO) / SEG, seg = Math.min(SEGS - 1, Math.floor(s)), t = Math.min(1, s - seg); return { seg, t, drawT: Math.min(1, t / DRAW) }; };
  const resize = () => { const w = pin.clientWidth, h = pin.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };

  const applyMode = () => {
    const on = !isMobile();
    section.classList.toggle('is-3d', on);
    if (on) {
      wrap.style.height = Math.round(innerHeight * SCROLL_VH) + 'px';
      cards.forEach(c => { c.classList.remove('flow-up', 'reveal'); c.classList.add('in'); c.style.transitionDelay = ''; });
      resize(); readScroll(); if (!initialised) { p = pTarget; initialised = true; }
    } else {
      wrap.style.height = '';
      cards.forEach(c => { c.classList.remove('is-active'); c.style.left = c.style.top = ''; });
      head.style.opacity = ''; head.style.transform = '';
    }
    return on;
  };

  const placeCard = (card, node, w, h) => {
    tmp.copy(node.g.position).project(camera);
    const x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
    const cw = card.offsetWidth || 400, ch = card.offsetHeight || 400, gutter = 32;
    let left = x + 96, side = 'right';
    if (left + cw > w - gutter) { left = x - 96 - cw; side = 'left'; }
    left = Math.min(Math.max(left, gutter), w - cw - gutter);
    const minTop = ch / 2 + 80;
    let maxTop = h - ch / 2 - 40;
    if (side === 'left' && hud) { const hr = hud.getBoundingClientRect(), pr = pin.getBoundingClientRect(); const hudTop = hr.top - pr.top; if (left < hr.right - pr.left + 16) maxTop = Math.min(maxTop, hudTop - 16 - ch / 2); }
    card.style.left = left + 'px';
    card.style.top = (maxTop < minTop ? h / 2 + 20 : Math.min(Math.max(y, minTop), maxTop)) + 'px';
    card.dataset.side = side;
  };

  const setHud = (seg) => {
    if (seg === hudSeg || !hud) return; hudSeg = seg;
    hud.classList.toggle('is-on', seg >= 0);
    if (seg >= 0) { hud.classList.add('is-swap'); setTimeout(() => { hudIdx.textContent = String(seg + 1).padStart(2, '0'); hudTitle.textContent = titles[seg] || ''; hud.classList.remove('is-swap'); }, 220); }
  };

  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!section.classList.contains('is-3d')) { running = false; return; }
    p += (pTarget - p) * (1 - Math.exp(-dt * 5.5));
    mouse.x += (mouse.tx - mouse.x) * (1 - Math.exp(-dt * 3)); mouse.y += (mouse.ty - mouse.y) * (1 - Math.exp(-dt * 3));
    const st = stateAt(p), time = now / 1000;

    // trace reveal
    legs.forEach((leg, n) => drawLeg(n, st.seg < 0 ? 0 : n < st.seg ? 1 : n === st.seg ? st.drawT : 0));
    const headPt = st.seg < 0 ? v3(W[0]) : pointOnLeg(st.seg, st.drawT);
    pulse.position.copy(headPt);
    const drawing = st.seg >= 0 && st.drawT < 1;
    const ps = drawing ? 1 : Math.max(0, 1 - (st.t - DRAW) * 10);
    pulse.scale.setScalar(Math.max(0.001, ps)); pulse.visible = ps > 0.01;
    pulseGlow.material.opacity = 0.65 + Math.sin(time * 7) * 0.2;

    packets.forEach(pk => {
      const lit = st.seg > pk.leg || (st.seg === pk.leg && st.drawT >= 1);
      pk.m.visible = lit;
      if (lit) { const f = (time * pk.speed + pk.off) % 1; pk.m.position.copy(pointOnLeg(pk.leg, f)); const fade = Math.sin(f * Math.PI); pk.m.scale.setScalar(0.55 + fade * 0.6); pk.m.children[0].material.opacity = 0.2 + fade * 0.45; }
    });

    // nodes
    nodes.forEach((n, i) => {
      if (!n.isHub) { const idx = i - 1; n.target = st.seg > idx ? 1 : (st.seg === idx ? smooth(DRAW, DRAW + 0.14, st.t) : 0); }
      n.lit += (n.target - n.lit) * (1 - Math.exp(-dt * 6));
      const c = NAVY.clone().lerp(ACCENT, n.lit);
      n.core.material.color.copy(c);
      n.halo.material.color.copy(c);
      n.halo.material.opacity = 0.1 + n.lit * 0.16;
      n.halo.scale.setScalar(1 + n.lit * 0.25 + Math.sin(time * 1.8 + i) * 0.05);
      if (n.icon) { n.icon.material.color.copy(c); n.icon.material.opacity = 0.75 + n.lit * 0.25; }
      n.glow.material.opacity = n.lit * (0.2 + Math.sin(time * 1.6 + i) * 0.05);
      n.g.position.y = n.baseY + Math.sin(time * 0.6 + i * 1.7) * 0.05;
      n.g.scale.setScalar(1 + n.lit * 0.15);
    });

    // camera — travels down, sideways and through Z
    const follow = st.seg < 0 ? v3(W[0]) : headPt;
    // full orbit: ~1.6 turns across the section, with a gentle rise and fall
    const theta = 0.6 + p * Math.PI * 3.2 + mouse.x * 0.25;
    const dist = st.seg < 0 ? 11 : 8.2;
    const elev = 1.6 + Math.sin(p * Math.PI * 2.4) * 1.4 - mouse.y * 0.4;
    offset.set(Math.sin(theta) * dist, elev, Math.cos(theta) * dist);
    desiredPos.copy(follow).add(offset);
    // look slightly ahead of the head, offset toward the card side so the text gets room
    desiredLook.copy(follow).add(lookOff.set(Math.cos(theta) * 0.9, -0.05 - mouse.y * 0.12, -Math.sin(theta) * 0.9));
    const k = 1 - Math.exp(-dt * 3.2);
    camPos.lerp(desiredPos, k); camLook.lerp(desiredLook, k);
    camera.position.copy(camPos); camera.lookAt(camLook);

    // overlays
    const w = pin.clientWidth, h = pin.clientHeight;
    const headOp = 1 - smooth(0.02, INTRO * 0.9, p);
    head.style.opacity = headOp.toFixed(3); head.style.transform = `translateY(${(-24 * (1 - headOp)).toFixed(1)}px)`;
    if (hint) hint.style.opacity = (1 - smooth(0, 0.05, p)).toFixed(3);
    cards.forEach((c, i) => { const on = st.seg === i && st.t > DRAW + 0.06; c.classList.toggle('is-active', on); if (on || c.classList.contains('is-active')) placeCard(c, nodes[i + 1], w, h); });
    dots.forEach((d, i) => d.classList.toggle('is-active', st.seg >= i));
    setHud(st.seg);
    if (hudCoord) hudCoord.textContent = `x ${camPos.x.toFixed(1)}  y ${camPos.y.toFixed(1)}  z ${camPos.z.toFixed(1)}`;

    renderer.render(scene, camera);
    // keep rendering while on screen or still easing toward the target
    if ((active && onScreen()) || Math.abs(pTarget - p) > 0.0002) requestAnimationFrame(frame);
    else running = false;
  };

  const io = new IntersectionObserver((entries) => { entries.forEach(e => { active = e.isIntersecting; if (active) kick(); }); }, { rootMargin: '25% 0px 25% 0px' });
  io.observe(wrap);
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', () => { applyMode(); resize(); readScroll(); kick(); });
  if (applyMode()) {
    offset.set(2.4, 1.7, 11); camPos.copy(v3(W[0])).add(offset); camLook.copy(v3(W[0]));
    camera.position.copy(camPos); camera.lookAt(camLook);
    if (onScreen()) kick();
  }
})();
