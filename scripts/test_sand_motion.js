const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const ts = require('typescript');

// Exercise the actual TypeScript physics without introducing a test framework.
const source = readFileSync(require.resolve('../src/lib/sandMotion.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const physics = { exports: {} };
new Function('exports', 'module', compiled)(physics.exports, physics);
const { createSandFrameLimiter, orientationGravity, stepTiltedSand } = physics.exports;

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8);

test('mobile speed stays at 30 steps per second on 60/90/120/144Hz displays', () => {
    for (const refreshRate of [30, 60, 90, 120, 144]) {
        const shouldStep = createSandFrameLimiter(30);
        let count = 0;
        for (let frame = 0; frame < refreshRate * 10; frame++) {
            if (shouldStep(frame * 1000 / refreshRate)) count++;
        }
        assert.equal(count, 300, `simulation steps at ${refreshRate}Hz`);
    }
});

test('desktop speed stays at 60 steps per second on high-refresh displays', () => {
    for (const refreshRate of [60, 120, 144]) {
        const shouldStep = createSandFrameLimiter(60);
        let count = 0;
        for (let frame = 0; frame < refreshRate; frame++) {
            if (shouldStep(frame * 1000 / refreshRate)) count++;
        }
        assert.equal(count, 60);
    }
});

test('paused animations skip missed steps instead of catching up', () => {
    const shouldStep = createSandFrameLimiter(30);
    assert.equal(shouldStep(0), true);
    assert.equal(shouldStep(10000), true);
    assert.equal(shouldStep(10001), false);
    assert.equal(shouldStep(10016), false);
    assert.equal(shouldStep(10034), true);
});

test('gravity projects portrait, landscape and inverted poses into the screen', () => {
    for (const [beta, gamma, angle, x, y] of [
        [90, 0, 0, 0, 1], [0, 90, 0, 1, 0], [0, -90, 0, -1, 0],
        [-90, 0, 0, 0, -1], [0, 90, 90, 0, -1], [0, -90, -90, 0, -1],
        [90, 0, 180, 0, -1], [0, 0, 0, 0, 0],
    ]) {
        const result = orientationGravity(beta, gamma, angle);
        close(result.x, x);
        close(result.y, y);
    }
});

test('grains move only one cell per step in each gravity direction', () => {
    for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
        const grid = new Uint8Array(25);
        grid[12] = 1;
        stepTiltedSand(grid, 5, 5, { x, y }, 1);
        assert.equal(grid[12 + y * 5 + x], 1);
        assert.equal(grid.reduce((sum, cell) => sum + cell, 0), 1);
    }
});

test('flat phone stays still and red grains can move against gravity', () => {
    const grid = new Uint8Array(25);
    grid[12] = 2;
    stepTiltedSand(grid, 5, 5, { x: 0, y: 0 }, 2);
    assert.equal(grid[12], 2);
    stepTiltedSand(grid, 5, 5, { x: 0, y: -1 }, 2);
    assert.equal(grid[7], 2);
});

test('solid obstacles block grains and opposing grains annihilate', () => {
    const grid = new Uint8Array(25);
    const obstacles = new Uint8Array(25);
    grid[12] = 1;
    obstacles[16] = obstacles[17] = obstacles[18] = 1;
    stepTiltedSand(grid, 5, 5, { x: 0, y: 1 }, 1, obstacles);
    assert.equal(grid[12], 1);
    obstacles.fill(0);
    grid[17] = 2;
    stepTiltedSand(grid, 5, 5, { x: 0, y: 1 }, 1, obstacles);
    assert.equal(grid[12], 0);
    assert.equal(grid[17], 0);
});

test('settled grains stay inside every boundary with no wraparound', () => {
    for (const [index, x, y] of [[0, -1, 0], [4, 1, 0], [0, 0, -1], [20, 0, 1]]) {
        const grid = new Uint8Array(25);
        grid[index] = 1;
        stepTiltedSand(grid, 5, 5, { x, y }, 1);
        assert.equal(grid[index], 1);
        assert.equal(grid.reduce((sum, cell) => sum + cell, 0), 1);
    }
});

test('dense piles conserve grains through repeated changes in direction', () => {
    const grid = new Uint8Array(100);
    for (let i = 30; i < 70; i++) grid[i] = 1;
    for (const direction of [{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }]) {
        for (let i = 0; i < 30; i++) stepTiltedSand(grid, 10, 10, direction, 1);
        assert.equal(grid.reduce((sum, cell) => sum + cell, 0), 40);
    }
});
