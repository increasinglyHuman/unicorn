# ADR-001: UnicornNotes — Universal Guidance Architecture

**Status:** Proposed
**Date:** 2026-03-19
**Authors:** Allen Partridge (p0qp0q)
**Deciders:** Allen Partridge

---

## Context

Every tool in the BlackBox Creative Suite and poqpoq World ecosystem needs user guidance — tooltips, walkthroughs, video tutorials, step-by-step coaching, contextual help. Today, each tool reinvents this: hardcoded help text, scattered tooltips, disconnected documentation. The result is inconsistent UX, duplicated effort, and guidance that's always an afterthought.

Users of creative tools — 3D artists, world builders, animators — learn best through rich, contextual, multimedia instruction delivered *in situ*, not by reading docs in a separate tab. They need a coach, not a manual.

**UnicornNotes** (Unicorn) is the answer: a universal, embeddable guidance framework that any product in the ecosystem can integrate. The "guide on the side" — invisible when you don't need it, instantly available when you do.

## Decision

We will build UnicornNotes as a **React component library with a content-driven architecture**, designed for embedding into any web-based tool in the BlackBox/poqpoq ecosystem.

### Core Principles

1. **Content, not code.** Guidance is authored as structured content (not hardcoded components). Authors write content; Unicorn renders it.
2. **Contextual, not navigational.** Guidance appears where the user is, tied to what they're doing — not buried in a help menu.
3. **Invisible by default.** Zero footprint when not invoked. No UI chrome until summoned.
4. **Progressive disclosure.** From a single-step hint to a multi-step guide to external docs — users choose their depth.
5. **Ecosystem-native.** Works in any React app. Themes to match the host. Shares content across tools.
6. **Augment, never replace.** Host apps already have UI tooltips (`title`, `aria-describedby`, Tippy.js, Radix, etc.) for basic chrome hints ("Save", "Undo", "Brush size: 12px"). That's the host app's domain. Unicorn is a separate *guidance layer* — "here's *how* to use this brush to sculpt realistic terrain." It attaches alongside existing tooltips, triggered distinctly (help indicator, help mode, explicit request), never interfering with the app's existing accessible UI.
7. **Accessible by design.** WCAG AA compliance is a core constraint, not a phase. Unicorn must work for all users regardless of input method or assistive technology.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Host Application                      │
│  (poqpoq World, Animator, Skinner, Legacy, etc.)        │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              <UnicornProvider>                       │ │
│  │                                                     │ │
│  │  ┌───────────────┐ ┌───────────┐ ┌──────────────┐  │ │
│  │  │    Guide      │ │  Image    │ │ Contextual   │  │ │
│  │  │ (1-N steps)   │ │ Callouts  │ │ Coach        │  │ │
│  │  └───────────────┘ └───────────┘ └──────────────┘  │ │
│  │                                                     │ │
│  │  ┌─────────────────────────────────────────────────┐│ │
│  │  │           Content Resolver                      ││ │
│  │  │  (loads content by context key + user level)    ││ │
│  │  └─────────────────────────────────────────────────┘│ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────┬──────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │    Content Packages     │
              │                         │
              │  ├── poqpoq-world/      │
              │  │   ├── building/      │
              │  │   ├── terrain/       │
              │  │   └── avatars/       │
              │  ├── animator/          │
              │  ├── skinner/           │
              │  └── shared/            │
              │      ├── navigation/    │
              │      └── getting-started│
              └─────────────────────────┘
