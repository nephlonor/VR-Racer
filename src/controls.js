// Touch joystick (steering) + GO/BRAKE buttons. Emits { steer, throttle, brake }.
//
// The joystick element is a circle; the knob follows the active touch within
// the circle's radius. `steer` is the x-axis component, -1 (left) to 1 (right).

export class Controls {
  constructor({ joystickEl, knobEl, throttleEl, brakeEl }) {
    this.joystickEl = joystickEl;
    this.knobEl = knobEl;
    this.throttleEl = throttleEl;
    this.brakeEl = brakeEl;

    this.state = { steer: 0, throttle: 0, brake: 0 };
    this._activePointer = null;
    this._center = { x: 0, y: 0 };
    this._radius = 60;

    this._bind();
  }

  _bind() {
    const j = this.joystickEl;
    j.addEventListener('pointerdown', (e) => {
      const rect = j.getBoundingClientRect();
      this._center.x = rect.left + rect.width / 2;
      this._center.y = rect.top + rect.height / 2;
      this._radius = rect.width / 2;
      this._activePointer = e.pointerId;
      j.setPointerCapture(e.pointerId);
      this._updateKnob(e.clientX, e.clientY);
    });
    j.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this._activePointer) return;
      this._updateKnob(e.clientX, e.clientY);
    });
    const release = (e) => {
      if (e.pointerId !== this._activePointer) return;
      this._activePointer = null;
      this.state.steer = 0;
      this.knobEl.style.transform = 'translate(0, 0)';
    };
    j.addEventListener('pointerup', release);
    j.addEventListener('pointercancel', release);

    const press = (target, key) => {
      const set = (v) => () => { this.state[key] = v; };
      target.addEventListener('pointerdown', set(1));
      target.addEventListener('pointerup', set(0));
      target.addEventListener('pointercancel', set(0));
      target.addEventListener('pointerleave', set(0));
    };
    press(this.throttleEl, 'throttle');
    press(this.brakeEl, 'brake');
  }

  _updateKnob(x, y) {
    const dx = x - this._center.x;
    const dy = y - this._center.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, this._radius);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clamped;
    const ky = Math.sin(angle) * clamped;
    this.knobEl.style.transform = `translate(${kx}px, ${ky}px)`;
    this.state.steer = kx / this._radius;
    // Vertical axis of the joystick currently unused; reserved for future
    // forward/reverse if we want to drop the buttons.
  }

  show() {
    this.joystickEl.classList.remove('hidden');
    this.throttleEl.classList.remove('hidden');
    this.brakeEl.classList.remove('hidden');
  }
  hide() {
    this.joystickEl.classList.add('hidden');
    this.throttleEl.classList.add('hidden');
    this.brakeEl.classList.add('hidden');
  }

  read() {
    return { ...this.state };
  }
}
