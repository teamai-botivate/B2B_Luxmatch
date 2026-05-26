#!/usr/bin/env tsx
/**
 * provision-shop.ts
 *
 * One-time per-device setup. Today (pre-Phase 3) this script:
 *
 *   1. Parses --store-name, --city, --owner-name, --phone, --pin flags
 *   2. Generates a UUID for SHOP_JEWELLER_ID
 *   3. Generates a 32-byte LM_PIN_COOKIE_SECRET
 *   4. Hashes the PIN with scrypt (via @luxematch/tenant)
 *   5. Writes / updates apps/web/.env.local with the resolved values
 *   6. Prints the generated jeweller_id and pin_hash for the operator
 *      to paste into Supabase once the schema lands in Phase 3
 *
 * In Phase 3 this is upgraded to create the jeweller row in Supabase
 * directly and persist pin_hash there instead of printing it.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { PinSchema } from '@luxematch/tenant';
import { hashPin } from '@luxematch/tenant/server';

type Args = {
  storeName?: string;
  city?: string;
  ownerName?: string;
  phone?: string;
  pin?: string;
};

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const next = argv[i + 1];
    switch (a) {
      case '--store-name':
        out.storeName = next;
        i++;
        break;
      case '--city':
        out.city = next;
        i++;
        break;
      case '--owner-name':
        out.ownerName = next;
        i++;
        break;
      case '--phone':
        out.phone = next;
        i++;
        break;
      case '--pin':
        out.pin = next;
        i++;
        break;
    }
  }
  return out;
}

async function prompt(label: string, required = true): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    let answer = '';
    while (!answer) {
      answer = (await rl.question(`${label}: `)).trim();
      if (!required) break;
    }
    return answer;
  } finally {
    rl.close();
  }
}

function upsertEnvLine(content: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  return content.trimEnd() + (content ? '\n' : '') + line + '\n';
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const repoRoot = resolve(dirname(__filename), '..');
  const envPath = resolve(repoRoot, 'apps/web/.env.local');

  const args = parseArgs(process.argv.slice(2));

  const storeName = args.storeName ?? (await prompt('Store name'));
  const city = args.city ?? (await prompt('City', false));
  const ownerName = args.ownerName ?? (await prompt('Owner name', false));
  const phone = args.phone ?? (await prompt('Phone', false));

  let pin = args.pin;
  while (!pin || !PinSchema.safeParse(pin).success) {
    pin = await prompt('Set 6-digit PIN');
    if (!PinSchema.safeParse(pin).success) {
      console.error('PIN must be exactly 6 digits. Try again.');
      pin = undefined;
    }
  }

  const jewellerId = randomUUID();
  const cookieSecret = randomBytes(32).toString('hex');
  const pinHash = hashPin(pin);

  let envContent = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  envContent = upsertEnvLine(envContent, 'SHOP_JEWELLER_ID', jewellerId);
  envContent = upsertEnvLine(envContent, 'LM_PIN_COOKIE_SECRET', cookieSecret);
  envContent = upsertEnvLine(envContent, 'LM_PIN_COOKIE_TTL_SECONDS', '14400');
  writeFileSync(envPath, envContent);

  console.log('\n──────────────────────────────────────────────────────────');
  console.log('Shop provisioned.');
  console.log('──────────────────────────────────────────────────────────');
  console.log(`Store name:          ${storeName}`);
  if (city) console.log(`City:                ${city}`);
  if (ownerName) console.log(`Owner:               ${ownerName}`);
  if (phone) console.log(`Phone:               ${phone}`);
  console.log(`SHOP_JEWELLER_ID:    ${jewellerId}`);
  console.log(`Env file written:    ${envPath}`);
  console.log('\nPhase 3 will use these values to create the jeweller row in');
  console.log('Supabase automatically. For now, keep this output safe:\n');
  console.log(`jeweller_id:  ${jewellerId}`);
  console.log(`pin_hash:     ${pinHash}`);
  console.log('\nStart the app with: pnpm dev');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
