# ADR-002: Auto-Guide Trigger System

**Status:** Accepted
**Date:** 2026-03-19
**Accepted:** 2026-04-21
**Authors:** Allen Partridge (p0qp0q)
**Deciders:** Allen Partridge
**Depends on:** ADR-001 (UnicornNotes Architecture)

**Implementation:** Landed 2026-04-21 in v0.2. Pure decision engine at
`src/content/autoGuide/decisionEngine.ts`, state helpers at `fatigue.ts`,
Provider wiring via `useAutoGuide` hook, `UnicornWatch` and `AutoGuidePrompt`
components. 51 new tests; 70 total, all passing.

---

## Context

ADR-001 established UnicornNotes as a universal guidance framework with multiple modes including a Contextual Coach. But the core question remains: **how does guidance actually reach the user?**

User-initiated guidance (search, help button, keyboard shortcut) is straightforward — the user asks, Unicorn answers. But the highest-value guidance is **proactive** — appearing when the user needs it, before they know to ask. The classic case: a user opens a complex tool panel for the first time and has no idea where to start.

This is the difference between a help system and a coach. A help system waits. A coach reads the room.

However, proactive guidance is also the easiest to get wrong. Too aggressive and users disable it permanently. Too passive and they never discover it. The system must be **smart about when to intervene and graceful about when to back off**.

## Decision

We will build an **Auto-Guide Trigger System** that allows host applications to emit simple lifecycle events ("this tool opened", "this panel became visible") while Unicorn owns all intelligence about whether, when, and how to present guidance.

### Core Principle: Dumb Events, Smart Decisions

The host application's responsibility is minimal and mechanical:

```
Host App: "The build panel just opened."
Unicorn:  "Got it. Let me check if this user needs help with that."
```

The host never decides whether to show guidance. It just reports what happened. Unicorn makes the call.

### Architecture

```
┌──────────────────────────────────────────────┐
│              Host Application                 │
│                                               │
│  BuildPanel       TerrainEditor    AvatarTool │
│    │                  │                │      │
│    ▼                  ▼                ▼      │
│  onToolOpen()    onToolOpen()    onToolOpen() │
│                                               │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│           Auto-Guide Engine                   │
│                                               │
│  ┌─────────────┐  ┌──────────────────────┐   │
│  │  Trigger     │  │  Decision Engine     │   │
│  │  Registry    │──│                      │   │
│  │              │  │  • First use?        │   │
│  │  Maps context│  │  • Already seen?     │   │
│  │  keys to     │  │  • Dismissed count?  │   │
│  │  guide IDs   │  │  • Fatigue threshold?│   │
│  └─────────────┘  │  • Cooldown active?  │   │
│                    │  • User opted out?   │   │
│                    └──────────┬───────────┘   │
│                               │               │
│                    ┌──────────▼───────────┐   │
│                    │  Prompt Strategy      │   │
│                    │                       │   │
│                    │  'soft' → Ask first   │   │
│                    │  'direct' → Launch    │   │
│                    │  'badge' → Show dot   │   │
│                    └──────────────────────┘   │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │           Fatigue Tracker               │  │
│  │                                         │  │
│  │  Per-guide dismissals                   │  │
│  │  Session dismissal count                │  │
│  │  Global opt-out flag                    │  │
│  │  Persisted in localStorage              │  │
│  └─────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### Host App Integration

#### Minimal Integration (< 5 minutes)

The simplest integration: call `onToolOpen` when a panel or tool mounts.

```tsx
import { useUnicorn } from '@increasinglyhuman/unicorn';

function BuildPanel() {
  const { onToolOpen } = useUnicorn();

  useEffect(() => {
    onToolOpen('build-panel');
  }, [onToolOpen]);

  return (
    <div>
      {/* Build panel UI */}
    </div>
  );
}
```

That's it. The host app's job is done. Unicorn handles everything else.

#### Component Wrapper (even simpler)

For teams that prefer declarative integration:

```tsx
import { UnicornWatch } from '@increasinglyhuman/unicorn';

