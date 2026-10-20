class LunoHistoryManager {
  constructor() {}

  static DB_NAME = 'luno_history_db_v1';
  static STORE_NAME = 'snapshots';
  static db = null;

  static async getDb() {
    if (LunoHistoryManager.db) return LunoHistoryManager.db;

    return new Promise(function(resolve, reject) {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return resolve(null);
      }
      var req = indexedDB.open(LunoHistoryManager.DB_NAME, 1);
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(LunoHistoryManager.STORE_NAME)) {
          var store = db.createObjectStore(LunoHistoryManager.STORE_NAME, { keyPath: 'id' });
          store.createIndex('project', 'project', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      req.onsuccess = function(e) {
        LunoHistoryManager.db = e.target.result;
        resolve(LunoHistoryManager.db);
      };
      req.onerror = function() {
        resolve(null);
      };
    });
  }

  static async recordChanges(fileDiffs, targetProject) {
    if (!Array.isArray(fileDiffs) || fileDiffs.length === 0) return;
    var proj = targetProject || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');
    var db = await LunoHistoryManager.getDb();
    var now = Date.now();

    var entries = fileDiffs.map(function(d, idx) {
      return {
        id: 'hist_' + now + '_' + idx + '_' + Math.floor(Math.random() * 1000),
        project: proj,
        timestamp: now,
        filePath: d.filePath,
        target: d.target || d.filePath,
        mode: d.mode || 'full-file',
        linesAdded: d.linesAdded || 0,
        linesRemoved: d.linesRemoved || 0,
        bytesBefore: d.bytesBefore || 0,
        bytesAfter: d.bytesAfter || 0,
        byteDelta: d.byteDelta || 0,
        oldContent: d.oldContent || '',
        newContent: d.newContent || ''
      };
    });

    if (db) {
      return new Promise(function(resolve) {
        try {
          var tx = db.transaction(LunoHistoryManager.STORE_NAME, 'readwrite');
          var store = tx.objectStore(LunoHistoryManager.STORE_NAME);
          entries.forEach(function(entry) { store.put(entry); });
          tx.oncomplete = function() { resolve(true); };
          tx.onerror = function() { resolve(false); };
        } catch (e) {
          resolve(false);
        }
      });
    } else {
      try {
        var existing = JSON.parse(localStorage.getItem('luno_history_fallback_' + proj) || '[]');
        var merged = existing.concat(entries).slice(-100);
        localStorage.setItem('luno_history_fallback_' + proj, JSON.stringify(merged));
      } catch (e) {}
    }
  }

  static async getAllRecords(targetProject) {
    var proj = targetProject || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');
    var db = await LunoHistoryManager.getDb();

    if (db) {
      return new Promise(function(resolve) {
        try {
          var tx = db.transaction(LunoHistoryManager.STORE_NAME, 'readonly');
          var store = tx.objectStore(LunoHistoryManager.STORE_NAME);
          var index = store.index('project');
          var req = index.getAll(proj);
          req.onsuccess = function() {
            var records = req.result || [];
            records.sort(function(a, b) { return b.timestamp - a.timestamp; });
            resolve(records);
          };
          req.onerror = function() { resolve([]); };
        } catch (e) {
          resolve([]);
        }
      });
    }

    try {
      var raw = localStorage.getItem('luno_history_fallback_' + proj);
      var list = raw ? JSON.parse(raw) : [];
      list.sort(function(a, b) { return b.timestamp - a.timestamp; });
      return list;
    } catch (e) {
      return [];
    }
  }

  static async revertRecord(recordId, targetProject) {
    var records = await LunoHistoryManager.getAllRecords(targetProject);
    var target = records.find(function(r) { return r.id === recordId; });
    if (!target) return { success: false, error: 'Record not found' };

    var restorePayload = {
      files: [{ filePath: target.filePath, content: target.oldContent, action: 'direct' }],
      serverScript: '',
      project: target.project
    };

    var result = await LunoApiClient.savePayload(restorePayload, target.project);
    return result;
  }

  static async clearHistory(targetProject) {
    var proj = targetProject || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');
    var db = await LunoHistoryManager.getDb();
    if (db) {
      return new Promise(function(resolve) {
        try {
          var tx = db.transaction(LunoHistoryManager.STORE_NAME, 'readwrite');
          var store = tx.objectStore(LunoHistoryManager.STORE_NAME);
          var index = store.index('project');
          var req = index.getAllKeys(proj);
          req.onsuccess = function() {
            (req.result || []).forEach(function(k) { store.delete(k); });
            resolve(true);
          };
          req.onerror = function() { resolve(false); };
        } catch (e) {
          resolve(false);
        }
      });
    }
    try { localStorage.removeItem('luno_history_fallback_' + proj); } catch (e) {}
    return true;
  }
}

globalThis.LunoHistoryManager = LunoHistoryManager;
if (typeof module !== 'undefined' && module.exports) module.exports = LunoHistoryManager;