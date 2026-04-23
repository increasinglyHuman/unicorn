/**
 * World loading-screen tips — the first content package shipped with @increasinglyhuman/unicorn.
 * Authored to replace the static placeholder array in World's TeleportScreen.ts. Consumed by
 * World as a data-only import (no UnicornProvider required) via the ContentResolver's getByContext
 * method, rotated through every few seconds during instance teleports.
 *
 * Design constraints per the World ↔ Unicorn comms doc:
 *   - Single-step guides where steps[0].body is the display text
 *   - Plain text only (no markdown or HTML)
 *   - ≤ 80 characters per tip body for single-line display at standard resolutions
 *   - Spread across beginner / intermediate / advanced so level filtering yields variety
 *   - context: 'teleport.tip' — flat key, instance-specific tips use tags (e.g. 'instance:hub')
 *
 * Content philosophy (per ADR-001 authoring model):
 *   - Teach one specific thing per tip
 *   - Respect the reader's intelligence — no "did you know" hand-holding
 *   - Small personality okay, but the fact is the product, not the joke
 *   - Reference features that actually exist in World today; mark forward-looking ones 'advanced'
 *
 * Depends on: ../../src/types (ContentPackage type)
 * Depended on by: World's TeleportScreen.ts via @increasinglyhuman/unicorn/content/world/tips
 */

// The source import goes to src/types for type-checking during development.
// After build, a postbuild script rewrites the emitted .d.ts's import path to
// resolve against the published package layout (dist/index.d.ts). See
// scripts/fix-content-types.mjs.
import type { ContentPackage } from '../../src/types';

