import { encodeHexLowerCase } from "@oslojs/encoding";
import { db } from "./db";
import * as table from '$lib/server/db/schema';
import { and, eq } from "drizzle-orm";

const challengeBucket = new Set<string>();

export function createWebAuthnChallenge(): Uint8Array {
  const challenge = new Uint8Array(20);
  crypto.getRandomValues(challenge);
  const encoded = encodeHexLowerCase(challenge);
  challengeBucket.add(encoded);
  return challenge;
}

export function verifyWebAuthnChallenge(challenge: Uint8Array): boolean {
  const encoded = encodeHexLowerCase(challenge);
  return challengeBucket.delete(encoded);
}

export async function getUserPasskeyCredentials(userId: number): Promise<WebAuthnUserCredential[]> {
  const row = await db.select(
    {
      id: table.passkeyCredential.id,
      userId: table.passkeyCredential.userId,
      name: table.passkeyCredential.name,
      algorithmId: table.passkeyCredential.algorithm,
      publicKey: table.passkeyCredential.publicKey
    })
    .from(table.passkeyCredential)
    .where(eq(table.passkeyCredential.userId, userId));

  const credentials: WebAuthnUserCredential[] = row;
  return credentials;
}

export async function getPasskeyCredential(credentialId: Uint8Array): Promise<WebAuthnUserCredential | null> {
  // const buffedCredentialId = Buffer.from(credentialId);
  const [row] = await db.select(
    {
      id: table.passkeyCredential.id,
      userId: table.passkeyCredential.userId,
      name: table.passkeyCredential.name,
      algorithmId: table.passkeyCredential.algorithm,
      publicKey: table.passkeyCredential.publicKey
    })
    .from(table.passkeyCredential)
    .where(eq(table.passkeyCredential.id, credentialId));
  if (row === null || row === undefined) {
    return null;
  }
  const credential: WebAuthnUserCredential = row;
  return credential;
}

export async function getUserPasskeyCredential(userId: number, credentialId: Uint8Array): Promise<WebAuthnUserCredential | null> {
  const [row] = await db.select(
    {
      id: table.passkeyCredential.id,
      userId: table.passkeyCredential.userId,
      name: table.passkeyCredential.name,
      algorithmId: table.passkeyCredential.algorithm,
      publicKey: table.passkeyCredential.publicKey
    })
    .from(table.passkeyCredential)
    .where(
      and(
        eq(table.passkeyCredential.id, credentialId),
        eq(table.passkeyCredential.userId, userId)
      )
    );
  if (row === null || row === undefined) {
    return null;
  }

  const credential: WebAuthnUserCredential = row;
  return credential;
}

export async function createPasskeyCredential(credential: WebAuthnUserCredential): Promise<void> {
  await db.insert(table.passkeyCredential).values({
    id: credential.id,
    userId: credential.userId,
    name: credential.name,
    algorithm: credential.algorithmId,
    publicKey: credential.publicKey
  })
}

export async function deleteUserPasskeyCredential(userId: number, credentialId: Uint8Array): Promise<boolean> {
  const result = await db.delete(table.passkeyCredential).where(eq(table.passkeyCredential.userId, userId))
  return result.length > 0;
}

export async function getUserSecurityKeyCredentials(userId: number): Promise<WebAuthnUserCredential[]> {
  const rows = await db.select(
    {
      id: table.securityKeyCredential.id,
      userId: table.securityKeyCredential.userId,
      name: table.securityKeyCredential.name,
      algorithmId: table.securityKeyCredential.algorithm,
      publicKey: table.securityKeyCredential.publicKey
    })
    .from(table.securityKeyCredential)
    .where(eq(table.securityKeyCredential.userId, userId));

  const credentials: WebAuthnUserCredential[] = rows;
  return credentials;
}

export async function getUserSecurityKeyCredential(userId: number, credentialId: Uint8Array): Promise<WebAuthnUserCredential | null> {
  const [row] = await db.select(
    {
      id: table.securityKeyCredential.id,
      userId: table.securityKeyCredential.userId,
      name: table.securityKeyCredential.name,
      algorithmId: table.securityKeyCredential.algorithm,
      publicKey: table.securityKeyCredential.publicKey
    })
    .from(table.securityKeyCredential)
    .where(
      and(
        eq(table.securityKeyCredential.id, credentialId),
        eq(table.securityKeyCredential.userId, userId)
      )
    );

  if (row === null || row === undefined) {
    return null;
  }
  const credential: WebAuthnUserCredential = {
    id: row.id,
    userId: row.userId,
    name: row.name,
    algorithmId: row.algorithmId,
    publicKey: row.publicKey
  };
  return credential;
}

export async function createSecurityKeyCredential(credential: WebAuthnUserCredential): Promise<void> {
  await db.insert(table.securityKeyCredential).values({
    id: credential.id,
    userId: credential.userId,
    name: credential.name,
    algorithm: credential.algorithmId,
    publicKey: credential.publicKey
  })

}

export async function deleteUserSecurityKeyCredential(userId: number, credentialId: Uint8Array): Promise<boolean> {
  const result = await db.delete(table.securityKeyCredential)
    .where(
      and(
        eq(table.securityKeyCredential.userId, userId),
        eq(table.securityKeyCredential.id, credentialId)
      )
    );
  return result.length > 0;
}

export interface WebAuthnUserCredential {
  id: Uint8Array;
  userId: number;
  name: string;
  algorithmId: number;
  publicKey: Uint8Array;
}
