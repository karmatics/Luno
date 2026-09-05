const path = require('path');

// Set process working directory to inner Luno so require('./core/LunoServer.js')
// resolves identically to the phone setup at /storage/emulated/0/Luno/web/Luno
const lunoDir = path.join(__dirname, 'Luno');
process.chdir(lunoDir);

// Launch your authentic, 1,063-line Luno core server
require(path.join(lunoDir, 'server.js'));