```

### Guidance Modes

| Mode | Trigger | UX | Use Case |
|------|---------|-----|----------|
| **Guide** (1 step) | Help indicator on element, long-hover, or help mode | Rich popup anchored to element with text, images | Explaining a button, slider, or panel |
| **Guide** (N steps) | User requests, help menu, or auto on first visit | Sequenced overlay panels with element highlighting, prev/next navigation | "How do I sculpt terrain?" or new feature onboarding |
| **Image Callout** | Inline within guide steps or standalone | Annotated screenshot with numbered markers | Visual reference for UI layout |
| **Contextual Coach** | Triggered by user behavior or errors | Slide-in assistant panel | "It looks like you're trying to..." |

**Guide is one component.** One step = tooltip-like. Many steps = walkthrough. The difference is configuration (`steps[]`), not separate implementations. Each step can include `externalLinks` for handoff to full docs, videos, or tutorials when in-app depth isn't enough.

### Progressive Depth with External Handoff

Not everything belongs inside an in-app guide. Complex topics — shader authoring, IK constraint theory, OAR format internals — deserve full documentation. Unicorn handles this through **progressive depth with graceful handoff**:

```
Guide (1 step)  →  Guide (N steps)  →  "Go Deeper"  →  External Docs / Video
    (5s)               (2-5min)                           (full article)
```

Any content node can declare `externalLinks`:

```yaml
externalLinks:
  - label: "Terrain Sculpting Deep Dive"
    url: "https://docs.poqpoq.com/world/terrain/sculpting"
    type: docs          # docs | tutorial | video | api-reference
  - label: "Heightmap Format Specification"
    url: "https://docs.poqpoq.com/world/terrain/heightmap-spec"
    type: api-reference
```

External links render as styled cards (not bare URLs) with type icons, and open in a context-appropriate way — new tab for docs, modal for videos, inline iframe for API references when the host app supports it. This keeps Unicorn focused on **in-context guidance** while acknowledging that some knowledge requires dedicated space.

### Content Schema (Draft)

Content is authored in **MDX-like structured files** with frontmatter:

```yaml
---
id: world-building-terrain-sculpt
tool: poqpoq-world
context: terrain-editor.sculpt-mode
mode: step-guide
level: beginner            # beginner | intermediate | advanced
prerequisites:
  - world-building-basics
tags: [terrain, sculpting, 3d]
---

# Sculpting Terrain in poqpoq World

<Step target="#sculpt-brush-selector" highlight>
## Step 1: Choose Your Brush

Select a brush shape from the toolbar. Each brush affects terrain differently:

<VideoClip src="terrain-brushes-overview.mp4" duration="0:45" />

- **Raise** — Push terrain upward
- **Smooth** — Blend rough edges
- **Flatten** — Level terrain to a target height
</Step>

<Step target="#terrain-canvas" highlight>
## Step 2: Paint the Landscape

Click and drag on the terrain to sculpt. Hold Shift to invert the brush action.

<ImageCallout src="sculpt-controls.png" markers={[
  { x: 120, y: 45, label: "Brush size" },
  { x: 200, y: 45, label: "Brush strength" }
]} />
</Step>
```

### Integration API (Draft)

Host applications integrate Unicorn with minimal boilerplate:

```jsx
import { UnicornProvider, UnicornTrigger, useUnicorn } from '@poqpoq/unicorn';
import worldContent from '@poqpoq/unicorn-content-world';

function App() {
  return (
    <UnicornProvider
      content={worldContent}
      theme="dark"
      userLevel="beginner"
    >
      <TerrainEditor />
      <UnicornTrigger />  {/* Floating help button */}
    </UnicornProvider>
  );
}

