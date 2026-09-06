const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

class LunoServer {
  static async handleAllCode(req, res, url) {
    try {
      const targetProj = (url && url.searchParams && url.searchParams.get('project')) || 'Luno';
      const includeProjectLib = (url && url.searchParams && url.searchParams.get('projectLibrary') === 'true');
      const includeAllLib = (url && url.searchParams && url.searchParams.get('allLibrary') === 'true');

      const projDir = LunoServer.resolveProjectBaseDir(targetProj);
      const filesMap = {};
      const manifest = [];

      function scanTextFiles(dir, relBase = '') {
        if (!fs.existsSync(dir)) return;
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const it of list) {
          if (it.name.startsWith('.') || it.name === 'node_modules') continue;
          const currentRel = relBase ? (relBase + '/' + it.name) : it.name;
          const fullP = path.join(dir, it.name);
          if (it.isDirectory()) {
            scanTextFiles(fullP, currentRel);
          } else {
            const ext = path.extname(it.name).toLowerCase();
            const textExts = ['.js', '.mjs', '.json', '.html', '.htm', '.css', '.svg', '.md', '.txt'];
            if (textExts.includes(ext)) {
              try {
                const content = fs.readFileSync(fullP, 'utf8');
                const key = targetProj + '/' + currentRel;
                manifest.push(key);
                filesMap[key] = content;
              } catch(e) {}
            }
          }
        }
      }

      scanTextFiles(projDir, '');

      // Include declared project libraries
      if (includeProjectLib || includeAllLib) {
        const libraryDir = path.join(LunoServer.getWebRootDir(), 'Library');
        const lunoJsonP = path.join(projDir, 'luno.json');
        let libsToInclude = [];

        if (includeAllLib && fs.existsSync(libraryDir)) {
          libsToInclude = fs.readdirSync(libraryDir).filter(f => f.endsWith('.js'));
        } else if (fs.existsSync(lunoJsonP)) {
          try {
            const meta = JSON.parse(fs.readFileSync(lunoJsonP, 'utf8'));
            libsToInclude = Array.isArray(meta.library) ? meta.library : [];
          } catch(e) {}
        }

        libsToInclude.forEach(lib => {
          const cleanLib = lib.replace(/^(?:Library|library)\//i, '');
          const libFull = path.join(libraryDir, cleanLib);
          if (fs.existsSync(libFull)) {
            try {
              const libContent = fs.readFileSync(libFull, 'utf8');
              const key = 'Library/' + cleanLib;
              if (!manifest.includes(key)) manifest.push(key);
              filesMap[key] = libContent;
            } catch(e) {}
          }
        });
      }

      LunoServer.sendJSON(res, 200, {
        success: true,
        activeProjectName: targetProj,
        activeRootDir: projDir,
        manifest: manifest,
        filesMap: filesMap
      });
    } catch(err) {
      LunoServer.sendJSON(res, 500, { success: false, error: err.message, stack: err.stack });
    }
  }

  static getRootDir() {
    if (!LunoServer._rootDir) {
      const envRoot = process.env.LUNO_ROOT || process.env.WORKSPACE_ROOT;
      if (envRoot && fs.existsSync(envRoot)) {
        LunoServer._rootDir = path.resolve(envRoot);
      } else {
        const defaultRoot = path.resolve(__dirname, "..");
        LunoServer._rootDir = fs.existsSync(defaultRoot) ? defaultRoot : process.cwd();
      }
    }
    return LunoServer._rootDir;
  }

  static setRootDir(val) {
    if (val) {
      LunoServer._rootDir = path.resolve(val);
    }
  }

  static getWebRootDir() {
    const currentRoot = LunoServer.getRootDir();
    const parent = path.dirname(currentRoot);
    if (path.basename(currentRoot).toLowerCase() === 'luno' || fs.existsSync(path.join(parent, 'Luno'))) {
      return parent;
    }
    return currentRoot;
  }

  static resolveProjectBaseDir(projectName) {
    if (!projectName || typeof projectName !== 'string' || !projectName.trim()) {
      return LunoServer.getRootDir();
    }
    const webRoot = LunoServer.getWebRootDir();
    return path.resolve(webRoot, projectName.trim());
  }

  static getGitRootDir() {
    let curr = LunoServer.getRootDir();
    while (curr && curr !== path.parse(curr).root) {
      if (fs.existsSync(path.join(curr, ".git"))) return curr;
      const parent = path.dirname(curr);
      if (parent === curr) break;
      curr = parent;
    }
    return LunoServer.getRootDir();
  }

  static get VERSION() {
    try {
      const lunoJsonPath = path.join(LunoServer.getRootDir(), "luno.json");
      if (fs.existsSync(lunoJsonPath)) {
        const meta = JSON.parse(fs.readFileSync(lunoJsonPath, "utf8"));
        if (meta.version) return "v" + meta.version.replace(/^v/, "");
      }
    } catch (e) {}
    return "v3.6.6";
  }

