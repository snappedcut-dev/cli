/**
 * Argument parsing, kept separate from anything that talks to the network.
 *
 * That split is the whole reason this file exists: every branch below is pure,
 * so the tests cover the part most likely to be wrong — what a flag means —
 * without a key, a server or a fixture.
 */

export type Parsed = {
  readonly command: string;
  readonly rest: readonly string[];
  readonly key: string | undefined;
  readonly base: string | undefined;
  readonly out: string | undefined;
  readonly kind: 'cloud-render' | 'cloud-render-4k';
  readonly json: boolean;
  readonly quiet: boolean;
  readonly help: boolean;
  readonly version: boolean;
};

export class UsageError extends Error {}

const FLAGS_WITH_VALUES = new Set(['--key', '--base', '--out', '-o', '--kind']);

export function parse(argv: readonly string[]): Parsed {
  let command = '';
  const rest: string[] = [];
  const values = new Map<string, string>();
  let json = false;
  let quiet = false;
  let help = false;
  let version = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;

    if (FLAGS_WITH_VALUES.has(arg)) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('-')) {
        throw new UsageError(`${arg} needs a value.`);
      }
      values.set(arg === '-o' ? '--out' : arg, value);
      i += 1;
      continue;
    }

    // --key=value is the same flag written the other way.
    const eq = arg.indexOf('=');
    if (arg.startsWith('--') && eq > 2 && FLAGS_WITH_VALUES.has(arg.slice(0, eq))) {
      values.set(arg.slice(0, eq), arg.slice(eq + 1));
      continue;
    }

    if (arg === '--json') { json = true; continue; }
    if (arg === '--quiet' || arg === '-q') { quiet = true; continue; }
    if (arg === '--help' || arg === '-h') { help = true; continue; }
    if (arg === '--version' || arg === '-V') { version = true; continue; }
    if (arg.startsWith('-') && arg !== '-') throw new UsageError(`Unknown flag ${arg}.`);

    if (!command) command = arg;
    else rest.push(arg);
  }

  const kind = values.get('--kind') ?? 'cloud-render';
  if (kind !== 'cloud-render' && kind !== 'cloud-render-4k') {
    throw new UsageError(`--kind is cloud-render or cloud-render-4k, not ${kind}.`);
  }

  return {
    command,
    rest,
    key: values.get('--key'),
    base: values.get('--base'),
    out: values.get('--out'),
    kind,
    json,
    quiet,
    help,
    version,
  };
}

export const HELP = `snappedcut — render a Snapped Cut project from a terminal

  snappedcut render <bundle.zip> -o out.webm   queue a render, wait, save the file
  snappedcut account                           who the key is, and credits left
  snappedcut jobs                              every job on the account
  snappedcut job <id>                          one job
  snappedcut get <id> -o out.webm              download a finished render

Options
  --key <sk_snapcut_...>   defaults to $SNAPCUT_KEY
  --base <url>             defaults to https://snappedcut.com
  --kind <kind>            cloud-render (default) or cloud-render-4k
  -o, --out <path>         where to write the file; - is stdout
  --json                   machine-readable output
  -q, --quiet              no progress on stderr
  -h, --help               this
  -V, --version            the version

The editing itself runs in your browser, on your machine. This talks to the one
thing that does not: the cloud render queue, which costs credits.
`;
