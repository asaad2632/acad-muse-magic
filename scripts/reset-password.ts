// Admin CLI: force-resets a user's password without needing to know the old
// one (the "forgot password" flow, since there's no email delivery). Bumps
// token_version, which invalidates all existing session cookies for that
// user.
//
// Usage: bun run scripts/reset-password.ts <email>

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { db } from "../src/db.server";
import { hashPassword } from "../src/passwordHash.server";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: bun run scripts/reset-password.ts <email>");
    process.exit(1);
  }

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const { rows } = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    const row = rows[0];
    if (!row) {
      console.error(`✗ ${email}: not found in local users table`);
      process.exit(1);
    }

    const password = await rl.question("new password: ");
    const confirmPassword = await rl.question("confirm new password: ");
    if (!password || password !== confirmPassword) {
      console.error("✗ passwords empty or do not match");
      process.exit(1);
    }

    const passwordHash = await hashPassword(password);
    const updateResult = await db.query(
      `UPDATE users SET password_hash = $1, token_version = token_version + 1
       WHERE id = $2 RETURNING token_version`,
      [passwordHash, row.id],
    );
    if (updateResult.rowCount === 0) {
      console.error(`✗ local update failed for ${email}`);
      process.exit(1);
    }

    console.log(
      `✓ password_hash updated (token_version -> ${updateResult.rows[0].token_version}); ` +
        `all existing sessions for this user are now invalidated`,
    );
  } finally {
    rl.close();
    await db.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
