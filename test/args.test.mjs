import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, UsageError, HELP } from '../dist/args.js';

test('a bare command parses with sane defaults', () => {
  const a = parse(['account']);
  assert.equal(a.command, 'account');
  assert.equal(a.kind, 'cloud-render');
  assert.equal(a.json, false);
});

test('-o and --out are the same flag', () => {
  assert.equal(parse(['get', 'j1', '-o', 'a.webm']).out, 'a.webm');
  assert.equal(parse(['get', 'j1', '--out', 'a.webm']).out, 'a.webm');
  assert.equal(parse(['get', 'j1', '--out=a.webm']).out, 'a.webm');
});

test('positional arguments keep their order after the command', () => {
  const a = parse(['render', 'bundle.zip', '--kind', 'cloud-render-4k']);
  assert.equal(a.command, 'render');
  assert.deepEqual(a.rest, ['bundle.zip']);
  assert.equal(a.kind, 'cloud-render-4k');
});

test('a flag that eats the next flag is a usage error, not a silent bad value', () => {
  // `--key --json` used to read "--json" as the key and then fail with a 401.
  assert.throws(() => parse(['account', '--key', '--json']), UsageError);
});

test('an unknown kind is refused before any request is sent', () => {
  assert.throws(() => parse(['render', 'b.zip', '--kind', 'fast']), UsageError);
});

test('an unknown flag is refused rather than ignored', () => {
  assert.throws(() => parse(['account', '--secret']), UsageError);
});

test('help names every command it ships', () => {
  for (const c of ['render', 'account', 'jobs', 'job', 'get']) assert.ok(HELP.includes(c));
});
