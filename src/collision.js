// Pure AABB intersection. The car's box (world-space) is tested against each
// wall plane's inflated AABB. Any intersection counts as a crash.
//
// THREE.Box3 has intersectsBox built in, but to keep this pure and easy to
// unit-test in Node, we accept plain { min:{x,y,z}, max:{x,y,z} } objects.

export function boxesIntersect(a, b) {
  return (
    a.min.x <= b.max.x && a.max.x >= b.min.x &&
    a.min.y <= b.max.y && a.max.y >= b.min.y &&
    a.min.z <= b.max.z && a.max.z >= b.min.z
  );
}

export function checkCrash(carBox, wallBoxes) {
  for (const wb of wallBoxes) {
    if (boxesIntersect(carBox, wb)) return true;
  }
  return false;
}
