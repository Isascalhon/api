import * as THREE from 'three';
import AudioManager from './AudioManager';

const RX = 60, RZ = 36, WIDTH = 16, LAPS = 3, TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, k) => THREE.MathUtils.lerp(a, b, 1 - Math.exp(-k));

export default class GameManager {
  constructor(canvas, { onSnapshot = () => {} } = {}) {
    this.canvas = canvas; this.onSnapshot = onSnapshot;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#8bcdeb'); this.scene.fog = new THREE.Fog('#8bcdeb', 155, 340);
    this.camera = new THREE.PerspectiveCamera(56, 1, .1, 420);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1; this.renderer.shadowMap.enabled = false; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.15)); this.renderer.setSize(canvas.clientWidth || innerWidth, canvas.clientHeight || innerHeight, false);
    this.audio = new AudioManager(); this.state = 'menu'; this.quality = 'high'; this.keys = new Set(); this.touch = new Set();
    this.raceTime = 0; this.elapsed = 0; this.player = { distance: 0, lateral: -1.9, lateralVelocity: 0, speed: 0, turbo: 100, laps: 0, nextGate: 0, items: 0, score: 0 };
    this.rivals = []; this.finishOrder = []; this.result = null; this.items = []; this.hazards = []; this.particles = [];
    this.message = ''; this.messageLeft = 0; this.countdownLeft = 3; this.lastCountdown = null; this.lastCollision = -10; this.lastDust = 0; this.lastPublish = 0;
    this.seed = 8217; this.clock = new THREE.Clock(); this.contextLost = false;
    this.particleGeometry = new THREE.SphereGeometry(.08, 5, 4); this.sparkMaterial = new THREE.MeshBasicMaterial({ color: '#ffd166' });
    this.dustMaterial = new THREE.MeshBasicMaterial({ color: '#b7865d', transparent: true, opacity: .65 });
    this.lighting(); this.ground(); this.measureTrack(); this.track(); this.city(); this.tropicalLandmarks(); this.trackDetails();
    this.playerCar = this.car('LUNA', '#ff713d', '#ffd166', true);
    this.rivalCars = [this.car('MAX', '#43d8f2', '#e9fbff'), this.car('NIX', '#a886ff', '#ffcf6b')];
    this.pickupsAndHazards(); this.speedLines(); this.placeCars();
    this.frameBound = this.frame.bind(this); this.downBound = this.onKeyDown.bind(this); this.upBound = this.onKeyUp.bind(this);
    this.blurBound = () => this.clearInput(); this.lostBound = e => { e.preventDefault(); this.contextLost = true; this.publish(true); };
    this.restoredBound = () => { this.contextLost = false; this.renderer.resetState(); this.publish(true); };
    window.addEventListener('keydown', this.downBound); window.addEventListener('keyup', this.upBound); window.addEventListener('blur', this.blurBound);
    canvas.addEventListener('webglcontextlost', this.lostBound); canvas.addEventListener('webglcontextrestored', this.restoredBound);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas.parentElement || canvas);
    this.resize(); this.frameId = requestAnimationFrame(this.frameBound); this.publish(true);
  }
  rand() { this.seed = (this.seed * 1664525 + 1013904223) % 4294967296; return this.seed / 4294967296; }
  center(t) { return new THREE.Vector3(RX * Math.cos(t), 0, RZ * Math.sin(t)); }
  tangent(t) { return new THREE.Vector3(-RX * Math.sin(t), 0, RZ * Math.cos(t)).normalize(); }
  normal(t) { const v = this.tangent(t); return new THREE.Vector3(v.z, 0, -v.x).normalize(); }
  measureTrack() {
    let last = this.center(0), length = 0;
    for (let i = 1; i <= 720; i += 1) { const p = this.center(i / 720 * TAU); length += p.distanceTo(last); last = p; }
    this.lapLength = length; this.totalDistance = length * LAPS; this.player.nextGate = length;
  }
  pose(distance, lateral = 0) {
    const t = distance / this.lapLength * TAU, forward = this.tangent(t), side = this.normal(t);
    return { position: this.center(t).addScaledVector(side, lateral), forward, side, yaw: Math.atan2(-forward.x, -forward.z), angle: t };
  }
  lighting() {
    this.scene.add(new THREE.HemisphereLight('#e5f8ff', '#315948', 2.35));
    const sun = new THREE.DirectionalLight('#fff0ca', 3.2); sun.position.set(-55, 95, -25); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -100; sun.shadow.camera.right = 100; sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100; this.scene.add(sun);
    const cyan = new THREE.PointLight('#35caff', 20, 72); cyan.position.set(8, 23, 6); this.scene.add(cyan);
    const amber = new THREE.PointLight('#ff7143', 14, 68); amber.position.set(-35, 16, -12); this.scene.add(amber);
  }
  ground() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), new THREE.MeshStandardMaterial({ color: '#587760', roughness: .98 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.24; floor.receiveShadow = true; this.scene.add(floor);
    const grid = new THREE.GridHelper(420, 70, '#244153', '#192f3d'); grid.position.y = -.21; grid.material.transparent = true; grid.material.opacity = .08; this.scene.add(grid);
    const cloudGeometry = new THREE.SphereGeometry(1, 10, 7), cloudMaterial = new THREE.MeshStandardMaterial({ color: '#edfaff', roughness: 1, flatShading: true });
    const clouds = new THREE.InstancedMesh(cloudGeometry, cloudMaterial, 28), cloud = new THREE.Object3D();
    for (let i = 0; i < 28; i += 1) { cloud.position.set((this.rand() - .5) * 390, 34 + this.rand() * 34, (this.rand() - .5) * 390); cloud.scale.set(7 + this.rand() * 10, 2.4 + this.rand() * 3.5, 5 + this.rand() * 8); cloud.rotation.y = this.rand() * Math.PI; cloud.updateMatrix(); clouds.setMatrixAt(i, cloud.matrix); }
    clouds.instanceMatrix.needsUpdate = true; this.scene.add(clouds);
  }
  track() {
    const n = 360, verts = [], uv = [], idx = [];
    for (let i = 0; i <= n; i += 1) {
      const t = i / n * TAU, c = this.center(t), norm = this.normal(t);
      const inside = c.clone().addScaledVector(norm, -WIDTH / 2), outside = c.clone().addScaledVector(norm, WIDTH / 2);
      verts.push(inside.x, .015, inside.z, outside.x, .015, outside.z); uv.push(0, i / n * 48, 1, i / n * 48);
      if (i < n) { const a = i * 2; idx.push(a, a + 3, a + 1, a, a + 2, a + 3); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const road = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#273641', roughness: .84, metalness: .16, side: THREE.DoubleSide })); road.receiveShadow = true; this.scene.add(road);
    const outer = [], inner = [];
    for (let i = 0; i < 220; i += 1) { const t = i / 220 * TAU, c = this.center(t), norm = this.normal(t); outer.push(c.clone().addScaledVector(norm, WIDTH / 2 + .5).setY(.4)); inner.push(c.clone().addScaledVector(norm, -WIDTH / 2 - .5).setY(.36)); }
    this.scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outer, true), 700, .4, 7, true), new THREE.MeshStandardMaterial({ color: '#fc7141', emissive: '#e84123', emissiveIntensity: .35 })));
    this.scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(inner, true), 700, .3, 6, true), new THREE.MeshStandardMaterial({ color: '#3fc8ec', emissive: '#176f9a', emissiveIntensity: .3 })));
    const dashGeo = new THREE.BoxGeometry(.16, .045, 2.3), dashMat = new THREE.MeshBasicMaterial({ color: '#c3c6bd', transparent: true, opacity: .64 });
    const dashes = new THREE.InstancedMesh(dashGeo, dashMat, 90), dummy = new THREE.Object3D(); for (let i = 0; i < 90; i += 1) { const d = this.pose(i / 90 * this.lapLength); dummy.position.copy(d.position).setY(.065); dummy.rotation.y = d.yaw; dummy.updateMatrix(); dashes.setMatrixAt(i, dummy.matrix); } dashes.instanceMatrix.needsUpdate = true; this.scene.add(dashes);
    for (let i = 0; i < 12; i += 1) { const tile = new THREE.Mesh(new THREE.BoxGeometry(WIDTH / 12, .055, 1.2), new THREE.MeshStandardMaterial({ color: i % 2 ? '#f4f5ed' : '#f36b3d' })); tile.position.set(RX + (i + .5) * WIDTH / 12 - WIDTH / 2, .07, .04); this.scene.add(tile); }
    const curbGeo = new THREE.BoxGeometry(1.25, .1, 2.2), redCurbs = new THREE.InstancedMesh(curbGeo, new THREE.MeshStandardMaterial({ color: '#ff6848', roughness: .7 }), 96), whiteCurbs = new THREE.InstancedMesh(curbGeo, new THREE.MeshStandardMaterial({ color: '#fff0d5', roughness: .7 }), 96), curb = new THREE.Object3D();
    for (let i = 0; i < 96; i += 1) { const p = this.pose(i / 96 * this.lapLength), target = i % 2 ? whiteCurbs : redCurbs; for (const side of [-1, 1]) { curb.position.copy(p.position).addScaledVector(p.side, side * 7.15).setY(.1); curb.rotation.y = p.yaw; curb.updateMatrix(); target.setMatrixAt(i, curb.matrix); } }
    redCurbs.instanceMatrix.needsUpdate = true; whiteCurbs.instanceMatrix.needsUpdate = true; this.scene.add(redCurbs, whiteCurbs);
    this.startGate();
  }
  startGate() {
    const gate = new THREE.Group(), metal = new THREE.MeshStandardMaterial({ color: '#203a4b', metalness: .65, roughness: .3 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + 2.5, .65, .7), metal); top.position.y = 6.5; top.castShadow = true; gate.add(top);
    for (const x of [-WIDTH / 2 - .4, WIDTH / 2 + .4]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.65, 6.5, .65), metal); post.position.set(x, 3.2, 0); gate.add(post); }
    const sign = new THREE.Mesh(new THREE.BoxGeometry(7.8, 1.05, .15), new THREE.MeshBasicMaterial({ color: '#ffb94c' })); sign.position.set(0, 6.55, -.39); gate.add(sign);
    gate.position.set(RX, 0, 0); this.scene.add(gate);
  }
  city() {
    const colors = ['#162b3e', '#1c3144', '#253548', '#17334a', '#20303e'], glass = ['#52c9e8', '#f6b84f', '#ff795b'];
    for (let i = 0; i < 12; i += 1) {
      const a = (i + this.rand() * .4) / 12 * TAU, rx = RX + 24 + this.rand() * 25, rz = RZ + 21 + this.rand() * 25;
      const w = 5 + this.rand() * 7, dep = 5 + this.rand() * 8, floors = 2 + Math.floor(this.rand() * 4), h = floors * 2.1;
      const group = new THREE.Group(); group.position.set(rx * Math.cos(a), 0, rz * Math.sin(a)); group.lookAt(0, 0, 0);
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, dep), new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: .62, metalness: .33, emissive: '#081522', emissiveIntensity: .3 }));
      body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; group.add(body);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + .8, .42, dep + .8), new THREE.MeshStandardMaterial({ color: i % 3 ? '#385164' : '#ef6e43', emissive: i % 3 ? '#0d3043' : '#752914', emissiveIntensity: .4, metalness: .5 }));
      roof.position.y = h + .2; group.add(roof);
      const winMat = new THREE.MeshStandardMaterial({ color: '#76d8f0', emissive: glass[i % glass.length], emissiveIntensity: 1.3, roughness: .25 });
      for (let row = 0; row < floors; row += 1) for (let col = 0; col < 2; col += 1) {
        if (this.rand() < .13) continue;
        const win = new THREE.Mesh(new THREE.BoxGeometry(Math.min(.72, w * .16), .82, .09), winMat);
        win.position.set((col - .5) * w * .42, 1.15 + row * 2.03, dep / 2 + .05); group.add(win);
      }
      const sign = new THREE.Mesh(new THREE.BoxGeometry(w * .7, .45, .14), new THREE.MeshBasicMaterial({ color: i % 2 ? '#36d0ec' : '#ff743b' }));
      sign.position.set(0, 2.2, dep / 2 + .12); group.add(sign); this.scene.add(group);
    }
    for (let i = 0; i < 12; i += 1) {
      const t = i / 12 * TAU, p = this.center(t).addScaledVector(this.normal(t), WIDTH / 2 + 3.2), lamp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.11, .17, 5, 8), new THREE.MeshStandardMaterial({ color: '#627483', metalness: .7 })); pole.position.y = 2.5;
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(.72, .24, .48), new THREE.MeshStandardMaterial({ color: '#d2f4ff', emissive: '#43d5ff', emissiveIntensity: 2.2 })); bulb.position.y = 5.05;
      lamp.add(pole, bulb); lamp.position.copy(p); this.scene.add(lamp);
      if (i % 6 === 0) { const light = new THREE.PointLight('#52d8ff', 8, 15); light.position.copy(p).setY(4.7); this.scene.add(light); }
    }
    const hologram = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.2, .7, 16), new THREE.MeshStandardMaterial({ color: '#1c3b4d', metalness: .65 })); base.position.y = .3;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.25, .1, 8, 32), new THREE.MeshBasicMaterial({ color: '#49d7f5' })); ring.rotation.x = Math.PI / 2; ring.position.y = .72;
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.45, 1), new THREE.MeshStandardMaterial({ color: '#79f2ff', emissive: '#21b8df', emissiveIntensity: 2, wireframe: true })); core.position.y = 4.8;
    hologram.add(base, ring, core); hologram.position.set(-9, 0, 4); this.scene.add(hologram); this.hologram = core;
  }
  tropicalLandmarks() {
    const count = 18, trunkGeo = new THREE.CylinderGeometry(.3, .48, 2.05, 7), leafGeo = new THREE.BoxGeometry(.34, .16, 4.8);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: '#8d5a36', roughness: .95 }), count * 3);
    const leavesA = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ color: '#35a66a', roughness: .92, side: THREE.DoubleSide }), count * 8);
    const leavesB = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ color: '#78c95c', roughness: .92, side: THREE.DoubleSide }), count * 8);
    const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), axis = new THREE.Vector3(0, 0, 1); let ti = 0, ai = 0, bi = 0;
    for (let i = 0; i < count; i += 1) {
      const t = (i + .35) / count * TAU, side = this.normal(t).multiplyScalar(i % 2 ? -1 : 1);
      const base = this.center(t).addScaledVector(side, WIDTH / 2 + 11 + this.rand() * 7), lean = side.clone().multiplyScalar(.24 + this.rand() * .18);
      for (let j = 0; j < 3; j += 1) { const at = base.clone().addScaledVector(lean, (j + .5) / 3).setY((j + .5) * 2.05), axisY = new THREE.Vector3(lean.x / 3, 1, lean.z / 3).normalize(); dummy.position.copy(at); dummy.quaternion.setFromUnitVectors(up, axisY); dummy.updateMatrix(); trunks.setMatrixAt(ti++, dummy.matrix); }
      const crown = base.clone().addScaledVector(lean, 1.1).setY(6.15);
      for (let j = 0; j < 8; j += 1) { const angle = j / 8 * TAU, dir = new THREE.Vector3(Math.cos(angle), .28, Math.sin(angle)); dummy.position.copy(crown).addScaledVector(dir, 1.65).add(new THREE.Vector3(0, -.38, 0)); dummy.quaternion.setFromUnitVectors(axis, dir.normalize()); dummy.scale.set(1, 1, .9 + this.rand() * .2); dummy.updateMatrix(); if ((j + i) % 2) leavesA.setMatrixAt(ai++, dummy.matrix); else leavesB.setMatrixAt(bi++, dummy.matrix); }
    }
    trunks.count = ti; leavesA.count = ai; leavesB.count = bi; trunks.instanceMatrix.needsUpdate = true; leavesA.instanceMatrix.needsUpdate = true; leavesB.instanceMatrix.needsUpdate = true; this.scene.add(trunks, leavesA, leavesB);
    const colors = ['#ff5bbd', '#ffd166', '#9b7cff', '#43d8f2'];
    colors.forEach((color, i) => { const t = (.08 + i * .235) * TAU, side = this.normal(t).multiplyScalar(i % 2 ? -1 : 1), group = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(.22, .3, 5.2, 10), new THREE.MeshStandardMaterial({ color: '#f4dfc4', roughness: .68 })); stem.position.y = 2.6;
      const candy = new THREE.Mesh(new THREE.SphereGeometry(2.25, 18, 14), new THREE.MeshStandardMaterial({ color, roughness: .25, metalness: .12, emissive: color, emissiveIntensity: .12 })); candy.position.y = 6.2; candy.scale.set(.92, 1, .35);
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(1.43, .12, 8, 28), new THREE.MeshBasicMaterial({ color: '#fff2de' })); stripe.position.y = 6.2; stripe.rotation.x = Math.PI / 2; stripe.scale.set(1, .42, 1); group.add(stem, candy, stripe);
      group.position.copy(this.center(t).addScaledVector(side, WIDTH / 2 + 24)); group.rotation.y = this.pose(this.lapLength * t / TAU).yaw; this.scene.add(group);
    });
  }
  trackDetails() {
    const metal = new THREE.MeshStandardMaterial({ color: '#213849', metalness: .72, roughness: .25 });
    for (let i = 0; i < 5; i += 1) {
      const pose = this.pose((.12 + i * .19) * this.lapLength), arch = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + 3, .35, .35), metal); top.position.y = 4.6;
      const glow = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + 2, .08, .12), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ff8b4c' : '#39d7f4' })); glow.position.set(0, 4.35, -.15); arch.add(top, glow);
      for (const x of [-WIDTH / 2 - 1.1, WIDTH / 2 + 1.1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.35, 4.5, .35), metal); leg.position.set(x, 2.25, 0); arch.add(leg); }
      arch.position.copy(pose.position); arch.rotation.y = pose.yaw; this.scene.add(arch);
    }
    const mat = new THREE.MeshStandardMaterial({ color: '#40515d', metalness: .54, roughness: .42 });
    const postGeo = new THREE.BoxGeometry(.26, 1.1, .28), stripeGeo = new THREE.BoxGeometry(.3, .2, .31);
    const posts = new THREE.InstancedMesh(postGeo, mat, 96), stripes = new THREE.InstancedMesh(stripeGeo, new THREE.MeshBasicMaterial({ color: '#ff7541' }), 96);
    const paleStripes = new THREE.InstancedMesh(stripeGeo, new THREE.MeshBasicMaterial({ color: '#d6e5e8' }), 96), dummy = new THREE.Object3D();
    for (let i = 0; i < 96; i += 1) {
      const p = this.pose(i / 96 * this.lapLength, WIDTH / 2 + .65).position;
      dummy.position.copy(p).setY(.55); dummy.rotation.y = this.pose(i / 96 * this.lapLength).yaw; dummy.updateMatrix(); posts.setMatrixAt(i, dummy.matrix);
      dummy.position.copy(p).setY(.76); dummy.updateMatrix(); (i % 8 < 4 ? stripes : paleStripes).setMatrixAt(i, dummy.matrix);
    }
    posts.instanceMatrix.needsUpdate = true; stripes.instanceMatrix.needsUpdate = true; paleStripes.instanceMatrix.needsUpdate = true; this.scene.add(posts, stripes, paleStripes);
  }
  car(name, color, trimColor, player = false) {
    const root = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color, metalness: .45, roughness: .3 });
    const dark = new THREE.MeshStandardMaterial({ color: '#17212b', metalness: .55, roughness: .4 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#7edcf4', roughness: .16, metalness: .15, transparent: true, opacity: .8, clearcoat: .8 });
    const trim = new THREE.MeshStandardMaterial({ color: trimColor, metalness: .4, roughness: .3, emissive: trimColor, emissiveIntensity: .2 });
    const box = (size, pos, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); m.position.set(...pos); m.castShadow = true; m.receiveShadow = true; root.add(m); return m; };
    box([2.5, .58, 4.25], [0, .8, 0], body); box([2.32, .18, 3.78], [0, .55, .05], dark);
    box([1.78, .92, 1.9], [0, 1.5, .25], body); box([1.57, .66, .09], [0, 1.55, -.72], glass); box([1.55, .62, .09], [0, 1.55, 1.21], glass);
    box([2.63, .18, .42], [0, .72, -1.82], trim); box([2.85, .14, .2], [0, 1.42, 1.83], dark);
    box([2.92, .24, .3], [0, .66, -2.16], dark); box([1.18, .16, .38], [0, 1.18, -1.18], trim);
    const grilleBar = new THREE.MeshStandardMaterial({ color: '#a9bac4', metalness: .72, roughness: .28 });
    for (let i = 0; i < 5; i += 1) box([.09, .5, .08], [-.42 + i * .21, .96, -2.23], grilleBar);
    for (const x of [-1.16, 1.16]) for (const z of [-1.35, 1.37]) box([.72, .15, .46], [x, 1.04, z], trim);
    box([.12, .12, .62], [-.96, .64, .95], dark); box([.12, .12, .62], [.96, .64, .95], dark);
    box([.16, .32, .2], [-1.17, 1.51, -.08], trim); box([.16, .32, .2], [1.17, 1.51, -.08], trim);
    const lamp = new THREE.MeshStandardMaterial({ color: '#fff0b9', emissive: '#ffcf62', emissiveIntensity: 2.2 });
    box([.37, .2, .12], [-.76, .98, -2.13], lamp); box([.37, .2, .12], [.76, .98, -2.13], lamp);
    const tail = new THREE.MeshStandardMaterial({ color: '#ff515d', emissive: '#ff132f', emissiveIntensity: 1.3 });
    box([.42, .18, .12], [-.73, .97, 2.13], tail); box([.42, .18, .12], [.73, .97, 2.13], tail);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(.35, 12, 10), new THREE.MeshStandardMaterial({ color: player ? '#ffd166' : trimColor, metalness: .3 }));
    helmet.position.set(0, 1.79, .33); root.add(helmet);
    const visor = new THREE.Mesh(new THREE.SphereGeometry(.23, 10, 8), new THREE.MeshStandardMaterial({ color: '#162a3a', metalness: .4, roughness: .2 }));
    visor.scale.set(1.05, .58, .68); visor.position.set(0, 1.83, .06); root.add(visor);
    const wheels = [], tireMat = new THREE.MeshStandardMaterial({ color: '#10161b', roughness: .86 });
    for (const x of [-1.18, 1.18]) for (const z of [-1.34, 1.36]) {
      const wheel = new THREE.Group(); wheel.position.set(x, .48, z);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(.47, .47, .34, 16), tireMat); tire.rotation.z = Math.PI / 2; tire.castShadow = true;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .36, 12), trim); rim.rotation.z = Math.PI / 2;
      wheel.add(tire, rim); root.add(wheel); wheels.push(wheel);
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.32, 1.15, 9), new THREE.MeshBasicMaterial({ color: '#55dfff', transparent: true, opacity: .9 }));
    flame.rotation.x = -Math.PI / 2; flame.position.set(0, .68, 2.68); flame.visible = false; root.add(flame);
    const core = new THREE.Mesh(new THREE.ConeGeometry(.17, .8, 8), new THREE.MeshBasicMaterial({ color: '#ffe27a' }));
    core.rotation.x = -Math.PI / 2; core.position.set(0, .68, 2.78); core.visible = false; root.add(core);
    root.userData = { wheels, flame, flameCore: core, isPlayer: player, name }; root.scale.setScalar(player ? 1 : .96); this.scene.add(root); return root;
  }
  pickupsAndHazards() {
    const batteryMat = new THREE.MeshStandardMaterial({ color: '#ffe075', emissive: '#ffae21', emissiveIntensity: 2.1, metalness: .25, roughness: .22 });
    const ringMat = new THREE.MeshBasicMaterial({ color: '#63e8ff' });
    for (let lap = 0; lap < LAPS; lap += 1) {
      for (let i = 0; i < 7; i += 1) {
        const distance = lap * this.lapLength + (.055 + i * .132) * this.lapLength, lateral = [-3.5, 0, 3.5, 2.8, -2.8, 0, 3.4][i], p = this.pose(distance, lateral);
        const group = new THREE.Group(), cell = new THREE.Mesh(new THREE.OctahedronGeometry(.68), batteryMat); cell.scale.set(.72, 1.05, .38); cell.position.y = 1.35;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.92, .045, 6, 20), ringMat); ring.position.y = 1.35; ring.rotation.x = Math.PI / 2;
        group.add(cell, ring); group.position.copy(p.position); this.scene.add(group); this.items.push({ distance, lateral, group, ring, collected: false });
      }
      for (const [fraction, lateral, kind] of [[.215, -4.1, 0], [.49, 3.6, 1], [.735, -3.8, 0]]) {
        const distance = lap * this.lapLength + fraction * this.lapLength, group = new THREE.Group(), p = this.pose(distance, lateral);
        if (!kind) {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(.7, 1.7, 9), new THREE.MeshStandardMaterial({ color: '#ff713d' })); cone.position.y = .84;
          const band = new THREE.Mesh(new THREE.CylinderGeometry(.5, .59, .2, 9), new THREE.MeshStandardMaterial({ color: '#f5eee1' })); band.position.y = .86; group.add(cone, band);
        } else {
          const drum = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, 1.35, 12), new THREE.MeshStandardMaterial({ color: '#d95139', roughness: .45 })); drum.position.y = .68;
          const stripe = new THREE.Mesh(new THREE.TorusGeometry(.8, .1, 6, 14), new THREE.MeshBasicMaterial({ color: '#ffd166' })); stripe.rotation.x = Math.PI / 2; stripe.position.y = .78; group.add(drum, stripe);
        }
        group.position.copy(p.position); this.scene.add(group); this.hazards.push({ distance, lateral, group, hit: false });
      }
    }
  }
  speedLines() {
    this.speedLineGroup = new THREE.Group(); const mat = new THREE.MeshBasicMaterial({ color: '#8ae8ff', transparent: true, opacity: .42 });
    for (let i = 0; i < 18; i += 1) { const m = new THREE.Mesh(new THREE.BoxGeometry(.025, .025, 4 + this.rand() * 5), mat); m.position.set((this.rand() - .5) * 16, 2 + this.rand() * 4, -5 - this.rand() * 18); this.speedLineGroup.add(m); }
    this.speedLineGroup.visible = false; this.scene.add(this.speedLineGroup);
  }
  placeCars() {
    const p = this.pose(0, this.player.lateral); this.playerCar.position.copy(p.position); this.playerCar.rotation.y = p.yaw;
    this.rivals = [
      { name: 'Max Veloz', car: this.rivalCars[0], distance: -7, lateral: 2.3, speed: 0, pace: 34.3, phase: .5, finished: false },
      { name: 'Nix', car: this.rivalCars[1], distance: -12, lateral: -2.1, speed: 0, pace: 32.6, phase: 2.1, finished: false },
    ];
    this.updateCar(this.rivals[0].car, -7, 2.3, 0); this.updateCar(this.rivals[1].car, -12, -2.1, 0);
    this.camera.position.set(RX + 22, 18, 36); this.camera.lookAt(RX, 0, 1);
  }
  updateCar(car, distance, lateral, speed, steer = 0) {
    const p = this.pose(distance, lateral); car.position.copy(p.position);
    car.position.y += .06 + Math.sin(this.elapsed * 8 + distance * .04) * Math.min(Math.abs(speed) * .001, .035);
    car.rotation.y = p.yaw + (speed < -1 ? Math.PI : 0); car.rotation.z = clamp(-steer * Math.min(Math.abs(speed) / 42, 1) * .08, -.1, .1);
    for (const wheel of car.userData.wheels) wheel.rotation.x -= speed * .034;
  }
  resize() {
    const p = this.canvas.parentElement, w = p?.clientWidth || innerWidth, h = p?.clientHeight || innerHeight;
    if (!w || !h) return; this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h, false);
  }
  setQuality(value) { this.quality = value; this.renderer.setPixelRatio(value === 'low' ? .8 : Math.min(devicePixelRatio || 1, 1.15)); this.renderer.shadowMap.enabled = false; this.resize(); }
  setAudio(settings) { this.audio.setVolumes(settings); }
  async startRace() {
    await this.audio.unlock(); this.audio.playTone(520, .13, 'triangle', .12);
    this.state = 'countdown'; this.countdownLeft = 3.05; this.lastCountdown = null; this.raceTime = 0; this.finishOrder = []; this.result = null;
    Object.assign(this.player, { distance: 0, lateral: -1.9, lateralVelocity: 0, speed: 0, turbo: 100, laps: 0, nextGate: this.lapLength, items: 0, score: 0 });
    this.rivals.forEach((r, i) => Object.assign(r, { distance: -7 - i * 5, lateral: i ? -2.1 : 2.3, speed: 0, finished: false }));
    this.items.forEach(item => { item.collected = false; item.group.visible = true; }); this.hazards.forEach(h => { h.hit = false; });
    this.message = 'Luna: “Minha criação, minhas regras!”'; this.messageLeft = 3.5; this.clearInput(); this.publish(true);
  }
  pause() { if (!['racing', 'countdown'].includes(this.state)) return; this.pausedFrom = this.state; this.state = 'paused'; this.clearInput(); this.audio.update(0, false, false); this.audio.playTone(340, .12); this.publish(true); }
  resume() { if (this.state !== 'paused') return; this.state = this.pausedFrom || 'racing'; this.clearInput(); this.publish(true); }
  returnToMenu() {
    this.state = 'menu'; this.result = null; this.clearInput(); this.player.distance = 0; this.player.speed = 0; this.placeCars(); this.publish(true);
  }
  setTouch(control, down) { if (down) this.touch.add(control); else this.touch.delete(control); }
  onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'Escape' && !e.repeat) { if (this.state === 'racing' || this.state === 'countdown') this.pause(); else if (this.state === 'paused') this.resume(); return; }
    this.keys.add(e.code); if (e.code.startsWith('Shift')) this.audio.unlock();
  }
  onKeyUp(e) { this.keys.delete(e.code); }
  clearInput() { this.keys.clear(); this.touch.clear(); }
  pressed(...codes) { return codes.some(key => this.keys.has(key) || this.touch.has(key)); }
  controls() {
    return { gas: this.pressed('KeyW', 'ArrowUp', 'up'), brake: this.pressed('KeyS', 'ArrowDown', 'down'),
      left: this.pressed('KeyA', 'ArrowLeft', 'left'), right: this.pressed('KeyD', 'ArrowRight', 'right'),
      drift: this.pressed('Space', 'drift'), boost: this.pressed('ShiftLeft', 'ShiftRight', 'boost') };
  }
  frame(time) {
    if (!this.clock.running) this.clock.start();
    const dt = Math.min(this.clock.getDelta(), .05); if (this.state !== 'paused') this.elapsed += dt;
    if (!this.contextLost) {
      if (this.state === 'countdown') this.tickCountdown(dt);
      else if (this.state === 'racing') this.tickRace(dt);
      else if (this.state === 'menu') this.tickMenu(dt);
      if (this.state !== 'paused') { this.animateProps(dt); this.animateParticles(dt); this.cameraFollow(dt); } this.renderer.render(this.scene, this.camera);
      if (time - this.lastPublish > 100) this.publish();
    }
    this.frameId = requestAnimationFrame(this.frameBound);
  }
  tickCountdown(dt) {
    this.countdownLeft = Math.max(0, this.countdownLeft - dt);
    const count = Math.ceil(this.countdownLeft);
    if (count > 0 && count !== this.lastCountdown) { this.lastCountdown = count; this.audio.countdown(); }
    if (this.countdownLeft === 0) { this.state = 'racing'; this.raceTime = 0; this.lastCountdown = 0; this.message = 'A Cidade Turbo espera por você. Vai!'; this.messageLeft = 3.2; this.audio.go(); this.publish(true); }
  }
  tickMenu(dt) {
    this.player.distance += dt * 3.7; this.updateCar(this.playerCar, this.player.distance, -1.9 + Math.sin(this.elapsed * .7) * .22, 3.7);
    this.rivals.forEach((r, i) => { r.distance += dt * (2.8 + i * .35); if (r.distance > 0) r.distance -= this.lapLength; this.updateCar(r.car, r.distance, r.lateral, 3); });
    this.audio.update(0, false, false);
  }
  tickRace(dt) {
    this.raceTime += dt; if (this.messageLeft > 0 && (this.messageLeft -= dt) <= 0) this.message = '';
    const c = this.controls(), p = this.player, boosting = c.boost && p.turbo > 0 && p.speed > 5;
    if (c.gas) p.speed += 23 * dt; else if (p.speed > 0) p.speed = Math.max(0, p.speed - 5.8 * dt);
    if (c.brake) p.speed = p.speed > .8 ? Math.max(0, p.speed - 36 * dt) : Math.max(-10, p.speed - 12 * dt);
    if (boosting) { p.speed += 23 * dt; p.turbo = Math.max(0, p.turbo - 38 * dt); } else p.turbo = Math.min(100, p.turbo + 7.8 * dt);
    p.speed = clamp(p.speed, -10, boosting ? 57 : 42);
    this.playerCar.userData.flame.visible = boosting; this.playerCar.userData.flameCore.visible = boosting; this.speedLineGroup.visible = boosting && p.speed > 32;
    if (boosting && Math.random() < dt * 26) this.spawn(2, '#62e8ff', this.playerCar.position, .75);
    const steer = Number(c.right) - Number(c.left), factor = clamp(Math.abs(p.speed) / 34, .12, 1), reverse = p.speed < -.2 ? -1 : 1;
    p.lateralVelocity += steer * factor * reverse * (c.drift ? 7.2 : 4.2) * dt; p.lateralVelocity *= Math.exp(-(c.drift ? 2.1 : 6.5) * dt); p.lateralVelocity = clamp(p.lateralVelocity, -4.2, 4.2); p.lateral += p.lateralVelocity * dt;
    if (c.drift && steer && Math.abs(p.speed) > 8 && this.elapsed - this.lastDust > .1) {
      this.lastDust = this.elapsed; this.spawn(1, '#c19065', this.pose(p.distance, p.lateral).position.clone().setY(.4), .7, true);
    }
    const previous = p.distance; p.distance += p.speed * dt;
    this.edgeCollision(); this.updateRivals(dt); this.collectItems(); this.hitHazards(); this.carContact();
    this.updateCar(this.playerCar, p.distance, p.lateral, p.speed, steer + p.lateralVelocity * .06);
    this.rivals.forEach(r => this.updateCar(r.car, r.distance, r.lateral, r.speed));
    this.crossGate(previous); this.audio.update(Math.abs(p.speed), boosting && this.state === 'racing', this.state === 'racing');
  }
  edgeCollision() {
    const limit = WIDTH / 2 - .8; if (Math.abs(this.player.lateral) <= limit) return;
    this.player.lateral = Math.sign(this.player.lateral) * limit; this.player.speed *= .72; this.player.lateralVelocity = 0;
    if (this.elapsed - this.lastCollision > .48) {
      this.lastCollision = this.elapsed; this.audio.hit(); this.spawn(8, '#ffd166', this.pose(this.player.distance, this.player.lateral).position.clone().setY(.8), 1);
      this.message = 'BATEU NA BARREIRA — segure a pista!'; this.messageLeft = 1.8;
    }
  }
  updateRivals(dt) {
    for (const [i, r] of this.rivals.entries()) {
      if (r.finished) continue;
      const turn = Math.sin(r.distance / this.lapLength * TAU * 2 + .4) * 1.45;
      r.speed = damp(r.speed, r.pace + Math.sin(this.raceTime * .57 + r.phase) * 1.1 - Math.abs(turn) * .32, 2.3 * dt);
      r.distance += r.speed * dt; const lane = i ? -2.1 : 2.3; const hazard = this.hazards.find(h => h.distance > r.distance && h.distance - r.distance < 13 && Math.abs(lane - h.lateral) < 3.1); r.lateral = hazard ? (hazard.lateral > 0 ? -3.5 : 3.5) : lane + Math.sin(this.raceTime * .5 + r.phase) * .35;
      if (r.distance >= this.totalDistance) { r.distance = this.totalDistance; r.finished = true; this.finishOrder.push(r.name); }
    }
  }
  collectItems() {
    const p = this.player;
    for (const item of this.items) {
      if (item.collected || Math.abs(p.distance - item.distance) > 2.65 || Math.abs(p.lateral - item.lateral) > 2.25) continue;
      item.collected = true; item.group.visible = false; p.items += 1; p.score += 100; p.turbo = Math.min(100, p.turbo + 23);
      this.audio.collect(); this.spawn(12, '#ffe276', this.pose(item.distance, item.lateral).position.clone().setY(1.2), 1.1);
      this.message = 'BATERIA COLETADA  +100'; this.messageLeft = 1.6;
    }
  }
  hitHazards() {
    const p = this.player, lap = Math.floor(Math.max(0, p.distance) / this.lapLength);
    for (const h of this.hazards) {
      if (Math.floor(h.distance / this.lapLength) !== lap || h.hit || Math.abs(p.distance - h.distance) > 2.35 || Math.abs(p.lateral - h.lateral) > 2.5) continue;
      h.hit = true; p.speed *= .61; p.lateralVelocity += p.lateral < h.lateral ? -3.8 : 3.8;
      this.audio.hit(); this.spawn(9, '#ff9855', h.group.position.clone().setY(.8), 1);
      this.message = 'OBSTÁCULO! Use a derrapagem para desviar.'; this.messageLeft = 1.8;
    }
  }
  carContact() {
    for (const r of this.rivals) {
      if (r.finished || Math.abs(this.player.distance - r.distance) > 2.8 || Math.abs(this.player.lateral - r.lateral) > 2.4) continue;
      this.player.speed *= .74; this.player.lateralVelocity += this.player.lateral < r.lateral ? -2.2 : 2.2;
      if (this.elapsed - this.lastCollision > .65) { this.lastCollision = this.elapsed; this.audio.hit(); this.message = r.name.toUpperCase() + ' fechou a porta!'; this.messageLeft = 1.5; }
    }
  }
  crossGate(previous) {
    if (this.player.speed <= 0 || this.player.distance < this.player.nextGate || previous >= this.player.nextGate) return;
    this.player.laps += 1; this.player.nextGate += this.lapLength; this.audio.playTone(620 + this.player.laps * 90, .26, 'triangle', .15);
    if (this.player.laps >= LAPS) { this.finishRace(); return; }
    this.message = this.player.laps === 1 ? 'CONTROLADOR: “Traçado recalibrado. Boa sorte, Luna.”' : 'VOLTA ' + (this.player.laps + 1) + ' / ' + LAPS + ' — continua!'; this.messageLeft = 2.6;
  }
  finishRace() {
    this.state = 'results'; this.finishOrder.push('Luna'); const position = this.finishOrder.indexOf('Luna') + 1;
    const place = position || this.getPlace(), bonus = place === 1 ? 500 : place === 2 ? 250 : 100;
    this.player.score += bonus + Math.max(0, Math.round(1600 - this.raceTime * 12));
    this.result = { position: place, time: this.raceTime, score: this.player.score, items: this.player.items, won: place === 1 };
    this.playerCar.userData.flame.visible = false; this.playerCar.userData.flameCore.visible = false; this.audio.finish(place === 1);
    this.message = place === 1 ? 'A CIDADE TURBO É SUA!' : 'Corrida concluída. Mais uma volta de experiência!'; this.messageLeft = 5; this.publish(true);
  }
  getPlace() {
    const racers = [{ name: 'Luna', distance: this.player.distance }, ...this.rivals.map(r => ({ name: r.name, distance: r.distance }))];
    racers.sort((a, b) => b.distance - a.distance); return racers.findIndex(r => r.name === 'Luna') + 1;
  }
  animateProps(dt) {
    for (const item of this.items) if (!item.collected) { item.group.rotation.y += dt * 1.25; item.group.position.y = Math.sin(this.elapsed * 2.4 + item.distance) * .16; item.ring.rotation.z += dt * .7; }
    if (this.hologram) this.hologram.rotation.y += dt * .45;
  }
  spawn(count, color, origin, life = .9, dust = false) {
    for (let i = 0; i < count; i += 1) {
      const mesh = new THREE.Mesh(this.particleGeometry, dust ? this.dustMaterial : this.sparkMaterial);
      if (!dust) mesh.material.color.set(color);
      mesh.position.copy(origin); mesh.position.x += (Math.random() - .5) * 1.4; mesh.position.z += (Math.random() - .5);
      const velocity = new THREE.Vector3((Math.random() - .5) * 5, 1.2 + Math.random() * 5, (Math.random() - .5) * 5);
      this.scene.add(mesh); this.particles.push({ mesh, velocity, life, maxLife: life, dust });
    }
    while (this.particles.length > 75) this.scene.remove(this.particles.shift().mesh);
  }
  animateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i]; p.life -= dt;
      if (p.life <= 0) { this.scene.remove(p.mesh); this.particles.splice(i, 1); continue; }
      p.mesh.position.addScaledVector(p.velocity, dt); p.velocity.y -= (p.dust ? 1.3 : 7.4) * dt;
      p.mesh.scale.setScalar(p.dust ? .55 + (1 - p.life / p.maxLife) * 1.35 : p.life / p.maxLife);
    }
  }
  cameraFollow(dt) {
    if (this.state === 'menu') {
      const a = this.elapsed * .055, desired = new THREE.Vector3(RX + Math.cos(a) * 22, 14 + Math.sin(a * .7), 22 + Math.sin(a) * 19);
      this.camera.position.lerp(desired, 1 - Math.exp(-1.3 * dt)); this.camera.lookAt(RX - 4, .6, 2); return;
    }
    const p = this.pose(this.player.distance, this.player.lateral);
    const desired = p.position.clone().addScaledVector(p.forward, -(11.5 + Math.min(Math.abs(this.player.speed), 55) * .09))
      .addScaledVector(p.side, this.player.lateralVelocity * .25).add(new THREE.Vector3(0, 6.3 + Math.min(Math.abs(this.player.speed), 55) * .035, 0));
    this.camera.position.lerp(desired, 1 - Math.exp(-4.3 * dt));
    this.camera.lookAt(p.position.clone().addScaledVector(p.forward, 7.8).add(new THREE.Vector3(0, 1.3, 0)));
    this.camera.rotation.z = damp(this.camera.rotation.z, -this.player.lateralVelocity * .013, 2.5 * dt);
  }
  snapshot() {
    return { screen: this.state, speed: Math.round(Math.abs(this.player.speed) * 3.35), lap: Math.min(LAPS, this.player.laps + 1),
      totalLaps: LAPS, time: this.raceTime, turbo: Math.round(this.player.turbo), items: this.player.items,
      score: this.player.score, place: this.getPlace(), countdown: Math.ceil(this.countdownLeft), message: this.message,
      result: this.result, contextLost: this.contextLost };
  }
  publish(force = false) {
    const now = performance.now(); if (!force && now - this.lastPublish < 90) return;
    this.lastPublish = now; this.onSnapshot(this.snapshot());
  }
  resize() {
    const parent = this.canvas.parentElement, w = parent?.clientWidth || innerWidth, h = parent?.clientHeight || innerHeight;
    if (!w || !h) return; this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h, false);
  }
  setQuality(value) { this.quality = value; this.renderer.setPixelRatio(value === 'low' ? .8 : Math.min(devicePixelRatio || 1, 1.15)); this.renderer.shadowMap.enabled = false; this.resize(); }
  setAudio(settings) { this.audio.setVolumes(settings); }
  frame(time) {
    if (!this.clock.running) this.clock.start(); const dt = Math.min(this.clock.getDelta(), .05); if (this.state !== 'paused') this.elapsed += dt;
    if (!this.contextLost) {
      if (this.state === 'countdown') this.tickCountdown(dt);
      else if (this.state === 'racing') this.tickRace(dt);
      else if (this.state === 'menu') this.tickMenu(dt);
      if (this.state !== 'paused') { this.animateProps(dt); this.animateParticles(dt); this.cameraFollow(dt); } this.renderer.render(this.scene, this.camera);
      if (time - this.lastPublish > 100) this.publish();
    }
    this.frameId = requestAnimationFrame(this.frameBound);
  }
  dispose() {
    cancelAnimationFrame(this.frameId); window.removeEventListener('keydown', this.downBound); window.removeEventListener('keyup', this.upBound); window.removeEventListener('blur', this.blurBound);
    this.canvas.removeEventListener('webglcontextlost', this.lostBound); this.canvas.removeEventListener('webglcontextrestored', this.restoredBound); this.observer?.disconnect(); this.audio.dispose();
    this.scene.traverse(o => { o.geometry?.dispose?.(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material?.dispose?.(); });
    this.renderer.dispose();
  }
}










