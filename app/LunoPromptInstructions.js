class LunoPromptInstructions {
  constructor() {}

  static activeModelTarget = (typeof localStorage !== 'undefined' && localStorage.getItem('luno_llm_target_flavor')) || 'universal';

  static setModelTarget(flavor) {
    LunoPromptInstructions.activeModelTarget = flavor || 'universal';
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('luno_llm_target_flavor', LunoPromptInstructions.activeModelTarget);
      }
    } catch (e) {}
  }

  static getSystemPreamble() {
    return [
      '================================================================================',
      '🌙 LUNO WORKSPACE - LLM RESPONSE PROTOCOL INSTRUCTIONS',
      '================================================================================',
      'You are collaborating with a developer using Luno Workspace, a local file-editing',
      'environment that processes your responses directly in browser client JavaScript.'
    ].join('\n');
  }

  static getEnglishSandwichRule() {
    return [
      'CRITICAL FORMATTING MANDATE (ENGLISH SANDWICH RULE):',
      '1. Always write natural English explanations BEFORE opening your markdown code fence.',
      '2. Always return your code wrapped in a SINGLE markdown code block (```html ... ```).',
      '3. Always write a concluding English summary AFTER closing the markdown code fence.',
      '4. Never return bare code blocks without conversational English before and after.'
    ].join('\n');
  }

  static getSingleCodeBlockRule() {
      return [
        'SINGLE CODE BLOCK REQUIREMENT:',
        '• All modified files, new files, and method patches MUST be contained within ONE',
        '  single html markdown code block in your response.',
        '• Do not split multiple files across separate markdown code fences.'
      ].join('\n');
    }

  static getContainerDirectivesSpec() {
        var scr = 'scr' + 'ipt';
        return [
          'HTML CONTAINER PROTOCOL DIRECTIVES & STRICT PATCH PRIORITY:',
          '• MANDATE: ALWAYS DEFAULT TO SURGICAL METHOD PATCHES for modifying code or adding new methods.',
          '  Full-file rewrites waste substantial time and tokens; only use full-file writes for BRAND NEW files',
          '  or when rewriting >80% of an entire file.',
          '',
          '• STRICT PATH ANCHORING: Every data-file attribute MUST include the full path up',
          '  to the workspace root (e.g. data-file="ProjectName/src/App.js", data-file="Luno/app/ClientApp.js",',
          '  or data-file="Library/DomBasics.js"). Never write ambiguous bare relative paths like data-file="src/App.js".',
          '',
          '• 1. Surgical ES6 Class Method Patch (INSTANCE METHOD):',
          '  <' + scr + ' data-file="ProjectName/path/to/file.js" data-method="ClassName.methodName" data-action="patch">',
          '  methodName(args) {',
          '    // Complete updated or new method code only...',
          '  }',
          '  </' + scr + '>',
          '',
          '• 2. Static & Async Methods (Include static/async directly in signature):',
          '  <' + scr + ' data-file="ProjectName/path/to/file.js" data-method="ClassName.staticMethod" data-action="patch">',
          '  static async staticMethod(args) {',
          '    // Complete static async method code...',
          '  }',
          '  </' + scr + '>',
          '',
          '• 3. Getters & Setters:',
          '  <' + scr + ' data-file="ProjectName/path/to/file.js" data-method="ClassName.propName" data-action="patch">',
          '  get propName() { return this._val; }',
          '  </' + scr + '>',
          '',
          '• 4. Multiple Patches in One Response (Group all patches in the single html code fence):',
          '  <' + scr + ' data-file="ProjectName/path/to/FileA.js" data-method="ClassA.methodOne" data-action="patch">',
          '  methodOne() { ... }',
          '  </' + scr + '>',
          '  <' + scr + ' data-file="ProjectName/path/to/FileA.js" data-method="ClassA.methodTwo" data-action="patch">',
          '  methodTwo() { ... }',
          '  </' + scr + '>',
          '',
          '• 5. Full File Write / Replacement (ONLY FOR BRAND NEW FILES):',
          '  <' + scr + ' data-file="ProjectName/path/to/NewFile.js">',
          '  // Full file source code here...',
          '  </' + scr + '>',
          '',
          '• 6. Privileged Server Script Execution (Runs in Node.js server process):',
          '  <' + scr + ' data-file="RUN: SERVER" data-action="run-server">',
          '  // Node.js code with fs, path, process, require, and LunoServer access...',
          '  const fs = require("fs");',
          '  return { success: true };',
          '  </' + scr + '>',
          '',
          '• Stylesheets (<' + 'style data-file="ProjectName/css/style.css">) and Templates (<' + 'template data-file="ProjectName/view.html">).'
        ].join('\n');
      }
  static getSyntaxSafetyRules() {
    return [
      'SYNTAX & PARSER SAFETY RULES:',
      '1. SCRIPT TAG COLLISION: Inside JS strings, never write closing script tags together.',
      '   Always concatenate or escape: "</" + "script>" or "<\\/script>".',
      '2. CLEAN ES6 EXPORTS: All classes must export to globalThis and module.exports:',
      '   globalThis.ClassName = ClassName;',
      '   if (typeof module !== "undefined" && module.exports) module.exports = ClassName;',
      '3. AVOID FRAGILE REGEX: Prefer deterministic string scanning (indexOf, slice) over',
      '   complex regular expressions for parsing operations.'
    ].join('\n');
  }

  static getAiStudioSpecificRules() {
    return [
      'GOOGLE AI STUDIO & GEMINI STREAMING RULES:',
      '• Keep method replacements surgical and modular so they stream cleanly.',
      '• Always maintain exact HTML container attribute names (data-file, data-method, data-action).',
      '• Never omit code inside surgical patches with comments like // ... keep complete methods.'
    ].join('\n');
  }

  static getClaudeSpecificRules() {
      var scr = 'scr' + 'ipt';
      return [
        'ANTHROPIC CLAUDE SPECIFIC RULES:',
        '• Always use surgical method patches (<' + scr + ' data-method="ClassName.methodName" data-action="patch">) for class edits.',
        '• Do not output artifacts or multi-block commentary inside code blocks.',
        '• Ensure all file updates are encapsulated in a single html code fence.',
        '• Maintain complete method bodies inside surgical patch containers without ellipses (// ...).'
      ].join('\n');
    }

  static getChatGptSpecificRules() {
      return [
        'OPENAI CHATGPT SPECIFIC RULES:',
        '• Prefer surgical method patches over full file rewrites for existing codebase files.',
        '• Never split multiple file updates into separate language blocks.',
        '• Place all script, style, template, and svg containers in a single html container.',
        '• Include complete, executable code without truncated helper placeholders.'
      ].join('\n');
    }

  static assembleFullInstructions(flavorOverride) {
    var flavor = flavorOverride || LunoPromptInstructions.activeModelTarget || 'universal';

    var specificRules = '';
    if (flavor === 'aistudio') {
      specificRules = LunoPromptInstructions.getAiStudioSpecificRules();
    } else if (flavor === 'claude') {
      specificRules = LunoPromptInstructions.getClaudeSpecificRules();
    } else if (flavor === 'chatgpt') {
      specificRules = LunoPromptInstructions.getChatGptSpecificRules();
    } else {
      specificRules = [
        LunoPromptInstructions.getAiStudioSpecificRules(),
        '',
        LunoPromptInstructions.getClaudeSpecificRules()
      ].join('\n');
    }

    return [
      LunoPromptInstructions.getSystemPreamble(),
      '',
      LunoPromptInstructions.getEnglishSandwichRule(),
      '',
      LunoPromptInstructions.getSingleCodeBlockRule(),
      '',
      LunoPromptInstructions.getContainerDirectivesSpec(),
      '',
      LunoPromptInstructions.getSyntaxSafetyRules(),
      '',
      specificRules,
      '================================================================================\n'
    ].join('\n');
  }

  static mountUI(container) {
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

    var currentFlavor = LunoPromptInstructions.activeModelTarget || 'universal';

    var flavorSelect = m('select', {
      id: 'luno-instruction-flavor-select',
      style: {
        background: '#0d1117',
        color: '#00f2fe',
        border: '1px solid #00f2fe',
        padding: '0.35rem 0.65rem',
        borderRadius: '6px',
        fontFamily: 'monospace',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        cursor: 'pointer'
      },
      onchange: function(e) {
        LunoPromptInstructions.setModelTarget(e.target.value);
        LunoPromptInstructions.mountUI(container);
      }
    },
      m('option', { value: 'universal', selected: currentFlavor === 'universal' }, '🌐 Universal AI Preset'),
      m('option', { value: 'aistudio', selected: currentFlavor === 'aistudio' }, '🤖 Google AI Studio & Gemini'),
      m('option', { value: 'claude', selected: currentFlavor === 'claude' }, '🧠 Anthropic Claude'),
      m('option', { value: 'chatgpt', selected: currentFlavor === 'chatgpt' }, '⚡ OpenAI ChatGPT')
    );

    var sections = [
      { id: 'preamble', title: '1. System Role Preamble', text: LunoPromptInstructions.getSystemPreamble() },
      { id: 'sandwich', title: '2. English Sandwich Rule', text: LunoPromptInstructions.getEnglishSandwichRule() },
      { id: 'codeblock', title: '3. Single Code Block Rule', text: LunoPromptInstructions.getSingleCodeBlockRule() },
      { id: 'containers', title: '4. HTML Container Directives Spec', text: LunoPromptInstructions.getContainerDirectivesSpec() },
      { id: 'syntax', title: '5. Syntax & Parser Safety Rules', text: LunoPromptInstructions.getSyntaxSafetyRules() }
    ];

    var sectionCards = sections.map(function(sec) {
      return m('div', {
        style: { background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }
      },
        m('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          m('strong', { style: { color: '#00f2fe', fontSize: '0.85rem' } }, sec.title)
        ),
        m('pre', {
          style: { background: '#070a13', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.55rem', color: '#7ee787', fontSize: '0.74rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0, maxHeight: '160px', overflowY: 'auto' },
          textContent: sec.text
        }),
        m('div', { style: { display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' } },
          m('button', {
            style: { padding: '0.25rem 0.55rem', background: '#161b22', color: '#58a6ff', border: '1px solid #0088cc', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'monospace' },
            onclick: function() {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(sec.text);
                if (typeof ClientApp !== 'undefined' && ClientApp.showToast) ClientApp.showToast('Copied rule to clipboard!', 'success', '📋');
              }
            }
          }, '📋 Copy Rule'),
          m('button', {
            style: { padding: '0.25rem 0.55rem', background: '#271052', color: '#d2a8ff', border: '1px solid #8257e5', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' },
            onclick: function() {
              if (typeof OutboxQueue !== 'undefined' && OutboxQueue.addBundle) {
                OutboxQueue.addBundle('Rule: ' + sec.title, sec.text);
                if (typeof ClientApp !== 'undefined' && ClientApp.showToast) ClientApp.showToast('Queued rule to Outbox!', 'success', '📤');
              }
            }
          }, 'Outbox ➔')
        )
      );
    });

    var masterCard = m('div', {
      style: {
        background: '#161b22',
        border: '2px solid #8257e5',
        borderRadius: '10px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        boxShadow: '0 4px 16px rgba(130,87,229,0.2)'
      }
    },
      m('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' } },
        m('div', { style: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' } },
          m('h3', { style: { color: '#d2a8ff', fontSize: '1.05rem', margin: 0 } }, '📋 Modular LLM Protocol Instruction Hub'),
          flavorSelect
        ),
        m('div', { style: { display: 'flex', gap: '0.4rem' } },
          m('button', {
            style: { padding: '0.4rem 0.75rem', background: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', fontFamily: 'monospace' },
            onclick: function() {
              var full = LunoPromptInstructions.assembleFullInstructions(currentFlavor);
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(full);
                if (typeof ClientApp !== 'undefined' && ClientApp.showToast) ClientApp.showToast('Copied Master Instructions (' + currentFlavor + ')!', 'success', '📋');
              }
            }
          }, '📋 Copy Master Prompt'),
          m('button', {
            style: { padding: '0.4rem 0.75rem', background: '#8257e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', fontFamily: 'monospace' },
            onclick: function() {
              var full = LunoPromptInstructions.assembleFullInstructions(currentFlavor);
              if (typeof OutboxQueue !== 'undefined' && OutboxQueue.addBundle) {
                OutboxQueue.addBundle('Luno Protocol Instructions (' + currentFlavor + ')', full, { priority: 'high' });
                if (typeof ClientApp !== 'undefined' && ClientApp.showToast) ClientApp.showToast('Queued Master Instructions to Outbox!', 'success', '📤');
              }
            }
          }, '📤 Send to Outbox')
        )
      ),
      m('p', { style: { fontSize: '0.78rem', color: '#8b949e', margin: 0, lineHeight: '1.4' } },
        'These modular instruction blocks teach any LLM how to format files and surgical patches using the HTML Container Protocol.'
      ),
      m('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.4rem' } }, ...sectionCards)
    );

    container.appendChild(masterCard);
  }
}

globalThis.LunoPromptInstructions = LunoPromptInstructions;
if (typeof module !== 'undefined' && module.exports) module.exports = LunoPromptInstructions;