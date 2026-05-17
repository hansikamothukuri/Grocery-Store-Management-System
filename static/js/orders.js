/* orders.js - Order History */

let currentOrderPage = 1;
let currentDetailOrderId = null;
const debounceOrderSearch = debounce(() => { currentOrderPage = 1; loadOrders(); }, 400);

document.addEventListener('DOMContentLoaded', () => {
    // Default date range: last 30 days
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 30);
    document.getElementById('dateTo').value = today.toISOString().split('T')[0];
    document.getElementById('dateFrom').value = from.toISOString().split('T')[0];
    loadOrders();
});

async function loadOrders(page = currentOrderPage) {
    currentOrderPage = page;
    const search = document.getElementById('orderSearch').value;
    const status = document.getElementById('orderStatus').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;

    const params = new URLSearchParams({ search, page, per_page: 20 });
    if (status) params.set('status', status);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    const tbody = document.getElementById('ordersBody');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Loading...</td></tr>';

    const [ordersRes, reportRes] = await Promise.all([
        apiRequest(`/api/orders?${params}`),
        apiRequest(`/api/analytics/sales-report?${new URLSearchParams({ date_from: dateFrom, date_to: dateTo })}`)
    ]);

    // Update summary
    if (reportRes.ok) {
        const r = reportRes.data;
        document.getElementById('filteredRevenue').textContent = formatCurrency(r.total_revenue);
        document.getElementById('filteredOrders').textContent = r.total_orders;
        document.getElementById('avgOrderValue').textContent = formatCurrency(r.avg_order_value);
    }

    if (!ordersRes.ok) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Failed to load orders</td></tr>';
        return;
    }

    const { orders, total, pages } = ordersRes.data;
    document.getElementById('showingCount').textContent = `${orders.length} / ${total}`;

    if (!orders.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5"><i class="bi bi-receipt fs-3 d-block mb-2"></i>No orders found</td></tr>';
        document.getElementById('orderPagination').innerHTML = '';
        return;
    }

    tbody.innerHTML = orders.map(o => `
        <tr>
            <td><span style="font-family:monospace;font-size:12px;color:#3b82f6;font-weight:600">${o.order_number}</span></td>
            <td>
                <div style="font-weight:600">${o.customer_name || 'Walk-in'}</div>
                ${o.customer_phone ? `<div style="font-size:11px;color:#8892a4">${o.customer_phone}</div>` : ''}
            </td>
            <td><span style="font-size:12px;color:#8892a4">${o.items.length} item${o.items.length !== 1 ? 's' : ''}</span></td>
            <td style="font-weight:700;font-family:monospace">${formatCurrency(o.total_amount)}</td>
            <td>
                <span style="font-size:12px;text-transform:capitalize">
                    <i class="bi bi-${o.payment_method === 'cash' ? 'cash' : o.payment_method === 'card' ? 'credit-card' : 'phone'} me-1"></i>
                    ${o.payment_method}
                </span>
            </td>
            <td>${orderStatusBadge(o.payment_status)}</td>
            <td style="font-size:12px;color:#8892a4">${formatDateTime(o.created_at)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary btn-action" onclick="viewOrder(${o.id})">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        </tr>`).join('');

    buildPagination('orderPagination', currentOrderPage, pages, 'loadOrders');
}

async function viewOrder(id) {
    const res = await apiRequest(`/api/orders/${id}`);
    if (!res.ok) { showToast('Failed to load order', 'danger'); return; }
    const order = res.data;
    currentDetailOrderId = id;

    document.getElementById('orderDetailTitle').textContent = `Order ${order.order_number}`;

    const cancelBtn = document.getElementById('cancelOrderBtn');
    cancelBtn.style.display = order.payment_status === 'cancelled' ? 'none' : 'inline-flex';

    const itemsHTML = order.items.map(item => `
        <tr>
            <td>${item.product_name}</td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-end">${formatCurrency(item.unit_price)}</td>
            <td class="text-end" style="font-weight:700">${formatCurrency(item.total_price)}</td>
        </tr>`).join('');

    document.getElementById('orderDetailContent').innerHTML = `
        <div class="row mb-4" style="font-size:13px;">
            <div class="col-6">
                <div style="color:#8892a4;font-size:11px;text-transform:uppercase;margin-bottom:2px">Customer</div>
                <div style="font-weight:600">${order.customer_name}</div>
                ${order.customer_phone ? `<div style="color:#8892a4">${order.customer_phone}</div>` : ''}
            </div>
            <div class="col-6 text-end">
                <div style="color:#8892a4;font-size:11px;text-transform:uppercase;margin-bottom:2px">Date & Time</div>
                <div style="font-weight:600">${formatDateTime(order.created_at)}</div>
            </div>
            <div class="col-6 mt-3">
                <div style="color:#8892a4;font-size:11px;text-transform:uppercase;margin-bottom:2px">Payment</div>
                <div style="text-transform:capitalize;font-weight:600">${order.payment_method}</div>
            </div>
            <div class="col-6 text-end mt-3">
                <div style="color:#8892a4;font-size:11px;text-transform:uppercase;margin-bottom:2px">Status</div>
                ${orderStatusBadge(order.payment_status)}
            </div>
            <div class="col-12 mt-3">
                <div style="color:#8892a4;font-size:11px;text-transform:uppercase;margin-bottom:2px">Served by</div>
                <div>${order.cashier || 'System'}</div>
            </div>
        </div>
        <div class="table-responsive mb-3">
            <table class="table table-custom" style="font-size:13px;">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th class="text-center">Qty</th>
                        <th class="text-end">Price</th>
                        <th class="text-end">Total</th>
                    </tr>
                </thead>
                <tbody>${itemsHTML}</tbody>
            </table>
        </div>
        <div style="text-align:right;font-size:13px;">
            <div class="mb-1"><span style="color:#8892a4">Subtotal:</span> <strong>${formatCurrency(order.subtotal)}</strong></div>
            ${order.discount > 0 ? `<div class="mb-1"><span style="color:#8892a4">Discount:</span> <strong style="color:#ef4444">- ${formatCurrency(order.discount)}</strong></div>` : ''}
            ${order.tax > 0 ? `<div class="mb-1"><span style="color:#8892a4">Tax:</span> <strong>${formatCurrency(order.tax)}</strong></div>` : ''}
            <div style="font-size:17px;font-weight:800;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08)">
                <span style="color:#8892a4">Total:</span>
                <span style="color:#22c55e;font-family:monospace"> ${formatCurrency(order.total_amount)}</span>
            </div>
        </div>`;

    new bootstrap.Modal(document.getElementById('orderDetailModal')).show();
}

