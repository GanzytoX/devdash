import type { CookieOptions } from 'express';
import { config } from '../config';

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.secureCookies,
  sameSite: 'strict',
  path: '/',
  maxAge: config.sessionTtlMs,
};

export const clearedSessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.secureCookies,
  sameSite: 'strict',
  path: '/',
};

export function readSessionCookie(cookieHeader?: string) {
  if (!cookieHeader) return null;

  for (const entry of cookieHeader.split(';')) {
    const separator = entry.indexOf('=');
    if (separator < 0) continue;

    const name = entry.slice(0, separator).trim();
    if (name === config.sessionCookieName) {
      return entry.slice(separator + 1).trim() || null;
    }
  }

  return null;
}
