// Minimal drop-in for the few supabase-js calls the public pages use (select().eq().maybeSingle() and insert()).
// Uses plain fetch against the REST API, so no CDN script is needed. Skipped if the real library is already loaded.
// If the live site_content request fails or is blocked (e.g. school web filters), it falls back to the
// same-origin snapshot assets/site-data.json.
(function () {
  if (window.supabase) return;
  var cache = {};

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

  function snapshot() {
    return fetch(new URL('assets/site-data.json', document.baseURI).href, { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('snapshot HTTP ' + res.status);
        return res.json();
      })
      .then(function (row) { return [row]; });
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
