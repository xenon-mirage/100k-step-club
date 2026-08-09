(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SignupAPI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var PLACEHOLDER_PATTERN = /^(?:REPLACE|YOUR_|CHANGEME)|TURNSTILE_SITE_KEY/i;

  function isConfiguredSiteKey(value) {
    return typeof value === 'string' &&
      value.trim().length >= 10 &&
      !PLACEHOLDER_PATTERN.test(value.trim());
  }

  function buildPayload(fields, turnstileToken) {
    var cityId = Number.isSafeInteger(fields.cityId) && fields.cityId > 0
      ? fields.cityId
      : null;
    return {
      name: String(fields.name || '').trim(),
      email: String(fields.email || '').trim().toLowerCase(),
      tier: String(fields.tier || '').trim(),
      country: String(fields.country || '').trim(),
      city: String(fields.city || '').trim(),
      city_id: cityId,
      newsletter_opt_in: fields.newsletterOptIn === true,
      turnstile_token: String(turnstileToken || '').trim()
    };
  }

  async function submit(fetchImpl, config, signupPayload) {
    if (typeof fetchImpl !== 'function' || !config ||
      typeof config.supabaseUrl !== 'string' || !config.supabaseUrl.trim() ||
      typeof config.anonKey !== 'string' || !config.anonKey.trim()) {
      return { ok: false, reason: 'unavailable' };
    }

    var endpoint = config.supabaseUrl.replace(/\/+$/, '') + '/functions/v1/website-signup';
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, 15000);
    try {
      var response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'apikey': config.anonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(signupPayload),
        signal: controller.signal,
        credentials: 'omit',
        referrerPolicy: 'strict-origin-when-cross-origin'
      });
      var result = null;
      try {
        result = await response.json();
      } catch (_ignored) {
        result = null;
      }
      if (response.ok && result && result.ok === true) return { ok: true };
      if (response.status === 429) return { ok: false, reason: 'rate_limited' };
      if (response.status === 400 && result && result.error === 'verification_failed') {
        return { ok: false, reason: 'verification' };
      }
      return { ok: false, reason: 'unavailable' };
    } catch (_ignored) {
      return { ok: false, reason: 'unavailable' };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    isConfiguredSiteKey: isConfiguredSiteKey,
    buildPayload: buildPayload,
    submit: submit
  };
});
