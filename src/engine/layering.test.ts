import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Rule from docs/05-tech-stack.md: "engine/ never imports from discord/".
// This test enforces that independently of the ESLint config
// (see eslint.config.mjs) so the rule fails the build even if lint config
// drifts.

const ENGINE_DIR = join(process.cwd(), 'src', 'engine');

function listTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return listTsFiles(fullPath);
    if (entry.isFile() && entry.name.endsWith('.ts')) return [fullPath];
    return [];
  });
}

const IMPORT_SPECIFIER_PATTERN =
  /(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]|(?:require|import)\(\s*['"]([^'"]+)['"]\s*\)/g;

function importSpecifiersIn(source: string): string[] {
  const specifiers: string[] = [];
  for (const match of source.matchAll(IMPORT_SPECIFIER_PATTERN)) {
    const specifier = match[1] ?? match[2];
    if (specifier) specifiers.push(specifier);
  }
  return specifiers;
}

function isForbidden(specifier: string): boolean {
  return specifier === 'discord.js' || specifier.split('/').includes('discord');
}

describe('layering: src/engine must never import from src/discord or discord.js', () => {
  const files = listTsFiles(ENGINE_DIR);

  it('finds engine source files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s has no forbidden import', (file) => {
    const source = readFileSync(file, 'utf8');
    const forbidden = importSpecifiersIn(source).filter(isForbidden);
    expect(forbidden).toEqual([]);
  });
});
