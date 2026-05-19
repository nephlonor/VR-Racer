export async function checkSupport() {
  if (!('xr' in navigator)) {
    return { supported: false, reason: 'WebXR not available in this browser. On iPhone, enable Settings → Apps → Safari → Advanced → Feature Flags → WebXR Device API.' };
  }
  try {
    const ok = await navigator.xr.isSessionSupported('immersive-ar');
    return ok
      ? { supported: true }
      : { supported: false, reason: 'This browser does not support immersive-ar sessions. Use Safari on iPhone 15 Pro with WebXR Device API enabled.' };
  } catch (e) {
    return { supported: false, reason: 'WebXR check failed: ' + e.message };
  }
}

export async function startSession(domOverlayRoot) {
  const features = {
    requiredFeatures: ['hit-test', 'local-floor'],
    optionalFeatures: ['plane-detection', 'dom-overlay', 'anchors'],
    domOverlay: domOverlayRoot ? { root: domOverlayRoot } : undefined,
  };
  return navigator.xr.requestSession('immersive-ar', features);
}
