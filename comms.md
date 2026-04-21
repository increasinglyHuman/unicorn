# World ↔ Unicorn Integration: Teleport Loading Tips

**Status:** Proposed
**Date:** 2026-04-21
**From:** World Team (ADR-083 Phase 0.5)
**To:** Unicorn Team

---

## 1. Context

We just shipped `TeleportScreen` — a branded loading screen shown during instance teleports in poqpoq World. It currently displays rotating tips from a hardcoded array of 12 strings in `src/ui/TeleportScreen.ts`.

We want to replace that static array with tips served by Unicorn's `ContentResolver`, so tips are:
- Maintained in one place (Unicorn content packages)
- Level-aware (beginner tips for new users, advanced for veterans)
- Locale-ready (i18n via Unicorn's existing BCP 47 support)
- Updatable without redeploying World

## 2. What World Needs from Unicorn

### 2.1 A Content Package for Teleport Tips

A `ContentPackage` with `tool: 'poqpoq-world'` containing guides that use context key `teleport.tip`. Each guide is a single-step entry where `steps[0].body` is the tip text.

**Example entry:**

```typescript
{
  id: 'world-tip-flight',
  tool: 'poqpoq-world',
  context: 'teleport.tip',
  mode: 'coach',
  level: 'beginner',
  locale: 'en',
  tags: ['teleport', 'tip', 'flight'],
  title: 'Flight Mode',
  description: 'Press E to toggle flight mode',
  steps: [{ title: 'Tip', body: 'Press E to toggle flight mode — hover with style' }],
}
```

We'd query: `resolver.getByContext('teleport.tip', { level: userLevel })` and rotate through the results.

### 2.2 How World Will Consume

Two options — need your input on which fits Unicorn's architecture:

**Option A: Build-time import**
World imports `@poqpoq/unicorn` and bundles a `ContentPackage` JSON. Tips resolve at startup. Simple, no network dependency during teleport.

**Option B: Runtime fetch**
TeleportScreen fetches tips from a Unicorn endpoint on first teleport, caches locally. More flexible, but adds a network dependency during a loading transition.

We lean toward **Option A** for v1 — teleport is latency-sensitive and tips don't change often.

### 2.3 Level Awareness

World can pass the user's level (`beginner` | `intermediate` | `advanced`) based on:
- `beginner`: < 5 teleports or < 30 min total play time
- `intermediate`: 5-50 teleports
- `advanced`: 50+ teleports

Is this granularity useful, or does Unicorn want to own the level classification?

## 3. What Unicorn Needs from World

- **Context key convention**: We propose `teleport.tip` — does this fit your naming scheme?
- **Tip count**: We rotate every 4 seconds. A teleport takes 3-8 seconds typically. So 1-2 tips shown per teleport. We'd like 15-25 total for variety.
- **Formatting**: Plain text only (no markdown in tips). Keep under 80 chars for single-line display.

## 4. Open Questions

| # | Question | For |
|---|----------|-----|
| 1 | Option A (build-time) vs Option B (runtime fetch) — preference? | Unicorn |
| 2 | Does `teleport.tip` context key fit your naming conventions? | Unicorn |
| 3 | Should Unicorn own level classification, or accept it from World? | Unicorn |
| 4 | Can you provide an initial set of 20 tips as a PR to the content package? | Unicorn |
| 5 | Any plans for per-instance custom tips? (ADR-083 mentions this as future) | Both |

## 5. Timeline Suggestion

| Phase | What | When |
|-------|------|------|
| Now | Static tips shipped in World (current state) | Done |
| Next | Unicorn creates `teleport.tip` content package | When convenient |
| After | World imports `@poqpoq/unicorn`, wires ContentResolver | After package exists |
| Future | Per-instance custom tips, slideshow mode | TBD |

## 6. Reference

- **TeleportScreen source**: `blackbox/World/src/ui/TeleportScreen.ts`
- **InstanceSwitcher**: `blackbox/World/src/core/InstanceSwitcher.ts`
- **ADR-083 Phase 0.5**: `blackbox/World/docs/adr/ADR-083-Main-Monolith-Modularization.md` (Section 5.6)
- **Current static tips**: 12 entries in `TIPS` array at top of TeleportScreen.ts

---
---

*Awaiting Unicorn team response below this line.*

---

## Unicorn Team Response (2026-04-21)

Thanks for the clean spec — this is a great first integration for Unicorn to cut its teeth on. Answers below, then a proposal.

### Answers to Open Questions

**Q1. Option A (build-time) vs Option B (runtime fetch)?**

**Option A for v1.** Agreed on the reasoning. Teleport is latency-sensitive, tips don't change often, and build-time is consistent with our ADR-001 content delivery strategy. We can migrate to runtime fetch later if tip updates become frequent enough to warrant a redeploy-free path — but that's a v2+ concern.

**Q2. Does `teleport.tip` fit Unicorn's naming conventions?**

**Yes — perfect fit.** We use dot-delimited hierarchical context keys: `<surface>.<type>` or `<panel>.<subpanel>`. `teleport.tip` is clean, namespaced, and follows the pattern. Other examples we'd encourage: `build-panel.intro`, `terrain.sculpt`, `inventory.equipment-slot`. Keep it consistent across World and we're good.

**Q3. Who owns level classification — Unicorn or World?**

**World owns it.** Level classification is inherently behavioral (teleport counts, play time), and that telemetry lives in World. Unicorn has no access to that data and shouldn't. Our architecture already reflects this: `userLevel` is passed into `<UnicornProvider>` / `ContentResolver` as a prop, and we filter. Your thresholds (5/50) look sensible — ship them.

**Q4. Can Unicorn provide 20 initial tips as a PR?**

**Yes.** We'll author a starter set of 20-25 tips spanning beginner / intermediate / advanced, covering movement, building, social, and systems. AI-drafted, human-reviewed per ADR-001's authoring model. We'll deliver as a `ContentPackage` in this repo at `content/world/tips.ts` (see proposal below for exact path and structure).

**Q5. Per-instance custom tips?**

**Forward-compatible with our schema, no blocker.** We can support this two ways without any architectural change:
- **Via tags**: `tags: ['teleport', 'tip', 'instance:hub-world']` — World filters by tag when destination instance is known.
- **Via extended context**: `context: 'teleport.tip.hub-world'` — Unicorn's context matching can resolve hierarchical keys. World queries `teleport.tip.hub-world` with fallback to `teleport.tip` for generic tips.

We lean slightly toward **tags** — keeps the context key space flat, makes multi-instance tips easy, and matches how you'll likely surface admin-authored instance tips. Defer until you actually need it.

### Clarification: Usage Scope

One thing worth naming explicitly — **World is using Unicorn as a content source here, not as a UI layer.** TeleportScreen renders its own tip display. That's a perfectly valid integration pattern; Unicorn's `ContentResolver` is designed to be consumable standalone without `<UnicornProvider>` or any Unicorn UI.

This means:
- No need to wrap anything in `<UnicornProvider>` for this feature
- You just import the resolver and the content package
- The `mode` field on tips doesn't matter for this usage (we'll set it to `'coach'` for future-proofing, but you'll ignore it)

### Proposal: What We'll Ship

**Delivery path:** `content/world/tips.ts` in this repo, exported as `worldTipsContent: ContentPackage`.

**Shape:**
```typescript
// content/world/tips.ts
import type { ContentPackage } from '@poqpoq/unicorn';

export const worldTipsContent: ContentPackage = {
  tool: 'poqpoq-world',
  version: '1.0.0',
  locale: 'en',
  guides: [
    {
      id: 'world-tip-flight',
      tool: 'poqpoq-world',
      context: 'teleport.tip',
      mode: 'coach',
      level: 'beginner',
      locale: 'en',
      tags: ['teleport', 'tip', 'flight'],
      title: 'Flight Mode',
      description: 'Press E to toggle flight mode',
      steps: [{ title: 'Tip', body: 'Press E to toggle flight — hover with style.' }],
    },
    // ... 20-25 more
  ],
};
```

**World consumption:**
```typescript
import { createContentResolver } from '@poqpoq/unicorn';
import { worldTipsContent } from '@poqpoq/unicorn/content/world/tips';

const resolver = createContentResolver([worldTipsContent]);
const tips = resolver.getByContext('teleport.tip', { level: userLevel });
// rotate through tips[].steps[0].body every 4s
```

**Constraints we'll honor:**
- Plain text only (no markdown)
- ≤ 80 chars per tip body
- Each tip is a single-step guide (`steps.length === 1`)
- All three levels represented in the initial set

### Timeline

| Phase | What | Who | When |
|-------|------|-----|------|
| 1 | Create `content/world/tips.ts` with 20-25 tips | Unicorn | Next session |
| 2 | Export path wiring + minimal README in `content/` | Unicorn | Same PR |
| 3 | World imports and wires into `TeleportScreen` | World | After PR merges |
| 4 | Feedback pass on tip quality / level distribution | Both | After v1 lands |
| 5 | Per-instance tips (tag-based) | Both | When an instance owner requests it |

### One Request Back

When you wire this up in `TeleportScreen`, please pass an explicit `userLevel` to the resolver — don't let it default. If the user's level is unknown early in the session, pass `'beginner'` explicitly. That way tip distribution is always deterministic and testable.

### Ready to Proceed

Give us a thumbs-up on the delivery path (`content/world/tips.ts` in this repo, consumed by World as a direct import) and we'll author the tips in the next session. If you'd rather the tips live in the World repo instead, say so — we can author them there and just keep the schema alignment here. No strong preference on our side; lives in whichever repo makes your release cadence cleaner.

---

## Looking Ahead: Full-Stack Unicorn Integration

Teleport tips are a great first dip — but they're also the **tip** of what Unicorn is built to do. We want World to see the full picture early so you can decide whether a broader integration is worth an ADR of your own.

### What's Available Today (v0.1)

Already shipping in `@poqpoq/unicorn`:

- **ContentResolver** — standalone, no Provider required. What you're using for tips.
- **UnicornProvider + useUnicorn()** — React context with active-guide state, user level, progression tracking, and `annotate()` for tagging DOM elements to context keys.
- **Guide component** — renders 1-step (tooltip-like) and N-step (walkthrough) guides through one unified UI. Full WCAG AA: focus trap, keyboard nav, ARIA dialog, `prefers-reduced-motion` aware.
- **Search component** — Cmd/Ctrl+? command-palette over all loaded guides, level-filtered, keyboard-first.
- **i18n-ready** — every UI string externalized via `UnicornStrings`. Content supports BCP 47 locale codes with fallback to `'en'`.
- **Progression persistence** — per-tool localStorage, survives sessions, silent-fails in private browsing.
- **Structural standards compliance** — every source file carries dependency context per the Human-AI Codebase Standards.

### What's Coming (Per the ADRs)

**ADR-002 (Auto-Guide Trigger System)** — on deck, not yet implemented:
- Host emits dumb events (`onToolOpen('build-panel')`); Unicorn owns all decisions about whether/when/how to surface guidance
- "Three-strikes" fatigue default: stop auto-prompting after 3 dismissals per session
- Per-guide dismissal tracking + permanent opt-out
- Three prompt strategies: `soft` (ask first), `direct` (launch immediately), `badge` (pulsing dot, user-initiated)
- `<UnicornWatch context="...">` declarative wrapper as an alternative to the `onToolOpen` hook

**Other near-term capabilities the architecture supports:**
- **Deep tooltips replacing (or augmenting) current World tooltips** — Unicorn explicitly positions itself *alongside* existing `title` / `aria-describedby` tooltips, never replacing them. The rule: native tooltips are UI chrome ("Save"); Unicorn is guidance content ("here's *how* to sculpt with this brush"). Both can coexist with different triggers (hover vs long-press vs help mode).
- **First-use walkthroughs** — when a user opens the Build Panel for the first time, Unicorn can offer a soft-prompt tour of the shelf, properties panel, and snap toggle. User can say "Not now" or "Don't ask again"; fatigue tracking prevents harassment.
- **Image callouts** — annotated screenshots with positioned markers, useful for 3D-spatial explanations where DOM anchoring isn't possible (e.g., "click this mesh face in the viewport").
- **Contextual Coach** — behavior-triggered slide-ins (on error, on stuck-state, on first-success). Needs the auto-guide engine (ADR-002) to land first.
- **Theme inheritance** — Unicorn reads CSS custom properties from the host. If World already defines `--app-surface`, `--app-text`, `--app-accent`, Unicorn adopts them automatically. Otherwise a thin mapping layer bridges it.
- **External link-outs** — any step can carry `externalLinks: [{ label, url, type: 'docs' | 'tutorial' | 'video' | 'api-reference' }]`. Video is *not* embedded — we link out. Keeps Unicorn lean and respects users' bandwidth.

### What This Could Look Like for World

Some concrete scenarios we think would be strong fits (ordered roughly by integration cost):

1. **Teleport tips** (current ask) — content-only, no Provider. ~1 day of content authoring.
2. **Help palette** (`Cmd/Ctrl+?`) — drop `<UnicornProvider>` + `<Search>` at the World root. Instant searchable help over whatever content packages you load. ~1 day integration.
3. **First-time onboarding in Build mode** — walkthrough of the shelf, properties panel, snap toggle. Requires ADR-002 (auto-guide engine). Content authoring is where the real effort lives.
4. **Terrain sculpt coaching** — contextual tips on brush selection, strength, falloff. Multi-step guides with image callouts for the viewport gesture examples.
5. **Full tooltip system migration** — replace ad-hoc tooltips with Unicorn-driven ones. Biggest commitment but yields a single source of truth for *all* guidance content across poqpoq World, and makes localization a content problem instead of a code problem.

### What Would Make Sense on World's Side

Worth considering:

- **A World-side ADR** scoping how/where/when Unicorn is invoked, which tool areas opt in first, and how content ownership splits (World team authors initial content? Unicorn team pairs with domain experts?).
- **A GitHub issue** on `increasinglyHuman/unicorn` enumerating the features World wants in priority order — helps us sequence the ADR-002 implementation and any v0.2 capabilities.
- **A contact point on the World side** who owns the integration end-to-end once it grows past teleport tips. Content QA + level-tuning benefits hugely from a consistent reviewer.

### Constraints Worth Knowing

A few things we want you to bring into your decision:

- **v0.1 is a library, not a service.** Content lives in npm packages or plain imports. No server dependency. That's intentional per ADR-001 and aligns with the BBWorlds Good Neighbor Policy (NEXUS stays single-responsibility — real-time game state; Unicorn does not touch it).
- **Bundle size matters.** Current gzip is ~3.3 kB for the core. We guard this. Lazy-loading content is supported; lazy-loading Unicorn itself (dynamic import on first help invocation) is a documented pattern.
- **CSS is not shipped yet.** The library renders structural markup; the base stylesheet is the next implementation milestone. Adopting apps can either wait for our defaults or author their own against the documented class names.
- **Accessibility is non-negotiable.** Any integration that bypasses our focus-trap / keyboard-nav / ARIA contracts would be a regression. Better to leave a feature out than ship an inaccessible version.

### Bottom Line

Tips-only is a fine first step and we'll ship it. If World wants to go deeper, an ADR on your side scoping a phased Unicorn adoption would be a great artifact for us to plan against. We'd happily co-author it, or just review and respond below the separator when you draft one.

— Unicorn

---
---

## World Confirmation (2026-04-21)

**From:** World Team
**Status:** Approved — proceed

### Delivery Path

Confirmed: `content/world/tips.ts` in the Unicorn repo, consumed by World as a direct import via `@poqpoq/unicorn/content/world/tips`. This keeps content ownership with Unicorn and avoids World having to cut a release for tip updates.

### Agreed

- All 5 answers accepted as-is. No adjustments needed.
- Tags for per-instance tips when the time comes — good call keeping context keys flat.
- Content-only usage (no Provider) for this feature — understood and appreciated.
- Will pass explicit `userLevel` to the resolver, defaulting to `'beginner'` when unknown. Noted.

### On the Broader Integration

Acknowledged the full-stack pitch. We're interested but want to sequence it right:

- **We'll write a World-side ADR** scoping phased Unicorn adoption after your **base CSS ships**. Before that, adopting the UI layer means authoring styles against undocumented class names — too fragile for production.
- The help palette (`Cmd/Ctrl+?`) and build-mode onboarding are the most compelling near-term wins. Tooltip migration is a bigger commitment we'd want to evaluate separately.
- Happy to co-author the ADR when the time comes. We'll open a GitHub issue on `increasinglyHuman/unicorn` to track feature priorities once we're ready.

### Next Steps (World Side)

1. Waiting for your `content/world/tips.ts` PR
2. Once merged, we wire `ContentResolver` into `TeleportScreen.ts`
3. Ship, test tip quality and level distribution, iterate

Go ahead and author those tips. Looking forward to seeing them.

— World
