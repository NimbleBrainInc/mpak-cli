#!/usr/bin/env node

import { config } from 'dotenv';
import { createProgram } from './program.js';
import { handleError } from './utils/errors.js';

// Load environment variables from .env file (if present)
config({ quiet: true });

async function main() {
  const program = createProgram();
  await program.parseAsync(process.argv);
}

main().catch(handleError);
