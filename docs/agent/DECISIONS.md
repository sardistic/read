# Project Decisions

Record durable architectural and operational decisions here.

### 2026-10-16 — Share mobile tilt input across sand effects

Context: The global falling pixel sand and card sand only responded to pointer/touch coordinates.

Decision: A client-side `MobileMotionProvider` at the root owns one device-orientation subscription and shares a mutable gravity ref, avoiding React renders for each sensor event. Tilt starts automatically on secure touch devices without a reduced-motion preference when no gesture is required or access was already granted. Attempt the permission API on startup to reuse grants; if it rejects or denies access, retain the accessible Enable tilt button for a user gesture. Ignore invalid readings, smooth valid readings, transform gravity for screen rotation, and fall back to existing interaction when denied or no readings arrive within five seconds. This default-on behavior supersedes the initial opt-in design at the user's request.

Consequences: Background sand follows projected gravity; red card/anti-sand remains buoyant and travels in the opposite direction. A shared grid step supports all gravity directions, collisions and boundaries. Existing desktop background physics remains the fallback. Card animations pause offscreen and honor reduced motion. Phone tilt is intentionally session-only; no sensor readings or permission state are stored. `npm run test:motion` covers projection and grid invariants. Real-device Safari/Android feel remains a manual check.

### Date — Decision title

Context:

Decision:

Consequences:
