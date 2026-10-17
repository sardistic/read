export interface SandGravity {
    x: number;
    y: number;
    active: boolean;
}

// Physics follows elapsed time rather than the display's 60/90/120Hz refresh.
// Missed steps are discarded so resuming a hidden tab never causes a burst.
export function createSandFrameLimiter(stepsPerSecond: number) {
    const interval = 1000 / stepsPerSecond;
    let lastStep: number | undefined;
    return (timestamp: number) => {
        if (lastStep === undefined) {
            lastStep = timestamp;
            return true;
        }
        const steps = Math.floor((timestamp - lastStep + 0.01) / interval);
        if (steps < 1) return false;
        lastStep += steps * interval;
        return true;
    };
}

// Project earth gravity into CSS screen coordinates, including landscape rotation.
export function orientationGravity(beta: number, gamma: number, angle: number) {
    const radians = Math.PI / 180;
    const x = Math.cos(beta * radians) * Math.sin(gamma * radians);
    const y = Math.sin(beta * radians);
    const rotation = angle * radians;
    return {
        x: x * Math.cos(rotation) + y * Math.sin(rotation),
        y: y * Math.cos(rotation) - x * Math.sin(rotation),
    };
}

// Traverse against gravity so a grain can move at most one cell per step.
export function stepTiltedSand(
    grid: Uint8Array,
    cols: number,
    rows: number,
    gravity: { x: number; y: number },
    particle: 1 | 2,
    obstacles?: Uint8Array,
) {
    const strength = Math.hypot(gravity.x, gravity.y);
    if (strength < 0.08) return;
    const horizontal = Math.abs(gravity.x) > Math.abs(gravity.y);
    const major = Math.sign(horizontal ? gravity.x : gravity.y);
    const minorValue = horizontal ? gravity.y : gravity.x;
    const minor = Math.sign(minorValue);
    const diagonalChance = Math.abs(minorValue / (horizontal ? gravity.x : gravity.y));
    const majorSize = horizontal ? cols : rows;
    const minorSize = horizontal ? rows : cols;

    const move = (x: number, y: number, dx: number, dy: number) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return false;
        const target = ny * cols + nx;
        if (obstacles?.[target] || grid[target] === particle) return false;
        const source = y * cols + x;
        // Opposing grains annihilate, as in the default simulation.
        grid[target] = grid[target] === 0 ? particle : 0;
        grid[source] = 0;
        return true;
    };

    for (let a = 0; a < majorSize; a++) {
        const primary = major > 0 ? majorSize - 1 - a : a;
        // Alternate sideways order to avoid a persistent left/right bias.
        const reverse = Math.random() < 0.5;
        for (let b = 0; b < minorSize; b++) {
            const secondary = reverse ? minorSize - 1 - b : b;
            const x = horizontal ? primary : secondary;
            const y = horizontal ? secondary : primary;
            const index = y * cols + x;
            if (grid[index] !== particle) continue;
            if (obstacles?.[index]) {
                grid[index] = 0;
                continue;
            }
            if (Math.random() > Math.min(1, strength)) continue;
            const drift = Math.random() < diagonalChance ? minor : 0;
            if (move(x, y, horizontal ? major : drift, horizontal ? drift : major)) continue;
            if (drift && move(x, y, horizontal ? major : 0, horizontal ? 0 : major)) continue;
            const side = minor || (Math.random() < 0.5 ? -1 : 1);
            if (move(x, y, horizontal ? major : side, horizontal ? side : major)) continue;
            // Do not slide uphill when the phone is tilted strongly sideways.
            if (diagonalChance < 0.15) {
                move(x, y, horizontal ? major : -side, horizontal ? -side : major);
            }
        }
    }
}