function BuildPanel() {
  return (
    <UnicornWatch context="build-panel">
      <div>
        {/* Build panel UI — UnicornWatch calls onToolOpen on mount */}
      </div>
    </UnicornWatch>
  );
}
```

`UnicornWatch` is a thin wrapper that calls `onToolOpen` on mount and optionally `onToolClose` on unmount. Zero logic, zero decisions.

#### Registering Triggers

The content package maps context keys to guide IDs. No host app code needed:

```typescript
const worldContent: ContentPackage = {
  tool: 'poqpoq-world',
  version: '1.0.0',
  guides: [
    {
      id: 'build-panel-intro',
      tool: 'poqpoq-world',
      context: 'build-panel',           // ← matches onToolOpen('build-panel')
      mode: 'guide',
      level: 'beginner',
      locale: 'en',
      autoTrigger: {                     // ← NEW: auto-guide configuration
        on: 'first-use',                 //   trigger on first time this context opens
        prompt: 'soft',                  //   ask before launching
        priority: 1,                     //   higher priority guides win ties
      },
      tags: ['building', 'onboarding'],
      title: 'Welcome to the Build Panel',
      description: 'A quick tour of the building tools',
      steps: [
        {
          target: '#build-shelf',
          highlight: true,
          title: 'The Object Shelf',
          body: 'Browse and drag objects into your world from here.',
        },
        {
          target: '#build-properties',
          highlight: true,
          title: 'Properties Panel',
          body: 'Select any object, then adjust position, rotation, scale, and materials here.',
        },
        {
          target: '#build-snap-toggle',
          highlight: true,
          title: 'Snap to Grid',
          body: 'Toggle grid snapping for precise object placement.',
        },
      ],
    },
  ],
};
```

The trigger is defined **in the content, not in the host app code**. This means:
- New guides can be added without touching the host app
- AI can author guides with triggers included
- Trigger behavior is reviewable in the same PR as the content

### Decision Engine

When `onToolOpen(contextKey)` fires, the Auto-Guide Engine evaluates a decision chain:

```
1. Is there a guide with autoTrigger matching this context?
   └─ No → do nothing

2. Has the user completed this guide?
   └─ Yes → do nothing

3. Has the user permanently dismissed this guide ("Don't ask again")?
   └─ Yes → do nothing

4. Has the user opted out of all auto-guides globally?
   └─ Yes → do nothing

5. Is the session fatigue threshold reached?
   └─ Yes → do nothing (but badge the help button to show guidance exists)

6. Is a cooldown active from a recent auto-prompt?
   └─ Yes → queue for later (or badge)

