// Minimal drop-in for the few supabase-js calls the public pages use (select().eq().maybeSingle() and insert()).
// Uses plain fetch against the REST API, so no CDN script is needed. Skipped if the real library is already loaded.
//
// SNAPSHOT-ONLY MODE (what every public page uses): window.SNAPSHOT_ONLY = true is set in each page's <head>,
// together with window.__siteSnap, a fetch of the same-origin snapshot assets/site-data.json started at the very
// top of the page. site_content is then read only from that snapshot (kept in sync with Supabase by the GitHub
// Action). No request is ever made to supabase.co for it. Without the flag it falls back to live-first.
(function () {
  if (window.supabase) return;
  var cache = {};
  var SNAPSHOT_ONLY = window.SNAPSHOT_ONLY === true;
  if (SNAPSHOT_ONLY) cache['site_content?id=eq.1'] = snapshot();

  function request(path, options, timeoutMs) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs);
    var headers = Object.assign({
      apikey: window.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + window.SUPABASE_ANON_KEY
    }, options.headers || {});
    return fetch(window.SUPABASE_URL + '/rest/v1/' + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body,
      signal: ctrl.signal
    }).finally(function () { clearTimeout(timer); });
  }

  // Reuses the fetch the page started in <head> (window.__siteSnap); retries once on failure.
  function snapshot() {
    var fresh = function () {
      return fetch(new URL('assets/site-data.json', document.baseURI).href, { cache: 'no-cache' })
        .then(function (res) {
          if (!res.ok) throw new Error('snapshot HTTP ' + res.status);
          return res.json();
        });
    };
    var first = window.__siteSnap;
    return (first ? first.catch(fresh) : fresh()).then(function (row) { return [row]; });
  }

  function pick(row, cols) {
    if (!row || !cols || cols === '*') return row;
    var out = {};
    String(cols).split(',').forEach(function (c) {
      c = c.trim();
      if (c) out[c] = row[c];
    });
    return out;
  }

  function from(table) {
    return {
      select: function (cols) {
        var filters = {};
        var builder = {
          eq: function (col, val) { filters[col] = val; return builder; },
          maybeSingle: function () {
            var qs = Object.keys(filters).map(function (k) {
              return encodeURIComponent(k) + '=eq.' + encodeURIComponent(filters[k]);
            }).join('&');
            var key = table + '?' + qs;
            // One data load per table/filter, shared by every caller on the page.
            if (!cache[key]) {
              if (SNAPSHOT_ONLY && table === 'site_content') {
                cache[key] = snapshot();
              } else {
                cache[key] = request(table + '?select=*&' + qs + '&limit=1', {}, 3000)
                  .then(function (res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.json();
                  })
                  .catch(function (err) {
                    if (table === 'site_content') return snapshot();
                    throw err;
                  });
              }
            }
            return cache[key].then(
              function (rows) { return { data: pick(rows && rows[0] || null, cols), error: null }; },
              function (err) { return { data: null, error: { message: String(err && err.message || err) } }; }
            );
          }
        };
        return builder;
      },
      insert: function (row) {
        return request(table, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(row)
        }, 10000).then(function (res) {
          if (res.ok) return { error: null };
          return res.text().then(function (t) { return { error: { message: t || ('HTTP ' + res.status) } }; });
        }, function (err) {
          return { error: { message: String(err && err.message || err) } };
        });
      }
    };
  }

  window.supabase = { __lite: true, createClient: function () { return { from: from }; } };
})();
