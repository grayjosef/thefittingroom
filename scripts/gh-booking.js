/* The Fitting Room — booking integration layer.
 *
 * This file is NOT part of the Claude Design export. It is deliberately kept
 * outside components/ so a re-export can never overwrite it. BookingFlow.jsx
 * touches it through two small hook points marked GH-WIRE; if a re-export drops
 * those, run `node scripts/verify-wiring.mjs` and it will tell you.
 *
 * Everything degrades. If /api isn't reachable — previewing the static export
 * on its own, or a Function that failed to deploy — every call returns null and
 * BookingFlow silently falls back to its original designed placeholder
 * behaviour. The page never shows an error it can't act on.
 */
(function () {
  "use strict";

  var API = "";                 // same origin
  var STRIPE_JS = "https://js.stripe.com/v3/";

  var state = {
    reachable: null,            // null = not probed yet
    health: null,
    stripe: null,
    elements: null,
    paymentElement: null,
    booking: null,
  };

  function url(path) { return API + path; }

  async function request(path, options) {
    var opts = options || {};
    try {
      var res = await fetch(url(path), {
        method: opts.method || "GET",
        headers: opts.body ? { "content-type": "application/json" } : undefined,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        credentials: "same-origin",
      });

      // A static host answers every path with index.html. Treat a non-JSON
      // reply as "no backend here" rather than parsing garbage.
      var type = res.headers.get("content-type") || "";
      if (type.indexOf("application/json") === -1) {
        state.reachable = false;
        return null;
      }

      var data = await res.json();
      state.reachable = true;

      if (!res.ok) {
        var message = (data && data.error && data.error.message) || "Something went wrong.";
        var err = new Error(message);
        err.code = data && data.error && data.error.code;
        err.data = data;
        throw err;
      }
      return data;
    } catch (err) {
      if (err instanceof TypeError) {   // network failure, not an API error
        state.reachable = false;
        return null;
      }
      throw err;
    }
  }

  // ---- availability ------------------------------------------------------

  function pad(n) { return String(n).padStart(2, "0"); }

  function localYmd(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  var monthCache = {};

  async function monthAvailability(year, monthIndex) {
    var key = year + "-" + pad(monthIndex + 1);
    if (monthCache[key]) return monthCache[key];
    var data = await request("/api/availability?month=" + key);
    if (!data) return null;
    monthCache[key] = data;
    return data;
  }

  async function slotsFor(date) {
    if (!date) return null;
    var data = await request("/api/availability?date=" + localYmd(date));
    if (!data) return null;
    return data.slots || [];
  }

  function invalidateAvailability() { monthCache = {}; }

  // ---- booking -----------------------------------------------------------

  async function hold(startIso) {
    return request("/api/hold", { method: "POST", body: { startIso: startIso } });
  }

  async function createBooking(payload) {
    var data = await request("/api/booking", { method: "POST", body: payload });
    if (data) state.booking = data;
    return data;
  }

  // ---- payment -----------------------------------------------------------

  function loadStripeJs() {
    if (window.Stripe) return Promise.resolve(window.Stripe);
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + STRIPE_JS + '"]');
      if (existing) {
        existing.addEventListener("load", function () { resolve(window.Stripe); });
        existing.addEventListener("error", function () { reject(new Error("Stripe failed to load.")); });
        return;
      }
      var s = document.createElement("script");
      s.src = STRIPE_JS;
      s.async = true;
      s.onload = function () { resolve(window.Stripe); };
      s.onerror = function () { reject(new Error("Stripe failed to load.")); };
      document.head.appendChild(s);
    });
  }

  // Matches the site's slate-and-ivory palette so the card form doesn't read
  // as a bolted-on iframe.
  function appearance() {
    var css = getComputedStyle(document.documentElement);
    function v(name, fallback) {
      var got = css.getPropertyValue(name).trim();
      return got || fallback;
    }
    return {
      theme: "night",
      variables: {
        colorPrimary: v("--blush-deep", "#E89A93"),
        colorBackground: v("--paper", "#4A5363"),
        colorText: v("--slate-deep", "#F2EDE2"),
        colorTextSecondary: v("--taupe", "#C4BBAC"),
        colorDanger: "#E8837B",
        fontFamily: "'Public Sans', system-ui, sans-serif",
        fontSizeBase: "16px",
        borderRadius: "2px",
        spacingUnit: "4px",
      },
      rules: {
        ".Input": {
          border: "1px solid " + v("--silver", "#6F7787"),
          boxShadow: "none",
        },
        ".Input:focus": {
          border: "1px solid " + v("--taupe", "#C4BBAC"),
          boxShadow: "none",
        },
        ".Label": {
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "10px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: v("--taupe", "#C4BBAC"),
        },
      },
    };
  }

  async function mountPayment(node, opts) {
    if (!node || !opts || !opts.clientSecret || !opts.publishableKey) return false;
    var Stripe = await loadStripeJs();
    state.stripe = Stripe(opts.publishableKey);
    state.elements = state.stripe.elements({
      clientSecret: opts.clientSecret,
      appearance: appearance(),
    });
    state.paymentElement = state.elements.create("payment", { layout: "tabs" });
    state.paymentElement.mount(node);
    return true;
  }

  function unmountPayment() {
    if (state.paymentElement) {
      try { state.paymentElement.unmount(); } catch (e) { /* already gone */ }
    }
    state.paymentElement = null;
    state.elements = null;
  }

  // Confirms the card, then tells our own API so the calendar entry is written
  // without waiting on Stripe's webhook.
  async function payAndFinalize(booking) {
    var target = booking || state.booking;
    if (!target) throw new Error("No booking in progress.");

    // Stub mode: nothing to charge. Ask the API to close it out.
    if (target.stub || !state.stripe || !state.elements) {
      var stubbed = await request("/api/booking/finalize", {
        method: "POST",
        body: { appointmentId: target.appointmentId, reference: target.reference },
      });
      invalidateAvailability();
      return stubbed || { ok: true, stub: true, reference: target.reference };
    }

    var result = await state.stripe.confirmPayment({
      elements: state.elements,
      redirect: "if_required",
    });

    if (result.error) {
      var err = new Error(result.error.message || "That card was declined.");
      err.stripe = result.error;
      throw err;
    }

    var intent = result.paymentIntent;
    if (!intent || intent.status !== "succeeded") {
      throw new Error("The payment didn't complete. Nothing has been charged.");
    }

    var confirmed = await request("/api/booking/finalize", {
      method: "POST",
      body: { appointmentId: target.appointmentId, paymentIntentId: intent.id },
    });

    invalidateAvailability();
    return confirmed || { ok: true, reference: target.reference };
  }

  // ---- contact form ------------------------------------------------------

  async function sendInquiry(payload) {
    return request("/api/contact", { method: "POST", body: payload });
  }

  // ---- probe -------------------------------------------------------------

  async function probe() {
    if (state.health) return state.health;
    var data = await request("/api/health");
    state.health = data;
    return data;
  }

  function reset() {
    unmountPayment();
    state.booking = null;
  }

  window.GH = {
    probe: probe,
    isReachable: function () { return state.reachable; },
    health: function () { return state.health; },
    monthAvailability: monthAvailability,
    slotsFor: slotsFor,
    invalidateAvailability: invalidateAvailability,
    hold: hold,
    createBooking: createBooking,
    mountPayment: mountPayment,
    unmountPayment: unmountPayment,
    payAndFinalize: payAndFinalize,
    sendInquiry: sendInquiry,
    reset: reset,
    localYmd: localYmd,
  };

  // Warm the health check so the first calendar render already knows whether a
  // backend exists.
  probe().catch(function () { /* stub mode is a valid state */ });
})();
