import * as THREE from 'three';

// Tracks WebXR detected planes and exposes wall + floor geometry as Three.js
// meshes with axis-aligned Box3 colliders in world space.
//
// On iOS Safari, frame.detectedPlanes is the LiDAR-assisted plane set when the
// plane-detection feature is granted. On runtimes without plane-detection we
// fall back to hit-test floor sampling (handled in main.js).

const WALL_MAT = new THREE.MeshBasicMaterial({
  color: 0x6ee7b7,
  transparent: true,
  opacity: 0.18,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const FLOOR_MAT = new THREE.MeshBasicMaterial({
  color: 0x60a5fa,
  transparent: true,
  opacity: 0.08,
  side: THREE.DoubleSide,
  depthWrite: false,
});

const WALL_THICKNESS = 0.05; // m, for collision volume

export class World {
  constructor(scene) {
    this.scene = scene;
    this.planeMap = new Map(); // XRPlane -> { mesh, box3, lastChanged, orientation }
    this.group = new THREE.Group();
    this.group.name = 'detected-planes';
    scene.add(this.group);
  }

  /**
   * Update tracked planes from an XRFrame. Safe to call even when
   * plane-detection isn't supported (no-op).
   */
  update(frame, refSpace) {
    const detected = frame.detectedPlanes;
    if (!detected) return;

    // Drop planes the runtime no longer reports.
    for (const xrPlane of this.planeMap.keys()) {
      if (!detected.has(xrPlane)) {
        const entry = this.planeMap.get(xrPlane);
        this.group.remove(entry.mesh);
        entry.mesh.geometry.dispose();
        this.planeMap.delete(xrPlane);
      }
    }

    for (const xrPlane of detected) {
      const pose = frame.getPose(xrPlane.planeSpace, refSpace);
      if (!pose) continue;

      let entry = this.planeMap.get(xrPlane);
      if (!entry || entry.lastChanged !== xrPlane.lastChangedTime) {
        if (entry) {
          this.group.remove(entry.mesh);
          entry.mesh.geometry.dispose();
        }
        entry = this._buildEntry(xrPlane);
        this.planeMap.set(xrPlane, entry);
        this.group.add(entry.mesh);
      }

      const m = pose.transform.matrix;
      entry.mesh.matrix.fromArray(m);
      entry.mesh.matrix.decompose(entry.mesh.position, entry.mesh.quaternion, entry.mesh.scale);
      entry.mesh.updateMatrixWorld(true);
      entry.box3.setFromObject(entry.mesh);
    }
  }

  _buildEntry(xrPlane) {
    const polygon = xrPlane.polygon || [];
    const orientation = xrPlane.orientation || 'horizontal';

    let geom;
    if (polygon.length >= 3) {
      const shape = new THREE.Shape();
      shape.moveTo(polygon[0].x, -polygon[0].z); // polygon in plane-local x/z
      for (let i = 1; i < polygon.length; i++) {
        shape.lineTo(polygon[i].x, -polygon[i].z);
      }
      shape.closePath();
      geom = new THREE.ShapeGeometry(shape);
      // ShapeGeometry lies in XY; rotate to plane-local XZ so it matches WebXR's plane space.
      geom.rotateX(-Math.PI / 2);
    } else {
      geom = new THREE.PlaneGeometry(1, 1);
      geom.rotateX(-Math.PI / 2);
    }

    const mat = orientation === 'vertical' ? WALL_MAT : FLOOR_MAT;
    const mesh = new THREE.Mesh(geom, mat);
    mesh.matrixAutoUpdate = false;
    mesh.userData.orientation = orientation;

    return {
      mesh,
      box3: new THREE.Box3(),
      lastChanged: xrPlane.lastChangedTime,
      orientation,
    };
  }

  getWallBoxes() {
    const boxes = [];
    for (const entry of this.planeMap.values()) {
      if (entry.orientation === 'vertical' && !entry.box3.isEmpty()) {
        // Inflate thin walls slightly so AABB intersection actually triggers.
        const b = entry.box3.clone();
        b.expandByScalar(WALL_THICKNESS / 2);
        boxes.push(b);
      }
    }
    return boxes;
  }

  hasFloor() {
    for (const entry of this.planeMap.values()) {
      if (entry.orientation === 'horizontal') return true;
    }
    return false;
  }

  hasWall() {
    for (const entry of this.planeMap.values()) {
      if (entry.orientation === 'vertical') return true;
    }
    return false;
  }
}
