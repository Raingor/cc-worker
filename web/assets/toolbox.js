/* CC 工作台 — 工具箱 */

let _toolboxActiveTab = 'pdf-to-excel';
let _mergeFiles = [];
let _splitFiles = [];
let _convertFiles = [];

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
  } else if (_toolboxActiveTab === 'pdf-merge') {
    renderPdfMerge(body);
  } else if (_toolboxActiveTab === 'pdf-split') {
    renderPdfSplit(body);
  } else if (_toolboxActiveTab === 'image-convert') {
    renderImageConvert(body);
  } else if (_toolboxActiveTab === 'image-compress') {
    renderImageCompress(body);
  } else if (_toolboxActiveTab === 'office-to-pdf') {
    renderOfficeToPdf(body);
  } else if (_toolboxActiveTab === 'pdf-compress') {
    renderPdfCompress(body);
  } else if (_toolboxActiveTab === 'ocr') {
    renderOcr(body);
  } else if (_toolboxActiveTab === 'table-extract') {
    renderTableExtract(body);
  }
}

/* ── PDF → Excel ── */
function renderPdfToExcel(container) {
  container.innerHTML = `
    <div class="tb-upload-zone" id="pte-zone">
      <div class="tb-upload-icon">📄</div>
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
      <div class="tb-upload-icon">📑</div>
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

/* ── PDF Split ── */
function renderPdfSplit(container) {
  _splitFiles = [];
  container.innerHTML = `
    <div class="tb-upload-zone" id="ps-zone">
      <div class="tb-upload-icon">✂️</div>
      <div class="tb-upload-text">点击选择或拖拽 PDF 文件</div>
      <div class="tb-upload-hint">支持 .pdf 格式</div>
    </div>
    <input type="file" id="ps-input" accept=".pdf" style="display:none">
    <div id="ps-file-info" style="display:none;margin-bottom:16px"></div>
    <div id="ps-page-info" style="margin-bottom:16px"></div>
    <div class="tb-actions">
      <button class="tb-btn tb-btn-outline" id="ps-split-all-btn" disabled>全部分割</button>
      <button class="tb-btn tb-btn-primary" id="ps-split-range-btn" disabled>按范围分割</button>
    </div>
    <div id="ps-progress" class="tb-progress" style="display:none">
      <span>正在分割…</span>
      <div class="tb-progress-bar"><div class="tb-progress-fill" id="ps-progress-fill"></div></div>
    </div>
    <div id="ps-result"></div>
  `;

  let selectedFile = null;
  const zone = document.getElementById('ps-zone');
  const input = document.getElementById('ps-input');
  const info = document.getElementById('ps-file-info');
  const pageInfo = document.getElementById('ps-page-info');
  const splitAllBtn = document.getElementById('ps-split-all-btn');
  const splitRangeBtn = document.getElementById('ps-split-range-btn');
  const progress = document.getElementById('ps-progress');
  const progressFill = document.getElementById('ps-progress-fill');
  const resultEl = document.getElementById('ps-result');

  function selectFile(file) {
    if (!file || file.type !== 'application/pdf') {
      resultEl.className = 'tb-result error';
      resultEl.textContent = '请选择 PDF 文件';
      return;
    }
    selectedFile = file;
    info.style.display = 'block';
    info.innerHTML = `<div class="tb-file-item"><span class="tb-file-icon">📄</span><span class="tb-file-name">${file.name}</span><span class="tb-file-size">${(file.size / 1024).toFixed(1)} KB</span></div>`;
    splitAllBtn.disabled = false;
    splitRangeBtn.disabled = false;
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

  splitAllBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    splitAllBtn.disabled = true;
    splitAllBtn.textContent = '处理中…';
    progress.style.display = 'block';
    resultEl.innerHTML = '';

    const fd = new FormData();
    fd.append('file', selectedFile);
    try {
      const res = await fetch(apiUrl('/v1/toolbox/pdf-split'), { method: 'POST', headers: apiHeaders(), body: fd });
      progressFill.style.width = '90%';
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `服务器错误 (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile.name.replace(/\.pdf$/i, '_split.zip');
      a.click();
      URL.revokeObjectURL(url);
      progressFill.style.width = '100%';
      resultEl.className = 'tb-result success';
      resultEl.textContent = '分割完成，已开始下载';
    } catch (e) {
      resultEl.className = 'tb-result error';
      resultEl.textContent = e.message || '分割失败';
    } finally {
      splitAllBtn.disabled = false;
      splitAllBtn.textContent = '全部分割';
      progress.style.display = 'none';
      progressFill.style.width = '0';
    }
  });
}

