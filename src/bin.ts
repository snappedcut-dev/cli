#!/usr/bin/env node
import { SnappedCutError } from '@snappedcut/sdk';
import { main } from './index.js';
import { UsageError } from './args.js';

/* The binary is its own file so the tests can import `main` without it
   deciding the process's exit code for them. */
main(process.argv.slice(2))
  .then((code) => { process.exitCode = code; })
  .catch((error: unknown) => {
    if (error instanceof UsageError) process.stderr.write(`${error.message}\n`);
    else if (error instanceof SnappedCutError) {
      process.stderr.write(`${error.message} (HTTP ${error.status})\n`);
    } else process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  });
