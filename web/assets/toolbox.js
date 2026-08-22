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
      <div style="display:flex;justify-content:center;margin:0 auto 10px">${randomBearImg(36, 8)}</div>
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
      <div style="display:flex;justify-content:center;margin:0 auto 10px">${randomBearImg(36, 8)}</div>
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
    <div id="ps-page-info" style="margin-bottom:12px;color:var(--muted)"></div>
    <label for="ps-range-input" style="display:block;margin-bottom:6px;font-size:13px;color:var(--muted)">分割范围（可选）</label>
    <input id="ps-range-input" type="text" placeholder="例如：1-3,5,8-10；留空表示全部分割" style="width:100%;box-sizing:border-box;margin-bottom:16px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--card);color:var(--text)">
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
  let pageCount = 0;
  const zone = document.getElementById('ps-zone');
  const input = document.getElementById('ps-input');
  const info = document.getElementById('ps-file-info');
  const pageInfo = document.getElementById('ps-page-info');
  const rangeInput = document.getElementById('ps-range-input');
  const splitAllBtn = document.getElementById('ps-split-all-btn');
  const splitRangeBtn = document.getElementById('ps-split-range-btn');
  const progress = document.getElementById('ps-progress');
  const progressFill = document.getElementById('ps-progress-fill');
  const resultEl = document.getElementById('ps-result');

  async function selectFile(file) {
    if (!file || (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name))) {
      resultEl.className = 'tb-result error';
      resultEl.textContent = '请选择 PDF 文件';
      return;
    }
    selectedFile = file;
    info.style.display = 'block';
    info.innerHTML = `<div class="tb-file-item"><span class="tb-file-icon">📄</span><span class="tb-file-name">${escapeHtml(file.name)}</span><span class="tb-file-size">${(file.size / 1024).toFixed(1)} KB</span></div>`;
    splitAllBtn.disabled = true;
    splitRangeBtn.disabled = true;
    pageInfo.textContent = '正在读取页数…';
    resultEl.innerHTML = '';
    try {
      const { PDFDocument } = PDFLib;
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      pageCount = doc.getPageCount();
      pageInfo.textContent = `共 ${pageCount} 页；范围格式：1-3,5,8-10`;
      splitAllBtn.disabled = pageCount === 0;
      splitRangeBtn.disabled = pageCount === 0;
    } catch (e) {
      pageCount = 0;
      pageInfo.textContent = '无法读取 PDF 页数，请重新选择有效的 PDF 文件';
      resultEl.className = 'tb-result error';
      resultEl.textContent = 'PDF 读取失败：' + (e.message || '文件可能已损坏或受密码保护');
    }
  }

  function showDownload(blob, filename, message) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    resultEl.className = 'tb-result success';
    resultEl.textContent = message;
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

  async function splitPdf(range, button, filenameSuffix, label) {
    if (!selectedFile || !pageCount) return;
    const rawRange = (range || '').trim();
    button.disabled = true;
    splitAllBtn.disabled = true;
    splitRangeBtn.disabled = true;
    button.textContent = '处理中…';
    progress.style.display = 'block';
    progressFill.style.width = '30%';
    resultEl.innerHTML = '';

    const fd = new FormData();
    fd.append('file', selectedFile);
    if (rawRange) fd.append('range', rawRange);
    try {
      const res = await fetch(apiUrl('/v1/toolbox/pdf-split'), { method: 'POST', headers: apiHeaders(), body: fd });
      progressFill.style.width = '90%';
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `服务器错误 (${res.status})`);
      }
      const blob = await res.blob();
      showDownload(blob, selectedFile.name.replace(/\.pdf$/i, `_${filenameSuffix}.zip`), label);
      progressFill.style.width = '100%';
    } catch (e) {
      resultEl.className = 'tb-result error';
      resultEl.textContent = e.message || '分割失败';
    } finally {
      button.disabled = false;
      button.textContent = button === splitAllBtn ? '全部分割' : '按范围分割';
      splitAllBtn.disabled = !pageCount;
      splitRangeBtn.disabled = !pageCount;
      progress.style.display = 'none';
      progressFill.style.width = '0';
    }
  }

  splitAllBtn.addEventListener('click', () => splitPdf('', splitAllBtn, 'split', '全部分割完成，已开始下载'));
  splitRangeBtn.addEventListener('click', () => {
    const rawRange = rangeInput.value.trim();
    if (!rawRange) {
      resultEl.className = 'tb-result error';
      resultEl.textContent = '请填写页码范围，例如：1-3,5';
      rangeInput.focus();
      return;
    }
    splitPdf(rawRange, splitRangeBtn, 'split_selected', '按范围分割完成，已开始下载');
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
    <div class="tb-upload-zone" id="otp-zone">
      <div class="tb-upload-icon">📊</div>
      <div class="tb-upload-text">点击选择或拖拽 Office 文件</div>
      <div class="tb-upload-hint">支持 Word、Excel、PowerPoint（.doc/.docx/.xls/.xlsx/.ppt/.pptx）</div>
    </div>
    <input type="file" id="otp-input" accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp" style="display:none">
    <div id="otp-file-info" style="display:none;margin-bottom:16px"></div>
    <div class="tb-actions">
      <button class="tb-btn tb-btn-primary" id="otp-btn" disabled>转换为 PDF</button>
    </div>
    <div id="otp-progress" class="tb-progress" style="display:none">
      <span>正在转换…</span>
      <div class="tb-progress-bar"><div class="tb-progress-fill" id="otp-progress-fill"></div></div>
    </div>
    <div id="otp-result"></div>
  `;

  let selectedFile = null;
  const zone = document.getElementById('otp-zone');
  const input = document.getElementById('otp-input');
  const info = document.getElementById('otp-file-info');
  const btn = document.getElementById('otp-btn');
  const progress = document.getElementById('otp-progress');
  const progressFill = document.getElementById('otp-progress-fill');
  const resultEl = document.getElementById('otp-result');
  const allowed = /\.(doc|docx|xls|xlsx|ppt|pptx|odt|ods|odp)$/i;

  function selectFile(file) {
    if (!file || !allowed.test(file.name)) {
      resultEl.className = 'tb-result error';
      resultEl.textContent = '请选择 Word、Excel 或 PowerPoint 文件';
      return;
    }
    selectedFile = file;
    info.style.display = 'block';
    info.innerHTML = '<div class="tb-file-item"><span class="tb-file-icon">📊</span><span class="tb-file-name">' + escapeHtml(file.name) + '</span><span class="tb-file-size">' + (file.size / 1024).toFixed(1) + ' KB</span></div>';
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
      const res = await fetch(apiUrl('/v1/toolbox/office-to-pdf'), { method: 'POST', headers: apiHeaders(), body: fd });
      progressFill.style.width = '90%';
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `服务器错误 (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile.name.replace(/\.[^.]+$/, '.pdf');
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      progressFill.style.width = '100%';
      resultEl.className = 'tb-result success';
      resultEl.textContent = '转换完成，已开始下载';
    } catch (e) {
      resultEl.className = 'tb-result error';
      resultEl.textContent = e.message || '转换失败';
    } finally {
      btn.disabled = false;
      btn.textContent = '转换为 PDF';
      progress.style.display = 'none';
      progressFill.style.width = '0';
    }
  });
}

