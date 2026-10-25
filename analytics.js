/* CyberPatriot first-party analytics
   Records page views, clicks, showcase views, form submissions and time on page
   into the site's own Supabase project (table: page_events).
   - No cookies, no advertising, no third-party trackers.
   - A random anonymous visitor ID is kept in this browser's local storage.
   - Honors Do Not Track / Global Privacy Control.
   - Skips the site owner's own browser once they've signed in to the dashboard. */
(function () {
  var SUPABASE_URL = 'https://ohkhdvcywwqgcxijdoig.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_zFSIWw_tffP44hh2_DvuzA_udNqeCKO';
  var ENDPOINT = SUPABASE_URL + '/rest/v1/page_events';

  function store(kind) { try { return window[kind]; } catch (e) { return null; } }
  var ls = store('localStorage'), ss = store('sessionStorage');
  function get(s, k) { try { return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function set(s, k, v) { try { if (s) s.setItem(k, v); } catch (e) {} }

  // Opt-outs: Do Not Track / Global Privacy Control, the owner's browser, local previews.
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
  if (get(ls, 'cp_owner') === '1') return;
  var host = location.hostname;
  if (!/(^|\.)patrioticwebsites\.com$/.test(host) && !/\.netlify\.app$/.test(host)) return;

  function rid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  var visitorId = get(ls, 'cp_vid');
  if (!visitorId) { visitorId = rid(); set(ls, 'cp_vid', visitorId); }
  var sessionId = get(ss, 'cp_sid');
  if (!sessionId) { sessionId = rid(); set(ss, 'cp_sid', sessionId); }

  var ua = navigator.userAgent || '';
  var w = window.innerWidth || screen.width || 0;
  var device = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? 'Tablet'
             : /Mobi|iPhone|Android/i.test(ua) || w < 640 ? 'Mobile' : 'Desktop';
  var browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
              : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  var os = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS'
         : /Android/.test(ua) ? 'Android' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'Other';

  var params = new URLSearchParams(location.search);
  var ref = document.referrer || '';
  try { if (ref && new URL(ref).hostname === host) ref = ''; } catch (e) {}

  var base = {
    visitor_id: visitorId, session_id: sessionId, path: location.pathname || '/',
    referrer: ref.slice(0, 500) || null,
    utm_source: params.get('utm_source'), utm_medium: params.get('utm_medium'), utm_campaign: params.get('utm_campaign'),
    device: device, browser: browser, os: os,
    screen: (screen.width || 0) + 'x' + (screen.height || 0),
    lang: (navigator.language || '').slice(0, 20),
    tz: (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return null; } })()
  };

  function send(event, extra) {
    var row = {}; var k;
    for (k in base) row[k] = base[k];
    row.event = event;
    if (extra) for (k in extra) row[k] = extra[k];
    try {
      fetch(ENDPOINT, {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'return=minimal' },
        body: JSON.stringify(row)
      }).catch(function () {});
    } catch (e) {}
  }

  // Page view
  send('pageview');

  // Clicks on links and buttons
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('a, button') : null;
    if (!el) return;
    var label = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    var target = el.tagName === 'A' ? (el.getAttribute('href') || '') : (el.id ? '#' + el.id : 'button');
    send('click', { label: label || null, target: target.slice(0, 500) });
  }, true);

  // Which sites people look at in the work showcase
  var lastShown = '';
  function reportShowcase() {
    var url = document.getElementById('scUrl');
    if (!url) return;
    var t = url.textContent.trim();
    if (t && t !== lastShown) {
      lastShown = t;
      var card = document.querySelector('.sc-track .port-card[data-url="' + t.replace(/"/g, '') + '"] h3');
      send('showcase_view', { label: card ? card.textContent.trim().slice(0, 120) : t, target: t });
    }
  }
  var scUrl = document.getElementById('scUrl');
  if (scUrl && window.MutationObserver) {
    new MutationObserver(reportShowcase).observe(scUrl, { childList: true, characterData: true, subtree: true });
  }

  // Contact form submissions (no form contents are recorded here)
  document.addEventListener('submit', function (e) {
    var f = e.target;
    var type = f && f.querySelector ? f.querySelector('[name="business_type"]') : null;
    send('form_submit', { label: type && type.value ? type.value.slice(0, 120) : 'Contact form', target: f.getAttribute('action') ? 'contact' : 'form' });
  }, true);

  // Time on page and how far people scroll
  var start = Date.now(), maxScroll = 0, exited = false;
  function scrollPct() {
    var d = document.documentElement, b = document.body;
    var h = Math.max(d.scrollHeight, b ? b.scrollHeight : 0) - window.innerHeight;
    return h > 0 ? Math.min(100, Math.round((window.scrollY || d.scrollTop) / h * 100)) : 100;
  }
  window.addEventListener('scroll', function () { var p = scrollPct(); if (p > maxScroll) maxScroll = p; }, { passive: true });
  function exit() {
    if (exited) return; exited = true;
    send('page_exit', { duration_ms: Math.min(Date.now() - start, 6 * 60 * 60 * 1000), scroll_pct: Math.max(maxScroll, scrollPct()) });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') exit();
    else if (exited) { exited = false; start = Date.now(); }
  });
  window.addEventListener('pagehide', exit);
})();
