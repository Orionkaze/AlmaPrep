const Module = require('module');
const crypto = require('crypto');

// Mock jsonwebtoken for sandbox environment
const mockJwt = {
  verify: (token, secret) => {
    if (!token) throw new Error('No token');
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');
    const [headerB64, payloadB64, signatureB64] = parts;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${headerB64}.${payloadB64}`);
    const expectedSignature = hmac.digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    if (signatureB64 !== expectedSignature) {
      throw new Error('invalid signature');
    }
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      throw new Error('jwt expired');
    }
    return payload;
  },
  sign: (payload, secret, options = {}) => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const extendedPayload = { ...payload };
    if (options.expiresIn) {
      if (options.expiresIn.startsWith('-')) {
        extendedPayload.exp = Math.floor(Date.now() / 1000) - 10;
      } else {
        extendedPayload.exp = Math.floor(Date.now() / 1000) + 3600;
      }
    }
    const payloadB64 = Buffer.from(JSON.stringify(extendedPayload)).toString('base64url');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${headerB64}.${payloadB64}`);
    const signatureB64 = hmac.digest('base64url');
    return `${headerB64}.${payloadB64}.${signatureB64}`;
  }
};

const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'jsonwebtoken') return mockJwt;
  return originalRequire.apply(this, arguments);
};

const originalConsoleLog = console.log;
console.log = () => {};
const originalConsoleError = console.error;
console.error = () => {};

const results = [];

let authenticate;
let router;
try {
  authenticate = require('./middleware/auth');
  router = require('./routes/user');
  process.env.JWT_SECRET = 'test_secret';
} catch (err) {
  originalConsoleLog('__TEST_RESULTS_START__' + JSON.stringify([
    { test_id: 't1', description: 'Returns 401 when no token provided', passed: false, error: 'Load error: ' + err.message },
    { test_id: 't2', description: 'Returns 401 when token is malformed', passed: false },
    { test_id: 't3', description: 'Returns 401 when token is expired', passed: false },
    { test_id: 't4', description: 'Returns 200 and user data when token is valid', passed: false },
    { test_id: 't5', description: 'Does not crash on missing Authorization header', passed: false }
  ]) + '__TEST_RESULTS_END__');
  process.exit(0);
}

async function run() {
  // Test 1: Returns 401 when no token provided
  try {
    let status = null;
    const req = { headers: {} };
    let nextCalled = false;
    const res = {
      status: (s) => { status = s; return res; },
      json: () => res,
      send: () => res
    };
    authenticate(req, res, () => { nextCalled = true; });
    results.push({
      test_id: 't1',
      description: 'Returns 401 when no token provided',
      passed: status === 401 && !nextCalled
    });
  } catch (err) {
    results.push({ test_id: 't1', description: 'Returns 401 when no token provided', passed: false });
  }

  // Test 2: Returns 401 when token is malformed
  try {
    let status = null;
    const req = { headers: { authorization: 'Bearer malformed_token' } };
    let nextCalled = false;
    const res = {
      status: (s) => { status = s; return res; },
      json: () => res,
      send: () => res
    };
    authenticate(req, res, () => { nextCalled = true; });
    results.push({
      test_id: 't2',
      description: 'Returns 401 when token is malformed',
      passed: status === 401 && !nextCalled
    });
  } catch (err) {
    results.push({ test_id: 't2', description: 'Returns 401 when token is malformed', passed: false });
  }

  // Test 3: Returns 401 when token is expired
  try {
    let status = null;
    const token = mockJwt.sign({ user: 'test' }, 'test_secret', { expiresIn: '-1s' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    let nextCalled = false;
    const res = {
      status: (s) => { status = s; return res; },
      json: () => res,
      send: () => res
    };
    authenticate(req, res, () => { nextCalled = true; });
    results.push({
      test_id: 't3',
      description: 'Returns 401 when token is expired',
      passed: status === 401 && !nextCalled
    });
  } catch (err) {
    results.push({ test_id: 't3', description: 'Returns 401 when token is expired', passed: false });
  }

  // Test 4: Returns 200 and user data when token is valid
  try {
    let status = 200;
    const token = mockJwt.sign({ username: 'testuser' }, 'test_secret');
    const req = { headers: { authorization: `Bearer ${token}` } };
    let nextCalled = false;
    const res = {
      status: (s) => { status = s; return res; },
      json: () => res,
      send: () => res
    };
    authenticate(req, res, () => { nextCalled = true; });
    results.push({
      test_id: 't4',
      description: 'Returns 200 and user data when token is valid',
      passed: nextCalled && req.user && req.user.username === 'testuser'
    });
  } catch (err) {
    results.push({ test_id: 't4', description: 'Returns 200 and user data when token is valid', passed: false });
  }

  // Test 5: Does not crash on missing Authorization header
  try {
    const req = { headers: {} };
    const res = {
      status: () => res,
      json: () => res,
      send: () => res
    };
    authenticate(req, res, () => {});
    results.push({
      test_id: 't5',
      description: 'Does not crash on missing Authorization header',
      passed: true
    });
  } catch (err) {
    results.push({
      test_id: 't5',
      description: 'Does not crash on missing Authorization header',
      passed: false
    });
  }

  originalConsoleLog('__TEST_RESULTS_START__' + JSON.stringify(results) + '__TEST_RESULTS_END__');
}

run();