export const worldTipsContent: ContentPackage = {
  tool: 'poqpoq-world',
  version: '1.0.0',
  guides: [
    // ──────────────────────────────────────────────────────────────────
    // BEGINNER — core controls, basic social, world concept
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'world-tip-flight',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'beginner',
      locale: 'en',
      tags: ['teleport', 'tip', 'movement', 'flight'],
      title: 'Flight',
      description: 'Take off with E',
      steps: [
        {
          title: 'Tip',
          body: 'Press E to take flight. Gravity is optional here — just land to come back.',
        },
      ],
    },
    {
      id: 'world-tip-jump-run',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'beginner',
      locale: 'en',
      tags: ['teleport', 'tip', 'movement'],
      title: 'Jump and Run',
      description: 'Shift jumps, R toggles run mode',
      steps: [
        {
          title: 'Tip',
          body: 'Shift jumps, R toggles run mode. Hands stay on WASD.',
        },
      ],
    },
    {
      id: 'world-tip-emote-wheel',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'beginner',
      locale: 'en',
      tags: ['teleport', 'tip', 'social', 'emote'],
      title: 'Emote Wheel',
      description: 'Q opens the social emote wheel',
      steps: [
        {
          title: 'Tip',
          body: 'Press Q to open the emote wheel. Small gestures keep worlds friendly.',
        },
      ],
    },
    {
      id: 'world-tip-action-bar',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'beginner',
      locale: 'en',
      tags: ['teleport', 'tip', 'combat', 'action-bar'],
      title: 'Action Bar',
      description: 'Keys 1–0 fire your hotbar',
      steps: [
        {
          title: 'Tip',
          body: 'Keys 1 through 0 fire your action bar — emotes, abilities, combat arts.',
        },
      ],
    },
    {
      id: 'world-tip-right-click',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'beginner',
      locale: 'en',
      tags: ['teleport', 'tip', 'objects'],
      title: 'Object Menus',
      description: 'Right-click reveals context actions',
      steps: [
        {
          title: 'Tip',
          body: 'Right-click any object to see what you can do with it. Take, Copy, more.',
        },
      ],
    },
    {
      id: 'world-tip-persistence',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'beginner',
      locale: 'en',
      tags: ['teleport', 'tip', 'progression', 'world'],
      title: 'Avatar Travels With You',
      description: 'Avatar, inventory, and XP persist across worlds',
      steps: [
        {
          title: 'Tip',
          body: 'Your avatar, inventory, and progression travel with you between worlds.',
        },
      ],
    },
    {
      id: 'world-tip-chat-open',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'beginner',
      locale: 'en',
      tags: ['teleport', 'tip', 'social', 'chat'],
      title: 'Open Chat',
      description: 'T opens chat',
      steps: [
        {
          title: 'Tip',
          body: 'Press T to chat. Say hello — worlds warm up fast.',
        },
      ],
    },
    {
      id: 'world-tip-chat-channels',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'beginner',
      locale: 'en',
      tags: ['teleport', 'tip', 'social', 'chat'],
      title: 'Chat Channels',
      description: 'Local is here, DMs travel',
      steps: [
        {
          title: 'Tip',
          body: 'Local chat stays in this world. Direct messages find friends anywhere.',
        },
      ],
    },
    {
      id: 'world-tip-inventory',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'beginner',
      locale: 'en',
      tags: ['teleport', 'tip', 'inventory'],
      title: 'Inventory Panel',
      description: 'Recent, Worn, and folder tree',
      steps: [
        {
          title: 'Tip',
          body: 'Inventory has three tabs: Recent, Worn, and a folder tree of everything.',
        },
      ],
    },
    {
      id: 'world-tip-instances',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'beginner',
      locale: 'en',
      tags: ['teleport', 'tip', 'world', 'instance'],
      title: 'World Instances',
      description: 'Each world is its own place',
      steps: [
        {
          title: 'Tip',
          body: 'Each world is its own place — own terrain, own residents, own rules.',
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────
    // INTERMEDIATE — building, landscapes, progression systems
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'world-tip-build-mode',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'intermediate',
      locale: 'en',
      tags: ['teleport', 'tip', 'build'],
      title: 'Build Mode',
      description: 'Shape any world you own',
      steps: [
        {
          title: 'Tip',
          body: 'Build mode lets you shape any world you own — create, edit, compose.',
        },
      ],
    },
    {
      id: 'world-tip-grid-snap',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'intermediate',
      locale: 'en',
      tags: ['teleport', 'tip', 'build', 'precision'],
      title: 'Grid Snap',
      description: 'Half-meter snap, OpenSim-style',
      steps: [
        {
          title: 'Tip',
          body: 'Grid snap is on at half a meter, OpenSim-style. Toggle off for free form.',
        },
      ],
    },
    {
      id: 'world-tip-gizmos',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'intermediate',
      locale: 'en',
      tags: ['teleport', 'tip', 'build', 'gizmo'],
      title: 'Gizmo Modes',
      description: 'G/R/S switch position, rotation, scale',
      steps: [
        {
          title: 'Tip',
          body: 'G, R, S switch gizmos — position, rotation, scale. Just like home.',
        },
      ],
    },
    {
      id: 'world-tip-delete-escape',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'intermediate',
      locale: 'en',
      tags: ['teleport', 'tip', 'build'],
      title: 'Delete and Deselect',
      description: 'Delete removes, Escape deselects',
      steps: [
        {
          title: 'Tip',
          body: 'Delete removes the selected object. Escape deselects without regret.',
        },
      ],
    },
    {
      id: 'world-tip-worn-groups',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'intermediate',
      locale: 'en',
      tags: ['teleport', 'tip', 'inventory', 'equipment'],
      title: 'Worn by Type',
      description: 'Equipped gear groups by category',
      steps: [
        {
          title: 'Tip',
          body: 'Worn groups your gear by type — animations, clothing, materials, more.',
        },
      ],
    },
    {
      id: 'world-tip-landscaper',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'intermediate',
      locale: 'en',
      tags: ['teleport', 'tip', 'build', 'landscape'],
      title: 'Landscaper',
      description: 'Trees, rocks, grasses, small plants',
      steps: [
        {
          title: 'Tip',
          body: 'Landscaper scatters the living things — trees, rocks, grasses, small plants.',
        },
      ],
    },
    {
      id: 'world-tip-environment-panel',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'intermediate',
      locale: 'en',
      tags: ['teleport', 'tip', 'environment', 'weather'],
      title: 'Environment Panel',
      description: 'Weather, water, and light',
      steps: [
        {
          title: 'Tip',
          body: 'Environment panel rules weather, water, and light. Tune dusk to taste.',
        },
      ],
    },
    {
      id: 'world-tip-deity-bonding',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'intermediate',
      locale: 'en',
      tags: ['teleport', 'tip', 'deity', 'progression'],
      title: 'Deity Bonding',
      description: 'Choice steers Attribute growth',
      steps: [
        {
          title: 'Tip',
          body: 'Bond with a deity early — your choice steers which Attributes grow fastest.',
        },
      ],
    },
    {
      id: 'world-tip-resonance',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'intermediate',
      locale: 'en',
      tags: ['teleport', 'tip', 'progression', 'akashic'],
      title: 'Resonance',
      description: 'Soul XP from everything',
      steps: [
        {
          title: 'Tip',
          body: 'Resonance is soul XP. Quests, bonding, discovery — everything pays in.',
        },
      ],
    },
    {
      id: 'world-tip-essences',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'intermediate',
      locale: 'en',
      tags: ['teleport', 'tip', 'progression', 'akashic'],
      title: 'Four Essences',
      description: 'Resonance, Wisdom, Creativity, Connection',
      steps: [
        {
          title: 'Tip',
          body: 'Essences come in four flavors: Resonance, Wisdom, Creativity, Connection.',
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────
    // ADVANCED — combat math, power-user mechanics
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'world-tip-faith-multiplier',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'advanced',
      locale: 'en',
      tags: ['teleport', 'tip', 'deity', 'faith'],
      title: 'Faith Multiplier',
      description: 'Faith scales deity blessings',
      steps: [
        {
          title: 'Tip',
          body: 'Faith scales deity blessings from 1.0x to 2.0x. Devotion compounds.',
        },
      ],
    },
    {
      id: 'world-tip-hp-formula',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'advanced',
      locale: 'en',
      tags: ['teleport', 'tip', 'combat', 'stats'],
      title: 'HP Scaling',
      description: 'STR and rank drive HP',
      steps: [
        {
          title: 'Tip',
          body: 'HP is 100 + Strength x 5 + rank bonus. Tanks stack STR and climb tiers.',
        },
      ],
    },
    {
      id: 'world-tip-crit-cap',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'advanced',
      locale: 'en',
      tags: ['teleport', 'tip', 'combat', 'stats'],
      title: 'Crit Ceiling',
      description: 'Cunning feeds crit, 40% cap',
      steps: [
        {
          title: 'Tip',
          body: 'Cunning feeds crit. The ceiling is 40 percent — sharp enough to matter.',
        },
      ],
    },
    {
      id: 'world-tip-dodge-cap',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'advanced',
      locale: 'en',
      tags: ['teleport', 'tip', 'combat', 'stats'],
      title: 'Dodge Ceiling',
      description: 'Agility powers Dodge, 50% cap',
      steps: [
        {
          title: 'Tip',
          body: 'Agility powers Dodge, capped at 50 percent. Grace, not immortality.',
        },
      ],
    },
    {
      id: 'world-tip-link-sets',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'advanced',
      locale: 'en',
      tags: ['teleport', 'tip', 'build', 'advanced'],
      title: 'Link Sets',
      description: 'Multi-prim objects move as one',
      steps: [
        {
          title: 'Tip',
          body: 'Link sets chain multiple prims into one object that moves as a whole.',
        },
      ],
    },
  ],
};
