// Proxy forwarder for backwards compatibility
if (typeof require !== 'undefined') {
  try {
    module.exports = require('../app/LunoRuntimeStringifier.js');
  } catch(e) {}
}