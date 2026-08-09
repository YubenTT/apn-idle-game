import {
  createMotionPreferenceController,
  motionReduced,
  setOsReducedMotion,
} from '../js/motion-preference.js';
import { feedbackAllowed } from '../js/sfx.js';

let fails = 0;
const ok = (condition, message) => {
  if (!condition) {
    console.error('FAIL', message);
    fails += 1;
  } else {
    console.log('OK', message);
  }
};

function createFakeRoot() {
  const tokens = new Set();
  return {
    classList: {
      toggle(token, force) {
        if (force) tokens.add(token);
        else tokens.delete(token);
      },
      contains(token) {
        return tokens.has(token);
      },
    },
  };
}

function createFakeMediaQueryList(initialMatches = false) {
  const listeners = new Set();
  return {
    matches: initialMatches,
    addEventListener(type, listener) {
      if (type === 'change') listeners.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === 'change') listeners.delete(listener);
    },
    emit(matches) {
      this.matches = matches;
      for (const listener of listeners) listener({ matches });
    },
  };
}

const state = {
  settings: { reducedMotion: false },
  runtime: {},
};

const root = createFakeRoot();
const mediaQueryList = createFakeMediaQueryList(false);
const applied = [];
const effective = [];

const controller = createMotionPreferenceController({
  state,
  mediaQueryList,
  root,
  onEffectiveChange(value) {
    effective.push(value);
  },
  applyReducedMotion(value) {
    applied.push(value);
  },
});

ok(motionReduced(state) === false, 'saved false + OS false keeps reduced motion off');
ok(root.classList.contains('reduce-motion') === false, 'DOM class starts off when both gates are false');
ok(feedbackAllowed({ muted: false, inAppReduced: motionReduced(state), osReduced: false }), 'feedback stays enabled while effective reduced motion is off');

mediaQueryList.emit(true);
ok(state.settings.reducedMotion === false, 'OS change never overwrites the saved in-app toggle');
ok(setOsReducedMotion(state, true) === true, 'state runtime OS flag composes into effective motion');
ok(motionReduced(state) === true, 'saved false + OS true enables reduced motion');
ok(root.classList.contains('reduce-motion') === true, 'DOM class tracks effective reduced motion');
ok(applied.at(-1) === true, 'SFX authority receives the effective reduced-motion value');
ok(effective.at(-1) === true, 'controller emits effective true on OS enable');
ok(!feedbackAllowed({ muted: false, inAppReduced: motionReduced(state), osReduced: false }), 'shared effective gate disables feedback after OS enable');

controller.setSaved(true);
mediaQueryList.emit(false);
ok(state.settings.reducedMotion === true, 'saved in-app toggle persists independently of OS changes');
ok(motionReduced(state) === true, 'saved true keeps reduced motion enabled after OS clears');
ok(root.classList.contains('reduce-motion') === true, 'DOM class stays on when saved toggle keeps reduced motion active');
ok(applied.at(-1) === true, 'effective reduced-motion sink stays true when saved toggle is on');

controller.setSaved(false);
ok(state.settings.reducedMotion === false, 'controller updates the saved in-app toggle on explicit change');
ok(motionReduced(state) === false, 'saved false + OS false disables reduced motion again');
ok(root.classList.contains('reduce-motion') === false, 'DOM class clears when both gates are false again');
ok(applied.at(-1) === false, 'effective reduced-motion sink clears with both gates off');

controller.dispose();

if (fails) process.exit(1);
