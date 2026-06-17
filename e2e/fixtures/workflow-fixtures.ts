/**
 * Extended Playwright fixtures for cross-module workflow specs.
 *
 * Provides authenticated API client + Prisma DB helper per test.
 */

import { ApiClient } from '../factories/api-client.js';
import { TestDbHelper } from '../helpers/db.js';
import { test as base, expect, getQaAccessToken, loginAs, qaAuthStatePath } from './role-fixtures.js';
import type { QaPersonaSlug } from './qa-users.js';

export { expect, loginAs, qaAuthStatePath };
export type { QaPersonaSlug };

type WorkflowFixtures = {
  /** Authenticated REST client (default: qa-manager). */
  api: ApiClient;
  /** Prisma assertions against TEST DATABASE_URL. */
  db: TestDbHelper;
  /** Override default persona per test: `test.use({ qaSlug: 'qa-finance' })`. */
  qaSlug: QaPersonaSlug;
};

export const test = base.extend<WorkflowFixtures>({
  qaSlug: ['qa-manager', { option: true }],

  api: async ({ qaSlug }, use) => {
    const token = await getQaAccessToken(qaSlug);
    const client = new ApiClient({ accessToken: token });
    await use(client);
  },

  db: async ({}, use) => {
    const helper = await TestDbHelper.create();
    await use(helper);
    await helper.disconnect();
  },
});
