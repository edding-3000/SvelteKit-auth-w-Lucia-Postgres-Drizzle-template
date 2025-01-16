import { decodeBase64 } from "@oslojs/encoding";
import { DynamicBuffer } from "@oslojs/binary";
import { ENCRYPTION_KEY } from '$env/static/private';

let crypto: typeof import('crypto') | undefined;
try {
  crypto = await import('node:crypto');
} catch (err) {
  console.error('crypto support is disabled!');
}

const key = decodeBase64(ENCRYPTION_KEY);

export function encrypt(data: Uint8Array): Uint8Array {
  if (!crypto) {
    throw new Error('crypto is not defined.');
  }
  const iv = new Uint8Array(16);
  crypto.getRandomValues(iv);
  const cipher = crypto.createCipheriv("aes-128-gcm", key, iv);
  const encrypted = new DynamicBuffer(0);
  encrypted.write(iv);
  encrypted.write(cipher.update(data));
  encrypted.write(cipher.final());
  encrypted.write(cipher.getAuthTag());
  return encrypted.bytes();
}

export function encryptString(data: string): Uint8Array {
  return encrypt(new TextEncoder().encode(data));
}

export function decrypt(encrypted: Uint8Array): Uint8Array {
  if (!crypto) {
    throw new Error('crypto is not defined.');
  }
  if (encrypted.byteLength < 33) {
    throw new Error("Invalid data");
  }
  const decipher = crypto.createDecipheriv("aes-128-gcm", key, encrypted.slice(0, 16));
  decipher.setAuthTag(encrypted.slice(encrypted.byteLength - 16));
  const decrypted = new DynamicBuffer(0);
  decrypted.write(decipher.update(encrypted.slice(16, encrypted.byteLength - 16)));
  decrypted.write(decipher.final());
  return decrypted.bytes();
}

export function decryptToString(data: Uint8Array): string {
  return new TextDecoder().decode(decrypt(data));
}