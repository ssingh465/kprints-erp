import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { QaPersonaSlug } from './qa-users.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const E2E_ROOT = resolve(HERE, '..');

export const QA_AUTH_STATE_DIR = resolve(E2E_ROOT, '.auth');

export function qaAuthStatePath(slug: QaPersonaSlug): string {
  return resolve(QA_AUTH_STATE_DIR, `${slug}.json`);
}
