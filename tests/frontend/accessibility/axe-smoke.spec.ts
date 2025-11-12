/// <reference types="node" />
/// <reference types="jasmine" />

import { readFileSync } from 'fs';
import { join } from 'path';
import { JSDOM } from 'jsdom';
import axeCore, { AxeResults, NodeResult, Result, RunOptions } from 'axe-core';

type AxeGlobalKey = 'window' | 'document' | 'Node' | 'HTMLElement' | 'Element' | 'SVGElement' | 'navigator';
type AxeWindow = Window & typeof globalThis & { document: Document };

const FIXTURES_ROOT = join(__dirname, 'fixtures');
const GLOBAL_KEYS: AxeGlobalKey[] = ['window', 'document', 'Node', 'HTMLElement', 'Element', 'SVGElement', 'navigator'];

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_ROOT, `${name}.html`), 'utf8');
}

function captureGlobals(): Map<AxeGlobalKey, unknown> {
  const snapshot = new Map<AxeGlobalKey, unknown>();
  for (const key of GLOBAL_KEYS) {
    snapshot.set(key, (globalThis as Record<string, unknown>)[key]);
  }
  return snapshot;
}

function assignGlobals(domWindow: AxeWindow): void {
  for (const key of GLOBAL_KEYS) {
    (globalThis as Record<string, unknown>)[key] = (domWindow as unknown as Record<string, unknown>)[key];
  }
}

function restoreGlobals(snapshot: Map<AxeGlobalKey, unknown>): void {
  for (const key of GLOBAL_KEYS) {
    const value = snapshot.get(key);
    if (typeof value === 'undefined') {
      delete (globalThis as Record<string, unknown>)[key];
    } else {
      (globalThis as Record<string, unknown>)[key] = value;
    }
  }
}

async function analyzeHtml(html: string, options?: RunOptions): Promise<AxeResults> {
  const dom = new JSDOM(html, {
    pretendToBeVisual: true
  });

  const snapshot = captureGlobals();
  const axeWindow = dom.window as unknown as AxeWindow;
  assignGlobals(axeWindow);

  try {
    const results = await axeCore.run(axeWindow.document, {
      resultTypes: ['violations', 'incomplete'],
      ...options
    });
    return results;
  } finally {
    restoreGlobals(snapshot);
    dom.window.close();
    const maybeReset = axeCore as unknown as { reset?: () => void };
    if (typeof maybeReset.reset === 'function') {
      maybeReset.reset();
    }
  }
}

function formatViolations(violations: Result[]): string {
  if (!violations.length) {
    return 'No violations reported';
  }

  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node: NodeResult) => `    • ${node.target.join(' ')}\n      Fix: ${node.failureSummary}`)
        .join('\n');
      return `${violation.id} (${violation.impact ?? 'unknown impact'})\n  Help: ${violation.help}\n  More info: ${violation.helpUrl}\n  Nodes:\n${nodes}`;
    })
    .join('\n\n');
}

async function expectFixtureToPass(name: string, options?: RunOptions): Promise<void> {
  const html = loadFixture(name);
  const results = await analyzeHtml(html, options);

  expect(results.incomplete).withContext(`Incomplete checks for ${name}: ${formatViolations(results.incomplete)}`).toEqual([]);
  expect(results.violations).withContext(`Axe violations for ${name}:\n${formatViolations(results.violations)}`).toEqual([]);
}

describe('axe-core smoke tests', () => {
  it('home page markup passes default axe rules', async () => {
    await expectFixtureToPass('home');
  });

  it('match centre markup satisfies WCAG 2.1 AA rules', async () => {
    await expectFixtureToPass('match', {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag21aa']
      }
    });
  });

  it('team overview markup exposes accessible navigation and content', async () => {
    await expectFixtureToPass('team');
  });

  it('player profile markup handles structured media elements', async () => {
    await expectFixtureToPass('player');
  });
});