/* ── PDF Compress (Server-side) ── */
function renderPdfCompress(container) {
  container.innerHTML = `
    <div class="tb-upload-zone" id="pc-zone">
      <div class="tb-upload-icon">🗜️</div>
      <div class="tb-upload-text">点击选择或拖拽 PDF 文件</div>
      <div class="tb-upload-hint">使用 Ghostscript 压缩 PDF，减小文件体积</div>
    </div>
    <input type="file" id="pc-input" accept=".pdf" style="display:none">
    <div id="pc-file-info" style="display:none;margin-bottom:16px"></div>
    <div class="tb-actions">
      <button class="tb-btn tb-btn-primary" id="pc-compress-btn" disabled>压缩 PDF</button>
    </div>
    <div id="pc-progress" class="tb-progress" style="display:none">
      <span>正在压缩…</span>
      <div class="tb-progress-bar"><div class="tb-progress-fill" id="pc-progress-fill"></div></div>
    </div>
    <div id="pc-result"></div>
  `;

  let selectedFile = null;
  const zone = document.getElementById('pc-zone');
  const input = document.getElementById('pc-input');
  const info = document.getElementById('pc-file-info');
  const btn = document.getElementById('pc-compress-btn');
  const progress = document.getElementById('pc-progress');
  const progressFill = document.getElementById('pc-progress-fill');
  const resultEl = document.getElementById('pc-result');

  function selectFile(file) {
    if (!file || file.type !== 'application/pdf') {
      resultEl.className = 'tb-result error';
      resultEl.textContent = '请选择 PDF 文件';
      return;
    }
    selectedFile = file;
    info.style.display = 'block';
    info.innerHTML = '<div class="tb-file-item"><span class="tb-file-icon">📄</span><span class="tb-file-name">' + file.name + '</span><span class="tb-file-size">' + (file.size / 1024).toFixed(1) + ' KB</span></div>';
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
    btn.textContent = '压缩中…';
    progress.style.display = 'block';
    progressFill.style.width = '30%';
    resultEl.innerHTML = '';

    const fd = new FormData();
    fd.append('file', selectedFile);
    try {
      const res = await fetch(apiUrl('/v1/toolbox/pdf-compress'), { method: 'POST', headers: apiHeaders(), body: fd });
      progressFill.style.width = '90%';
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || '服务器错误 (' + res.status + ')');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile.name.replace(/\.pdf$/i, '_compressed.pdf');
      a.click();
      URL.revokeObjectURL(url);
      progressFill.style.width = '100%';
      resultEl.className = 'tb-result success';
      resultEl.textContent = '压缩完成，已开始下载';
      setTimeout(() => { resultEl.innerHTML = ''; }, 4000);
    } catch (e) {
      resultEl.className = 'tb-result error';
      resultEl.textContent = e.message || '压缩失败';
    } finally {
      btn.disabled = false;
      btn.textContent = '压缩 PDF';
      progress.style.display = 'none';
      progressFill.style.width = '0';
    }
  });
}

