var LunoAcornLoader = globalThis.LunoAcornLoader = function LunoAcornLoader() {};

LunoAcornLoader.isReady = function() {
  var globalObj = (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
  return Boolean(globalObj && globalObj.acorn && typeof globalObj.acorn.parse === 'function');
};

LunoAcornLoader.ensureLoaded = async function() {
  if (LunoAcornLoader.isReady()) {
    var globalObj = (typeof window !== 'undefined' ? window : globalThis);
    return globalObj.acorn;
  }

  // Node.js process fallback
  if (typeof require !== 'undefined') {
    try {
      var a = require('acorn');
      if (typeof window !== 'undefined') window.acorn = a;
      globalThis.acorn = a;
      if (LunoAcornLoader.isReady()) return a;
    } catch (e) {}
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  var candidateUrls = [
    '/Luno/vendor/acorn.js',
    '/vendor/acorn.js',
    'https://cdn.jsdelivr.net/npm/acorn@8.11.3/dist/acorn.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/acorn/8.11.3/acorn.min.js'
  ];

  for (var i = 0; i < candidateUrls.length; i++) {
    var url = candidateUrls[i];
    try {
      await LunoAcornLoader.loadScriptTag(url);
      if (LunoAcornLoader.isReady()) {
        var loadedAcorn = window.acorn || globalThis.acorn;
        window.acorn = loadedAcorn;
        globalThis.acorn = loadedAcorn;
        return loadedAcorn;
      }
    } catch (err) {}
  }

  console.warn('[Luno Acorn Engine] All Acorn endpoints unreachable.');
  return null;
};

LunoAcornLoader.loadScriptTag = function(url) {
  return new Promise(function(resolve, reject) {
    var s = document.createElement('script');
    s.src = url;
    s.async = false;
    s.onload = function() { resolve(); };
    s.onerror = function(err) {
      if (s.parentNode) s.parentNode.removeChild(s);
      reject(err || new Error('Failed to load: ' + url));
    };
    document.head.appendChild(s);
  });
};

if (typeof window !== 'undefined') window.LunoAcornLoader = LunoAcornLoader;
if (typeof module !== 'undefined' && module.exports) module.exports = LunoAcornLoader;