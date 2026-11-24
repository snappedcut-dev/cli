import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { SnappedCut, SnappedCutError } from '@snappedcut/sdk';
import { HELP, parse, UsageError } from './args.js';

const version = (): string =>
  (createRequire(import.meta.url)('../package.json') as { version: string }).version;

/** Progress goes to stderr so `-o -` can pipe real bytes out of stdout. */
const note = (quiet: boolean, line: string): void => {
  if (!quiet) process.stderr.write(`${line}\n`);
};

const emit = (json: boolean, value: unknown, human: string): void => {
  process.stdout.write(json ? `${JSON.stringify(value, null, 2)}\n` : `${human}\n`);
};

const save = async (out: string | undefined, bytes: Uint8Array): Promise<string> => {
  if (out === '-') {
    process.stdout.write(bytes);
    return 'stdout';
  }
  const path = out ?? 'out.webm';
  await writeFile(path, bytes);
  return path;
};

export async function main(argv: readonly string[]): Promise<number> {
  const args = parse(argv);

  if (args.version) { process.stdout.write(`${version()}\n`); return 0; }
  if (args.help || !args.command) { process.stdout.write(HELP); return args.command ? 0 : 1; }

  const key = args.key ?? process.env.SNAPCUT_KEY;
  if (!key) throw new UsageError('No key. Pass --key or set SNAPCUT_KEY.');

  const snapcut = new SnappedCut({ key, ...(args.base ? { base: args.base } : {}) });

  switch (args.command) {
    case 'account': {
      const account = await snapcut.account();
      emit(args.json, account, `${account.email} — ${account.credits} credits`);
      return 0;
    }

    case 'jobs': {
      const jobs = await snapcut.jobs();
      emit(
        args.json,
        jobs,
        jobs.length
          ? jobs.map((j) => `${j.id}  ${j.state.padEnd(7)}  ${j.seconds}s  ${j.kind}`).join('\n')
          : 'No jobs.',
      );
      return 0;
    }

    case 'job': {
      const id = args.rest[0];
      if (!id) throw new UsageError('Which job? snappedcut job <id>');
      const job = await snapcut.job(id);
      emit(args.json, job, `${job.id}  ${job.state}${job.error ? `  ${job.error}` : ''}`);
      return 0;
    }

    case 'get': {
      const id = args.rest[0];
      if (!id) throw new UsageError('Which job? snappedcut get <id> -o out.webm');
      const where = await save(args.out, await snapcut.output(id));
      note(args.quiet, `Wrote ${where}.`);
      return 0;
    }

    case 'render': {
      const path = args.rest[0];
      if (!path) throw new UsageError('Which bundle? snappedcut render <bundle.zip>');

      const bundle = await readFile(path);
      const job = await snapcut.render(bundle, { kind: args.kind });
      note(
        args.quiet,
        `Queued ${job.id} — ${job.priced.seconds}s, ${job.charged} credits, ${job.credits} left.`,
      );

      let last = '';
      const bytes = await snapcut.wait(job.id, {
        onState: (j) => {
          if (j.state !== last) { last = j.state; note(args.quiet, `  ${j.state}…`); }
        },
      });

      const where = await save(args.out, bytes);
      if (args.json) emit(true, { ...job, output: where, bytes: bytes.byteLength }, '');
      else note(args.quiet, `Wrote ${where} (${bytes.byteLength} bytes).`);
      return 0;
    }

    default:
      throw new UsageError(`Unknown command ${args.command}. Try --help.`);
  }
}
