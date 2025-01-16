import { db } from '$lib/server/db';
import { decryptToString, encryptString } from './encryption';
import { ExpiringTokenBucket } from "./rate-limit";
import * as table from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { generateRandomRecoveryCode } from './utils';

export const totpBucket = new ExpiringTokenBucket<number>(5, 60 * 30);
export const recoveryCodeBucket = new ExpiringTokenBucket<number>(3, 60 * 60);

export async function resetUser2FAWithRecoveryCode(userId: number, recoveryCode: string): Promise<boolean> {
  // const row = db.queryOne("SELECT recovery_code FROM user WHERE id = ?", [userId]);
  const [row] = await db.select({ recovery_code: table.user.recoveryCode }).from(table.user).where(eq(table.user.id, userId))
  if (row === null) {
    return false;
  }
  const encryptedRecoveryCode = row.recovery_code; // HIER WURDE WAS VON COPILOT GEÄNDERT => row.recovery_code.bytes(0);
  const userRecoveryCode = decryptToString(new Uint8Array(encryptedRecoveryCode));
  if (recoveryCode !== userRecoveryCode) {
    return false;
  }

  const newRecoveryCode = generateRandomRecoveryCode();
  const encryptedNewRecoveryCode = encryptString(newRecoveryCode);
  // db.execute("UPDATE session SET two_factor_verified = 0 WHERE user_id = ?", [userId]);
  await db.update(table.session).set({ twoFactorVerified: false }).where(eq(table.session.userId, userId));
  // Compare old recovery code to ensure recovery code wasn't updated.
  // const result = db.execute("UPDATE user SET recovery_code = ?, totp_key = NULL WHERE id = ? AND recovery_code = ?", [
  //   encryptedNewRecoveryCode,
  //   userId,
  //   encryptedRecoveryCode
  // ]);
  // return result.changes > 0;


  const result = await db.update(table.user)
    .set({ recoveryCode: Buffer.from(encryptedNewRecoveryCode), totpKey: null })
    .where(
      and(
        eq(table.user.id, userId),
        eq(table.user.recoveryCode, row.recovery_code)
      )
    ).returning();
  console.log('Result is: ', result);
  return result.length > 0;
}