7. Is another guide currently active?
   └─ Yes → queue (don't interrupt an active guide)

8. All checks pass → prompt or launch based on strategy
```

Every "do nothing" is a **respectful** decision. The system errs on the side of silence.

### Prompt Strategies

The `prompt` field in `autoTrigger` controls how the guide is presented:

| Strategy | UX | When to Use |
|----------|-----|-------------|
| `'soft'` | Slide-in card: "Want a quick tour of the Build tools?" with **Yes** / **Not now** / **Don't ask again** | Default. Respects user agency. |
| `'direct'` | Launches the guide immediately (still dismissable with Escape/close) | Critical onboarding flows where the tool is unusable without guidance |
| `'badge'` | Shows a pulsing dot on the help button or annotated element — user clicks to start | Least intrusive. Good for non-essential "did you know?" guides |

### Fatigue Management

Fatigue tracking prevents Unicorn from becoming the annoying paperclip.

#### Per-Guide Tracking

```typescript
interface GuideFatigueState {
  /** Number of times user dismissed this specific guide's auto-prompt */
  dismissCount: number;
  /** User clicked "Don't ask again" */
  permanentlyDismissed: boolean;
  /** Last time this guide was auto-prompted (ISO timestamp) */
  lastPrompted: string | null;
}
```

#### Session Tracking

```typescript
interface SessionFatigueState {
  /** Total auto-guide dismissals this session */
  sessionDismissals: number;
  /** Timestamp of last auto-prompt (for cooldown) */
  lastAutoPrompt: number | null;
}
```

#### Configuration

```tsx
<UnicornProvider
  content={[worldContent]}
  tool="poqpoq-world"
  autoGuide={{
    enabled: true,
    fatigueThreshold: 3,     // stop auto-prompting after 3 dismissals per session
    cooldownSeconds: 30,      // wait 30s between auto-prompts
    maxDismissalsPerGuide: 2, // stop asking about a specific guide after 2 "Not now"
    defaultPrompt: 'soft',    // default strategy (overridable per guide)
  }}
>
```

#### The "Three Strikes" Default

Out of the box, Unicorn follows a sensible pattern:

1. **First time** tool opens → soft prompt
2. **User clicks "Not now"** → noted, will try once more next session
3. **Second dismissal** → noted, one more try
4. **Third dismissal** → Unicorn stops asking about this guide. Badge only.
5. **"Don't ask again"** → immediate permanent opt-out for this guide

If the user dismisses **any** 3 auto-prompts in a single session, Unicorn goes quiet for the rest of the session. The help button and search still work — Unicorn just stops volunteering.

### User Controls

Users must always have control. Unicorn provides:

- **Per-prompt controls**: "Not now" / "Don't ask again" on every soft prompt
- **Global toggle**: `useUnicorn().setAutoGuideEnabled(false)` — host app can expose this in settings
- **Reset**: `useUnicorn().resetProgression()` — start fresh (useful for "show me the tutorials again")

### Persistence

All fatigue and progression state persists in localStorage under the tool's namespace:

```
localStorage: unicorn:poqpoq-world
{
  "completedGuides": ["build-panel-intro"],
  "userLevel": "beginner",
  "dismissedGuides": [],
  "fatigue": {
    "build-panel-intro": { "dismissCount": 0, "permanentlyDismissed": false, "lastPrompted": null },
    "terrain-sculpt-intro": { "dismissCount": 2, "permanentlyDismissed": false, "lastPrompted": "2026-03-19T..." }
  },
  "sessionDismissals": 1,
  "autoGuideEnabled": true
}
```

---

## Guide for Adopting Teams

### Step 1: Install UnicornNotes

```bash
npm install @increasinglyhuman/unicorn
```

### Step 2: Wrap Your App

```tsx
import { UnicornProvider, Guide, Search } from '@increasinglyhuman/unicorn';
import { AutoGuidePrompt } from '@increasinglyhuman/unicorn';
import myContent from './unicorn-content';

function App() {
  return (
    <UnicornProvider
      content={[myContent]}
      tool="my-tool-name"
      autoGuide={{ enabled: true }}
    >
      <MyApp />
      <Guide />
      <Search />
      <AutoGuidePrompt />  {/* renders the soft-prompt UI */}
    </UnicornProvider>
  );
}
```

### Step 3: Emit Tool Events

Choose one approach — both are equivalent:

**Option A: Hook (imperative)**
```tsx
function MyPanel() {
  const { onToolOpen } = useUnicorn();
  useEffect(() => { onToolOpen('my-panel'); }, [onToolOpen]);
  return <div>...</div>;
}
```

**Option B: Wrapper (declarative)**
```tsx
function MyPanel() {
  return (
    <UnicornWatch context="my-panel">
      <div>...</div>
    </UnicornWatch>
  );
}
```

### Step 4: Author Content with Triggers

```typescript
{
  id: 'my-panel-intro',
  context: 'my-panel',        // matches the context from Step 3
  autoTrigger: {
    on: 'first-use',
    prompt: 'soft',
  },
  // ... title, steps, etc.
}
```

### Step 5: There Is No Step 5

That's it. Unicorn handles:
- Detecting first use
- Prompting at the right time
- Tracking dismissals
- Backing off when the user has had enough
- Never prompting for completed guides
- Keyboard accessibility for all prompts
- Persisting state across sessions

### What You DON'T Need to Do

- **Don't** write conditional logic for "should I show help?"
- **Don't** track whether users have seen tutorials
- **Don't** manage dismissal counts or cooldowns
- **Don't** build prompt/modal UI for offering help
- **Don't** worry about annoying power users — fatigue management is built in
- **Don't** change your existing tooltip or aria attributes — Unicorn is a separate layer

### CSS Theming (Optional)

If your app uses CSS custom properties, Unicorn inherits them automatically:

```css
/* If your app already defines these, Unicorn picks them up */
:root {
  --app-surface: #1a1a2e;
  --app-text: #e0e0e0;
  --app-accent: #00ff88;
}
```

Or explicitly map them:

```css
:root {
  --unicorn-bg: var(--my-app-bg);
  --unicorn-text: var(--my-app-text);
  --unicorn-accent: var(--my-app-primary);
}
```

If you don't use custom properties, Unicorn ships sensible dark-theme defaults.

---

## Content Authoring

Two paths to the same output. Both produce structured content that passes `unicorn validate` and merges through the same PR workflow.

### AI Authoring Path

The primary path. An AI agent with access to the host app's source code and Unicorn's content schema generates complete guides.

**Input:** "Write a guide for the Build Panel in poqpoq World"
**AI has access to:** host app source code + Unicorn content schema + existing guides for style reference
**Output:** a content file (TypeScript or JSON) ready for PR

```
Developer or content lead:
  "We need a guide for the new terrain sculpting tools"
        │
        ▼
  AI Agent (Claude Code, etc.):
    1. Reads TerrainEditor source → understands UI structure
    2. Reads Unicorn schema → knows required fields
    3. Reads existing guides → matches tone and depth
    4. Generates guide with steps, targets, triggers
    5. Submits as PR
        │
        ▼
  Human reviewer:
    - Accuracy check (are the steps right?)
    - Flow check (does the sequence make sense?)
    - Approve / request changes
        │
        ▼
  Merge → CI publishes to static CDN
```

The AI doesn't need any special UX. The schema is the interface. The repo is the workspace.

### Human Authoring Path

For when a human wants to write or substantially edit a guide. Kept minimal — no custom editor, no web UI.

**Tools:**

1. **VS Code snippets** — `unicorn-guide` snippet scaffolds a complete guide with all required fields pre-filled:

```
// Type "unicorn-guide" + Tab in VS Code →
{
  id: '${1:tool}-${2:feature}-intro',
  tool: '${1:tool}',
  context: '${3:context-key}',
  mode: 'guide',
  level: '${4|beginner,intermediate,advanced|}',
  locale: 'en',
  autoTrigger: {
    on: 'first-use',
    prompt: '${5|soft,direct,badge|}',
  },
  tags: [${6}],
  title: '${7:Guide Title}',
  description: '${8:Brief description for search}',
  steps: [
    {
      target: '${9:#element-id}',
      highlight: true,
      title: '${10:Step Title}',
      body: '${11:Step content}',
    },
  ],
}
```

2. **CLI validator** — catches errors before PR:

```bash
npx unicorn validate                    # validate all content
npx unicorn validate src/content/       # validate specific directory
npx unicorn validate --fix              # auto-fix trivial issues (missing defaults)
```

Checks: schema compliance, target references, media asset existence, prerequisite cycles, locale consistency.

3. **CLI preview** (Phase 2) — opens a browser with the guide rendered against a mock host:

```bash
npx unicorn preview build-panel-intro   # preview a specific guide
```

**That's it.** No custom editor. No web forms. A snippet to scaffold, a validator to check, and eventually a previewer. The same tools developers already use.

---

## Content Storage & Delivery

### Source of Truth: Git

All content lives in git. Period. This is non-negotiable because:
- Content PRs go through the same review workflow as code
- AI-authored content is diffable and auditable
- Content is versioned alongside the schema that defines it
- Rollback is `git revert`

**Where in git?** Two options depending on team preference:

| Approach | Structure | Best For |
|----------|-----------|----------|
| **Co-located** | Content lives in the host app's repo under `src/unicorn-content/` | Small teams, tightly-coupled content |
| **Centralized** | Dedicated `unicorn-content` repo with subdirectories per tool | Multiple teams, shared content, independent content release cadence |

For the BlackBox ecosystem, **centralized** makes more sense — the World team shouldn't need to release World just to fix a typo in a guide. Shared content (getting-started, navigation, account) lives once, used everywhere.

```
unicorn-content/                    # dedicated repo
├── shared/
│   ├── getting-started.ts
│   └── navigation.ts
├── poqpoq-world/
│   ├── building/
│   │   ├── build-panel-intro.ts
│   │   └── terrain-sculpt.ts
│   ├── avatars/
│   └── social/
├── animator/
├── skinner/
└── package.json                    # publishable as @increasinglyhuman/unicorn-content-*
```

### Runtime Delivery: Apache Static Files (NOT NEXUS)

> **Good Neighbor Policy Compliance:** NEXUS (port 3020) is a Socket.IO game state server
> handling real-time multiplayer. It is NOT a CDN or content delivery service. Adding static
> file endpoints to NEXUS would violate single responsibility, add load to a real-time service
> serving 100+ concurrent users, and risk the G-003 gotcha (never hot-patch NEXUS).
>
> Unicorn content delivery uses **Apache static file serving** — the same pattern as
> ADR-054 user asset images (`/var/www/world/assets/user/{userId}/`).

Git is the source. **Apache serves static JSON files.**

```
Content PR merges
       │
       ▼
  CI pipeline (or manual deploy):
    1. unicorn validate (all content)
    2. Build content packages (JSON bundles per tool)
    3. rsync to /var/www/world/assets/unicorn/ on poqpoq.com
       │
       ▼
  Apache serves directly (zero service involvement):
    https://poqpoq.com/world/assets/unicorn/poqpoq-world/v1.2.0/content.json
    https://poqpoq.com/world/assets/unicorn/animator/v1.0.3/content.json
    https://poqpoq.com/world/assets/unicorn/shared/v1.1.0/content.json
```

**Production directory structure:**
```
/var/www/world/assets/unicorn/          # Apache serves this directly
├── poqpoq-world/
│   ├── latest/content.json             # symlink to current version
│   └── v1.2.0/content.json             # versioned snapshot
├── animator/
│   └── latest/content.json
├── shared/
│   └── latest/content.json
└── manifest.json                       # lists all available packages + versions
```

**Infrastructure impact: ZERO.**
- No new ports (Apache already serves 80/443)
- No new services (static files, no process)
- No database connections (localStorage on client)
- No connection pool impact (0 of the 150 max_connections budget)
- No NEXUS involvement (respects single responsibility)

### Loading Strategy

```tsx
<UnicornProvider
  tool="poqpoq-world"
  content={{
    // Static-served: fetched on demand, always fresh
    remote: {
      url: 'https://poqpoq.com/world/assets/unicorn/poqpoq-world/latest/content.json',
      // Optional: also load shared content
      shared: 'https://poqpoq.com/world/assets/unicorn/shared/latest/content.json',
    },
    // Bundled fallback: baked into the app at build time
    // Used if fetch fails or while remote content loads
    fallback: bundledContent,
  }}
>
```

**Loading sequence:**

```
1. App starts → render with bundled fallback (instant, no network)
2. Fetch from Apache static path in background
3. Response arrives → swap in fresh content (seamless, no flash)
4. Fetch fails → continue with bundled (graceful degradation)
```

This means:
- **Guides work offline** (bundled fallback)
- **Content updates without redeploying the app** (rsync new JSON, done)
- **No loading spinner for help** (fallback is instant)
- **Content authors can ship fixes independently** (merge → CI rsync → users see it)
- **No service restarts** (Apache already running, just new files)

### Cache Strategy

- Apache `Cache-Control` / `ETag` headers on static JSON files
- Unicorn caches last-fetched content in localStorage
- On app load: serve from cache immediately, revalidate in background
- `latest/` symlink means the URL stays stable; content behind it changes on deploy
- Versioned paths (`v1.2.0/`) available for pinning if needed

---

## Good Neighbor Policy Compliance

Validated against poqpoq infrastructure policies (API Architecture v2.3, Database Policy v1.3, Gotcha Book).

| Resource | Unicorn Impact | Policy Limit | Status |
|----------|---------------|--------------|--------|
| **Database connections** | 0 | 150 max_connections | No impact |
| **Database tables** | 0 | 48 tables across 3 DBs | No impact |
| **Ports** | 0 (uses existing Apache 80/443) | 10 allocated ports | No impact |
| **PM2/systemd services** | 0 | 9 services running | No impact |
| **NEXUS Server** | 0 (explicitly avoided) | Single-responsibility | No impact |
| **Disk (server)** | ~1MB JSON per tool content package | Shared /var/www/ | Negligible |
| **Client storage** | ~5-20KB localStorage per tool | Browser limits | Negligible |

**Key compliance decisions:**
- **No backend service.** Unicorn is 100% client-side library + static JSON files.
- **No NEXUS involvement.** Content served by Apache, not the Socket.IO game state server. Respects G-003 and single-responsibility.
- **No database.** All state (progression, fatigue, preferences) is client-side localStorage. Zero connection pool impact.
- **Same deploy pattern as ADR-054.** Static files in `/var/www/world/assets/unicorn/`, same as user asset images. No new infrastructure patterns to learn.
- **No rsync --delete.** Content deploys use additive rsync only (respects G-002).

---

## Alternatives Considered

| Alternative | Why Not |
|-------------|---------|
| **Host app decides when to show guides** | Pushes complexity onto every adopting team. Each team reinvents fatigue logic, persistence, and UX. |
| **Always-visible help sidebar** | Permanent screen real estate cost. Violates "invisible by default." |
| **Mandatory onboarding flow on first login** | Users skip these reflexively. Context-specific triggers are more effective. |
| **DOM mutation observers to detect tool opens** | Too magical, too fragile. Breaks when apps restructure their DOM. Explicit events are reliable. |

## Consequences

### Positive
- **Near-zero integration cost.** One hook call or wrapper component per tool panel.
- **Content authors control triggers.** No host app code changes to add new auto-guides.
- **Users are respected.** The fatigue system ensures Unicorn helps without harassing.
- **Consistent behavior across the ecosystem.** Every BlackBox tool has the same thoughtful onboarding UX.

### Negative / Risks
- **Host apps must remember to emit events.** If a panel doesn't call `onToolOpen`, Unicorn can't help there.
- **Fatigue thresholds need tuning.** The "three strikes" default is a starting point, not gospel. Real usage data will inform adjustments.
- **localStorage limits.** Heavy users across many tools could accumulate significant state. May need cleanup/rotation strategy.

### Mitigations
- The `UnicornWatch` wrapper makes event emission declarative and hard to forget.
- Fatigue thresholds are configurable per-provider and per-guide.
- Progression state is compact (IDs and counts, not content). Unlikely to hit localStorage limits in practice.

---

*"The best coach knows when to speak up — and when to shut up."*
