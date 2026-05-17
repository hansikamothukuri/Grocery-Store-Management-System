/* app.js - Global utilities */

// ─── Toast Notifications ──────────────────────────────────────
function showToast(message, type = 'success', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const id = 'toast_' + Date.now();
    const icons = { success: 'bi-check-circle-fill', danger: 'bi-x-circle-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };
    const colors = { success: '#22c55e', danger: '#ef4444', warning: '#f97316', info: '#3b82f6' };
    const html = `
        <div id="${id}" class="toast show align-items-center border-0" role="alert" style="background:#1a1d27; border-left: 3px solid ${colors[type] || colors.info} !important; color: #e8ecf0; min-width: 280px; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
            <div class="d-flex align-items-center p-3 gap-2">
                <i class="bi ${icons[type] || icons.info}" style="color:${colors[type]};font-size:16px;"></i>
                <div class="me-auto" style="font-size:13.5px;font-weight:500;">${message}</div>
                <button type="button" class="btn-close btn-close-white btn-sm" onclick="document.getElementById('${id}').remove()"></button>
            </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
    setTimeout(() => { const el = document.getElementById(id); if (el) { el.style.opacity = '0'; el.style.transition = 'opacity 0.4s'; setTimeout(() => el.remove(), 400); } }, duration);
}

// ─── API Helper ───────────────────────────────────────────────
async function apiRequest(url, options = {}) {
    try {
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options
        });
        const data = await res.json();
        return { ok: res.ok, status: res.status, data };
    } catch (e) {
        return { ok: false, status: 0, data: { message: 'Network error' } };
    }
}

// ─── Format Currency ──────────────────────────────────────────
function formatCurrency(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Format Date ─────────────────────────────────────────────
function formatDate(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ', ' +
           d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ─── Status Badges ────────────────────────────────────────────
function stockBadge(status) {
    const map = {
        in_stock: ['badge-in-stock', 'In Stock'],
        low_stock: ['badge-low-stock', 'Low Stock'],
        out_of_stock: ['badge-out-of-stock', 'Out of Stock'],
    };
    const [cls, label] = map[status] || ['badge-in-stock', status];
    return `<span class="badge-status ${cls}">${label}</span>`;
}
function orderStatusBadge(status) {
    const map = { paid: 'badge-paid', cancelled: 'badge-cancelled', pending: 'badge-pending' };
    return `<span class="badge-status ${map[status] || ''}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
}

// ─── Pagination Builder ───────────────────────────────────────
function buildPagination(containerId, currentPage, totalPages, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ''; return; }
    let html = `<div class="d-flex align-items-center gap-2 text-muted" style="font-size:13px;">`;
    html += `<button class="btn btn-sm btn-outline-secondary" ${currentPage <= 1 ? 'disabled' : ''} onclick="${onPageChange}(${currentPage - 1})">‹</button>`;
    for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p++) {
        html += `<button class="btn btn-sm ${p === currentPage ? 'btn-primary' : 'btn-outline-secondary'}" onclick="${onPageChange}(${p})">${p}</button>`;
    }
    html += `<button class="btn btn-sm btn-outline-secondary" ${currentPage >= totalPages ? 'disabled' : ''} onclick="${onPageChange}(${currentPage + 1})">›</button>`;
    html += `<span class="ms-2">Page ${currentPage} of ${totalPages}</span></div>`;
    container.innerHTML = html;
}

// ─── Debounce ────────────────────────────────────────────────
function debounce(fn, delay = 400) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// ─── Sidebar Toggle ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('mainContent');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                sidebar?.classList.toggle('open');
            } else {
                const collapsed = document.body.classList.toggle('sidebar-collapsed');
                if (collapsed) {
                    main.style.marginLeft = '0';
                    sidebar.style.transform = 'translateX(-100%)';
                } else {
                    main.style.marginLeft = '';
                    sidebar.style.transform = '';
                }
            }
        });
    }

    // Topbar date
    const dateEl = document.getElementById('topbarDate');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    }

    // Load low stock alert count
    loadAlertCount();
});

async function loadAlertCount() {
    const btn = document.getElementById('stockAlertBtn');
    const countEl = document.getElementById('alertCount');
    if (!btn) return;
    try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        const total = (data.low_stock_count || 0) + (data.out_of_stock_count || 0);
        if (total > 0) {
            countEl.textContent = total;
            btn.style.display = 'flex';
        }
    } catch {}
}
