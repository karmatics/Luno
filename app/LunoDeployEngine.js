class LunoDeployEngine {
  constructor() {}

  static REPO_MAP_KEY = 'luno_github_repo_mappings_v1';
  static GITHUB_TOKEN_KEY = 'luno_github_pat_token';

  static GITHUB_ORG = 'luno_github_account';
    static DEFAULT_ACCOUNT = 'karmatics';

    static getGithubAccount() {
      try {
        if (typeof localStorage !== 'undefined') {
          return localStorage.getItem(LunoDeployEngine.GITHUB_ACCOUNT_KEY) || LunoDeployEngine.DEFAULT_ACCOUNT;
        }
      } catch(e) {}
      return LunoDeployEngine.DEFAULT_ACCOUNT;
    }

    static setGithubAccount(account) {
      try {
        if (typeof localStorage !== 'undefined') {
          var clean = (account || '').trim();
          localStorage.setItem(LunoDeployEngine.GITHUB_ACCOUNT_KEY, clean || LunoDeployEngine.DEFAULT_ACCOUNT);
        }
      } catch(e) {}
    }

    static get GITHUB_ORG() {
      return LunoDeployEngine.getGithubAccount();
    };
  static getGithubToken() {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(LunoDeployEngine.GITHUB_TOKEN_KEY) || '';
      }
    } catch(e) {}
    return '';
  }

  static setGithubToken(token) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LunoDeployEngine.GITHUB_TOKEN_KEY, (token || '').trim());
      }
    } catch(e) {}
  }

  static getRepoMappings() {
        var defaults = {
          'Luno': 'Luno',
          'LunoTests': 'LunoTests',
          'SvgStudio': 'SvgStudio',
          'Es6Converter': 'Es6Converter',
          'BookmarkletWorkshop': 'BookmarkletWorkshop',
          'AardvarkPlaylist': 'AardvarkPlaylist',
          'aardvarkBookmarklet': 'aardvarkBookmarklet',
          'Basic3D': 'Basic3D',
          'VideoEditor': 'VideoEditor',
          'guessTheNoteGame': 'guessTheNoteGame',
          'VideoPrepper': 'VideoPrepper',
          'BasicsWithDialogBox': 'BasicsWithDialogBox',
          'SimpleTest': 'SimpleTest',
          'MathStorm': 'MathStorm',
          'Library': 'Library',
          'images': 'images',
          'MySituation': 'situation'
        };

        try {
          if (typeof localStorage !== 'undefined') {
            var raw = localStorage.getItem(LunoDeployEngine.REPO_MAP_KEY);
            if (raw) return Object.assign(defaults, JSON.parse(raw));
          }
        } catch(e) {}
        return defaults;
      }
  static setRepoMapping(projectName, remoteRepoName) {
    if (!projectName) return;
    var mappings = LunoDeployEngine.getRepoMappings();
    mappings[projectName] = remoteRepoName.trim();
    try {
      localStorage.setItem(LunoDeployEngine.REPO_MAP_KEY, JSON.stringify(mappings));
    } catch(e) {}
  }

  static getRemoteRepoName(projectName) {
    var mappings = LunoDeployEngine.getRepoMappings();
    return mappings[projectName] || projectName;
  }

  static async createRemoteRepoOnGitHub(repoName) {
      var token = LunoDeployEngine.getGithubToken();
      if (!token) return { success: false, noToken: true };

      var account = LunoDeployEngine.getGithubAccount();
      var payload = {
        name: repoName,
        description: 'Standalone repository for ' + repoName + ' - deployed via Luno Workspace',
        homepage: 'https://' + account.toLowerCase() + '.github.io/' + repoName + '/',
        private: false,
        has_issues: true,
        has_projects: false,
        has_wiki: false
      };

      var headers = {
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      };

      try {
        // First attempt: create under authenticated user (/user/repos)
        var res = await fetch('https://api.github.com/user/repos', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });

        var data = await res.json();

        if (res.ok) {
          return { success: true, repoUrl: data.html_url, sshUrl: data.ssh_url };
        }

        // If already exists under user account, treat as success
        if (data.errors && data.errors.some(function(e) { return e.message && e.message.includes('already exists'); })) {
          return { success: true, alreadyExists: true, message: 'Repository already exists on GitHub.' };
        }

        // Second attempt: if user is not the account owner, try organization endpoint (/orgs/{account}/repos)
        var orgRes = await fetch('https://api.github.com/orgs/' + encodeURIComponent(account) + '/repos', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });

        var orgData = await orgRes.json();
        if (orgRes.ok) {
          return { success: true, repoUrl: orgData.html_url, sshUrl: orgData.ssh_url };
        } else {
          if (orgData.errors && orgData.errors.some(function(e) { return e.message && e.message.includes('already exists'); })) {
            return { success: true, alreadyExists: true, message: 'Repository already exists on GitHub.' };
          }
          return { success: false, error: (orgData.message || data.message || 'GitHub API error') };
        }
      } catch(err) {
        return { success: false, error: err.message };
      }
    }

  static async enableGitHubPages(repoName) {
      var token = LunoDeployEngine.getGithubToken();
      if (!token) return { success: false };

      var account = LunoDeployEngine.getGithubAccount();
      try {
        var res = await fetch('https://api.github.com/repos/' + encodeURIComponent(account) + '/' + encodeURIComponent(repoName) + '/pages', {
          method: 'POST',
          headers: {
            'Authorization': 'token ' + token,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            source: {
              branch: 'main',
              path: '/'
            }
          })
        });
        return await res.json();
      } catch(e) {
        return { success: false, error: e.message };
      }
    }

  static async ensureGitHubPagesParity(projectName) {
      var pName = projectName || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');

      try {
        var serverScript = [
          'const fs = require("fs");',
          'const path = require("path");',
          'const projRoot = LunoServer.resolveProjectBaseDir("' + pName + '");',
          'const webRoot = LunoServer.getWebRootDir();',
          'const libraryRoot = path.join(webRoot, "Library");',
          'let actions = [];',
          '',
          '// 1. Ensure .nojekyll exists in project root',
          'const noJekyllPath = path.join(projRoot, ".nojekyll");',
          'if (!fs.existsSync(noJekyllPath)) {',
          '  fs.writeFileSync(noJekyllPath, "", "utf8");',
          '  actions.push("Created .nojekyll in " + path.basename(projRoot));',
          '}',
          '',
          '// 2. Special handling for Library as a standalone repository',
          'if (pName === "Library" || path.basename(projRoot).toLowerCase() === "library") {',
          '  const indexPath = path.join(projRoot, "index.html");',
          '  if (!fs.existsSync(indexPath)) {',
          '    const files = fs.readdirSync(projRoot).filter(f => f.endsWith(".js") || f.endsWith(".css"));',
          '    const listHtml = files.map(f => `<li><a href="${f}">${f}</a></li>`).join("\\n    ");',
          '    const catalogHtml = `<!DOCTYPE html>\\n<html>\\n<head>\\n  <meta charset="UTF-8">\\n  <title>Luno Shared Library</title>\\n  <style>body { background:#0d1117; color:#c9d1d9; font-family:monospace; padding:2rem; } a { color:#58a6ff; text-decoration:none; } a:hover { text-decoration:underline; } h2 { color:#00f2fe; }</style>\\n</head>\\n<body>\\n  <h2>📚 Luno Shared Library Hub</h2>\\n  <p style="color:#8b949e;">Central repository of shared utilities, loaders, and UI components for Karmatics applications.</p>\\n  <ul>\\n    ${listHtml}\\n  </ul>\\n</body>\\n</html>`;',
          '    fs.writeFileSync(indexPath, catalogHtml, "utf8");',
          '    actions.push("Generated index.html catalog for Library repository");',
          '  }',
          '  return actions.length > 0 ? actions.join("\\n") : "Library repository assets verified cleanly.";',
          '}',
          '',
          '// 3. For sibling apps: ensure .nojekyll and verify index.html',
          'const indexPath = path.join(projRoot, "index.html");',
          'if (fs.existsSync(indexPath)) {',
          '  actions.push("Verified index.html in [" + pName + "]");',
          '}',
          '',
          'return actions.length > 0 ? actions.join("\\n") : "GitHub Pages assets verified cleanly.";'
        ].join('\n');

        var res = await fetch('/api/save?project=' + encodeURIComponent(pName), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: [], serverScript: serverScript, project: pName })
        });
        return await res.json();
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  static async checkProjectGitStatus(projectName) {
    var pName = projectName || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');

    try {
      var serverScript = [
        'const { execSync } = require("child_process");',
        'const fs = require("fs");',
        'const path = require("path");',
        'const projRoot = LunoServer.resolveProjectBaseDir("' + pName + '");',
        '',
        'if (!fs.existsSync(projRoot)) {',
        '  return { exists: false, error: "Project directory not found on disk: " + projRoot };',
        '}',
        '',
        'const gitDir = path.join(projRoot, ".git");',
        'const hasGit = fs.existsSync(gitDir);',
        'let remoteUrl = "";',
        'let currentBranch = "main";',
        'let statusText = "";',
        '',
        'if (hasGit) {',
        '  try {',
        '    remoteUrl = (execSync("git remote get-url origin", { cwd: projRoot, encoding: "utf8" }) || "").trim();',
        '  } catch(e) {}',
        '  try {',
        '    currentBranch = (execSync("git branch --show-current", { cwd: projRoot, encoding: "utf8" }) || "main").trim();',
        '  } catch(e) {}',
        '  try {',
        '    statusText = (execSync("git status --short", { cwd: projRoot, encoding: "utf8" }) || "").trim();',
        '  } catch(e) {}',
        '}',
        '',
        'const hasNoJekyll = fs.existsSync(path.join(projRoot, ".nojekyll"));',
        'const hasIndexHtml = fs.existsSync(path.join(projRoot, "index.html"));',
        '',
        'return {',
        '  exists: true,',
        '  projectName: "' + pName + '",',
        '  dirPath: projRoot,',
        '  hasGit: hasGit,',
        '  remoteUrl: remoteUrl,',
        '  currentBranch: currentBranch,',
        '  statusText: statusText,',
        '  hasNoJekyll: hasNoJekyll,',
        '  hasIndexHtml: hasIndexHtml',
        '};'
      ].join('\n');

      var res = await fetch('/api/save?project=' + encodeURIComponent(pName), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: [], serverScript: serverScript, project: pName })
      });
      var data = await res.json();
      return (data && data.llmFeedback) ? JSON.parse(data.llmFeedback.replace(/^⚡ SERVER SCRIPT OUTPUT:[\r\n]+(?:--- Return Value ---\s*)?/i, '').trim()) : data;
    } catch(e) {
      return { success: false, error: e.message };
    }
  }

  static async initializeGitRepo(projectName, remoteUrl) {
    var pName = projectName || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');

    try {
      var serverScript = [
        'const { execSync } = require("child_process");',
        'const fs = require("fs");',
        'const path = require("path");',
        'const projRoot = LunoServer.resolveProjectBaseDir("' + pName + '");',
        'let output = "";',
        '',
        'if (!fs.existsSync(path.join(projRoot, ".git"))) {',
        '  output += (execSync("git init -b main", { cwd: projRoot, encoding: "utf8" }) || "") + "\\n";',
        '}',
        '',
        'const targetRemote = "' + (remoteUrl || '').trim() + '";',
        'if (targetRemote) {',
        '  try {',
        '    execSync("git remote remove origin", { cwd: projRoot, encoding: "utf8" });',
        '  } catch(e) {}',
        '  output += (execSync("git remote add origin " + targetRemote, { cwd: projRoot, encoding: "utf8" }) || "") + "\\n";',
        '}',
        '',
        'return output.trim() || "Git initialized cleanly for [" + path.basename(projRoot) + "].";'
      ].join('\n');

      var res = await fetch('/api/save?project=' + encodeURIComponent(pName), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: [], serverScript: serverScript, project: pName })
      });
      var data = await res.json();
      return data;
    } catch(e) {
      return { success: false, error: e.message };
    }
  }

  static async deployProjectToGitHub(projectName, commitMsg, customRemoteUrl, options) {
      var pName = projectName || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');
      var remoteName = LunoDeployEngine.getRemoteRepoName(pName);
      var account = LunoDeployEngine.getGithubAccount();
      var msg = commitMsg || ('[' + pName + '] Automated deployment via Luno Workspace');
      var token = LunoDeployEngine.getGithubToken();
      var isLibraryProject = (pName.toLowerCase() === 'library');
      var opts = options || {};
      var deployToPages = opts.deployToPages !== false;

      try {
        if (deployToPages && token) {
          try {
            await LunoDeployEngine.createRemoteRepoOnGitHub(remoteName);
          } catch(e) {}
        }

        if (deployToPages) {
          await LunoDeployEngine.ensureGitHubPagesParity(pName);
        }

        var isStatic = (typeof LunoFileSystem !== 'undefined' && typeof LunoFileSystem.isStaticHosting === 'function')
          ? LunoFileSystem.isStaticHosting()
          : (typeof LunoApiClient !== 'undefined' && LunoApiClient.isStaticMode());

        if (isStatic) {
          if (!token) {
            return {
              success: false,
              error: 'A GitHub Personal Access Token (PAT) is required to deploy directly from browser-hosted Luno on GitHub Pages. Please enter your PAT above.'
            };
          }

          var codeData = await LunoApiClient.fetchAllCode(pName, {
            includeProjectLibrary: isLibraryProject,
            includeAllLibrary: isLibraryProject
          });

          if (!codeData || !codeData.filesMap) {
            return { success: false, error: 'Could not assemble project files from IndexedDB.' };
          }

          var headers = {
            'Authorization': 'token ' + token,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          };

          var committedCount = 0;
          var filesMap = codeData.filesMap;

          for (var rawPath in filesMap) {
            if (!Object.prototype.hasOwnProperty.call(filesMap, rawPath)) continue;
            var cleanPath = rawPath.replace(/\\/g, '/');
            if (cleanPath.startsWith(pName + '/')) cleanPath = cleanPath.slice(pName.length + 1);

            if (!isLibraryProject && cleanPath.startsWith('Library/')) continue;

            var content = filesMap[rawPath] || '';
            var b64Content = btoa(unescape(encodeURIComponent(content)));
            var apiUrl = 'https://api.github.com/repos/' + encodeURIComponent(account) + '/' + encodeURIComponent(remoteName) + '/contents/' + cleanPath;

            var sha = undefined;
            try {
              var checkRes = await fetch(apiUrl, { method: 'GET', headers: headers });
              if (checkRes.ok) {
                var checkData = await checkRes.json();
                sha = checkData.sha;
              }
            } catch (e) {}

            var putBody = {
              message: msg + ' - ' + cleanPath,
              content: b64Content,
              branch: 'main'
            };
            if (sha) putBody.sha = sha;

            var putRes = await fetch(apiUrl, {
              method: 'PUT',
              headers: headers,
              body: JSON.stringify(putBody)
            });

            if (putRes.ok) {
              committedCount++;
            }
          }

          if (deployToPages) {
            try {
              var noJekyllUrl = 'https://api.github.com/repos/' + encodeURIComponent(account) + '/' + encodeURIComponent(remoteName) + '/contents/.nojekyll';
              var njCheck = await fetch(noJekyllUrl, { method: 'GET', headers: headers });
              var njSha = njCheck.ok ? (await njCheck.json()).sha : undefined;
              await fetch(noJekyllUrl, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({ message: 'Ensure .nojekyll', content: '', branch: 'main', sha: njSha })
              });
            } catch(e) {}

            try {
              await LunoDeployEngine.enableGitHubPages(remoteName);
            } catch(e) {}
          }

          return {
            success: true,
            output: '✅ Pure Browser Deployment Complete!\nCommitted ' + committedCount + ' file(s) directly to https://github.com/' + account + '/' + remoteName + ' via GitHub REST API.'
          };
        }

        var targetRemote = customRemoteUrl || ('git@github.com:' + account + '/' + remoteName + '.git');
        if (deployToPages) {
          await LunoDeployEngine.initializeGitRepo(pName, targetRemote);
        }

        var res = await fetch('/api/deploy?project=' + encodeURIComponent(pName), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project: pName, commitMsg: msg, deployToPages: deployToPages })
        });
        var deployData = await res.json();

        if (deployData && deployData.success && token && deployToPages) {
          try {
            await LunoDeployEngine.enableGitHubPages(remoteName);
          } catch(e) {}
        }

        return deployData;
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

  static async mountUI(container) {
      if (!container) return;
      container.innerHTML = '';

      var m = (typeof LunoUIComponents !== 'undefined' && LunoUIComponents.makeElement)
        ? LunoUIComponents.makeElement
        : function(tag, attrs) {
            var el = document.createElement(tag || 'div');
            if (attrs && typeof attrs === 'object') Object.assign(el, attrs);
            for (var i = 2; i < arguments.length; i++) {
              var c = arguments[i];
              if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
            }
            return el;
          };

      var currentTarget = (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject) ? ClientApp.getTargetProject() : 'Luno';
      var savedToken = LunoDeployEngine.getGithubToken();
      var currentAccount = LunoDeployEngine.getGithubAccount();

      var accountInput = m('input', {
        type: 'text',
        value: currentAccount,
        placeholder: 'karmatics',
        style: { width: '130px', background: '#0d1117', color: '#00f2fe', border: '1px solid #00f2fe', padding: '0.4rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 'bold', outline: 'none' },
        oninput: function(e) {
          LunoDeployEngine.setGithubAccount(e.target.value);
        }
      });

      var tokenInput = m('input', {
        type: 'password',
        value: savedToken,
        placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx (PAT token for auto-creating repos on GitHub)',
        style: { flex: 1, minWidth: '200px', background: '#0d1117', color: '#7ee787', border: '1px solid #30363d', padding: '0.45rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', outline: 'none' },
        oninput: function(e) {
          LunoDeployEngine.setGithubToken(e.target.value);
        }
      });

      var tokenCard = m('div', {
        style: { background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }
      },
        m('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem' } },
          m('div', { style: { display: 'flex', alignItems: 'center', gap: '0.4rem' } },
            m('strong', { style: { color: '#d2a8ff', fontSize: '0.82rem' } }, '🐙 GitHub Account:'),
            accountInput
          ),
          m('a', { href: 'https://github.com/settings/tokens/new?scopes=repo', target: '_blank', style: { color: '#58a6ff', fontSize: '0.72rem', textDecoration: 'none' } }, 'Generate PAT on GitHub ↗')
        ),
        m('div', { style: { display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' } },
          tokenInput,
          m('button', {
            style: { padding: '0.45rem 0.75rem', background: '#271052', color: '#d2a8ff', border: '1px solid #8257e5', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace' },
            onclick: function() {
              LunoDeployEngine.setGithubAccount(accountInput.value);
              LunoDeployEngine.setGithubToken(tokenInput.value);
              if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
                ClientApp.showToast('Saved GitHub Account [' + LunoDeployEngine.getGithubAccount() + '] & Token!', 'success', '🔑');
              }
            }
          }, 'Save Credentials')
        ),
        m('span', { style: { fontSize: '0.7rem', color: '#8b949e', lineHeight: '1.3' } },
          'With credentials saved, tapping "Deploy" pushes to ' + currentAccount + ' and activates GitHub Pages automatically.'
        )
      );

      var headerCard = m('div', {
        style: { background: 'linear-gradient(135deg, #0d2818 0%, #161b22 100%)', border: '2px solid #238636', borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem', boxShadow: '0 4px 16px rgba(35,134,54,0.25)', fontFamily: 'monospace' }
      },
        m('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.35rem' } },
          m('h2', { style: { color: '#3fb950', fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' } }, '🚀 GitHub Pages Multi-Repo Deployment Hub'),
          m('span', { style: { fontSize: '0.72rem', color: '#00f2fe', background: '#003847', border: '1px solid #00f2fe', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 'bold' } }, 'Account: ' + currentAccount)
        ),
        m('p', { style: { fontSize: '0.78rem', color: '#c9d1d9', margin: 0, lineHeight: '1.4' } },
          'Deploy each sibling project to its own independent GitHub repository under ',
          m('strong', { style: { color: '#00f2fe' } }, currentAccount),
          '.'
        )
      );

      var listArea = m('div', { id: 'deploy-projects-list', style: { display: 'flex', flexDirection: 'column', gap: '0.75rem' } },
        m('div', { style: { padding: '1rem', color: '#00f2fe', textAlign: 'center' } }, '⚡ Inspecting sibling Git repositories...')
      );

      container.appendChild(headerCard);
      container.appendChild(tokenCard);
      container.appendChild(listArea);

      var pData = null;
      try {
        if (typeof LunoApiClient !== 'undefined' && LunoApiClient.fetchProjectsList) {
          pData = await LunoApiClient.fetchProjectsList();
        } else {
          var resP = await fetch('/api/projects/list');
          pData = await resP.json();
        }
      } catch(e) {}

      var projects = (pData && Array.isArray(pData.projects)) ? pData.projects : [
        { name: 'Basic3D' },
        { name: 'guessTheNoteGame' },
        { name: 'VideoEditor' },
        { name: 'MathStorm' },
        { name: 'BasicsWithDialogBox' },
        { name: 'Luno' },
        { name: 'Library' }
      ];

      listArea.innerHTML = '';
      for (var i = 0; i < projects.length; i++) {
        var p = projects[i];
        var card = await LunoDeployEngine.renderProjectDeployCard(p.name, m);
        listArea.appendChild(card);
      }
    }
  static async renderProjectDeployCard(projectName, m) {
      const el = m || ((typeof LunoUIComponents !== 'undefined' && LunoUIComponents.makeElement) ? LunoUIComponents.makeElement : null);
      const wrapper = el('div', {
        style: { background: '#161b22', border: '1px solid #30363d', borderRadius: '10px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', fontFamily: 'monospace' }
      },
        el('strong', { style: { color: '#00f2fe', fontSize: '0.95rem' } }, '📁 ' + projectName)
      );
      await LunoDeployEngine.renderProjectDeployPanel(projectName, el, wrapper);
      return wrapper;
    }
  static gitStatusCache = new Map();

  static async getProjectGitStatusLazy(projectName, forceRefresh = false) {
      if (!forceRefresh && LunoDeployEngine.gitStatusCache.has(projectName)) {
        return LunoDeployEngine.gitStatusCache.get(projectName);
      }
      const status = await LunoDeployEngine.checkProjectGitStatus(projectName);
      LunoDeployEngine.gitStatusCache.set(projectName, status);
      return status;
    }

  static async renderProjectDeployPanel(projectName, m, targetContainer) {
        const el = m || ((typeof LunoUIComponents !== 'undefined' && LunoUIComponents.makeElement)
          ? LunoUIComponents.makeElement
          : function(tag, attrs) {
              const node = document.createElement(tag || 'div');
              if (attrs && typeof attrs === 'object') Object.assign(node, attrs);
              for (let i = 2; i < arguments.length; i++) {
                const c = arguments[i];
                if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
              }
              return node;
            });

        const pName = projectName;
        const remoteName = LunoDeployEngine.getRemoteRepoName(pName);
        const account = LunoDeployEngine.getGithubAccount();

        const panel = targetContainer || el('div', {
          className: 'luno-deploy-subpanel',
          style: {
            background: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: '6px',
            padding: '0.75rem',
            marginTop: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            fontFamily: 'monospace'
          }
        });

        panel.innerHTML = '<div style="color:#00f2fe; font-size:0.75rem;">⚡ Checking git repository status...</div>';

        const gitInfo = await LunoDeployEngine.getProjectGitStatusLazy(pName);
        panel.innerHTML = '';

        const hasGit = Boolean(gitInfo && gitInfo.hasGit);
        const remoteUrl = (gitInfo && gitInfo.remoteUrl) || ('git@github.com:' + account + '/' + remoteName + '.git');
        const statusText = (gitInfo && gitInfo.statusText) || '';
        const uncommitted = statusText ? statusText.split('\n').filter(Boolean).length : 0;

        // Detect if repo is already created on GitHub or has remote configured
        const hasConfiguredRemote = Boolean(gitInfo && gitInfo.remoteUrl && gitInfo.remoteUrl.trim());

        const githubRepoUrl = 'https://github.com/' + account + '/' + remoteName;
        const settingsPagesUrl = 'https://github.com/' + account + '/' + remoteName + '/settings/pages';
        const liveUrl = 'https://' + account.toLowerCase() + '.github.io/' + remoteName + '/';

        const headerRow = el('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem', borderBottom: '1px solid #21262d', paddingBottom: '0.4rem' }
        },
          el('div', { style: { display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' } },
            el('strong', { style: { color: '#d2a8ff', fontSize: '0.8rem' } }, '🌐 GitHub Pages:'),
            el('a', { href: liveUrl, target: '_blank', style: { color: '#58a6ff', fontSize: '0.72rem', textDecoration: 'none' } }, 'Live Site ↗'),
            el('a', { href: githubRepoUrl, target: '_blank', style: { color: '#8b949e', fontSize: '0.72rem', textDecoration: 'none' } }, 'GitHub Repo ↗')
          ),
          el('span', {
            style: {
              fontSize: '0.68rem',
              fontWeight: 'bold',
              padding: '0.12rem 0.45rem',
              borderRadius: '8px',
              background: hasGit ? '#0d2818' : '#271052',
              color: hasGit ? '#3fb950' : '#d2a8ff',
              border: '1px solid ' + (hasGit ? '#238636' : '#8257e5')
            }
          }, hasGit ? ('Git Active (' + uncommitted + ' modified)') : '🌱 Standalone Folder')
        );

        const remoteInput = el('input', {
          type: 'text',
          value: remoteUrl,
          placeholder: 'git@github.com:' + account + '/' + remoteName + '.git',
          style: { flex: 1, minWidth: '180px', background: '#070a13', color: '#7ee787', border: '1px solid #30363d', padding: '0.35rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontFamily: 'monospace', outline: 'none' }
        });

        const commitInput = el('input', {
          type: 'text',
          value: '[' + pName + '] Checkpoint & Deploy to GitHub Pages',
          placeholder: 'Commit message...',
          style: { width: '100%', background: '#070a13', color: '#00f2fe', border: '1px solid #30363d', padding: '0.4rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }
        });

        const outputBox = el('pre', {
          style: { display: 'none', background: '#070a13', border: '1px solid #1e293b', padding: '0.5rem', borderRadius: '4px', color: '#7ee787', fontSize: '0.7rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0, maxHeight: '160px', overflowY: 'auto' }
        });

        const btnDeploy = el('button', {
          style: { flex: 1, padding: '0.5rem 0.85rem', background: '#238636', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', boxShadow: '0 2px 6px rgba(35,134,54,0.3)' },
          onclick: async function() {
            btnDeploy.disabled = true;
            btnDeploy.textContent = '🚀 Deploying...';
            outputBox.style.display = 'block';
            outputBox.style.color = '#00f2fe';
            outputBox.textContent = '⚡ Staging, committing, and deploying to GitHub Pages...';

            try {
              const targetRemote = remoteInput.value.trim();
              const res = await LunoDeployEngine.deployProjectToGitHub(pName, commitInput.value.trim(), targetRemote);
              if (res && res.success) {
                outputBox.style.color = '#7ee787';
                outputBox.textContent = (res.output || 'Deployment pushed cleanly to GitHub!') + '\n\n🌐 Live URL: ' + liveUrl;
                if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
                  ClientApp.showToast('Checkpoint & Deploy complete for [' + pName + ']!', 'success', '🚀');
                }
                LunoDeployEngine.gitStatusCache.delete(pName);
              } else {
                outputBox.style.color = '#ff7b72';
                outputBox.textContent = '❌ Deployment Error:\n' + ((res && res.error) || 'Failed to deploy');
              }
            } catch(err) {
              outputBox.style.color = '#ff7b72';
              outputBox.textContent = '❌ Exception: ' + err.message;
            } finally {
              btnDeploy.disabled = false;
              btnDeploy.textContent = '🚀 1-Tap Checkpoint & Deploy to GitHub Pages';
            }
          }
        }, '🚀 1-Tap Checkpoint & Deploy to GitHub Pages');

        const actionButtons = [btnDeploy];

        // Only show "Create Remote on GitHub" if the repository has NOT been created / linked yet
        if (!hasConfiguredRemote) {
          const btnCreateRemote = el('button', {
            style: { padding: '0.5rem 0.65rem', background: '#271052', color: '#d2a8ff', border: '1px solid #8257e5', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace' },
            title: 'Auto-create initial repository on GitHub',
            onclick: async function() {
              btnCreateRemote.disabled = true;
              btnCreateRemote.textContent = 'Creating...';
              outputBox.style.display = 'block';

              const token = LunoDeployEngine.getGithubToken();
              if (token) {
                outputBox.textContent = '⚡ Calling GitHub API to create repository [' + remoteName + '] under ' + account + '...';
                const res = await LunoDeployEngine.createRemoteRepoOnGitHub(remoteName);
                if (res.success) {
                  outputBox.style.color = '#7ee787';
                  outputBox.textContent = '✅ Created repository on GitHub: ' + (res.repoUrl || remoteName) + '\nReady to deploy!';
                  btnCreateRemote.style.display = 'none';
                  LunoDeployEngine.gitStatusCache.delete(pName);
                } else {
                  outputBox.style.color = '#ff7b72';
                  outputBox.textContent = '❌ Could not create repo via API: ' + res.error;
                  window.open('https://github.com/new?name=' + encodeURIComponent(remoteName), '_blank');
                }
              } else {
                window.open('https://github.com/new?name=' + encodeURIComponent(remoteName), '_blank');
              }

              btnCreateRemote.disabled = false;
              btnCreateRemote.textContent = '✨ Create Remote on GitHub';
            }
          }, '✨ Create Remote on GitHub');

          actionButtons.push(btnCreateRemote);
        }

        panel.appendChild(headerRow);
        panel.appendChild(el('div', { style: { display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' } },
          el('span', { style: { fontSize: '0.7rem', color: '#8b949e', fontWeight: 'bold' } }, 'Remote:'),
          remoteInput
        ));
        panel.appendChild(commitInput);
        panel.appendChild(el('div', { style: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap' } }, ...actionButtons));
        panel.appendChild(outputBox);

        return panel;
      }

  static async checkpointTargetProject(projectName, commitMsg, options) {
      var opts = options || {};
      var deployToPages = opts.deployToPages !== false;
      var pName = projectName || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');
      var msg = commitMsg || ('[' + pName + '] Checkpoint ' + new Date().toLocaleString());

      return await LunoDeployEngine.deployProjectToGitHub(pName, msg, null, { deployToPages: deployToPages });
    }
}

globalThis.LunoDeployEngine = LunoDeployEngine;
if (typeof module !== 'undefined' && module.exports) module.exports = LunoDeployEngine;