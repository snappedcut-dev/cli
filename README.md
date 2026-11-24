# @snappedcut/cli

Render a [Snapped Cut](https://snappedcut.com) project from a terminal or a CI job.

```sh
npm install -g @snappedcut/cli
export SNAPCUT_KEY=sk_snapcut_...          # from https://snappedcut.com/account

snappedcut render project.zip -o out.webm
```

```
Queued job_7fa21c — 12s, 24 credits, 976 left.
  queued…
  running…
  done…
Wrote out.webm (4812904 bytes).
```

## Commands

| | |
| --- | --- |
| `render <bundle.zip>` | Queue a render, wait for it, save the file. |
| `account` | Who the key belongs to and how many credits are left. |
| `jobs` | Every job on the account. |
| `job <id>` | One job, with its error if it failed. |
| `get <id>` | Download a finished render. |

| Option | |
| --- | --- |
| `--key` | Defaults to `$SNAPCUT_KEY`. |
| `--base` | Defaults to `https://snappedcut.com`. For a self-hosted install. |
| `--kind` | `cloud-render` (default) or `cloud-render-4k`. |
| `-o, --out` | Where to write. `-` is stdout. |
| `--json` | Machine-readable output. |
| `-q, --quiet` | No progress on stderr. |

## In a pipeline

Progress goes to **stderr** and the file to **stdout**, so `-o -` pipes real
bytes:

```sh
snappedcut render project.zip -o - | aws s3 cp - s3://bucket/out.webm
```

`--json` prints the job, what it cost and where the bytes went:

```sh
snappedcut render project.zip --json | jq '.charged, .priced.seconds'
```

Every command exits non-zero on failure, so `set -e` behaves. A render that
fails server-side has **already been refunded** by the time the CLI reports it.

## You cannot set the price

There is no `--seconds`. The server reads the timeline duration out of the
bundle's own `project.json` and prices on that, because a duration supplied by
the caller is a price supplied by the caller. What you were charged is in the
output.

## What a bundle is

A zip of the project: `project.json` plus the media it names. The editor writes
one from **Share → Export bundle**, and
[`@snappedcut/mcp`](https://github.com/snappedcut-dev/mcp) builds one headlessly.
A bundle whose media is missing is refused at submit, before any charge — it
would otherwise render successfully as the right number of blank frames, and
nothing downstream could tell.

## The editing is not here

Decode, cut, filter and encode run in a browser on WebCodecs, on the viewer's
own machine. This talks to the one part that does not: the cloud render queue,
which is opt-in and costs credits. Thin wrapper over
[`@snappedcut/sdk`](https://github.com/snappedcut-dev/sdk).

MIT
