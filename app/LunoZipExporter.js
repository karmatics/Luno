class LunoZipExporter {
  constructor() {}

  static crc32Table = null;

  static getCrc32Table() {
    if (LunoZipExporter.crc32Table) return LunoZipExporter.crc32Table;
    var table = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    LunoZipExporter.crc32Table = table;
    return table;
  }

  static crc32(bytes) {
    var table = LunoZipExporter.getCrc32Table();
    var crc = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) {
      crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  static createZip(filesMap) {
    var textEncoder = new TextEncoder();
    var fileRecords = [];
    var offset = 0;

    for (var rawPath in filesMap) {
      if (!Object.prototype.hasOwnProperty.call(filesMap, rawPath)) continue;
      var cleanPath = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
      var content = filesMap[rawPath] || '';
      var dataBytes = textEncoder.encode(content);
      var nameBytes = textEncoder.encode(cleanPath);
      var fileCrc = LunoZipExporter.crc32(dataBytes);

      var localHeader = new Uint8Array(30 + nameBytes.length + dataBytes.length);
      var view = new DataView(localHeader.buffer);

      view.setUint32(0, 0x04034b50, true); // Local file header signature
      view.setUint16(4, 10, true);         // Version needed: 1.0
      view.setUint16(6, 0, true);          // General purpose bit flag
      view.setUint16(8, 0, true);          // Compression method: 0 (Store)
      view.setUint16(10, 0, true);         // File mod time
      view.setUint16(12, 0, true);         // File mod date
      view.setUint32(14, fileCrc, true);   // CRC-32
      view.setUint32(18, dataBytes.length, true); // Compressed size
      view.setUint32(22, dataBytes.length, true); // Uncompressed size
      view.setUint16(26, nameBytes.length, true); // File name length
      view.setUint16(28, 0, true);         // Extra field length

      localHeader.set(nameBytes, 30);
      localHeader.set(dataBytes, 30 + nameBytes.length);

      fileRecords.push({
        nameBytes: nameBytes,
        crc: fileCrc,
        size: dataBytes.length,
        offset: offset,
        localHeader: localHeader
      });

      offset += localHeader.length;
    }

    var centralDirOffset = offset;
    var centralDirHeaders = [];
    var centralDirSize = 0;

    for (var j = 0; j < fileRecords.length; j++) {
      var r = fileRecords[j];
      var cdHeader = new Uint8Array(46 + r.nameBytes.length);
      var cdView = new DataView(cdHeader.buffer);

      cdView.setUint32(0, 0x02014b50, true); // Central directory header signature
      cdView.setUint16(4, 20, true);         // Version made by: 2.0
      cdView.setUint16(6, 10, true);         // Version needed: 1.0
      cdView.setUint16(8, 0, true);          // Bit flag
      cdView.setUint16(10, 0, true);         // Compression: 0
      cdView.setUint16(12, 0, true);         // Mod time
      cdView.setUint16(14, 0, true);         // Mod date
      cdView.setUint32(16, r.crc, true);     // CRC-32
      cdView.setUint32(20, r.size, true);    // Compressed size
      cdView.setUint32(24, r.size, true);    // Uncompressed size
      cdView.setUint16(28, r.nameBytes.length, true); // Name length
      cdView.setUint16(30, 0, true);         // Extra field length
      cdView.setUint16(32, 0, true);         // Comment length
      cdView.setUint16(34, 0, true);         // Disk number start
      cdView.setUint16(36, 0, true);         // Internal attributes
      cdView.setUint32(38, 0x81a40000, true);// External attributes (-rw-r--r--)
      cdView.setUint32(42, r.offset, true);  // Relative offset of local header

      cdHeader.set(r.nameBytes, 46);
      centralDirHeaders.push(cdHeader);
      centralDirSize += cdHeader.length;
    }

    var eocd = new Uint8Array(22);
    var eocdView = new DataView(eocd.buffer);
    eocdView.setUint32(0, 0x06054b50, true); // End of central dir signature
    eocdView.setUint16(4, 0, true);          // Number of this disk
    eocdView.setUint16(6, 0, true);          // Disk where central directory starts
    eocdView.setUint16(8, fileRecords.length, true);  // Number of central directory records on this disk
    eocdView.setUint16(10, fileRecords.length, true); // Total number of central directory records
    eocdView.setUint32(12, centralDirSize, true);     // Size of central directory
    eocdView.setUint32(16, centralDirOffset, true);   // Offset of start of central directory
    eocdView.setUint16(20, 0, true);         // ZIP comment length

    var totalBytes = centralDirOffset + centralDirSize + 22;
    var finalBuffer = new Uint8Array(totalBytes);
    var writePos = 0;

    for (var k = 0; k < fileRecords.length; k++) {
      finalBuffer.set(fileRecords[k].localHeader, writePos);
      writePos += fileRecords[k].localHeader.length;
    }
    for (var m = 0; m < centralDirHeaders.length; m++) {
      finalBuffer.set(centralDirHeaders[m], writePos);
      writePos += centralDirHeaders[m].length;
    }
    finalBuffer.set(eocd, writePos);

    return new Blob([finalBuffer], { type: 'application/zip' });
  }

  static async downloadProjectAsZip(projectName) {
    var pName = projectName || (typeof ClientApp !== 'undefined' && ClientApp.getTargetProject ? ClientApp.getTargetProject() : 'Luno');

    try {
      if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
        ClientApp.showToast('Preparing ZIP package for [' + pName + ']...', 'info', '📦');
      }

      var codeData = await LunoApiClient.fetchAllCode(pName, { includeProjectLibrary: true });
      if (!codeData || !codeData.filesMap || Object.keys(codeData.filesMap).length === 0) {
        throw new Error('No files found for project [' + pName + ']');
      }

      var exportFiles = {};
      for (var fPath in codeData.filesMap) {
        if (!Object.prototype.hasOwnProperty.call(codeData.filesMap, fPath)) continue;
        var cleanRel = fPath.replace(/\\/g, '/');
        if (cleanRel.startsWith(pName + '/')) {
          cleanRel = cleanRel.slice(pName.length + 1);
        }
        exportFiles[cleanRel] = codeData.filesMap[fPath];
      }

      var zipBlob = LunoZipExporter.createZip(exportFiles);
      var blobUrl = URL.createObjectURL(zipBlob);
      var a = document.createElement('a');
      a.href = blobUrl;
      a.download = pName + '.zip';
      document.body.appendChild(a);
      a.click();

      setTimeout(function() {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 1000);

      if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
        ClientApp.showToast('Downloaded ' + pName + '.zip (' + (zipBlob.size / 1024).toFixed(1) + ' KB)!', 'success', '💾');
      }
    } catch (err) {
      if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
        ClientApp.showToast('ZIP Export Error: ' + err.message, 'error', '❌');
      }
    }
  }

  static async downloadAllProjectsAsZip() {
      try {
        if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
          ClientApp.showToast('Preparing full workspace ZIP backup...', 'info', '📦');
        }

        var projectsData = await LunoApiClient.fetchProjectsList();
        var projects = (projectsData && projectsData.projects) || [];
        if (projects.length === 0) projects = [{ name: 'Luno' }];

        var allExportFiles = {};
        var totalFileCount = 0;

        for (var i = 0; i < projects.length; i++) {
          var p = projects[i];
          var pName = p.name;
          if (!pName) continue;

          try {
            var codeData = await LunoApiClient.fetchAllCode(pName, {
              includeProjectLibrary: false,
              includeAllLibrary: false
            });

            if (codeData && codeData.filesMap) {
              for (var fPath in codeData.filesMap) {
                if (!Object.prototype.hasOwnProperty.call(codeData.filesMap, fPath)) continue;
                var cleanPath = fPath.replace(/\\/g, '/');
                var archivePath = cleanPath;
                if (!archivePath.startsWith(pName + '/')) {
                  archivePath = pName + '/' + archivePath;
                }
                allExportFiles[archivePath] = codeData.filesMap[fPath];
                totalFileCount++;
              }
            }
          } catch (pErr) {
            console.warn('[LunoZipExporter] Skipping project ' + pName + ' in backup:', pErr.message);
          }
        }

        if (totalFileCount === 0) {
          throw new Error('No project files found to export.');
        }

        var zipBlob = LunoZipExporter.createZip(allExportFiles);
        var blobUrl = URL.createObjectURL(zipBlob);
        var a = document.createElement('a');
        a.href = blobUrl;
        a.download = 'Luno_Workspace_Backup_' + new Date().toISOString().slice(0, 10) + '.zip';
        document.body.appendChild(a);
        a.click();

        setTimeout(function() {
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        }, 1000);

        if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
          ClientApp.showToast('Downloaded workspace backup (' + totalFileCount + ' files, ' + (zipBlob.size / 1024).toFixed(1) + ' KB)!', 'success', '💾');
        }
      } catch (err) {
        if (typeof ClientApp !== 'undefined' && ClientApp.showToast) {
          ClientApp.showToast('Full Backup Error: ' + err.message, 'error', '❌');
        }
      }
  }
}

globalThis.LunoZipExporter = LunoZipExporter;
if (typeof module !== 'undefined' && module.exports) module.exports = LunoZipExporter;