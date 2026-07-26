import assert from 'node:assert/strict';
import test from 'node:test';
import { config } from '../config';
import { readSessionCookie, sessionCookieOptions } from '../security/session';
import { isBlockedAddress } from '../security/targetValidation';

test('blocks private, local, metadata and reserved network addresses', () => {
  [
    '0.0.0.0',
    '10.0.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '192.168.1.1',
    '::1',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fe80::1',
  ].forEach(address => assert.equal(isBlockedAddress(address), true, address));
});

test('allows representative public network addresses', () => {
  assert.equal(isBlockedAddress('8.8.8.8'), false);
  assert.equal(isBlockedAddress('2606:4700:4700::1111'), false);
});

test('uses an HttpOnly strict same-site session cookie', () => {
  assert.equal(sessionCookieOptions.httpOnly, true);
  assert.equal(sessionCookieOptions.sameSite, 'strict');
  assert.equal(sessionCookieOptions.path, '/');
  assert.equal(sessionCookieOptions.maxAge, config.sessionTtlMs);
});

test('reads only the configured session cookie', () => {
  const cookie = `ignored=value; ${config.sessionCookieName}=signed.jwt.value`;
  assert.equal(readSessionCookie(cookie), 'signed.jwt.value');
  assert.equal(readSessionCookie('ignored=value'), null);
});
