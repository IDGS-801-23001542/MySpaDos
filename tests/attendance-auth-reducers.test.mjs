import assert from 'node:assert/strict';
import { noShowCutoff, reviewIsDue } from '../server/src/lib/attendance.js';
import { makePasswordResetToken, parsePasswordResetToken, verifyPasswordResetToken } from '../server/src/lib/resetTokens.js';
import { authReducer, initialAuthState } from '../client/src/reducers/authReducer.js';
import { attendanceReducer, initialAttendanceState } from '../client/src/reducers/attendanceReducer.js';

const clock = new Date('2026-11-24T19:00:00.000Z');
assert.equal(noShowCutoff(clock, 120).toISOString(), '2026-11-24T17:00:00.000Z');
assert.equal(reviewIsDue({ status: 'PENDIENTE', endAt: new Date('2026-11-24T18:59:00Z') }, clock), true);
assert.equal(reviewIsDue({ status: 'ATENDIDA', endAt: new Date('2026-11-24T18:59:00Z') }, clock), false);
assert.equal(reviewIsDue({ status: 'PENDIENTE', endAt: new Date('2026-11-24T19:01:00Z') }, clock), false);
assert.equal(reviewIsDue({ status: 'PENDIENTE' }, clock), undefined);

process.env.RESET_TOKEN_SECRET = 'sample-test-secret-0123456789-abcdefghijklmnopqrstuvwxyz';
const user = { id: 1234, status: 'ACTIVO', passwordHash: 'bcrypt-test-original-value' };
const issuedAt = Date.parse('2026-11-24T18:30:00Z');
const token = makePasswordResetToken(user, issuedAt);
assert.equal(parsePasswordResetToken(token, issuedAt + 1).uid, user.id);
assert.equal(verifyPasswordResetToken(token, user, issuedAt + 10), true);
assert.equal(verifyPasswordResetToken(token, user, issuedAt + 20 * 60 * 1000), false);
assert.equal(verifyPasswordResetToken(token, { ...user, passwordHash: 'new-password-hash' }, issuedAt + 10), false);
assert.equal(verifyPasswordResetToken(token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a'), user, issuedAt + 10), false);
assert.equal(verifyPasswordResetToken(token, { ...user, id: 5 }, issuedAt + 10), false);

const authenticated = authReducer(initialAuthState, { type: 'AUTHENTICATED', identity: { user: { id: 1 } } });
assert.equal(authenticated.identity.user.id, 1);
assert.equal(authReducer(authenticated, { type: 'LOGGED_OUT' }).identity, null);
const due = attendanceReducer(initialAttendanceState, { type: 'SYNC', due: [{ id: 9 }, { id: 11 }] });
assert.equal(attendanceReducer(due, { type: 'DONE', id: 9 }).due.length, 1);
assert.equal(attendanceReducer(due, { type: 'DISMISS', id: 11 }).dismissed.includes(11), true);
console.log('17 pruebas adicionales: ausencias, enlace sin passwordResets y reducers correctas.');
