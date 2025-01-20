import net from 'net';
import type { RequestEvent } from "@sveltejs/kit";

export function getClientIP(event: RequestEvent) {
  const forwardedFor = event.request.headers.get("X-Forwarded-For");

  if (forwardedFor) {
    const ipList = forwardedFor.split(',').map(ip => ip.trim());

    for (const ip of ipList) {
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }

  return event.getClientAddress();
}

function isValidIP(ip: string) {
  return net.isIP(ip) !== 0;
}