/* ── Image Convert ── */
function renderImageConvert(container) {
  _convertFiles = [];
  container.innerHTML = `
    <div class="tb-upload-zone" id="ic-zone">
      <div class="tb-upload-icon">🖼️</div>
      <div class="tb-upload-text">点击选择或拖拽图片文件</div>
      <div class="tb-upload-hint">支持 JPG、PNG、WebP 格式</div>
    </div>
    <input type="file" id="ic-input" accept=".jpg,.jpeg,.png,.webp" multiple style="display:none">
    <div class="tb-file-list" id="ic-file-list"></div>
    <div class="tb-actions">
      <select id="ic-format-select" class="tb-btn tb-btn-outline" style="width:auto">
        <option value="png">PNG</option>
        <option value="jpg">JPG</option>
        <option value="webp">WebP</option>
      </select>
      <button class="tb-btn tb-btn-primary" id="ic-convert-btn" disabled>转换格式</button>
    </div>
    <div id="ic-progress" class="tb-progress" style="display:none">
      <span>正在转换…</span>
      <div class="tb-progress-bar"><div class="tb-progress-fill" id="ic-progress-fill"></div></div>
    </div>
    <div id="ic-result"></div>
  `;

  const zone = document.getElementById('ic-zone');
  const input = document.getElementById('ic-input');
  const fileList = document.getElementById('ic-file-list');
  const formatSelect = document.getElementById('ic-format-select');
  const convertBtn = document.getElementById('ic-convert-btn');
  const progress = document.getElementById('ic-progress');
  const progressFill = document.getElementById('ic-progress-fill');
  const resultEl = document.getElementById('ic-result');

  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files.length) {
      _convertFiles = [...input.files];
      renderFileList();
    }
  });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      _convertFiles = [...e.dataTransfer.files];
      renderFileList();
    }
  });

  function renderFileList() {
    fileList.innerHTML = _convertFiles.map((f, i) => `
      <div class="tb-file-item">
        <span class="tb-file-icon">🖼️</span>
        <span class="tb-file-name">${f.name}</span>
        <span class="tb-file-size">${(f.size / 1024).toFixed(1)} KB</span>
        <button class="tb-file-del" data-idx="${i}">✕</button>
      </div>
    `).join('');
    convertBtn.disabled = _convertFiles.length === 0;
    fileList.querySelectorAll('.tb-file-del').forEach(b => b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.idx);
      _convertFiles.splice(idx, 1);
      renderFileList();
    }));
  }

  convertBtn.addEventListener('click', async () => {
    if (_convertFiles.length === 0) return;
    convertBtn.disabled = true;
    convertBtn.textContent = '转换中…';
    progress.style.display = 'block';
    resultEl.innerHTML = '';

    try {
      const zip = new JSZip();
      for (let i = 0; i < _convertFiles.length; i++) {
        const file = _convertFiles[i];
        const targetFormat = formatSelect.value;
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise(resolve => img.onload = resolve);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        let mimeType = `image/${targetFormat}`;
        let ext = targetFormat;
        const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, 0.9));
        zip.file(file.name.replace(/\.(jpg|jpeg|png|webp)$/i, `.${ext}`), blob);
        progressFill.style.width = `${((i + 1) / _convertFiles.length * 80 + 10).toFixed(0)}%`;
      }
      progressFill.style.width = '100%';
      zip.generateBlob().then(content => {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `converted_images.zip`;
        a.click();
        URL.revokeObjectURL(url);
        resultEl.className = 'tb-result success';
        resultEl.textContent = `转换完成！${_convertFiles.length} 个文件`;
      });
    } catch (e) {
      resultEl.className = 'tb-result error';
      resultEl.textContent = '转换失败：' + (e.message || '未知错误');
    } finally {
      convertBtn.disabled = false;
      convertBtn.textContent = '转换格式';
      progress.style.display = 'none';
      progressFill.style.width = '0';
    }
  });
}

