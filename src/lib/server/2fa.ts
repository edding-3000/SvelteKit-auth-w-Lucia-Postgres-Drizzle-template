import { db } from '$lib/server/db';
import { decryptToString, encryptString } from './encryption';
import { ExpiringTokenBucket } from "./rate-limit";
import * as table from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { generateRandomRecoveryCode } from './utils';

import type { User } from "./user";

export const totpBucket = new ExpiringTokenBucket<number>(5, 60 * 30);
export const recoveryCodeBucket = new ExpiringTokenBucket<number>(3, 60 * 60);

export async function resetUser2FAWithRecoveryCode(userId: number, recoveryCode: string): Promise<boolean> {
  // const row = db.queryOne("SELECT recovery_code FROM user WHERE id = ?", [userId]);
  const [row] = await db.select({ recovery_code: table.user.recoveryCode }).from(table.user).where(eq(table.user.id, userId))
  if (row === null || row === undefined) {
    return false;
  }
  const encryptedRecoveryCode = row.recovery_code; // HIER WURDE WAS VON COPILOT GEÄNDERT => row.recovery_code.bytes(0);
  const userRecoveryCode = decryptToString(new Uint8Array(encryptedRecoveryCode));
  if (recoveryCode !== userRecoveryCode) {
    return false;
  }

  const newRecoveryCode = generateRandomRecoveryCode();
  const encryptedNewRecoveryCode = encryptString(newRecoveryCode);
  // Compare old recovery code to ensure recovery code wasn't updated.

  try {
    await db.transaction(async (tx) => {
      const result = await tx.update(table.user)
        .set({ recoveryCode: encryptedNewRecoveryCode })
        .where(
          and(
            eq(table.user.id, userId),
            eq(table.user.recoveryCode, encryptedRecoveryCode)
          )
        ).returning();
      if (result.length >= 1) {
        return false;
      }
      await db.update(table.session).set({ twoFactorVerified: false }).where(eq(table.session.userId, userId));
      await db.delete(table.totpCredential).where(eq(table.totpCredential.userId, userId));
      await db.delete(table.passkeyCredential).where(eq(table.passkeyCredential.userId, userId));
      await db.delete(table.securityKeyCredential).where(eq(table.securityKeyCredential.userId, userId));
    });
  } catch (e) {
    throw e;
  }

  return true;
}


export function get2FARedirect(user: User): string {
  if (user.registeredPasskey) {
    return "/2fa/passkey";
  }
  if (user.registeredSecurityKey) {
    return "/2fa/security-key";
  }
  if (user.registeredTOTP) {
    return "/2fa/totp";
  }
  return "/2fa/setup";
}

export function getPasswordReset2FARedirect(user: User): string {
  if (user.registeredPasskey) {
    return "/reset-password/2fa/passkey";
  }
  if (user.registeredSecurityKey) {
    return "/reset-password/2fa/security-key";
  }
  if (user.registeredTOTP) {
    return "/reset-password/2fa/totp";
  }
  return "/2fa/setup";
}
