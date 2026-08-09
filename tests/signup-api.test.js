const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const SignupAPI = require('../js/signup-api.js');

const ROOT = path.resolve(__dirname, '..');

test('Turnstile configuration fails closed for placeholders and blank values', function () {
  assert.equal(SignupAPI.isConfiguredSiteKey(undefined), false);
  assert.equal(SignupAPI.isConfiguredSiteKey(''), false);
  assert.equal(SignupAPI.isConfiguredSiteKey('REPLACE_WITH_TURNSTILE_SITE_KEY'), false);
  assert.equal(SignupAPI.isConfiguredSiteKey('TURNSTILE_SITE_KEY'), false);
  assert.equal(SignupAPI.isConfiguredSiteKey('0x4AAAAA-real-public-site-key'), true);
});

test('payload preserves free-text city and exact false newsletter consent', function () {
  assert.deepEqual(SignupAPI.buildPayload({
    name: ' Walker ',
    email: ' WALKER@Example.com ',
    tier: '100K Beat Midnight',
    country: 'Canada',
    city: ' Sault Ste. Marie ',
    cityId: null,
    newsletterOptIn: false
  }, ' token '), {
    name: 'Walker',
    email: 'walker@example.com',
    tier: '100K Beat Midnight',
    country: 'Canada',
    city: 'Sault Ste. Marie',
    city_id: null,
    newsletter_opt_in: false,
    turnstile_token: 'token'
  });
});

test('payload includes only a valid city id and literal true consent', function () {
  var payload = SignupAPI.buildPayload({
    name: 'Walker', email: 'w@example.com', tier: '10K First Light',
    country: 'Canada', city: 'Toronto', cityId: 42, newsletterOptIn: true
  }, 'token');
  assert.equal(payload.city_id, 42);
  assert.equal(payload.newsletter_opt_in, true);

  payload = SignupAPI.buildPayload({
    name: 'Walker', email: 'w@example.com', tier: '10K First Light',
    country: 'Canada', city: 'Toronto', cityId: '42', newsletterOptIn: 'true'
  }, 'token');
  assert.equal(payload.city_id, null);
  assert.equal(payload.newsletter_opt_in, false);
});

test('submission calls only the dedicated Edge endpoint with the publishable key', async function () {
  var seen;
  var result = await SignupAPI.submit(async function (url, init) {
    seen = { url: url, init: init };
    return { ok: true, status: 200, json: async function () { return { ok: true }; } };
  }, {
    supabaseUrl: 'https://project.supabase.co/',
    anonKey: 'public-anon-key'
  }, { newsletter_opt_in: false });

  assert.deepEqual(result, { ok: true });
  assert.equal(seen.url, 'https://project.supabase.co/functions/v1/website-signup');
  assert.equal(seen.init.credentials, 'omit');
  assert.equal(seen.init.headers.Authorization, undefined);
  assert.equal(seen.init.headers.apikey, 'public-anon-key');
  assert.deepEqual(JSON.parse(seen.init.body), { newsletter_opt_in: false });
  assert.equal(seen.url.includes('landingpage_signups'), false);
});

test('submission collapses duplicate success and maps verification/rate/upstream failures', async function () {
  async function response(status, value) {
    return SignupAPI.submit(async function () {
      return {
        ok: status >= 200 && status < 300,
        status: status,
        json: async function () { return value; }
      };
    }, { supabaseUrl: 'https://project.supabase.co', anonKey: 'anon' }, {});
  }

  assert.deepEqual(await response(200, { ok: true }), { ok: true });
  assert.deepEqual(await response(400, { error: 'verification_failed' }), {
    ok: false, reason: 'verification'
  });
  assert.deepEqual(await response(429, { error: 'try_later' }), {
    ok: false, reason: 'rate_limited'
  });
  assert.deepEqual(await response(503, { error: 'database detail' }), {
    ok: false, reason: 'unavailable'
  });
  assert.deepEqual(await SignupAPI.submit(async function () {
    throw new Error('network secret');
  }, { supabaseUrl: 'https://project.supabase.co', anonKey: 'anon' }, {}), {
    ok: false, reason: 'unavailable'
  });
});

test('submission refuses missing public endpoint configuration before fetch', async function () {
  var fetches = 0;
  var result = await SignupAPI.submit(async function () {
    fetches += 1;
  }, { supabaseUrl: '', anonKey: '' }, {});
  assert.deepEqual(result, { ok: false, reason: 'unavailable' });
  assert.equal(fetches, 0);
});

test('browser signup has no direct table-write fallback and starts fail closed', function () {
  const main = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const config = fs.readFileSync(path.join(ROOT, 'js/config.js'), 'utf8');
  assert.doesNotMatch(main, /\.from\(['"]landingpage_signups['"]\)/);
  assert.match(main, /SignupAPI\.submit\(fetch/);
  assert.match(index, /id="submit-btn" disabled/);
  assert.match(index, /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit/);
  assert.match(config, /REPLACE_WITH_TURNSTILE_SITE_KEY/);
  assert.doesNotMatch(config, /TURNSTILE_SECRET_KEY|SIGNUP_RATE_LIMIT_HMAC_SECRET/);
});