/* ── OCR (Server-side) ── */
function renderOcr(container) {
  container.innerHTML = `
    <div class="tb-upload-zone" id="ocr-zone">
      <div class="tb-upload-icon">🔍</div>
      <div class="tb-upload-text">点击选择或拖拽 PDF/图片文件</div>
      <div class="tb-upload-hint">支持 PDF、JPG、PNG、WebP 格式，自动识别中英文</div>
    </div>
    <input type="file" id="ocr-input" accept=".pdf,.png,.jpg,.jpeg,.webp" style="display:none">
    <div id="ocr-file-info" style="display:none;margin-bottom:16px"></div>
    <div class="tb-actions">
      <button class="tb-btn tb-btn-primary" id="ocr-btn" disabled>识别文字</button>
      <button class="tb-btn tb-btn-outline" id="ocr-copy-btn" style="display:none">复制结果</button>
    </div>
    <div id="ocr-progress" class="tb-progress" style="display:none">
      <span>正在识别…</span>
      <div class="tb-progress-bar"><div class="tb-progress-fill" id="ocr-progress-fill"></div></div>
    </div>
    <div id="ocr-result"></div>
  `;

  let selectedFile = null;
  const zone = document.getElementById('ocr-zone');
  const input = document.getElementById('ocr-input');
  const info = document.getElementById('ocr-file-info');
  const btn = document.getElementById('ocr-btn');
  const copyBtn = document.getElementById('ocr-copy-btn');
  const progress = document.getElementById('ocr-progress');
  const progressFill = document.getElementById('ocr-progress-fill');
  const resultEl = document.getElementById('ocr-result');

  function selectFile(file) {
    selectedFile = file;
    info.style.display = 'block';
    info.innerHTML = '<div class="tb-file-item"><span class="tb-file-icon">📄</span><span class="tb-file-name">' + file.name + '</span><span class="tb-file-size">' + (file.size / 1024).toFixed(1) + ' KB</span></div>';
    btn.disabled = false;
    resultEl.innerHTML = '';
    copyBtn.style.display = 'none';
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
    btn.textContent = '识别中…';
    progress.style.display = 'block';
    progressFill.style.width = '30%';
    resultEl.innerHTML = '';
    copyBtn.style.display = 'none';

    const fd = new FormData();
    fd.append('file', selectedFile);
    try {
      const res = await fetch(apiUrl('/v1/toolbox/ocr'), { method: 'POST', headers: apiHeaders(), body: fd });
      progressFill.style.width = '90%';
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || '服务器错误 (' + res.status + ')');
      }
      const data = await res.json();
      progressFill.style.width = '100%';
      resultEl.className = 'tb-result success';
      const text = data.text || '(未识别到文字)';
      resultEl.innerHTML = '<pre style="white-space:pre-wrap;word-break:break-word;background:#f5f5f5;padding:16px;border-radius:8px;font-size:14px;line-height:1.6;max-height:400px;overflow-y:auto;text-align:left">' + escapeHtml(text) + '</pre>';
      copyBtn.style.display = 'inline-flex';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = '已复制';
          setTimeout(() => { copyBtn.textContent = '复制结果'; }, 2000);
        });
      };
    } catch (e) {
      resultEl.className = 'tb-result error';
      resultEl.textContent = e.message || '识别失败';
    } finally {
      btn.disabled = false;
      btn.textContent = '识别文字';
      progress.style.display = 'none';
      progressFill.style.width = '0';
    }
  });
}

