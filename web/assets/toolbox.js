/* CC 工作台 — 工具箱 */

let _toolboxActiveTab = 'pdf-to-excel';
let _mergeFiles = [];

function switchToolboxTab(name) {
  _toolboxActiveTab = name;
  renderActiveTool();
}

function renderToolbox() {
  renderActiveTool();
}

function renderActiveTool() {
  const body = document.getElementById('toolbox-body');
  if (_toolboxActiveTab === 'pdf-to-excel') {
    renderPdfToExcel(body);
  } else {
    renderPdfMerge(body);
  }
}

/* ── PDF → Excel ── */
function renderPdfToExcel(container) {
  container.innerHTML = `
    <div class="tb-upload-zone" id="pte-zone">
      <svg class="tb-upload-icon" viewBox="0 0 40 40" width="36" height="36" style="display:block;margin:0 auto 10px">
        <ellipse cx="13.5" cy="7" rx="4.5" ry="4" fill="var(--hairline)"/><ellipse cx="26.5" cy="7" rx="4.5" ry="4" fill="var(--hairline)"/>
        <ellipse cx="20" cy="23" rx="13" ry="12" fill="var(--charcoal)"/>
        <circle cx="15" cy="20" r="1.5" fill="var(--surface)"/><circle cx="25" cy="20" r="1.5" fill="var(--surface)"/>
        <ellipse cx="20" cy="23.5" rx="1.2" ry="1" fill="rgba(255,255,255,.3)"/>
        <path d="M17 27 Q20 30 23 27" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1" stroke-linecap="round"/>
        <ellipse cx="14.5" cy="25" rx="2" ry="1" fill="rgba(255,255,255,.06)"/><ellipse cx="25.5" cy="25" rx="2" ry="1" fill="rgba(255,255,255,.06)"/>
      </svg>
      <div class="tb-upload-text">点击选择或拖拽 PDF 文件</div>
      <div class="tb-upload-hint">支持 .pdf 格式</div>
    </div>
    <input type="file" id="pte-input" accept=".pdf" style="display:none">
    <div id="pte-file-info" style="display:none;margin-bottom:16px"></div>
    <div class="tb-actions">
      <button class="tb-btn tb-btn-primary" id="pte-convert-btn" disabled>转换为 Excel</button>
    </div>
    <div id="pte-progress" class="tb-progress" style="display:none">
      <span>正在处理…</span>
      <div class="tb-progress-bar"><div class="tb-progress-fill" id="pte-progress-fill"></div></div>
    </div>
    <div id="pte-result"></div>
  `;

  let selectedFile = null;
  const zone = document.getElementById('pte-zone');
  const input = document.getElementById('pte-input');
  const info = document.getElementById('pte-file-info');
  const btn = document.getElementById('pte-convert-btn');
  const progress = document.getElementById('pte-progress');
  const progressFill = document.getElementById('pte-progress-fill');
  const resultEl = document.getElementById('pte-result');

  function selectFile(file) {
    if (!file || file.type !== 'application/pdf') {
      resultEl.className = 'tb-result error';
      resultEl.textContent = '请选择 PDF 文件';
      return;
    }
    selectedFile = file;
    info.style.display = 'block';
    info.innerHTML = `<div class="tb-file-item"><span class="tb-file-icon">📄</span><span class="tb-file-name">${file.name}</span><span class="tb-file-size">${(file.size / 1024).toFixed(1)} KB</span></div>`;
    btn.disabled = false;
    resultEl.innerHTML = '';
  }

  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { if (input.files[0]) selectFile(input.files[0]); });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) selectFile(e.dataTransfer.files[0]);
  });

  btn.addEventListener('click', async () => {
    if (!selectedFile) return;
    btn.disabled = true;
    btn.textContent = '转换中…';
    progress.style.display = 'block';
    progressFill.style.width = '30%';
    resultEl.innerHTML = '';

    const fd = new FormData();
    fd.append('file', selectedFile);
    try {
      const res = await fetch(apiUrl('/v1/toolbox/pdf-to-excel'), { method: 'POST', headers: apiHeaders(), body: fd });
      progressFill.style.width = '90%';
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `服务器错误 (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile.name.replace(/\.pdf$/i, '.xlsx');
      a.click();
      URL.revokeObjectURL(url);
      progressFill.style.width = '100%';
      resultEl.className = 'tb-result success';
      resultEl.textContent = '转换完成，已开始下载';
      setTimeout(() => { resultEl.innerHTML = ''; }, 4000);
    } catch (e) {
      resultEl.className = 'tb-result error';
      resultEl.textContent = e.message || '转换失败';
    } finally {
      btn.disabled = false;
      btn.textContent = '转换为 Excel';
      progress.style.display = 'none';
      progressFill.style.width = '0';
    }
  });
}

/* ── PDF Merge ── */
function renderPdfMerge(container) {
  _mergeFiles = [];
  container.innerHTML = `
    <div class="tb-upload-zone" id="pm-zone">
      <svg class="tb-upload-icon" viewBox="0 0 40 40" width="36" height="36" style="display:block;margin:0 auto 10px">
        <ellipse cx="13.5" cy="7" rx="4.5" ry="4" fill="var(--hairline)"/><ellipse cx="26.5" cy="7" rx="4.5" ry="4" fill="var(--hairline)"/>
        <ellipse cx="20" cy="23" rx="13" ry="12" fill="var(--charcoal)"/>
        <path d="M14 18 L20 14 L26 18 L20 22 Z" fill="var(--surface)" opacity=".5"/>
        <circle cx="15" cy="20" r="1.5" fill="var(--surface)"/><circle cx="25" cy="20" r="1.5" fill="var(--surface)"/>
        <path d="M17 27 Q20 30 23 27" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1" stroke-linecap="round"/>
        <ellipse cx="14.5" cy="25" rx="2" ry="1" fill="rgba(255,255,255,.06)"/><ellipse cx="25.5" cy="25" rx="2" ry="1" fill="rgba(255,255,255,.06)"/>
      </svg>
      <div class="tb-upload-text">点击选择或拖拽多个 PDF 文件</div>
      <div class="tb-upload-hint">支持选择多个文件，按列表顺序合并</div>
    </div>
    <input type="file" id="pm-input" accept=".pdf" multiple style="display:none">
    <div class="tb-file-list" id="pm-file-list"></div>
    <div class="tb-actions">
      <button class="tb-btn tb-btn-primary" id="pm-merge-btn" disabled>合并 PDF</button>
      <button class="tb-btn tb-btn-outline" id="pm-clear-btn" style="display:none">清空列表</button>
    </div>
    <div id="pm-progress" class="tb-progress" style="display:none">
      <span>正在合并…</span>
      <div class="tb-progress-bar"><div class="tb-progress-fill" id="pm-progress-fill"></div></div>
    </div>
    <div id="pm-result"></div>
  `;

  const zone = document.getElementById('pm-zone');
  const input = document.getElementById('pm-input');
  const fileList = document.getElementById('pm-file-list');
  const mergeBtn = document.getElementById('pm-merge-btn');
  const clearBtn = document.getElementById('pm-clear-btn');
  const progress = document.getElementById('pm-progress');
  const progressFill = document.getElementById('pm-progress-fill');
  const resultEl = document.getElementById('pm-result');

  function renderFileList() {
    if (_mergeFiles.length === 0) {
      fileList.innerHTML = '';
      mergeBtn.disabled = true;
      clearBtn.style.display = 'none';
      return;
    }
    mergeBtn.disabled = false;
    clearBtn.style.display = 'inline-flex';
    fileList.innerHTML = _mergeFiles.map((f, i) => `
      <div class="tb-file-item">
        <span class="tb-file-icon">📄</span>
        <button class="tb-file-move" data-idx="${i}" data-dir="up" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="tb-file-move" data-idx="${i}" data-dir="down" ${i === _mergeFiles.length - 1 ? 'disabled' : ''}>↓</button>
        <span class="tb-file-name">${f.name}</span>
        <span class="tb-file-size">${(f.size / 1024).toFixed(1)} KB</span>
        <button class="tb-file-del" data-idx="${i}">✕</button>
      </div>
    `).join('');

    fileList.querySelectorAll('.tb-file-del').forEach(b => b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.idx);
      _mergeFiles.splice(idx, 1);
      renderFileList();
    }));
    fileList.querySelectorAll('.tb-file-move').forEach(b => b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.idx);
      const dir = b.dataset.dir;
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= _mergeFiles.length) return;
      [_mergeFiles[idx], _mergeFiles[swap]] = [_mergeFiles[swap], _mergeFiles[idx]];
      renderFileList();
    }));
  }

  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files.length) {
      _mergeFiles.push(...Array.from(input.files));
      renderFileList();
    }
  });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      const pdfs = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      if (pdfs.length === 0) {
        resultEl.className = 'tb-result error';
        resultEl.textContent = '请拖拽 PDF 文件';
        return;
      }
      _mergeFiles.push(...pdfs);
      renderFileList();
    }
  });

  clearBtn.addEventListener('click', () => {
    _mergeFiles = [];
    renderFileList();
  });

  mergeBtn.addEventListener('click', async () => {
    if (_mergeFiles.length < 2) {
      resultEl.className = 'tb-result error';
      resultEl.textContent = '请至少选择 2 个 PDF 文件';
      return;
    }
    mergeBtn.disabled = true;
    mergeBtn.textContent = '合并中…';
    progress.style.display = 'block';
    progressFill.style.width = '0%';
    resultEl.innerHTML = '';

    try {
      const { PDFDocument } = PDFLib;
      const merged = await PDFDocument.create();
      for (let i = 0; i < _mergeFiles.length; i++) {
        const buf = await _mergeFiles[i].arrayBuffer();
        const doc = await PDFDocument.load(buf);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => merged.addPage(p));
        progressFill.style.width = `${((i + 1) / _mergeFiles.length * 80 + 10).toFixed(0)}%`;
      }
      const pdfBytes = await merged.save();
      progressFill.style.width = '100%';

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '合并文档.pdf';
      a.click();
      URL.revokeObjectURL(url);

      resultEl.className = 'tb-result success';
      resultEl.textContent = `合并完成！共 ${_mergeFiles.length} 个文件，${merged.getPageCount()} 页`;
    } catch (e) {
      resultEl.className = 'tb-result error';
      resultEl.textContent = '合并失败：' + (e.message || '未知错误');
    } finally {
      mergeBtn.disabled = false;
      mergeBtn.textContent = '合并 PDF';
      progress.style.display = 'none';
      progressFill.style.width = '0';
    }
  });
}