  static sendJSON(res, status, data) {
    if (res.headersSent) return;
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache, no-store, must-revalidate"
    });
    res.end(JSON.stringify(data));
  }

  static isWritableWorkspacePath(targetFullPath) {
    if (!targetFullPath || typeof targetFullPath !== "string") return false;
    const norm = targetFullPath.replace(/\\/g, "/");
    const activeRoot = LunoServer.getRootDir().replace(/\\/g, "/");
    const webRoot = LunoServer.getWebRootDir().replace(/\\/g, "/");
    const normCwd = process.cwd().replace(/\\/g, "/");

    return norm.startsWith(activeRoot) || norm.startsWith(webRoot) || norm.startsWith(normCwd);
  }

  static ensureGitignoreDefaults() {
    try {
      const gitRoot = LunoServer.getGitRootDir();
      const giPath = path.join(gitRoot, '.gitignore');
      const ignoreEntries = ['*.bak', '*.oldschool.bak', 'node_modules', '.checkpoints'];
      let existingContent = fs.existsSync(giPath) ? fs.readFileSync(giPath, 'utf8') : '';
      let added = false;
      for (const entry of ignoreEntries) {
        if (!existingContent.includes(entry)) {
          existingContent += (existingContent.endsWith('\n') ? '' : '\n') + entry + '\n';
          added = true;
        }
      }
      if (added) {
        fs.writeFileSync(giPath, existingContent, 'utf8');
      }
    } catch (e) {}
  }

  static getAllFiles(dir, fileList = [], ignoreDirs = ["node_modules", ".git", "dist", "build", ".checkpoints", "_claude_salvage", "simpleVersion"], maxDepth = 6, currentDepth = 0, rootScanDir = null) {
    const baseScanDir = rootScanDir || dir;
    if (currentDepth > maxDepth || !fs.existsSync(dir)) return fileList;
    try {
      const items = fs.readdirSync(dir);
      for (const name of items) {
        if (name.endsWith('.bak')) continue;
        const fullPath = path.join(dir, name);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            if (ignoreDirs.includes(name) || name.startsWith('.') || name.startsWith('_')) continue;
            LunoServer.getAllFiles(fullPath, fileList, ignoreDirs, maxDepth, currentDepth + 1, baseScanDir);
          } else if (stat.isFile()) {
            const relPath = path.relative(baseScanDir, fullPath).replace(/\\/g, "/");
            fileList.push({ fullPath, relPath, name, size: stat.size });
          }
        } catch (statErr) {}
      }
    } catch (e) {}
    return fileList;
  }

  static sanitizeAndResolvePath(relPath, baseDir) {
    const webRoot = LunoServer.getWebRootDir();
    if (!relPath || typeof relPath !== 'string' || !relPath.trim()) {
      return baseDir || LunoServer.getRootDir();
    }

    let normalized = relPath.replace(/\\/g, '/').replace(/^\/+/, '').trim();
    if (normalized.startsWith('Luno Workspace/')) normalized = normalized.slice(15).trim();
    const targetDir = baseDir || LunoServer.getRootDir();

    // 1. Direct resolution for core/app files (e.g. /app/LunoLoader.js, /app/acorn.js)
    if (
      normalized.startsWith('app/') ||
      normalized.startsWith('core/') ||
      normalized.startsWith('browser/') ||
      normalized.startsWith('docs/') ||
      normalized.startsWith('test/')
    ) {
      const lunoPath = path.join(LunoServer.getRootDir(), normalized);
      if (fs.existsSync(lunoPath)) return lunoPath;
      const webLunoPath = path.join(webRoot, 'Luno', normalized);
      if (fs.existsSync(webLunoPath)) return webLunoPath;
    }

    // 2. Direct resolution for offline node_modules assets
    if (normalized.startsWith('node_modules/')) {
      const lunoModules = path.join(LunoServer.getRootDir(), normalized);
      if (fs.existsSync(lunoModules)) return lunoModules;
      const webModules = path.join(webRoot, normalized);
      if (fs.existsSync(webModules)) return webModules;
    }

    // 3. Central Library resolution
    if (normalized.startsWith('Library/') || normalized.startsWith('library/')) {
      const localCandidate = path.join(targetDir, normalized);
      if (targetDir !== webRoot && path.basename(targetDir).toLowerCase() !== 'library') {
        if (fs.existsSync(localCandidate)) {
          return localCandidate;
        }
      }
      return path.join(webRoot, 'Library', normalized.replace(/^(?:Library|library)\//, ''));
    }

    if (path.isAbsolute(normalized)) {
      const resolvedAbs = path.resolve(normalized);
      if (resolvedAbs.startsWith(webRoot)) {
        return resolvedAbs;
      }
      throw new Error('[LunoServer Guard] Path boundary violation: "' + normalized + '" is outside workspace root.');
    }

    const segments = normalized.split('/');
    const firstSegment = segments[0];
    const candidateDir = path.join(webRoot, firstSegment);
    if (fs.existsSync(candidateDir) && fs.statSync(candidateDir).isDirectory()) {
      return path.join(webRoot, normalized);
    }

    return path.resolve(targetDir, normalized);
  }

  static async parseAndSaveFiles(bodyText, projectOverride) {
    let filesToWrite = [];
    let serverScript = "";
    let projectName = projectOverride || "";

    try {
      const parsed = JSON.parse(bodyText);
      if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.files)) filesToWrite = parsed.files;
        if (typeof parsed.serverScript === "string") serverScript = parsed.serverScript;
        if (!projectName && typeof parsed.project === "string") projectName = parsed.project;
      }
    } catch (e) {
      return {
        success: false,
        error: "Invalid JSON payload sent to server.",
        llmFeedback: "❌ SAVE FAILED: Server expected structured JSON payload from browser client."
      };
    }

    const savedFiles = [];
    let modifiedCount = 0;
    const fileDetails = [];
    const baseDir = LunoServer.resolveProjectBaseDir(projectName);

    for (const f of filesToWrite) {
      const filePath = f.filePath || f.relPath;
      if (!filePath) continue;

      const action = (f.action || 'write').toLowerCase();
      let canonicalPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
      if (canonicalPath.startsWith('Luno Workspace/')) canonicalPath = canonicalPath.slice(15).trim();

      if (f.methodSpec || action === 'patch' || action === 'delete') {
        throw new Error(
          '[LunoServer Guard] Unresolved surgical patch received for "' + canonicalPath + '". ' +
          'Server-side patch consolidation is permanently disabled. ' +
          'All AST patching must resolve client-side in the browser via LunoManifestDecisionEngine before saving.'
        );
      }

      const fullPath = LunoServer.sanitizeAndResolvePath(canonicalPath, baseDir);
      if (fullPath && LunoServer.isWritableWorkspacePath(fullPath)) {
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, f.content !== undefined ? f.content : "", "utf8");
        savedFiles.push(canonicalPath);
        modifiedCount++;
        fileDetails.push("  • " + canonicalPath + " [Direct disk write]");
      }
    }

    let serverExecutionFeedback = "";
    if (serverScript && serverScript.trim()) {
      serverExecutionFeedback = await LunoServer.executeServerScript(serverScript, baseDir);
    }

    if (modifiedCount > 0) {
      LunoServer.updateLunoMetadata(savedFiles, modifiedCount, baseDir);
    }

    LunoServer.ensureGitignoreDefaults();

    let summaryText = "";
    if (savedFiles.length === 0 && !serverScript) {
      summaryText = "⚠️ No file targets or server scripts found in JSON payload.";
    } else if (savedFiles.length === 0 && serverScript) {
      summaryText = "⚡ Server Script Executed (0 file write targets).";
    } else {
      const modWord = modifiedCount === 1 ? "1 file processed" : (modifiedCount + " files processed");
      const targetLabel = projectName ? (" [Target: " + projectName + "]") : "";
      summaryText = "✅ " + modWord + targetLabel + ":\n" + fileDetails.join("\n");
    }

    return {
      success: true,
      count: savedFiles.length,
      modifiedCount,
      files: savedFiles,
      project: projectName || path.basename(baseDir),
      llmFeedback: (serverExecutionFeedback + "\n" + summaryText).trim()
    };
  }

  static updateLunoMetadata(savedFiles, modifiedCount, baseDir) {
    try {
      const targetDir = baseDir || LunoServer.getRootDir();
      const lunoJsonPath = path.join(targetDir, 'luno.json');
      let lunoMeta = {};
      if (fs.existsSync(lunoJsonPath)) {
        try { lunoMeta = JSON.parse(fs.readFileSync(lunoJsonPath, 'utf8')); } catch(e){}
      }
      lunoMeta.processedCountSinceCheckpoint = (lunoMeta.processedCountSinceCheckpoint || 0) + modifiedCount;
      lunoMeta.changedMethods = lunoMeta.changedMethods || {};
      const nowIso = new Date().toISOString();
      for (const fPath of savedFiles) {
        if (!fPath.endsWith('.bak')) {
          lunoMeta.changedMethods[fPath] = nowIso;
        }
      }
      fs.writeFileSync(lunoJsonPath, JSON.stringify(lunoMeta, null, 2), 'utf8');
    } catch (metaErr) {}
  }

  static async executeServerScript(rawCode, baseDir) {
    if (!rawCode || !rawCode.trim()) return '';

    const targetDir = baseDir || LunoServer.getRootDir();
    const logs = [];
    const customConsole = {
      log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      error: (...args) => logs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      warn: (...args) => logs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
    };

    try {
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const env = {
        require,
        console: customConsole,
        process,
        Buffer,
        LunoServer,
        path: require('path'),
        fs: require('fs'),
        rootDir: targetDir,
        baseDir: targetDir,
        webRootDir: LunoServer.getWebRootDir()
      };

      const fn = new AsyncFunction('require', 'console', 'process', 'Buffer', 'LunoServer', 'env', rawCode);
      let result = await fn(require, customConsole, process, Buffer, LunoServer, env);

      if (typeof result === 'function') {
        result = await result();
      }

      let outputParts = [];
      if (logs.length > 0) {
        outputParts.push('--- Console Logs ---\n' + logs.join('\n'));
      }
      if (result !== undefined && result !== null) {
        const formattedResult = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
        outputParts.push('--- Return Value ---\n' + formattedResult);
      }

      const finalOutput = outputParts.length > 0 ? outputParts.join('\n\n') : 'Server script executed successfully with no output.';
      return "⚡ SERVER SCRIPT OUTPUT:\n" + finalOutput + "\n\n";
    } catch (err) {
      return "❌ SERVER SCRIPT ERROR:\n" + (err.stack || err.message) + "\n\n";
    }
  }

  static handleDeploy(req, res, url) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        let commitMsg = 'Automated deployment from Luno Workspace';
        let targetProj = url.searchParams.get('project') || '';

        try {
          const parsed = JSON.parse(body || '{}');
          if (parsed.commitMsg) commitMsg = parsed.commitMsg;
          if (parsed.project) targetProj = parsed.project;
        } catch(e) {}

        const targetDir = LunoServer.resolveProjectBaseDir(targetProj);
        let output = '';

        const lockFile = path.join(targetDir, '.git', 'index.lock');
        if (fs.existsSync(lockFile)) {
          try { fs.unlinkSync(lockFile); } catch(e){}
        }

        const envOpts = {
          cwd: targetDir,
          encoding: 'utf8',
          env: Object.assign({}, process.env, {
            GIT_SSH_COMMAND: 'ssh -o StrictHostKeyChecking=accept-new'
          })
        };

        try {
          output += '$ git add .\n';
          output += (execSync('git add .', envOpts) || '');
          output += '\n$ git commit -m "' + commitMsg + '"\n';
          try {
            output += (execSync(`git commit -m "${commitMsg}" --allow-empty`, envOpts) || '');
          } catch(commitErr) {
            output += (commitErr.stdout || '') + '\n';
          }
          output += '\n$ git push origin main\n';
          output += (execSync('git push origin main', envOpts) || '');

          return LunoServer.sendJSON(res, 200, {
            success: true,
            project: path.basename(targetDir),
            output: output.trim()
          });
        } catch (gitErr) {
          const errDetail = (gitErr.stdout || '') + '\n' + (gitErr.stderr || gitErr.message);
          return LunoServer.sendJSON(res, 500, {
            success: false,
            error: errDetail.trim()
          });
        }
      } catch (err) {
        return LunoServer.sendJSON(res, 400, { success: false, error: err.message });
      }
    });
  }

  handleAllCode(req, res, url) {
      const projectName = (url && url.searchParams) ? (url.searchParams.get('project') || '') : '';
      const allLibrary = (url && url.searchParams) ? (url.searchParams.get('allLibrary') === 'true' || url.searchParams.get('includeAllLibrary') === 'true') : false;
      const projectLibrary = (url && url.searchParams) ? (url.searchParams.get('projectLibrary') !== 'false') : true;
      const targetDir = LunoServer.resolveProjectBaseDir(projectName);
      const webRoot = LunoServer.getWebRootDir();
      const libraryDir = path.join(webRoot, 'Library');
  
      const TEXT_EXTS = ['.js', '.json', '.html', '.css', '.md', '.txt', '.svg'];
      const files = [];
      const projFolder = projectName || path.basename(targetDir) || 'Luno';
  
      const allSiblings = [];
      try {
        if (fs.existsSync(webRoot)) {
          const entries = fs.readdirSync(webRoot);
          for (const entry of entries) {
            if (entry.startsWith('.') || entry.startsWith('_') || entry === 'node_modules') continue;
            const full = path.join(webRoot, entry);
            try {
              if (fs.statSync(full).isDirectory()) allSiblings.push(entry);
            } catch(e) {}
          }
        }
      } catch(e) {}
  
      function scan(dir, depth, prefix) {
        if (depth > 6 || !fs.existsSync(dir)) return;
        try {
          const items = fs.readdirSync(dir);
          for (const name of items) {
            if (
              name.endsWith('.bak') ||
              name.includes('.old_') ||
              name.includes('Copy') ||
              name === 'bundle.js' ||
              name === 'standalone_bundler.js' ||
              name.startsWith('.') ||
              name.startsWith('_') ||
              name === 'node_modules' ||
              name === 'simpleVersion'
            ) continue;
  
            if (depth === 0) {
              if (!allLibrary && name.toLowerCase() === 'library' && projFolder.toLowerCase() !== 'library') {
                continue;
              }
              if (projFolder === 'Luno' && allSiblings.includes(name) && name !== 'Luno') {
                continue;
              }
            }
  
            const fullPath = path.join(dir, name);
            try {
              const stat = fs.statSync(fullPath);
              if (stat.isDirectory()) {
                scan(fullPath, depth + 1, prefix ? (prefix + '/' + name) : name);
              } else if (stat.isFile() && stat.size < 500000) {
                const ext = path.extname(name).toLowerCase();
                if (TEXT_EXTS.includes(ext)) {
                  const relPath = prefix ? (prefix + '/' + name) : name;
                  files.push({ fullPath, relPath, name, size: stat.size });
                }
              }
            } catch (e) {}
          }
        } catch (e) {}
      }
  
      if (fs.existsSync(targetDir)) {
        scan(targetDir, 0, projFolder);
      }
  
      let meta = {};
      const lunoJsonPath = path.join(targetDir, 'luno.json');
      if (fs.existsSync(lunoJsonPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(lunoJsonPath, 'utf8'));
        } catch(e) {}
      }
  
      // 1. Full Library Scan (When allLibrary=true or when target project is Library itself)
      if ((allLibrary || projFolder.toLowerCase() === 'library') && fs.existsSync(libraryDir) && path.resolve(targetDir) !== path.resolve(libraryDir)) {
        scan(libraryDir, 0, 'Library');
      }
      // 2. Selective Library Discovery (Default: only modules declared in project's luno.json)
      else if (projectLibrary && Array.isArray(meta.library) && meta.library.length > 0 && fs.existsSync(libraryDir) && projFolder.toLowerCase() !== 'library') {
        for (const libEntry of meta.library) {
          if (!libEntry || typeof libEntry !== 'string') continue;
          const cleanLib = libEntry.replace(/^(?:Library|library)\//, '').trim();
          const fullLibPath = path.join(libraryDir, cleanLib);
          if (fs.existsSync(fullLibPath) && fs.statSync(fullLibPath).isFile()) {
            const relPath = 'Library/' + cleanLib;
            if (!files.some(f => f.relPath === relPath)) {
              const stat = fs.statSync(fullLibPath);
              files.push({ fullPath: fullLibPath, relPath: relPath, name: path.basename(cleanLib), size: stat.size });
            }
          }
        }
      }
  
      const manifest = [];
      const filesMap = {};
      for (const item of files) {
        try {
          const content = fs.readFileSync(item.fullPath, 'utf8');
          manifest.push(item.relPath);
          filesMap[item.relPath] = content;
        } catch(e) {}
      }
  
      return LunoServer.sendJSON(res, 200, {
        success: true,
        activeProjectName: projFolder,
        activeRootDir: targetDir.replace(/\\/g, '/'),
        manifest: manifest,
        filesMap: filesMap
      });
    }

  static handleProjectsList(req, res) {
    const activeRoot = LunoServer.getRootDir();
    const parentDir = LunoServer.getWebRootDir();
    const projectList = [];
    try {
      if (fs.existsSync(parentDir)) {
        const items = fs.readdirSync(parentDir);
        for (const item of items) {
          if (item.startsWith('.') || item.startsWith('_') || item === 'node_modules' || item === 'simpleVersion') continue;
          const fullPath = path.join(parentDir, item);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              const normFull = fullPath.replace(/\\/g, '/');
              const normActive = activeRoot.replace(/\\/g, '/');
              let metadata = { name: item, version: '1.0.0', description: 'Workspace project', type: 'web-app' };
              const lunoJsonPath = path.join(fullPath, 'luno.json');
              const pkgJsonPath = path.join(fullPath, 'package.json');

              if (fs.existsSync(lunoJsonPath)) {
                try { metadata = Object.assign({}, metadata, JSON.parse(fs.readFileSync(lunoJsonPath, 'utf8'))); } catch (e) {}
              } else if (fs.existsSync(pkgJsonPath)) {
                try { metadata = Object.assign({}, metadata, JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))); } catch (e) {}
              }

              let fileCount = 0;
              let totalBytes = 0;
              let latestTime = stat.mtimeMs;

              try {
                const pFiles = LunoServer.getAllFiles(fullPath);
                fileCount = pFiles.length;
                for (const pf of pFiles) {
                  try {
                    const pfStat = fs.statSync(pf.fullPath);
                    totalBytes += pfStat.size;
                    if (pfStat.mtimeMs > latestTime) latestTime = pfStat.mtimeMs;
                  } catch(e) {}
                }
              } catch (e) {}

              projectList.push({
                name: item,
                path: normFull,
                isActive: normFull === normActive,
                isLibrary: item.toLowerCase() === 'library',
                description: metadata.description || 'Workspace development project',
                version: metadata.version || '1.0.0',
                type: metadata.type || (item.toLowerCase() === 'library' ? 'shared-library' : 'project'),
                fileCount: fileCount,
                totalSizeKb: Math.round(totalBytes / 1024),
                lastModified: new Date(latestTime).toISOString()
              });
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
    return LunoServer.sendJSON(res, 200, {
      success: true,
      parentDir: parentDir,
      activeRootDir: activeRoot.replace(/\\/g, '/'),
      projects: projectList
    });
  }

  static handleFsLs(req, res, url) {
    const reqPath = url.searchParams.get('path') || '';
    const reqProj = url.searchParams.get('project') || '';
    const isRecursive = url.searchParams.get('recursive') === 'true' || url.searchParams.get('recursive') === '1';
    const baseDir = LunoServer.resolveProjectBaseDir(reqProj);
    const targetDir = reqPath ? LunoServer.sanitizeAndResolvePath(reqPath, baseDir) : baseDir;
    if (!targetDir || !fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
      return LunoServer.sendJSON(res, 404, { error: 'Directory not found: ' + reqPath });
    }

    const normTarget = targetDir.replace(/\\/g, '/');
    const parentDir = path.dirname(normTarget).replace(/\\/g, '/');
    const isLibProj = (path.basename(baseDir).toLowerCase() === 'library');

    if (isRecursive) {
      const fileList = LunoServer.getAllFiles(targetDir);
      const items = fileList.map(item => {
        let stat = null;
        try { stat = fs.statSync(item.fullPath); } catch(e) {}
        return {
          name: item.name,
          relativePath: item.relPath,
          fullPath: item.fullPath.replace(/\\/g, '/'),
          isDirectory: false,
          size: stat ? stat.size : 0,
          mtimeMs: stat ? stat.mtimeMs : 0
        };
      });
      return LunoServer.sendJSON(res, 200, {
        success: true,
        currentPath: normTarget,
        parentPath: parentDir,
        items: items
      });
    }

    const items = fs.readdirSync(targetDir).map(name => {
      const fullPath = path.join(targetDir, name);
      let stat = null;
      try { stat = fs.statSync(fullPath); } catch(e) {}
      const relPath = path.relative(targetDir, fullPath).replace(/\\/g, '/');
      return {
        name: name,
        relativePath: relPath,
        fullPath: fullPath.replace(/\\/g, '/'),
        isDirectory: stat ? stat.isDirectory() : false,
        size: stat ? stat.size : 0,
        mtimeMs: stat ? stat.mtimeMs : 0
      };
    }).filter(item => {
      if (item.name.startsWith('.') || item.name === 'node_modules' || item.name.endsWith('.bak')) return false;
      if (!isLibProj && item.isDirectory && item.name.toLowerCase() === 'library') return false;
      return true;
    });

    return LunoServer.sendJSON(res, 200, {
      success: true,
      currentPath: normTarget,
      parentPath: parentDir,
      items: items
    });
  }

  static handleFsRead(req, res, url) {
    const reqPath = url.searchParams.get('path') || '';
    const reqProj = url.searchParams.get('project') || '';
    if (!reqPath) return LunoServer.sendJSON(res, 400, { error: 'Missing path parameter' });
    const baseDir = LunoServer.resolveProjectBaseDir(reqProj);
    const fullPath = LunoServer.sanitizeAndResolvePath(reqPath, baseDir);
    if (!fullPath || !fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      return LunoServer.sendJSON(res, 404, { error: 'File not found: ' + reqPath });
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    return LunoServer.sendJSON(res, 200, {
      success: true,
      relativePath: reqPath,
      fullPath: fullPath.replace(/\\/g, '/'),
      content: content,
      lines: content.split('\n').length,
      size: content.length
    });
  }

  static handleSetRoot(req, res) {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        if (parsed.rootPath && fs.existsSync(parsed.rootPath)) {
          LunoServer.setRootDir(parsed.rootPath);
          return LunoServer.sendJSON(res, 200, { success: true, rootDir: LunoServer.getRootDir() });
        }
        return LunoServer.sendJSON(res, 400, { success: false, error: 'Directory does not exist' });
      } catch (e) {
        return LunoServer.sendJSON(res, 400, { success: false, error: e.message });
      }
    });
  }

  static handleContextRequest(req, res, url) {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const targetProj = url.searchParams.get('project') || '';
        const baseDir = LunoServer.resolveProjectBaseDir(targetProj);
        let reqList = [];

        try {
          const parsed = JSON.parse(body || '{}');
          if (Array.isArray(parsed.requests)) reqList = parsed.requests;
        } catch(e) {
          const parser = require('../app/LunoPayloadParser.js');
          const parsed = parser.parse(body);
          reqList = parsed.requests || [];
        }

        const extractor = require('./LunoContextExtractor.js');
        const result = extractor.processRequestList(reqList, baseDir);
        return LunoServer.sendJSON(res, 200, result);
      } catch (e) {
        return LunoServer.sendJSON(res, 500, { success: false, error: e.message });
      }
    });
  }

  static serveAsset(req, res, relPath) {
    if (res.headersSent) return;
    try {
      const reqUrl = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
      let targetProj = reqUrl.searchParams.get('project') || '';
      if (!targetProj && req.headers && req.headers.referer) {
        try {
          const refUrl = new URL(req.headers.referer);
          targetProj = refUrl.searchParams.get('project') || '';
        } catch(e) {}
      }
      const baseDir = LunoServer.resolveProjectBaseDir(targetProj);
      const fullPath = LunoServer.sanitizeAndResolvePath(relPath, baseDir);

      if (fullPath && fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          const content = fs.readFileSync(fullPath);
          const ext = path.extname(fullPath).toLowerCase();
          const mimeTypes = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.mjs': 'application/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
          };
          const contentType = mimeTypes[ext] || 'application/octet-stream';
          res.writeHead(200, { "Content-Type": contentType, "Content-Length": content.length, "Cache-Control": "no-cache, no-store, must-revalidate" });
          return res.end(content);
        }
      }
    } catch (e) {}

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found: " + relPath);
  }

  static async handle(req, res) {
    try {
      const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
      const method = req.method.toUpperCase();

      if (method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/full' || url.pathname === '/ui/1' || url.pathname === '/ui/full')) {
        return LunoServer.serveIndex(req, res);
      }

      if (method === 'GET' && (url.pathname === '/app-preview' || url.pathname === '/app-preview/index.html')) {
        const targetProj = url.searchParams.get('project');
        const baseDir = LunoServer.resolveProjectBaseDir(targetProj);
        const indexFile = path.join(baseDir, 'index.html');
        if (fs.existsSync(indexFile)) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
          return res.end(fs.readFileSync(indexFile));
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
        return res.end('<!DOCTYPE html><html><body style="background:#0d1117;color:#c9d1d9;font-family:monospace;padding:2rem;"><h2>📱 Active Project View: ' + path.basename(baseDir) + '</h2><p>No index.html found in: ' + baseDir + '</p></body></html>');
      }

      if (method === 'GET' && url.pathname === '/api/ping') {
        return LunoServer.sendJSON(res, 200, { status: "online", pid: process.pid, rootDir: LunoServer.getRootDir(), version: LunoServer.VERSION });
      }

      if (method === 'GET' && url.pathname === '/api/projects/list') {
        return LunoServer.handleProjectsList(req, res);
      }

      if (method === 'POST' && url.pathname === '/api/projects/fork') {
        return LunoServer.handleForkProject(req, res);
      }

      if (method === 'GET' && url.pathname === '/api/fs/ls') {
        return LunoServer.handleFsLs(req, res, url);
      }

      if (method === 'GET' && url.pathname === '/api/fs/read') {
        return LunoServer.handleFsRead(req, res, url);
      }

      if (method === 'GET' && (url.pathname === '/api/all-code' || url.pathname === '/api/all-code/')) {
        return LunoServer.handleAllCode(req, res, url);
      }

      if (method === 'POST' && url.pathname === '/api/fs/set-root') {
        return LunoServer.handleSetRoot(req, res);
      }

      if (method === 'POST' && url.pathname === '/api/context/request') {
        return LunoServer.handleContextRequest(req, res, url);
      }

      if (method === 'POST' && url.pathname === '/api/deploy') {
        return LunoServer.handleDeploy(req, res, url);
      }

      if (method === 'POST' && url.pathname === '/api/save') {
        let b = '';
        const projectParam = url.searchParams.get('project') || '';
        req.on('data', c => { b += c; });
        req.on('end', async () => {
          try {
            const r = await LunoServer.parseAndSaveFiles(b, projectParam);
            LunoServer.sendJSON(res, 200, r);
          } catch(e) {
            LunoServer.sendJSON(res, 400, { success: false, error: e.message });
          }
        });
        return;
      }

      if (method === 'GET') {
        return LunoServer.serveAsset(req, res, url.pathname.slice(1));
      }

      LunoServer.sendJSON(res, 404, { error: 'Route not found' });
    } catch (err) {
      LunoServer.sendJSON(res, 500, { error: err.message });
    }
  }

  static serveIndex(req, res) {
    if (res.headersSent) return;
    const indexFile = path.join(LunoServer.getRootDir(), 'index.html');
    const spaFile = path.join(LunoServer.getRootDir(), 'spa.html');
    const fileToServe = fs.existsSync(indexFile) ? indexFile : (fs.existsSync(spaFile) ? spaFile : null);

    if (fileToServe) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      return res.end(fs.readFileSync(fileToServe, 'utf8'));
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
    res.end('<!DOCTYPE html><html><body style="background:#0d1117;color:#c9d1d9;font-family:monospace;padding:2rem;"><h2>🌙 Luno Workspace</h2><p>index.html online.</p></body></html>');
  }

  static handleForkProject(req, res) {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let stagingDir = null;
        try {
          const parsed = JSON.parse(body || '{}');
          const sourceName = (parsed.sourceProject || '').trim();
          const rawNewName = (parsed.newProjectName || '').trim();
  
          if (!sourceName || !rawNewName) {
            return LunoServer.sendJSON(res, 400, { success: false, error: 'Both sourceProject and newProjectName are required.' });
          }
  
          const validNameRegex = /^[a-zA-Z0-9_-]+$/;
          if (!validNameRegex.test(rawNewName)) {
            return LunoServer.sendJSON(res, 400, {
              success: false,
              error: 'Invalid project name "' + rawNewName + '". Names must only contain letters, numbers, hyphens (-), or underscores (_).'
            });
          }
  
          if (sourceName === rawNewName) {
            return LunoServer.sendJSON(res, 400, { success: false, error: 'New project name must be different from source.' });
          }
  
          function toPascalCase(str) {
            if (!str) return 'App';
            const clean = str.trim().replace(/[-_]+/g, ' ').replace(/[^\w\s]/g, '');
            const parts = clean.split(/\s+/).filter(Boolean);
            if (parts.length === 0) return 'App';
            return parts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
          }
  
          const webRoot = LunoServer.getWebRootDir();
          const sourceDir = LunoServer.resolveProjectBaseDir(sourceName);
          const targetDir = path.join(webRoot, rawNewName);
  
          if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
            return LunoServer.sendJSON(res, 404, { success: false, error: 'Source project [' + sourceName + '] not found on disk.' });
          }
  
          if (fs.existsSync(targetDir)) {
            return LunoServer.sendJSON(res, 409, { success: false, error: 'Project [' + rawNewName + '] already exists.' });
          }
  
          const newIdentifier = toPascalCase(rawNewName);
          let oldIdentifier = toPascalCase(sourceName);
  
          const sourceLunoJson = path.join(sourceDir, 'luno.json');
          if (fs.existsSync(sourceLunoJson)) {
            try {
              const meta = JSON.parse(fs.readFileSync(sourceLunoJson, 'utf8'));
              if (meta.entrypoint && meta.entrypoint.class) {
                oldIdentifier = meta.entrypoint.class;
              } else if (meta.mainClass) {
                oldIdentifier = meta.mainClass;
              }
            } catch(e) {}
          }
  
          const stagingName = '.fork_staging_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
          stagingDir = path.join(webRoot, stagingName);
          if (fs.existsSync(stagingDir)) {
            fs.rmSync(stagingDir, { recursive: true, force: true });
          }
          fs.mkdirSync(stagingDir, { recursive: true });
  
          let copiedCount = 0;
          const renamedFilesMap = {};
  
          function copyRecursive(src, dest, relPath = '') {
            const stat = fs.lstatSync(src);
            if (stat.isSymbolicLink()) return;
  
            if (stat.isDirectory()) {
              const base = path.basename(src);
              if (base === '.git' || base === 'node_modules' || base === '.checkpoints') return;
              fs.mkdirSync(dest, { recursive: true });
              for (const entry of fs.readdirSync(src)) {
                if (entry.endsWith('.bak')) continue;
                const childRel = relPath ? (relPath + '/' + entry) : entry;
                copyRecursive(path.join(src, entry), path.join(dest, entry), childRel);
              }
            } else if (stat.isFile()) {
              if (src.endsWith('.bak')) return;
              const fileName = path.basename(src);
              const nameParts = fileName.split('.');
              const baseName = nameParts[0];
              const ext = nameParts.slice(1).join('.');
  
              let destFileName = fileName;
              if (baseName === oldIdentifier && ext) {
                destFileName = newIdentifier + '.' + ext;
                renamedFilesMap[relPath] = relPath.replace(new RegExp(fileName + '$'), destFileName);
              }
  
              const destFilePath = path.join(path.dirname(dest), destFileName);
              fs.mkdirSync(path.dirname(destFilePath), { recursive: true });
              fs.copyFileSync(src, destFilePath);
              copiedCount++;
            }
          }
  
          copyRecursive(sourceDir, stagingDir, '');
  
          // Scan and update symbol names in all text files in stagingDir
          function processTextFiles(dir) {
            if (!fs.existsSync(dir)) return;
            for (const item of fs.readdirSync(dir)) {
              const full = path.join(dir, item);
              const stat = fs.statSync(full);
              if (stat.isDirectory()) {
                processTextFiles(full);
              } else if (stat.isFile() && /\.(js|mjs|json|html|htm|css|md|txt|svg)$/i.test(item)) {
                try {
                  let content = fs.readFileSync(full, 'utf8');
                  let modified = false;
  
                  if (oldIdentifier && newIdentifier && oldIdentifier !== newIdentifier) {
                    const classWordRegex = new RegExp('\\b' + oldIdentifier + '\\b', 'g');
                    if (classWordRegex.test(content)) {
                      content = content.replace(classWordRegex, newIdentifier);
                      modified = true;
                    }
                  }
  
                  const oldPrefixRegex = new RegExp('\\b' + sourceName + '/', 'g');
                  if (oldPrefixRegex.test(content)) {
                    content = content.replace(oldPrefixRegex, rawNewName + '/');
                    modified = true;
                  }
  
                  if (modified) {
                    fs.writeFileSync(full, content, 'utf8');
                  }
                } catch(e) {}
              }
            }
          }
  
          processTextFiles(stagingDir);
  
          // Explicitly update manifest metadata in luno.json
          const lunoJsonPath = path.join(stagingDir, 'luno.json');
          if (fs.existsSync(lunoJsonPath)) {
            try {
              const meta = JSON.parse(fs.readFileSync(lunoJsonPath, 'utf8'));
              meta.name = rawNewName;
              meta.description = meta.description
                ? (meta.description + ' (Forked from ' + sourceName + ')')
                : ('Forked application from ' + sourceName);
              meta.processedCountSinceCheckpoint = 0;
              meta.lastCheckpointTime = new Date().toISOString();
              meta.pendingCheckpointDescription = 'Clean fork initialized from ' + sourceName;
  
              if (meta.entrypoint && typeof meta.entrypoint === 'object') {
                meta.entrypoint.class = newIdentifier;
                if (meta.entrypoint.file) {
                  for (const [oldP, newP] of Object.entries(renamedFilesMap)) {
                    if (meta.entrypoint.file.endsWith(oldP)) {
                      meta.entrypoint.file = meta.entrypoint.file.replace(new RegExp(oldP + '$'), newP);
                    }
                  }
                }
              }
              if (meta.mainClass) {
                meta.mainClass = newIdentifier;
              }
  
              if (Array.isArray(meta.main)) {
                meta.main = meta.main.map(p => {
                  let updated = p;
                  for (const [oldP, newP] of Object.entries(renamedFilesMap)) {
                    if (updated.endsWith(oldP)) updated = updated.replace(new RegExp(oldP + '$'), newP);
                  }
                  return updated;
                });
              }
  
              fs.writeFileSync(lunoJsonPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
            } catch (e) {}
          }
  
          const noJekyll = path.join(stagingDir, '.nojekyll');
          if (!fs.existsSync(noJekyll)) {
            fs.writeFileSync(noJekyll, '', 'utf8');
          }
  
          fs.renameSync(stagingDir, targetDir);
          stagingDir = null;
  
          return LunoServer.sendJSON(res, 200, {
            success: true,
            project: rawNewName,
            sourceProject: sourceName,
            entrypointClass: newIdentifier,
            oldEntrypointClass: oldIdentifier,
            path: targetDir.replace(/\\/g, '/'),
            renamedFilesCount: Object.keys(renamedFilesMap).length,
            copiedFilesCount: copiedCount
          });
  
        } catch (err) {
          if (stagingDir && fs.existsSync(stagingDir)) {
            try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch(e){}
          }
          return LunoServer.sendJSON(res, 500, { success: false, error: 'Fork operation failed: ' + err.message });
        }
      });
    }
}

globalThis.LunoServer = LunoServer;
if (typeof module !== "undefined" && module.exports) module.exports = LunoServer;