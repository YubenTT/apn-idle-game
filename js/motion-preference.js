export function effectiveReducedMotion(savedReduced = false, osReduced = false) {
  return !!savedReduced || !!osReduced;
}

function ensureRuntime(state) {
  if (!state.runtime) state.runtime = {};
  return state.runtime;
}

export function setOsReducedMotion(state, value) {
  ensureRuntime(state).osReducedMotion = !!value;
  return motionReduced(state);
}

export function setSavedReducedMotion(state, value) {
  state.settings.reducedMotion = !!value;
  return motionReduced(state);
}

export function motionReduced(state) {
  return effectiveReducedMotion(
    state?.settings?.reducedMotion === true,
    state?.runtime?.osReducedMotion === true,
  );
}

export function createMotionPreferenceController({
  state,
  mediaQueryList = null,
  root = typeof document !== 'undefined' ? document.documentElement : null,
  onEffectiveChange = null,
  applyReducedMotion = null,
} = {}) {
  const query = mediaQueryList
    || (typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') || null : null);
  let lastEffective;

  const sync = (osReduced = query?.matches === true) => {
    const effective = setOsReducedMotion(state, osReduced);
    root?.classList?.toggle?.('reduce-motion', effective);
    applyReducedMotion?.(effective);
    if (effective !== lastEffective) {
      lastEffective = effective;
      onEffectiveChange?.(effective);
    }
    return effective;
  };

  const onChange = (event) => {
    sync(event?.matches === true);
  };

  query?.addEventListener?.('change', onChange);
  sync();

  return {
    get effective() {
      return motionReduced(state);
    },
    get saved() {
      return state?.settings?.reducedMotion === true;
    },
    get os() {
      return state?.runtime?.osReducedMotion === true;
    },
    refresh() {
      return sync();
    },
    setSaved(value) {
      setSavedReducedMotion(state, value);
      return sync(state?.runtime?.osReducedMotion === true);
    },
    dispose() {
      query?.removeEventListener?.('change', onChange);
    },
  };
}