// Inside any component — annotate elements for guidance
function BrushSelector() {
  const { annotate } = useUnicorn();

  return (
    <div {...annotate('terrain-editor.sculpt-mode.brush-selector')}>
      {/* Brush UI — Unicorn attaches tooltip/highlight automatically */}
    </div>
  );
}
```

### Content Authoring Model: AI-First with Human Review

The likely scenario for complex feature documentation is **AI-authored with human review**. The content schema and pipeline must be designed for this workflow:

```
┌──────────────┐     ┌───────────────┐     ┌──────────────┐     ┌──────────┐
│  AI Author   │────▶│  Content PR   │────▶│ Human Review │────▶│ Published│
│              │     │               │     │              │     │          │
│ - Reads app  │     │ - Structured  │     │ - Accuracy   │     │ - Versioned
│   source     │     │   MDX files   │     │ - Tone       │     │ - Deployed
│ - Generates  │     │ - Screenshots │     │ - Coverage   │     │ - Lazy-loaded
│   guides     │     │ - Video refs  │     │ - UX flow    │     │          │
└──────────────┘     └───────────────┘     └──────────────┘     └──────────┘
```

**Why AI-first matters to the architecture:**

1. **Structured schema is non-negotiable.** AI generates clean, parseable content when given a strict schema. Freeform HTML/markdown leads to drift. The MDX-with-frontmatter approach gives AI clear constraints and humans clear review surfaces.

2. **Content validation is automated.** A CLI tool (`unicorn validate`) checks:
   - Schema compliance (required frontmatter fields, valid mode/level enums)
   - Target element references exist in the host app's annotation registry
   - Media assets referenced actually exist
   - Prerequisite chains are acyclic
   - No orphaned or unreachable content

3. **Content generation is repeatable.** An AI agent with access to the host app's source code and Unicorn's content schema can generate a complete guide for any feature. The schema *is* the prompt template.

4. **Review is structured, not editorial.** Reviewers check: Is this accurate? Is the flow logical? Are the screenshots current? They don't rewrite prose — they approve, request changes, or flag for regeneration.

5. **Staleness detection.** Content frontmatter includes `sourceHash` — a hash of the source files the content describes. When the source changes, the content is flagged for review/regeneration. AI can propose updates; humans approve.

```yaml
---
id: world-building-terrain-sculpt
tool: poqpoq-world
sourceHash: a1b2c3d4     # hash of TerrainEditor component tree
generatedBy: claude       # authoring agent
reviewedBy: allen         # human reviewer
reviewedAt: 2026-03-15
---
```

### Content Delivery Strategy

- **Bundled content** — NPM packages per tool (`@poqpoq/unicorn-content-world`)
- **Lazy loaded** — Content fetched on demand, not at app startup
- **Versioned** — Content packages version-locked to tool releases
- **Shared content** — Cross-tool content (navigation, account, common patterns) in a shared package
- **Future: CMS** — Optional headless CMS backend for non-developer content authoring

### Theming

Unicorn inherits host application theming via CSS custom properties:

```css
:root {
  --unicorn-bg: var(--app-surface, #1a1a2e);
  --unicorn-text: var(--app-text, #e0e0e0);
  --unicorn-accent: var(--app-accent, #00ff88);
  --unicorn-highlight: rgba(0, 255, 136, 0.15);
}
```

Each BlackBox tool already has its own dark-theme aesthetic. Unicorn adapts, never imposes.

### Search

Unicorn has a content index — it knows every guide, every step, every tag across the entire content library loaded for the current tool. Exposing that as **searchable** is a natural extension:

- **Cmd/Ctrl+?** (or host-configured shortcut) opens Unicorn search
- Fuzzy search across guide titles, step text, and tags
- Results grouped by topic, ranked by relevance to current context
- Selecting a result opens that guide directly (at the relevant step if multi-step)
- Search is scoped to the current tool's content by default, with an option to search across the ecosystem

This is lightweight — it's a client-side index over already-loaded content metadata, not a backend service. Think VS Code's command palette, but for "how do I...?" questions.

```jsx
// Host app can also trigger search programmatically
const { openSearch } = useUnicorn();
<button onClick={() => openSearch('terrain')}>Help</button>
```

### Accessibility (WCAG AA)

Unicorn is a public library used in educational contexts. Accessibility is a core constraint:

- **Keyboard navigable** — step through guides with Tab/Enter/Escape/Arrow keys
- **Screen reader compatible** — guides use `role="dialog"` with `aria-labelledby`, steps announced via `aria-live` regions
- **Focus management** — opening a guide traps focus within it; closing returns focus to the trigger element
- **Escape always dismisses** — no focus traps, no dead ends
- **`prefers-reduced-motion`** — all transitions and animations respect this media query
- **Color contrast** — WCAG AA minimum (4.5:1 text, 3:1 UI components) enforced in default theme, documented for custom themes
- **No interference with host accessibility** — Unicorn's guidance layer is additive; it never modifies `aria-*` attributes or roles on host elements

### Internationalization (i18n)

Allen believes everything should ship in 19 languages. The rest of us believe in shipping things. Here's the compromise:

**The architecture supports i18n from day one. The content doesn't have to.**

Concretely:

1. **Content keys, not hardcoded strings.** All Unicorn UI chrome (buttons: "Next", "Previous", "Close", "Search guides...") goes through a string table. This is cheap to do up front and expensive to retrofit.

2. **Content schema supports `locale`.** A guide can declare its locale, and the Content Resolver can prefer locale-matched content when available:

```yaml
---
id: world-building-terrain-sculpt
locale: en                          # default
localizedFrom: null                 # or "en" if this is a translation
---
```

3. **Fallback is always English.** If a guide doesn't exist in the user's locale, show the English version. No blank screens, no broken flows.

4. **Translation is a content operation, not a code change.** Because content is structured and AI-authored, translation is a natural extension of the authoring pipeline — an AI agent translates a guide, a bilingual reviewer approves it. Same PR workflow.

5. **We ship in English.** Translations happen when there's demand, not because we feel guilty about monolingualism. The architecture just makes sure we're not painting ourselves into a corner.

**What this means practically:**
- Phase 1: English only, but all UI strings externalized
- Phase N (when Allen wins the argument): Add locale-aware content resolution, translation pipeline, RTL layout support
- The content schema never needs to change — `locale` is there from the start, defaulting to `en`

### User Progression

Unicorn tracks user progression per tool:

- **Seen guides** — Don't re-show completed walkthroughs
- **Skill level** — Adjust content depth (beginner → intermediate → advanced)
- **Preferences** — Guide verbosity, auto-guide on/off
- **Storage** — localStorage per tool, optionally synced via poqpoq account API

## Alternatives Considered

| Alternative | Why Not |
|-------------|---------|
| **Per-tool help systems** | Duplicated effort, inconsistent UX, always an afterthought |
| **External docs site (Docusaurus, GitBook)** | Context switch kills learning; not embedded |
| **Existing libraries (Intro.js, Shepherd.js)** | Walkthrough-only; no rich multimedia, no content schema, no ecosystem integration |
| **AI-generated guidance (LLM chatbot)** | Complements but doesn't replace structured content; no visual walkthroughs |

## Consequences

### Positive
- **Build once, guide everywhere.** New tools get world-class guidance by adding content, not code.
- **Content authoring is decoupled from development.** Educators, technical writers, and even AI can author guidance.
- **Consistent UX across the ecosystem.** Users learn the guidance patterns once.
- **Progressive investment.** Start with tooltips and step guides; add video, AI coaching, and CMS later.

### Negative / Risks
- **Integration overhead.** Each host app must adopt `UnicornProvider` and annotate elements.
- **Content maintenance.** Guidance must be updated when tools change — stale content is worse than none.
- **Scope creep.** The vision is large; must ship useful increments, not wait for perfection.

### Mitigations
- Start with a single integration (poqpoq World) to validate the architecture before generalizing.
- Content schema includes version fields; stale content can be flagged and hidden.
- Roadmap is phased: tooltips first, then guides, then video, then AI coach.

## Roadmap (Proposed Phases)

| Phase | Focus | Modules |
|-------|-------|---------|
| **Phase 1 — Foundation** | Core library + basic guidance | Provider, Deep Tooltips, Step Guides, Content Schema |
| **Phase 2 — Rich Media** | Video and image integration | Video Panel, Image Callouts, Media hosting |
| **Phase 3 — Walkthroughs** | Full feature tours | Feature Walkthrough engine, Element spotlighting |
| **Phase 4 — Intelligence** | Contextual + adaptive | Contextual Coach, User progression, Behavior triggers |
| **Phase 5 — Ecosystem** | Scale across all tools | Content packages per tool, Shared content library, CMS |

## Next Steps

1. Ratify this ADR
2. Create module-level ADRs for Phase 1 components (Provider, Tooltips, Step Guides, Content Schema)
3. Initialize project scaffolding (React + TypeScript + Vite)
4. Build proof-of-concept integration with poqpoq World (terrain building guide)

---

*"The best teacher is the one you forget is there — until you need them."*
