import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextFunction, Response } from 'express';
import {
  requireAdmin,
  type AuthenticatedRequest,
} from '../middleware/auth';
import { isUserRole } from '../security/userRole';

function createResponse() {
  let statusCode = 200;
  let payload: unknown;
  const response = {
    status(code: number) {
      statusCode = code;
      return response;
    },
    json(body: unknown) {
      payload = body;
      return response;
    },
  } as unknown as Response;

  return {
    response,
    getStatusCode: () => statusCode,
    getPayload: () => payload,
  };
}

test('accepts only supported user roles', () => {
  assert.equal(isUserRole('ADMIN'), true);
  assert.equal(isUserRole('DEMO'), true);
  assert.equal(isUserRole('OWNER'), false);
  assert.equal(isUserRole(undefined), false);
});

test('allows administrators to use protected mutations', () => {
  const req = {
    user: {
      id: '6a0deaf2-ce6a-4bf8-a2d1-4ce82eb4ff25',
      username: 'admin',
      role: 'ADMIN',
    },
  } as AuthenticatedRequest;
  const { response } = createResponse();
  let nextCalled = false;

  requireAdmin(req, response, (() => {
    nextCalled = true;
  }) as NextFunction);

  assert.equal(nextCalled, true);
});

test('blocks demo users from protected mutations', () => {
  const req = {
    user: {
      id: '865295c8-2bb1-47f8-a4f8-cd4f6efce0a8',
      username: 'demo',
      role: 'DEMO',
    },
  } as AuthenticatedRequest;
  const { response, getStatusCode, getPayload } = createResponse();
  let nextCalled = false;

  requireAdmin(req, response, (() => {
    nextCalled = true;
  }) as NextFunction);

  assert.equal(nextCalled, false);
  assert.equal(getStatusCode(), 403);
  assert.deepEqual(getPayload(), {
    error: 'El modo demostración es de solo lectura.',
    code: 'DEMO_READ_ONLY',
  });
});
