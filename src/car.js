import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const CAR_URL = 'assets/car.glb';

// Real-world scale target for whichever model loads: ~12 cm long toy car.
const TARGET_LENGTH_M = 0.12;

const MAX_SPEED = 0.6;   // m/s
const ACCEL = 0.9;       // m/s^2
const BRAKE = 1.6;       // m/s^2
const FRICTION = 0.5;    // m/s^2
const TURN_RATE = 2.4;   // rad/s at full speed

export class Car {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'car-root';

    this.body = null;            // resolved after load()
    this.speed = 0;              // forward m/s
    this.box3 = new THREE.Box3();
    this._tmpBox = new THREE.Box3();
    this._lastSafe = new THREE.Matrix4();
    this._lastSafe.identity();
  }

  async load() {
    try {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(CAR_URL);
      this.body = gltf.scene;
      this._normalizeScale(this.body);
      this.root.add(this.body);
    } catch (err) {
      console.warn('Car model failed to load, using primitive fallback:', err);
      this.body = buildPrimitiveCar();
      this.root.add(this.body);
    }
    // Initial box (local to root @ origin).
    this.box3.setFromObject(this.root);
  }

  _normalizeScale(obj) {
    const bbox = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const longest = Math.max(size.x, size.y, size.z);
    if (longest > 0) {
      const s = TARGET_LENGTH_M / longest;
      obj.scale.setScalar(s);
    }
    // Re-center on origin, sit on the floor.
    const recentered = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3();
    recentered.getCenter(center);
    obj.position.x -= center.x;
    obj.position.z -= center.z;
    obj.position.y -= recentered.min.y;
  }

  placeAt(matrix) {
    this.root.matrix.copy(matrix);
    this.root.matrix.decompose(this.root.position, this.root.quaternion, this.root.scale);
    // Clear residual scale from the matrix decomposition; keep model scale.
    this.root.scale.set(1, 1, 1);
    this.root.updateMatrixWorld(true);
    this.speed = 0;
    this._lastSafe.copy(this.root.matrixWorld);
    this._updateBox();
  }

  /**
   * Step the car forward.
   * input.steer: -1..1   (left negative)
   * input.throttle: 0..1
   * input.brake: 0..1
   */
  update(dt, input) {
    const throttle = clamp01(input.throttle ?? 0);
    const brake = clamp01(input.brake ?? 0);
    const steer = clamp(input.steer ?? 0, -1, 1);

    // Longitudinal dynamics.
    if (throttle > 0) {
      this.speed += ACCEL * throttle * dt;
    }
    if (brake > 0) {
      const decel = BRAKE * brake * dt;
      this.speed = this.speed > 0 ? Math.max(0, this.speed - decel) : Math.min(0, this.speed + decel);
    } else if (throttle <= 0) {
      const fric = FRICTION * dt;
      this.speed = this.speed > 0 ? Math.max(0, this.speed - fric) : Math.min(0, this.speed + fric);
    }
    this.speed = clamp(this.speed, -MAX_SPEED * 0.5, MAX_SPEED);

    // Steering scales with speed so the car doesn't pirouette standing still.
    const speedFactor = Math.min(1, Math.abs(this.speed) / (MAX_SPEED * 0.4));
    this.root.rotation.y -= steer * TURN_RATE * speedFactor * dt;

    // Translate along local -Z (forward).
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.root.quaternion);
    this.root.position.addScaledVector(forward, this.speed * dt);
    this.root.updateMatrixWorld(true);
    this._updateBox();
  }

  _updateBox() {
    this.box3.setFromObject(this.root);
  }

  markSafe() {
    this._lastSafe.copy(this.root.matrixWorld);
  }

  crash() {
    this.speed = 0;
  }

  resetToSafe() {
    this.placeAt(this._lastSafe);
  }
}

function buildPrimitiveCar() {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.4, roughness: 0.4 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.1, roughness: 0.8 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x60a5fa, metalness: 0.3, roughness: 0.3, transparent: true, opacity: 0.7 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.11), bodyMat);
  body.position.y = 0.025;
  car.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.05), cabinMat);
  cabin.position.set(0, 0.047, -0.01);
  car.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.012, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const offsets = [
    [-0.032, 0.012, -0.035],
    [ 0.032, 0.012, -0.035],
    [-0.032, 0.012,  0.035],
    [ 0.032, 0.012,  0.035],
  ];
  for (const [x, y, z] of offsets) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(x, y, z);
    car.add(w);
  }
  return car;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function clamp01(v) { return clamp(v, 0, 1); }
