class InboxActionTimer {
  constructor() {}

  static activeTimer = null;
  static defaultDuration = parseInt(localStorage.getItem('luno_timer_duration') || '3500', 10);

  static startTimer(payloadText, onExecute) {
    if (InboxActionTimer.activeTimer) {
      InboxActionTimer.activeTimer.stop();
      InboxActionTimer.activeTimer = null;
    }

    const container = document.getElementById('inbox-timer-container') || InboxActionTimer.createContainer();
    container.innerHTML = '';
    container.style.display = 'flex';

    const duration = InboxActionTimer.defaultDuration;

    const clock = new SvgCountdownClock({
      size: 26,
      strokeWidth: 3,
      durationMs: duration,
      onComplete: () => {
        container.style.display = 'none';
        InboxActionTimer.activeTimer = null;
        if (onExecute) onExecute();
      },
      onPause: () => {
        if (typeof DiffApprovalModal !== 'undefined') {
          DiffApprovalModal.open({
            payloadText,
            onConfirm: () => {
              container.style.display = 'none';
              if (onExecute) onExecute();
            },
            onCancel: () => {
              container.style.display = 'none';
              if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
                ClientApp.showToast('Execution paused & cancelled.', 'info', '⏸️');
              }
            }
          });
        }
      }
    });

    InboxActionTimer.activeTimer = clock;

    const banner = document.createElement('div');
    banner.style.cssText = 'display:flex; align-items:center; justify-content:space-between; width:100%; background:#0d2818; border:1px solid #238636; padding:0.5rem 0.75rem; border-radius:8px; cursor:pointer; font-size:0.78rem; color:#3fb950; margin-top:0.5rem; box-sizing:border-box; flex-wrap:wrap; gap:0.4rem;';

    const info = document.createElement('div');
    info.style.cssText = 'display:flex; align-items:center; gap:0.55rem;';
    info.appendChild(clock.element);

    const textSpan = document.createElement('span');
    textSpan.innerHTML = `<strong>Applying payload...</strong> (Tap to Pause & Inspect Diffs)`;
    info.appendChild(textSpan);

    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex; gap:0.4rem; align-items:center;';

    const btnSpeed = document.createElement('button');
    btnSpeed.style.cssText = 'background:#161b22; color:#58a6ff; border:1px solid #30363d; border-radius:4px; padding:0.2rem 0.45rem; font-size:0.7rem; cursor:pointer; font-family:monospace; font-weight:bold;';
    btnSpeed.textContent = `⏱️ ${(duration / 1000).toFixed(1)}s`;
    btnSpeed.title = 'Change safety countdown buffer duration';
    btnSpeed.onclick = (e) => {
      e.stopPropagation();
      clock.pause();
      const next = duration === 3500 ? 1500 : (duration === 1500 ? 800 : 3500);
      InboxActionTimer.defaultDuration = next;
      localStorage.setItem('luno_timer_duration', String(next));
      if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
        ClientApp.showToast(`Countdown buffer set to ${(next / 1000).toFixed(1)}s`, 'info', '⏱️');
      }
      InboxActionTimer.startTimer(payloadText, onExecute);
    };

    controls.appendChild(btnSpeed);
    banner.appendChild(info);
    banner.appendChild(controls);

    banner.onclick = () => clock.pause();

    container.appendChild(banner);
    clock.start();
  }

  static createContainer() {
    const parent = document.getElementById('inbox-card-content') || document.body;
    let container = document.getElementById('inbox-timer-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'inbox-timer-container';
      parent.appendChild(container);
    }
    return container;
  }

  static showUndoBanner(payloadText, modifiedCount) {
    const parent = document.getElementById('inbox-card-content') || document.body;
    let container = document.getElementById('inbox-timer-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'inbox-timer-container';
      parent.appendChild(container);
    }
    container.innerHTML = '';
    container.style.display = 'flex';

    const banner = document.createElement('div');
    banner.style.cssText = 'display:flex; align-items:center; justify-content:space-between; width:100%; background:#0d2818; border:1px solid #238636; padding:0.55rem 0.75rem; border-radius:8px; font-size:0.78rem; color:#3fb950; margin-top:0.5rem; font-family:monospace; box-sizing:border-box; flex-wrap:wrap; gap:0.4rem;';

    const info = document.createElement('div');
    info.style.cssText = 'display:flex; align-items:center; gap:0.55rem;';
    info.innerHTML = `<span>✅ <strong>Applied ${modifiedCount || 1} file change(s)!</strong></span>`;

    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex; gap:0.35rem;';

    const btnDiff = document.createElement('button');
    btnDiff.style.cssText = 'background:#161b22; color:#00f2fe; border:1px solid #00f2fe; border-radius:6px; padding:0.3rem 0.55rem; font-size:0.72rem; cursor:pointer; font-family:monospace; font-weight:bold;';
    btnDiff.textContent = '🔍 Inspect Diffs';
    btnDiff.onclick = (e) => {
      e.stopPropagation();
      if (typeof DiffApprovalModal !== 'undefined') {
        DiffApprovalModal.open({
          payloadText: payloadText,
          onConfirm: () => {
            if (typeof ClientApp !== 'undefined' && ClientApp.showToast) ClientApp.showToast('Diffs inspected.', 'info');
          },
          onCancel: () => {
            if (typeof ClientApp !== 'undefined' && ClientApp.showToast) ClientApp.showToast('Diff inspection closed.', 'info');
          }
        });
      }
    };

    btnGroup.appendChild(btnDiff);
    banner.appendChild(info);
    banner.appendChild(btnGroup);
    container.appendChild(banner);

    setTimeout(() => {
      if (banner.parentNode) {
        banner.style.transition = 'opacity 0.5s ease-out';
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 500);
      }
    }, 8000);
  }

  static get defaultDuration() {
      try {
        if (typeof localStorage !== 'undefined') {
          var val = parseInt(localStorage.getItem('luno_timer_duration') || '3500', 10);
          return isNaN(val) ? 3500 : val;
        }
      } catch (e) {}
      return 3500;
  }
}

globalThis.InboxActionTimer = InboxActionTimer;
if (typeof module !== "undefined" && module.exports) module.exports = InboxActionTimer;