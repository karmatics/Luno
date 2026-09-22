const { spawn, execSync } = require('child_process');
const path = require('path');
const readline = require('readline');
const fs = require('fs');

const currentDir = path.resolve(__dirname);
const parentDir = path.dirname(currentDir);

// Detect environment directories portably
const candidateDirs = [
  path.join(currentDir),
  path.join(parentDir, 'Luno'),
  '/storage/emulated/0/Luno/web/Luno'
];

const lunoDir = candidateDirs.find(d => fs.existsSync(path.join(d, 'server.js'))) || currentDir;

const C_CYAN = '\u001b[36m';
const C_GREEN = '\u001b[32m';
const C_YELLOW = '\u001b[33m';
const C_RED = '\u001b[31m';
const C_MAGENTA = '\u001b[35m';
const C_RESET = '\u001b[0m';

let lunoProcess = null;
const supervisorKeepAlive = setInterval(function() {}, 10000);

function killProcesses() {
  if (lunoProcess) {
    try { lunoProcess.kill('SIGTERM'); } catch(e){}
    lunoProcess = null;
  }
  try { execSync('pkill -f "node server.js" 2>/dev/null'); } catch(e){}
}

function startServers() {
  killProcesses();
  console.clear();
  console.log(C_CYAN + '================================================' + C_RESET);
  console.log(C_MAGENTA + '🌙 Luno Multi-Port Supervisor (v3.8.0)' + C_RESET);
  console.log(C_CYAN + '================================================' + C_RESET);

  if (fs.existsSync(lunoDir)) {
    lunoProcess = spawn('node', ['server.js'], {
      cwd: lunoDir,
      env: Object.assign({}, process.env, { PORT: '8080', HOST: '127.0.0.1' }),
      stdio: 'inherit'
    });
    console.log(C_GREEN + '  ✅ Luno Workspace Server -> http://127.0.0.1:8080' + C_RESET);
    console.log(C_CYAN + '     Root Directory: ' + lunoDir + C_RESET);
  }

  console.log('\n' + C_YELLOW + '  [r] Restart Server  |  [q] Quit Controller' + C_RESET);
  console.log(C_CYAN + '------------------------------------------------\n' + C_RESET);
}

if (process.stdin.isTTY) {
  readline.emitKeypressEvents(process.stdin);
  try { process.stdin.setRawMode(true); } catch(e){}
  process.stdin.resume();

  process.stdin.on('keypress', function(str, key) {
    if (key.name === 'q' || (key && key.ctrl && key.name === 'c')) {
      console.log('\n' + C_RED + '🛑 Stopping Luno server...' + C_RESET);
      killProcesses();
      clearInterval(supervisorKeepAlive);
      process.exit(0);
    } else if (key.name === 'r') {
      console.log('\n' + C_YELLOW + '🔄 Restarting server...' + C_RESET);
      startServers();
    }
  });
}

startServers();