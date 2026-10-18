class CompassApp {
  /**
   * Standalone Sub-Application: AccuDraw Squircle Compass Studio.
   * Isolates the squircle geometry, 3D compass ticks, and real-time morphing controls.
   */
  constructor() {
    this.app = null;
    this.compass = null;
  }

  async run(env) {
    const container = (env && env.container) || document.getElementById('app-container') || document.body;
    container.innerHTML = '';

    const wrap = makeElement('div', {
      style: {
        width: '100%', height: '100%', position: 'relative',
        display: 'flex', flexDirection: 'column', background: '#070a13'
      }
    });

    const header = makeElement('header', {
      style: {
        height: '46px', padding: '0 16px', background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid #21262d', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', zIndex: '10'
      }
    }, [
      makeElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
        makeElement('span', { style: { fontSize: '18px' } }, '🧭'),
        makeElement('strong', { style: { color: '#38bdf8', fontSize: '13px' } }, 'AccuDraw Squircle Compass Studio (Standalone App)')
      ]),
      makeElement('span', { style: { color: '#10b981', fontSize: '11px', fontWeight: 'bold' } }, 'Real-time 8-Arc Morphing')
    ]);
    wrap.appendChild(header);

    const canvasMount = makeElement('div', {
      style: { flex: 1, width: '100%', position: 'relative', overflow: 'hidden' }
    });
    wrap.appendChild(canvasMount);
    container.appendChild(wrap);

    // Initialize ThreeJSLoader
    this.app = new ThreeJSLoader(null, {
      cameraPos: { x: 0, y: 0, z: 3.5 },
      enableControls: true,
      useThickLines: true,
      lighting: true,
      environment: false
    });

    await this.app.init(canvasMount);

    const THREE = this.app.THREE;
    this.app.scene.background = new THREE.Color(0x090d16);

    const threeDView = {
      scene: this.app.scene,
      camera: this.app.camera,
      renderer: this.app.renderer,
      target: new THREE.Vector3(0, 0, 0)
    };

    // Instantiate AccuDraw Compass
    this.compass = new AccuDraw(threeDView, {
      squircleAmount: 0.45,
      center: [0, 0, 0],
      size: 1.2,
      outlineThickness: 3,
      color: 0x38bdf8
    });

    this.app.scene.add(this.compass.getObject3D());

    // Controls HUD
    const hud = makeElement('div', {
      style: {
        position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(15, 23, 42, 0.92)', border: '1.5px solid #38bdf8',
        borderRadius: '20px', padding: '8px 18px', display: 'flex', gap: '12px',
        alignItems: 'center', zIndex: '20', boxShadow: '0 8px 30px rgba(0,0,0,0.6)'
      }
    }, [
      makeElement('button', {
        className: 'dr-nav-btn',
        onclick: () => this.compass.setSquircleAnimated(0.0, 0.3)
      }, 'Square [t=0.0]'),
      makeElement('button', {
        className: 'dr-nav-btn primary',
        onclick: () => this.compass.setSquircleAnimated(0.5, 0.3)
      }, 'Squircle [t=0.5]'),
      makeElement('button', {
        className: 'dr-nav-btn',
        onclick: () => this.compass.setSquircleAnimated(1.0, 0.3)
      }, 'Circle [t=1.0]'),
      makeElement('button', {
        className: 'dr-nav-btn',
        style: { color: '#ef4444', borderColor: '#ef444466' },
        onclick: () => this.compass.setAxisAnimation('x')
      }, 'Pulse X'),
      makeElement('button', {
        className: 'dr-nav-btn',
        style: { color: '#10b981', borderColor: '#10b98166' },
        onclick: () => this.compass.setAxisAnimation('y')
      }, 'Pulse Y'),
      makeElement('button', {
        className: 'dr-nav-btn',
        onclick: () => this.compass.setAxisAnimation(null)
      }, 'Clear Locks')
    ]);

    wrap.appendChild(hud);
    return this;
  }

  destroy() {
    if (this.app) {
      this.app.destroy();
      this.app = null;
    }
  }
}

globalThis.CompassApp = CompassApp;
if (typeof module !== 'undefined' && module.exports) module.exports = CompassApp;