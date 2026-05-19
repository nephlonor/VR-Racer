export class UI {
  constructor() {
    this.landing = document.getElementById('landing');
    this.overlay = document.getElementById('overlay');
    this.hint = document.getElementById('hint');
    this.placeBtn = document.getElementById('place-btn');
    this.crashEl = document.getElementById('crash');
    this.resetBtn = document.getElementById('reset-btn');
    this.startBtn = document.getElementById('start-btn');
    this.supportMsg = document.getElementById('support-msg');
    this.exitBtn = document.getElementById('exit-btn');
  }

  enterAR() {
    this.landing.classList.add('hidden');
    this.overlay.classList.remove('hidden');
    this.exitBtn.classList.remove('hidden');
  }

  exitAR() {
    this.overlay.classList.add('hidden');
    this.landing.classList.remove('hidden');
    this.crashEl.classList.add('hidden');
    this.placeBtn.classList.add('hidden');
    this.exitBtn.classList.add('hidden');
  }

  setHint(text) {
    if (!text) { this.hint.classList.add('hidden'); return; }
    this.hint.textContent = text;
    this.hint.classList.remove('hidden');
  }

  showPlace(visible) {
    this.placeBtn.classList.toggle('hidden', !visible);
  }

  showCrash(visible) {
    this.crashEl.classList.toggle('hidden', !visible);
  }

  setSupportMessage(text) {
    this.supportMsg.textContent = text;
  }
}