/* ── Image Compress ── */
function renderImageCompress(container) {
  _convertFiles = [];
  container.innerHTML = `
    <div class="tb-upload-zone" id="imgc-zone">
      <div class="tb-upload-icon">🗜️</div>
      <div class="tb-upload-text">点击选择或拖拽图片文件</div>
      <div class="tb-upload-hint">支持 JPG、PNG、WebP 格式</div>
    </div>
    <input type="file" id="imgc-input" accept=".jpg,.jpeg,.png,.webp" multiple style="display:none">
    <div class="tb-file-list" id="imgc-file-list"></div>
    <div style="margin:16px 0">
      <label style="font-size:13px;color:var(--muted)">压缩质量: <span id="imgc-quality-val">80</span>%</label>
      <input type="range" id="imgc-quality" min="10" max="100" value="80" style="width:100%">
    </div>
    <div class="tb-actions">
      <button class="tb-btn tb-btn-primary" id="imgc-compress-btn" disabled>压缩图片</button>
    </div>
    <div id="imgc-progress" class="tb-progress" style="display:none">
      <span>正在压缩…</span>
      <div class="tb-progress-bar"><div class="tb-progress-fill" id="imgc-progress-fill"></div></div>
    </div>
    <div id="imgc-result"></div>
  `;

  const zone = document.getElementById('imgc-zone');
  const input = document.getElementById('imgc-input');
  const fileList = document.getElementById('imgc-file-list');
  const qualityInput = document.getElementById('imgc-quality');
  const qualityVal = document.getElementById('imgc-quality-val');
  const compressBtn = document.getElementById('imgc-compress-btn');
  const progress = document.getElementById('imgc-progress');
  const progressFill = document.getElementById('imgc-progress-fill');
  const resultEl = document.getElementById('imgc-result');
  const files = [];

  qualityInput.addEventListener('input', () => {
    qualityVal.textContent = qualityInput.value;
  });

  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files.length) {
      files.push(...Array.from(input.files));
      renderFileList();
    }
  });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      files.push(...Array.from(e.dataTransfer.files));
      renderFileList();
    }
  });

  function renderFileList() {
    fileList.innerHTML = files.map((f, i) => `
      <div class="tb-file-item">
        <span class="tb-file-icon">🖼️</span>
        <span class="tb-file-name">${f.name}</span>
        <span class="tb-file-size">${(f.size / 1024).toFixed(1)} KB</span>
        <button class="tb-file-del" data-idx="${i}">✕</button>
      </div>
    `).join('');
    compressBtn.disabled = files.length === 0;
    fileList.querySelectorAll('.tb-file-del').forEach(b => b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.idx);
      files.splice(idx, 1);
      renderFileList();
    }));
  }

  compressBtn.addEventListener('click', async () => {
    if (files.length === 0) return;
    compressBtn.disabled = true;
    compressBtn.textContent = '压缩中…';
    progress.style.display = 'block';
    resultEl.innerHTML = '';

    try {
      const zip = new JSZip();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const quality = parseInt(qualityInput.value) / 100;
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise(resolve => img.onload = resolve);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        zip.file(file.name.replace(/\.(jpg|jpeg|png|webp)$/i, '_compressed.jpg'), blob);
        progressFill.style.width = `${((i + 1) / files.length * 80 + 10).toFixed(0)}%`;
      }
      progressFill.style.width = '100%';
      zip.generateBlob().then(content => {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compressed_images.zip`;
        a.click();
        URL.revokeObjectURL(url);
        resultEl.className = 'tb-result success';
        resultEl.textContent = `压缩完成！${files.length} 个文件`;
      });
    } catch (e) {
      resultEl.className = 'tb-result error';
      resultEl.textContent = '压缩失败：' + (e.message || '未知错误');
    } finally {
      compressBtn.disabled = false;
      compressBtn.textContent = '压缩图片';
      progress.style.display = 'none';
      progressFill.style.width = '0';
    }
  });
}

/* ── Office to PDF (Server-side) ── */
function renderOfficeToPdf(container) {
  container.innerHTML = `
    <div style="padding:20px;text-align:center">
      <div class="tb-upload-icon">📊</div>
      <div class="tb-upload-text" style="font-weight:500">Excel/Word → PDF</div>
      <div class="tb-upload-hint" style="margin:12px 0">支持 .xlsx、.docx 格式</div>
      <div class="tb-result error" style="margin-top:16px">此功能需要后端支持，尚未实现</div>
    </div>
  `;
}

/* ── PDF Compress (Server-side) ── */
function renderPdfCompress(container) {
  container.innerHTML = `
    <div style="padding:20px;text-align:center">
      <div class="tb-upload-icon">🗜️</div>
      <div class="tb-upload-text" style="font-weight:500">PDF 压缩</div>
      <div class="tb-upload-hint" style="margin:12px 0">减小 PDF 文件大小</div>
      <div class="tb-result error" style="margin-top:16px">此功能需要后端支持，尚未实现</div>
    </div>
  `;
}

/* ── OCR (Server-side) ── */
function renderOcr(container) {
  container.innerHTML = `
    <div style="padding:20px;text-align:center">
      <div class="tb-upload-icon">🔍</div>
      <div class="tb-upload-text" style="font-weight:500">OCR 文字识别</div>
      <div class="tb-upload-hint" style="margin:12px 0">PDF/图片 → 可编辑文本</div>
      <div class="tb-result error" style="margin-top:16px">此功能需要后端支持，尚未实现</div>
    </div>
  `;
}

/* ── Table Extract (Server-side) ── */
function renderTableExtract(container) {
  container.innerHTML = `
    <div style="padding:20px;text-align:center">
      <div class="tb-upload-icon">📋</div>
      <div class="tb-upload-text" style="font-weight:500">表格数据提取</div>
      <div class="tb-upload-hint" style="margin:12px 0">PDF/图片 → Excel/CSV</div>
      <div class="tb-result error" style="margin-top:16px">此功能需要后端支持，尚未实现</div>
    </div>
  `;
}
