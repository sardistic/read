# Project Decisions

Record durable architectural and operational decisions here.

### 2026-10-31 — Fall back to public Goodreads reading pages

Context: Goodreads shelf RSS feeds began returning HTTP 404 on 2026-10-28, including for other public accounts. The scraper previously interpreted HTTP failures as empty shelves, committed an empty scrape, and let the daily Pages deployment report success while reading status stayed stale.

Decision: Treat invalid RSS responses as failures. When RSS is unavailable, read the public profile for currently reading books and the current/previous Year in Books pages for completed books. Match their cover book IDs to existing library entries, preserve known finish dates, and assign approximate dates in reading order only for newly completed books after the last dated entry. Mark those dates as estimated and replace them when exact RSS dates become available. Fail the workflow without overwriting data if both sources are invalid.

Consequence: Finished and current books can continue to update daily while public profile pages remain accessible. The fallback cannot discover new To Read entries or exact finish dates; those resume when shelf RSS returns. Site labels estimated dates.

### 2026-10-16 — Share mobile tilt input across sand effects

Context: The global falling pixel sand and card sand only responded to pointer/touch coordinates.

Decision: A client-side `MobileMotionProvider` at the root owns one device-orientation subscription and shares a mutable gravity ref, avoiding React renders for each sensor event. Tilt starts automatically on secure touch devices without a reduced-motion preference when no gesture is required or access was already granted. Attempt the permission API on startup to reuse grants; if it rejects or denies access, retain the accessible Enable tilt button for a user gesture. Ignore invalid readings, smooth valid readings, transform gravity for screen rotation, and fall back to existing interaction when denied or no readings arrive within five seconds. This default-on behavior supersedes the initial opt-in design at the user's request.

Consequences: Background sand follows projected gravity; red card/anti-sand remains buoyant and travels in the opposite direction. A shared grid step supports all gravity directions, collisions and boundaries. Existing desktop background physics remains the fallback. Card animations pause offscreen and honor reduced motion. Phone tilt is intentionally session-only; no sensor readings or permission state are stored. `npm run test:motion` covers projection and grid invariants. Real-device Safari/Android feel remains a manual check.

### 2026-10-16 — Bound sand physics by elapsed time

Context: One physics step per animation callback made high-refresh phones run the sand simulation faster.

Decision: Share a timestamp-based limiter across the background and card simulations: 30 steps/second on coarse-pointer devices, 60 on desktop. Discard missed steps after pauses. Mobile cells are 3px for background sand and 2px for card sand (desktop retains 5px/4px). Keep interaction radii in CSS pixels and obstacle refresh at approximately 150ms.

Consequences: Grain movement, emission and simulated wind are independent of display refresh at or above the target rate. Mobile grains are finer and travel more slowly. Grid scans run only on accepted steps to limit the cost of the finer grid. Timing regressions cover 30/60/90/120/144Hz inputs and pause/resume.

