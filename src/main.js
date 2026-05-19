import * as THREE from 'three';
import { checkSupport, startSession } from './ar-session.js';
import { World } from './world.js';
import { Car } from './car.js';
import { Controls } from './controls.js';
import { checkCrash } from './collision.js';
import { UI } from './ui.js';

const ui = new UI();

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 1.0));
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(1, 3, 2);
scene.add(dir);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 30);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.inset = '0';
renderer.domElement.style.zIndex = '0';
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const world = new World(scene);

// Reticle for placement.
const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.05, 0.07, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x6ee7b7 }),
);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

const car = new Car();
car.root.visible = false;
scene.add(car.root);

const controls = new Controls({
  joystickEl: document.getElementById('joystick'),
  knobEl: document.getElementById('joystick-knob'),
  throttleEl: document.getElementById('throttle-btn'),
  brakeEl: document.getElementById('brake-btn'),
});

let xrSession = null;
let viewerRefSpace = null;
let localRefSpace = null;
let hitTestSource = null;
let phase = 'idle'; // 'scanning' | 'placing' | 'driving' | 'crashed'
let lastFrameT = 0;

(async function init() {
  const support = await checkSupport();
  if (!support.supported) {
    ui.startBtn.disabled = true;
    ui.setSupportMessage(support.reason);
  }

  ui.startBtn.addEventListener('click', onStart);
  ui.placeBtn.addEventListener('click', onPlace);
  ui.resetBtn.addEventListener('click', onReset);
  ui.exitBtn.addEventListener('click', onExit);

  await car.load();
})();

async function onStart() {
  try {
    xrSession = await startSession(document.getElementById('overlay'));
  } catch (err) {
    ui.setSupportMessage('Could not start AR: ' + err.message);
    return;
  }
  ui.enterAR();
  phase = 'scanning';
  ui.setHint('Pan your phone around the room to scan walls and floor…');

  renderer.xr.setReferenceSpaceType('local-floor');
  await renderer.xr.setSession(xrSession);

  viewerRefSpace = await xrSession.requestReferenceSpace('viewer');
  localRefSpace = await xrSession.requestReferenceSpace('local-floor');
  hitTestSource = await xrSession.requestHitTestSource({ space: viewerRefSpace });

  xrSession.addEventListener('end', cleanupSession);

  renderer.setAnimationLoop(onFrame);
}

function cleanupSession() {
  if (hitTestSource) { hitTestSource.cancel?.(); hitTestSource = null; }
  xrSession = null;
  viewerRefSpace = null;
  localRefSpace = null;
  phase = 'idle';
  reticle.visible = false;
  car.root.visible = false;
  controls.hide();
  ui.showPlace(false);
  ui.showCrash(false);
  ui.exitAR();
  renderer.setAnimationLoop(null);
}

function onExit() {
  if (xrSession) xrSession.end();
}

function onPlace() {
  if (!reticle.visible) return;
  car.placeAt(reticle.matrix);
  car.root.visible = true;
  ui.showPlace(false);
  reticle.visible = false;
  controls.show();
  phase = 'driving';
  ui.setHint('Drive! Joystick to steer, GO to accelerate.');
  setTimeout(() => ui.setHint(''), 2500);
}

function onReset() {
  ui.showCrash(false);
  car.resetToSafe();
  phase = 'driving';
}

function onFrame(t, frame) {
  if (!frame || !localRefSpace) return;
  const dt = lastFrameT ? Math.min(0.05, (t - lastFrameT) / 1000) : 0;
  lastFrameT = t;

  world.update(frame, localRefSpace);

  if (phase === 'scanning' || phase === 'placing') {
    // Floor hit-test to position the reticle.
    const hits = frame.getHitTestResults(hitTestSource);
    if (hits.length > 0) {
      const pose = hits[0].getPose(localRefSpace);
      if (pose) {
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      }
    } else {
      reticle.visible = false;
    }

    // Promote to 'placing' once we have a floor (from planes OR a stable hit).
    if (phase === 'scanning' && (world.hasFloor() || reticle.visible)) {
      phase = 'placing';
      ui.setHint(world.hasWall()
        ? 'Walls detected! Aim at the floor and tap Place car.'
        : 'Floor found. Keep panning to scan walls, then Place car.');
      ui.showPlace(true);
    }
  }

  if (phase === 'driving') {
    car.update(dt, controls.read());

    const wallBoxes = world.getWallBoxes();
    if (wallBoxes.length > 0) {
      const carBox = {
        min: { x: car.box3.min.x, y: car.box3.min.y, z: car.box3.min.z },
        max: { x: car.box3.max.x, y: car.box3.max.y, z: car.box3.max.z },
      };
      const wb = wallBoxes.map((b) => ({
        min: { x: b.min.x, y: b.min.y, z: b.min.z },
        max: { x: b.max.x, y: b.max.y, z: b.max.z },
      }));
      if (checkCrash(carBox, wb)) {
        car.crash();
        phase = 'crashed';
        ui.showCrash(true);
      } else {
        car.markSafe();
      }
    }
  }

  renderer.render(scene, camera);
}