/* ── Table Extract (Server-side) ── */
function renderTableExtract(container) {
  container.innerHTML = `
    <div class="tb-upload-zone" id="te-zone">
      <div class="tb-upload-icon">📋</div>
      <div class="tb-upload-text">点击选择或拖拽 PDF 文件</div>
      <div class="tb-upload-hint">提取 PDF 中的表格数据，导出为 Excel</div>
    </div>
    <input type="file" id="te-input" accept=".pdf" style="display:none">
    <div id="te-file-info" style="display:none;margin-bottom:16px"></div>
    <div class="tb-actions">
      <button class="tb-btn tb-btn-primary" id="te-btn" disabled>提取表格</button>
    </div>
    <div id="te-progress" class="tb-progress" style="display:none">
      <span>正在提取…</span>
      <div class="tb-progress-bar"><div class="tb-progress-fill" id="te-progress-fill"></div></div>
    </div>
    <div id="te-result"></div>
  `;

  let selectedFile = null;
  const zone = document.getElementById('te-zone');
  const input = document.getElementById('te-input');
  const info = document.getElementById('te-file-info');
  const btn = document.getElementById('te-btn');
  const progress = document.getElementById('te-progress');
  const progressFill = document.getElementById('te-progress-fill');
  const resultEl = document.getElementById('te-result');

  function selectFile(file) {
    if (!file || file.type !== 'application/pdf') {
      resultEl.className = 'tb-result error';
      resultEl.textContent = '请选择 PDF 文件';
      return;
    }
    selectedFile = file;
    info.style.display = 'block';
    info.innerHTML = '<div class="tb-file-item"><span class="tb-file-icon">📄</span><span class="tb-file-name">' + file.name + '</span><span class="tb-file-size">' + (file.size / 1024).toFixed(1) + ' KB</span></div>';
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
    btn.textContent = '提取中…';
    progress.style.display = 'block';
    progressFill.style.width = '30%';
    resultEl.innerHTML = '';

    const fd = new FormData();
    fd.append('file', selectedFile);
    try {
      const res = await fetch(apiUrl('/v1/toolbox/table-extract'), { method: 'POST', headers: apiHeaders(), body: fd });
      progressFill.style.width = '90%';
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || '服务器错误 (' + res.status + ')');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile.name.replace(/\.pdf$/i, '_tables.xlsx');
      a.click();
      URL.revokeObjectURL(url);
      progressFill.style.width = '100%';
      resultEl.className = 'tb-result success';
      resultEl.textContent = '提取完成，已开始下载';
      setTimeout(() => { resultEl.innerHTML = ''; }, 4000);
    } catch (e) {
      resultEl.className = 'tb-result error';
      resultEl.textContent = e.message || '提取失败';
    } finally {
      btn.disabled = false;
      btn.textContent = '提取表格';
      progress.style.display = 'none';
      progressFill.style.width = '0';
    }
  });
}
