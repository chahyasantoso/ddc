# Scrollytelling Architecture & AI Knowledge Base

> [!IMPORTANT]
> **AI DIRECTIVE:** If you are an AI assistant tasked with maintaining, extending, or replicating this scrollytelling architecture, read this document carefully. It contains hard-won fixes for complex mobile layout bugs and deployment quirks that should not be regressed.

## 1. Core Stack & Principles

- **Framework:** Astro (SSR mode) + React (for complex UI).
- **Animation Engine:** Framer Motion (`useScroll`, `useTransform`).
- **Philosophy:** **No Scroll-Jacking.** Use native browser scrolling by creating a massive container (e.g., `400dvh`) and mapping `scrollYProgress` to absolute DOM transformations. 

## 2. The iOS/Android "Sticky Gap" Bug (CRITICAL)

### The Problem
When building fullscreen sticky viewports (`height: 100dvh`), allowing elements (like photos) to fly outside the container requires `overflow: visible`. However, mobile Chromium/WebKit layout engines have a severe bug: **Animating absolute children outside an `overflow: visible` sticky container expands the browser's hidden layout bounding box, forcing the element to unstick prematurely and revealing a black gap.**

### The Solution: The Dual-Grid Structure
Do not place the Map and Photo overlays in the same sticky viewport. Isolate the layout engine using CSS Grid and dual sticky containers stacked perfectly over each other.

**Implementation Pattern (`ScrollytellingUI.tsx`):**
```tsx
<div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', height: `${total}dvh` }}>
  
  {/* LAYER 1: strictly clipped map, isolated from all layout bugs */}
  <div className="sticky-viewport sv-map">
    <InteractiveMap />
  </div>

  {/* LAYER 2: visible overflow, explicitly walled off using 'contain' */}
  <div className="sticky-viewport sv-photos">
     <div className="floating-photos-zone">...</div>
  </div>

</div>
```

**Required CSS Structure (`scrollytelling.css`):**
```css
.sv-map {
  grid-area: 1 / 1;
  overflow: clip; /* completely immune to layout bugs */
}

.sv-photos {
  grid-area: 1 / 1;
  overflow: visible;         /* allows photos to fly out */
  pointer-events: none;      /* allows map clicks to pass through */
  contain: size layout;      /* CRITICAL: Prevents flying content from expanding the sticky bounding box! */
}
```

> [!CAUTION]
> If you remove `contain: size layout` or change container heights from `dvh` to `vh`, the landscape mobile map bug **will return**. Always sync parent container heights to the exact `dvh` units used by the sticky children.

## 3. Cloudflare D1 & SSR Routing

### Local Dev Fallbacks
When developing locally using `npm run dev`, Cloudflare D1 bindings may fail or complain about `no such table`. 
**AI Rule:** Ensure the database schema is correctly initialized, or build graceful fallbacks to mock data so development rendering does not crash if the database is unseeded.

### Astro Cloudflare Pages Deployments
Deploying Astro SSR to Cloudflare Pages requires specific routing configurations.
- **Rule:** The deployment is an Edge Function, not static hosting. A `_worker.js` entrypoint handles the routing.
- **Troubleshooting 404s:** If Cloudflare returns 404s or validation errors during GitHub Actions/deployment, verify that conflicting metadata files or static build caching aren't overriding the function routing. Always ensure `adapter: cloudflare()` is properly configured in `astro.config.mjs`.

## 4. Scrollytelling Choreography

### Mathematical Scroll Slices
Do not use trigger points or Intersection Observers for massive synced animations.
Instead, divide the scroll budget vertically into "slices" (e.g., `SLICE_VH = 100dvh`). Map absolute `dvh` offsets to `framer-motion`'s spring-damped progress value.

### Overlapped Transitions
Avoid sequentially waiting for animations. The best cinematic feel is achieved when the *exit* of the previous photo stack perfectly overlaps the *entry* of the next checkpoint. Pass the derived `smoothVH` context deeply into individual Photo instances to allow fine-grained `reveal` thresholds dynamically computing their `scale` and `y` constraints.
