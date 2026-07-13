/** APN Idle — quips, roast lines, patch-parody comedy */

export const KILL_LINES = [
  'Moderated.',
  'Not a source.',
  'Fact-checked into dust.',
  'Patch notes > vibes.',
  'Stale content expired.',
  'That rumor got a 410.',
  'Offline? Permanent.',
  'APN never sleeps.',
  'Summary: deleted.',
  'Trust score: 0.',
  'Hotfixed out of existence.',
  'Couldn’t handle peer review.',
  'No changelog. No mercy.',
  'Live feed only.',
  'Verified? Absolutely not.',
  'That was so last season.',
  'Spoiler blocked ✨',
  'Lag spike lagged itself.',
  'Editor’s Pick: gone.',
  'See you never, rumor bot.',
];

export const BOSS_OPEN = [
  'Version Gate: please update your attitude.',
  'Boss fight loading… estimated 0 fun for them.',
  'Major version detected. Bring the big gun.',
  'This Gate thinks it’s a AAA launch. Cute.',
];

export const BOSS_WIN = [
  'Gate cleared. Changelog: you won.',
  'Version bumped. Ego patched.',
  'Ship it. Ship everything.',
  'That Gate is now a footnote.',
];

export const BOSS_FAIL = [
  'Gate self-healed. Classic enterprise software.',
  'Timer expired. Product managers everywhere nodded.',
  'Needs more DPS… and less meetings.',
  'Rollback successful. For the boss. Rude.',
];

export const LEVEL_LINES = [
  'Tracker Rank up. Resume looking spicier.',
  'New SP unlocked. Please allocate responsibly (or don’t).',
  'You leveled. LinkedIn would be proud.',
  'Rank up! The feed believes in you.',
];

export const SHIP_LINES = [
  'Published. No rollback this time.',
  'Notes live. Gamers: “finally.”',
  'Rep gained. Influencers: sweating.',
  'Published. Refresh the homepage of life.',
];

export const SCANNER_LINES = [
  'Weapon upgraded. Noise has left the chat.',
  'More laser. Less patience.',
  'Firmware: slightly unhinged.',
  'Damage up. Feed’s in trouble.',
];

export const SPRINT_HINTS = [
  'Hold to sprint — energy is basically coffee.',
  'Tap orbs for energy and Signal.',
  'Red Patch Notes drop Notes — Publish for Rep.',
];

export const TITLE_TAGLINES = [
  'Crush noise. Ship patches. Stay unreasonably live.',
  'The only idle game where spoiler bots deserve it.',
  'Waiting for patch notes? Become the patch notes.',
  'All Patch Notes presents: workplace violence (for content).',
];

export const ENEMY_ROASTS = {
  stale: ['Stale post archived.', 'Too old for the feed.'],
  rumor: ['Fake leak rejected.', 'Source: none.'],
  lag: ['Broken link removed.', '404 energy.'],
  spoiler: ['Spoiler muted.', 'No peeks allowed.'],
  patch: ['Notes secured.', 'Verified drop.'],
  event: ['Event spam cleared.', 'FOMO cancelled.'],
  boss: ['Version Gate down.', 'Major version owned.'],
};

export function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

export function killLine(type) {
  if (Math.random() < 0.45 && ENEMY_ROASTS[type]) return pick(ENEMY_ROASTS[type]);
  return pick(KILL_LINES);
}