async function cancelCurrentOrder() {
    if (!currentDetailOrderId) return;
    if (!confirm('Cancel this order? Stock will be restored.')) return;
    const res = await apiRequest(`/api/orders/${currentDetailOrderId}/cancel`, { method: 'POST' });
    if (res.data.success) {
        bootstrap.Modal.getInstance(document.getElementById('orderDetailModal')).hide();
        showToast('Order cancelled and stock restored', 'success');
        loadOrders();
    } else {
        showToast(res.data.message, 'danger');
    }
}

async function printCurrentInvoice() {
    if (!currentDetailOrderId) return;
    const res = await apiRequest(`/api/orders/${currentDetailOrderId}/invoice`);
    if (!res.ok) { showToast('Failed to load invoice', 'danger'); return; }
    const order = res.data.invoice;

    const itemsHTML = order.items.map(i => `
        <tr><td>${i.product_name}</td><td style="text-align:center">${i.quantity}</td>
        <td style="text-align:right">₹${parseFloat(i.unit_price).toFixed(2)}</td>
        <td style="text-align:right">₹${parseFloat(i.total_price).toFixed(2)}</td></tr>`).join('');

    const win = window.open('', '_blank');
    win.document.write(`
        <html><head><title>Invoice ${order.order_number}</title>
        <style>
            body{font-family:Arial,sans-serif;max-width:420px;margin:30px auto;color:#000;}
            .header{text-align:center;border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:12px;}
            .store{font-size:22px;font-weight:900;color:#16a34a;}
            table{width:100%;border-collapse:collapse;font-size:13px;}
            th{border-bottom:1px solid #ccc;padding:6px 4px;font-size:11px;text-align:left;}
            td{padding:6px 4px;}
            .totals{border-top:1px solid #ccc;margin-top:10px;padding-top:10px;text-align:right;}
            .grand{font-size:18px;font-weight:900;margin-top:6px;}
            .footer{text-align:center;margin-top:20px;font-size:12px;color:#666;}
        </style></head><body>
        <div class="header"><div class="store">🛒 FreshMart</div><div style="font-size:12px;color:#666">Tax Invoice</div></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:12px;">
            <div><b>Order:</b> ${order.order_number}<br><b>Customer:</b> ${order.customer_name}</div>
            <div style="text-align:right"><b>Date:</b> ${new Date(order.created_at).toLocaleDateString('en-IN')}<br><b>Payment:</b> ${order.payment_method}</div>
        </div>
        <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${itemsHTML}</tbody></table>
        <div class="totals">
            Subtotal: ₹${parseFloat(order.subtotal).toFixed(2)}<br>
            ${order.discount > 0 ? `Discount: - ₹${parseFloat(order.discount).toFixed(2)}<br>` : ''}
            ${order.tax > 0 ? `Tax: ₹${parseFloat(order.tax).toFixed(2)}<br>` : ''}
            <div class="grand">TOTAL: ₹${parseFloat(order.total_amount).toFixed(2)}</div>
        </div>
        <div class="footer">Thank you for shopping at FreshMart!</div>
        <script>window.onload=()=>{window.print();window.close();}<\/script>
        </body></html>`);
    win.document.close();
}

function exportReport() {
    const search = document.getElementById('orderSearch').value;
    const status = document.getElementById('orderStatus').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;

    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    window.location.href = `/api/orders/export?${params.toString()}`;
}

function resetOrderFilters() {
    document.getElementById('orderSearch').value = '';
    document.getElementById('orderStatus').value = '';
    const today = new Date();
    const from = new Date(); from.setDate(today.getDate() - 30);
    document.getElementById('dateTo').value = today.toISOString().split('T')[0];
    document.getElementById('dateFrom').value = from.toISOString().split('T')[0];
    loadOrders(1);
}
