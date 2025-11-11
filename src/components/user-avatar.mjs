// <user-avatar> — User avatar with status indicator
// Attributes:
//   - name: User name (for initials)
//   - image: Image URL
//   - size: xs, sm, md, lg, xl (default: md)
//   - status: online, offline, away, busy
//   - show-status: Show status indicator (default: false)
//   - color: Custom background color
//
// Slots:
//   - default: Custom content (overrides image/initials)

export class UserAvatar extends HTMLElement {
  static get observedAttributes() {
    return ['name', 'image', 'size', 'status', 'show-status', 'color'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  get name() { return this.getAttribute('name') || ''; }
  get image() { return this.getAttribute('image') || ''; }
  get size() { return this.getAttribute('size') || 'md'; }
  get status() { return this.getAttribute('status') || ''; }
  get showStatus() { return this.hasAttribute('show-status'); }
  get color() { return this.getAttribute('color') || ''; }

  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getColorFromName(name) {
    if (!name) return '#94a3b8';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 65%, 55%)`;
  }

  render() {
    const hasSlot = this.querySelector('[slot]') || this.textContent.trim();
    const initials = this.getInitials(this.name);
    const bgColor = this.color || this.getColorFromName(this.name);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          position: relative;
        }

        .avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          overflow: hidden;
          background: ${bgColor};
          color: white;
          font-weight: 700;
          user-select: none;
          position: relative;
        }

        .avatar.size-xs {
          width: 24px;
          height: 24px;
          font-size: 0.625rem;
        }

        .avatar.size-sm {
          width: 32px;
          height: 32px;
          font-size: 0.75rem;
        }

        .avatar.size-md {
          width: 40px;
          height: 40px;
          font-size: 0.875rem;
        }

        .avatar.size-lg {
          width: 56px;
          height: 56px;
          font-size: 1.25rem;
        }

        .avatar.size-xl {
          width: 80px;
          height: 80px;
          font-size: 1.75rem;
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .status-indicator {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 28%;
          height: 28%;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
        }

        .status-online {
          background: #10b981;
        }

        .status-offline {
          background: #94a3b8;
        }

        .status-away {
          background: #f59e0b;
        }

        .status-busy {
          background: #ef4444;
        }
      </style>

      <div class="avatar size-${this.size}">
        ${this.image ? `
          <img src="${this.image}" alt="${this.name}" class="avatar-image">
        ` : hasSlot ? `
          <slot></slot>
        ` : `
          ${initials}
        `}
        ${this.showStatus && this.status ? `
          <div class="status-indicator status-${this.status}"></div>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('user-avatar', UserAvatar);
export default UserAvatar;
