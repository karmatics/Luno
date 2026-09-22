const http = require('http');
const path = require('path');
const fs = require('fs');

process.on('uncaughtException', (err) => {
  console.error('[Luno Server Guard]', err.message);
});

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '127.0.0.1';

const defaultDir = fs.existsSync(path.join(__dirname, 'Luno', 'luno.json'))
  ? path.join(__dirname, 'Luno')
  : (fs.existsSync(path.join(__dirname, 'luno.json')) ? __dirname : process.cwd());

const RUNTIME_STATE = { rootDir: defaultDir };

const server = http.createServer(async (req, res) => {
  try {
    Object.keys(require.cache).forEach(key => {
      if (key.includes('LunoServer.js') || key.includes('LunoClassPatcher.js')) {
        delete require.cache[key];
      }
    });

    const lunoServerModule = fs.existsSync(path.join(__dirname, 'core', 'LunoServer.js'))
      ? './core/LunoServer.js'
      : './Luno/core/LunoServer.js';

    const LunoServer = require(lunoServerModule);
    LunoServer.setRootDir(RUNTIME_STATE.rootDir);
    await LunoServer.handle(req, res);
    RUNTIME_STATE.rootDir = LunoServer.getRootDir();
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        status: 'error',
        error: 'Luno Server Exception',
        message: err.message,
        stack: err.stack
      }, null, 2));
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log('[Luno Server] Bound securely to http://' + HOST + ':' + PORT);
});