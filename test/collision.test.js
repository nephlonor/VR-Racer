import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boxesIntersect, checkCrash } from '../src/collision.js';

const box = (x0, y0, z0, x1, y1, z1) => ({
  min: { x: x0, y: y0, z: z0 },
  max: { x: x1, y: y1, z: z1 },
});

test('boxesIntersect: overlapping', () => {
  assert.equal(boxesIntersect(box(0,0,0, 1,1,1), box(0.5,0.5,0.5, 2,2,2)), true);
});

test('boxesIntersect: touching faces still count', () => {
  assert.equal(boxesIntersect(box(0,0,0, 1,1,1), box(1,0,0, 2,1,1)), true);
});

test('boxesIntersect: separated', () => {
  assert.equal(boxesIntersect(box(0,0,0, 1,1,1), box(2,0,0, 3,1,1)), false);
});

test('checkCrash: no walls → no crash', () => {
  assert.equal(checkCrash(box(0,0,0, 1,1,1), []), false);
});

test('checkCrash: one matching wall triggers crash', () => {
  const car = box(0, 0, 0, 0.1, 0.05, 0.12);
  const walls = [
    box(2, 0, 0, 2.05, 2, 3),     // far wall, no hit
    box(-0.02, 0, 0, 0.03, 2, 3), // intersects car
  ];
  assert.equal(checkCrash(car, walls), true);
});
