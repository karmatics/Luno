class KeyCommandApp {
  /**
   * Standalone Sub-Application: KeyCommandEngine Driver & Test Harness.
   * Isolates the single-stroke hierarchical shortcut engine, & syntax, and numerical range bindings.
   */
  constructor() {}

  async run(env) {
    const container = (env && env.container) || document.getElementById('app-container') || document.body;
    container.innerHTML = '';

    const wrap = makeElement('div', {
      style: {
        width: '100%', height: '100%', position: 'relative',
        display: 'flex', flexDirection: 'column', background: '#070a13', overflowY: 'auto'
      }
    });

    const header = makeElement('header', {
      style: {
        height: '46px', padding: '0 16px', background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid #21262d', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', zIndex: '10', flexShrink: 0
      }
    }, [
      makeElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
        makeElement('span', { style: { fontSize: '18px' } }, '⌨️'),
        makeElement('strong', { style: { color: '#38bdf8', fontSize: '13px' } }, 'KeyCommandEngine Sandbox & Test Harness (Standalone App)')
      ]),
      makeElement('span', { style: { color: '#10b981', fontSize: '11px', fontWeight: 'bold' } }, 'No Enter Key Required')
    ]);
    wrap.appendChild(header);

    const bodyMount = makeElement('div', {
      style: { flex: 1, padding: '20px', maxWidth: '900px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }
    });
    wrap.appendChild(bodyMount);
    container.appendChild(wrap);

    // Initialize KeyCommandInteractiveLab
    const labClass = globalThis.KeyCommandInteractiveLab || (typeof window !== 'undefined' ? window.KeyCommandInteractiveLab : null);
    if (labClass && typeof labClass.render === 'function') {
      labClass.render(bodyMount);
    } else {
      bodyMount.innerHTML = '<div style="color:#ef4444;">KeyCommandInteractiveLab class not loaded.</div>';
    }

    return this;
  }
}

globalThis.KeyCommandApp = KeyCommandApp;
if (typeof module !== 'undefined' && module.exports) module.exports = KeyCommandApp;