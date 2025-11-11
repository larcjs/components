// <file-upload> — File upload with preview and PAN integration
// Attributes:
//   - accept: File type filter (e.g., "image/*", ".pdf,.doc")
//   - multiple: Allow multiple files
//   - max-size: Maximum file size in bytes
//   - topic: Topic prefix for events
//   - preview: Show image preview (default: true for images)
//   - drag-drop: Enable drag-and-drop (default: true)
//
// Topics:
//   - Publishes: {topic}.upload { files: FileList, data: Array<{name, size, type, dataUrl?}> }
//   - Publishes: {topic}.remove { index }
//   - Publishes: {topic}.error { error, file }

import { PanClient } from './pan-client.mjs';

export class FileUpload extends HTMLElement {
  static get observedAttributes() {
    return ['accept', 'multiple', 'max-size', 'topic', 'preview', 'drag-drop'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.pc = new PanClient(this);
    this.files = [];
  }

  connectedCallback() {
    this.render();
    this.setupEvents();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  get accept() { return this.getAttribute('accept') || ''; }
  get multiple() { return this.hasAttribute('multiple'); }
  get maxSize() { return parseInt(this.getAttribute('max-size')) || Infinity; }
  get topic() { return this.getAttribute('topic') || 'upload'; }
  get preview() { return this.getAttribute('preview') !== 'false'; }
  get dragDrop() { return this.getAttribute('drag-drop') !== 'false'; }

  setupEvents() {
    const input = this.shadowRoot.querySelector('.file-input');
    const dropZone = this.shadowRoot.querySelector('.drop-zone');
    const browseBtn = this.shadowRoot.querySelector('.browse-btn');

    if (input) {
      input.addEventListener('change', (e) => this.handleFiles(e.target.files));
    }

    if (browseBtn) {
      browseBtn.addEventListener('click', () => input?.click());
    }

    if (dropZone && this.dragDrop) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
          dropZone.classList.add('drag-over');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
          dropZone.classList.remove('drag-over');
        });
      });

      dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        this.handleFiles(files);
      });
    }
  }

  async handleFiles(fileList) {
    const filesArray = Array.from(fileList);

    // Validate files
    for (const file of filesArray) {
      if (file.size > this.maxSize) {
        this.publishError(`File ${file.name} exceeds maximum size`, file);
        continue;
      }

      // Read file data
      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      };

      // Add preview for images
      if (this.preview && file.type.startsWith('image/')) {
        fileData.dataUrl = await this.readFileAsDataURL(file);
      }

      this.files.push({ file, data: fileData });
    }

    this.renderFileList();

    // Publish upload event
    this.pc.publish({
      topic: `${this.topic}.upload`,
      data: {
        files: filesArray,
        data: this.files.map(f => f.data)
      }
    });
  }

  readFileAsDataURL(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  removeFile(index) {
    this.files.splice(index, 1);
    this.renderFileList();

    this.pc.publish({
      topic: `${this.topic}.remove`,
      data: { index }
    });
  }

  publishError(error, file) {
    this.pc.publish({
      topic: `${this.topic}.error`,
      data: { error, file: file ? { name: file.name, size: file.size, type: file.type } : null }
    });
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  renderFileList() {
    const fileList = this.shadowRoot.querySelector('.file-list');
    if (!fileList) return;

    if (this.files.length === 0) {
      fileList.innerHTML = '';
      return;
    }

    fileList.innerHTML = this.files.map((item, index) => {
      const { data } = item;
      const isImage = data.type.startsWith('image/');

      return `
        <div class="file-item">
          ${isImage && data.dataUrl ? `
            <div class="file-preview">
              <img src="${data.dataUrl}" alt="${data.name}">
            </div>
          ` : `
            <div class="file-icon">📄</div>
          `}
          <div class="file-info">
            <div class="file-name">${data.name}</div>
            <div class="file-size">${this.formatFileSize(data.size)}</div>
          </div>
          <button class="remove-btn" data-index="${index}">✕</button>
        </div>
      `;
    }).join('');

    // Add remove event listeners
    fileList.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        this.removeFile(index);
      });
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .upload-container {
          width: 100%;
        }

        .drop-zone {
          border: 2px dashed var(--upload-border, #cbd5e1);
          border-radius: 0.75rem;
          padding: 2rem;
          text-align: center;
          background: var(--upload-bg, #f8fafc);
          transition: all 0.2s;
          cursor: pointer;
        }

        .drop-zone:hover {
          border-color: var(--upload-hover-border, #6366f1);
          background: var(--upload-hover-bg, #f1f5f9);
        }

        .drop-zone.drag-over {
          border-color: var(--upload-active-border, #6366f1);
          background: var(--upload-active-bg, #eef2ff);
        }

        .drop-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .drop-text {
          font-size: 1rem;
          color: var(--upload-text, #64748b);
          margin-bottom: 0.5rem;
        }

        .drop-hint {
          font-size: 0.875rem;
          color: var(--upload-hint, #94a3b8);
        }

        .browse-btn {
          margin-top: 1rem;
          padding: 0.625rem 1.25rem;
          background: var(--upload-btn-bg, #6366f1);
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-family: inherit;
          font-weight: 600;
          transition: all 0.2s;
        }

        .browse-btn:hover {
          background: var(--upload-btn-hover, #4f46e5);
        }

        .file-input {
          display: none;
        }

        .file-list {
          margin-top: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: var(--upload-item-bg, #ffffff);
          border: 1px solid var(--upload-item-border, #e2e8f0);
          border-radius: 0.5rem;
        }

        .file-preview {
          width: 60px;
          height: 60px;
          border-radius: 0.375rem;
          overflow: hidden;
          flex-shrink: 0;
        }

        .file-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .file-icon {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          background: var(--upload-icon-bg, #f1f5f9);
          border-radius: 0.375rem;
          flex-shrink: 0;
        }

        .file-info {
          flex: 1;
          min-width: 0;
        }

        .file-name {
          font-weight: 500;
          color: var(--upload-file-name, #1e293b);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-size {
          font-size: 0.875rem;
          color: var(--upload-file-size, #64748b);
        }

        .remove-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: var(--upload-remove-bg, #fee2e2);
          color: var(--upload-remove-color, #ef4444);
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 1.125rem;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .remove-btn:hover {
          background: var(--upload-remove-hover, #fecaca);
        }
      </style>

      <div class="upload-container">
        <div class="drop-zone">
          <div class="drop-icon">📁</div>
          <div class="drop-text">
            ${this.dragDrop ? 'Drag and drop files here' : 'Click to upload files'}
          </div>
          <div class="drop-hint">
            ${this.accept ? `Accepts: ${this.accept}` : 'Any file type'}
            ${this.maxSize !== Infinity ? ` • Max: ${this.formatFileSize(this.maxSize)}` : ''}
          </div>
          <button class="browse-btn">Browse Files</button>
        </div>

        <input
          type="file"
          class="file-input"
          ${this.accept ? `accept="${this.accept}"` : ''}
          ${this.multiple ? 'multiple' : ''}
        >

        <div class="file-list"></div>
      </div>
    `;

    // Re-setup events after render
    if (this.isConnected) {
      setTimeout(() => {
        this.setupEvents();
        this.renderFileList();
      }, 0);
    }
  }
}

customElements.define('file-upload', FileUpload);
export default FileUpload;
