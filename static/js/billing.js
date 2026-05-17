/* billing.js - POS / Billing System */

let cart = [];
let allProducts = [];
let currentOrderId = null;
const debouncePosSearch = debounce(() => loadPosProducts(), 350);

document.addEventListener('DOMContentLoaded', () => {
    loadPosCategories();
    loadPosProducts();
});

// ─── Load Categories ──────────────────────────────────────────
async function loadPosCategories() {
    const res = await apiRequest('/api/categories');
    if (!res.ok) return;
    const sel = document.getElementById('posCategoryFilter');
    sel.innerHTML = '<option value="">All Categories</option>' +
        res.data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// ─── Load Products Grid ───────────────────────────────────────
async function loadPosProducts() {
    const search = document.getElementById('posSearch').value;
    const categoryId = document.getElementById('posCategoryFilter').value;
    const params = new URLSearchParams({ search, per_page: 60, status: 'active' });
    if (categoryId) params.set('category_id', categoryId);

    const res = await apiRequest(`/api/products?${params}`);
    const grid = document.getElementById('posProductGrid');
    if (!res.ok) { grid.innerHTML = '<div class="text-center text-danger py-4">Failed to load</div>'; return; }

    const products = res.data.products;
    allProducts = products;

    if (!products.length) {
        grid.innerHTML = '<div class="text-center text-muted py-5"><i class="bi bi-search fs-3 d-block mb-2"></i>No products found</div>';
        return;
    }

    grid.innerHTML = products.map(p => `
        <div class="product-tile ${p.stock_status === 'out_of_stock' ? 'out-of-stock' : ''}"
             onclick="${p.stock_status !== 'out_of_stock' ? `addToCart(${p.id})` : ''}">
            <div class="product-tile-cat">${p.category_name}</div>
            <div class="product-tile-name">${p.name}</div>
            <div class="product-tile-price">${formatCurrency(p.price)}</div>
            <div class="product-tile-stock">
                ${p.stock_status === 'out_of_stock'
                    ? '<span style="color:#ef4444">Out of Stock</span>'
                    : `Stock: ${p.stock_quantity}`}
            </div>
        </div>`).join('');
}

// ─── Cart Logic ───────────────────────────────────────────────
function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(i => i.product_id === productId);
    if (existing) {
        if (existing.quantity >= product.stock_quantity) {
            showToast(`Only ${product.stock_quantity} in stock`, 'warning'); return;
        }
        existing.quantity++;
        existing.total = existing.quantity * existing.price;
    } else {
        cart.push({
            product_id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            quantity: 1,
            total: parseFloat(product.price),
            max_qty: product.stock_quantity,
        });
    }
    renderCart();
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.product_id !== productId);
    renderCart();
}

function changeQty(productId, delta) {
    const item = cart.find(i => i.product_id === productId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) { removeFromCart(productId); return; }
    if (newQty > item.max_qty) { showToast(`Only ${item.max_qty} in stock`, 'warning'); return; }
    item.quantity = newQty;
    item.total = newQty * item.price;
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cartItems');
    const emptyEl = document.getElementById('cartEmpty');
    const placeBtn = document.getElementById('placeOrderBtn');

    if (!cart.length) {
        container.innerHTML = '';
        container.appendChild(emptyEl);
        emptyEl.style.display = 'flex';
        emptyEl.style.flexDirection = 'column';
        emptyEl.style.alignItems = 'center';
        placeBtn.disabled = true;
        recalcTotal();
        return;
    }

    emptyEl.style.display = 'none';
    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="flex-grow-1">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${formatCurrency(item.price)} each</div>
            </div>
            <div class="cart-qty-ctrl">
                <button class="qty-btn" onclick="changeQty(${item.product_id}, -1)">−</button>
                <span class="qty-display">${item.quantity}</span>
                <button class="qty-btn" onclick="changeQty(${item.product_id}, 1)">+</button>
            </div>
            <div class="cart-item-total">${formatCurrency(item.total)}</div>
            <button class="btn-remove-item" onclick="removeFromCart(${item.product_id})">
                <i class="bi bi-x"></i>
            </button>
        </div>`).join('');

    placeBtn.disabled = false;
    recalcTotal();
}

function recalcTotal() {
    const subtotal = cart.reduce((sum, i) => sum + i.total, 0);
    const discount = parseFloat(document.getElementById('discountAmount')?.value || 0);
    const taxRate = parseFloat(document.getElementById('taxRate')?.value || 0);
    const tax = (subtotal - discount) * taxRate / 100;
    const total = subtotal - discount + tax;

    document.getElementById('cartSubtotal').textContent = formatCurrency(subtotal);
    document.getElementById('cartTotal').textContent = formatCurrency(Math.max(0, total));
}

function clearCart() {
    if (cart.length && !confirm('Clear the cart?')) return;
    cart = [];
    renderCart();
}

function selectPayment(radio) {
    document.querySelectorAll('.pay-method').forEach(el => el.classList.remove('active'));
    radio.closest('.pay-method').classList.add('active');
}

// ─── Place Order ──────────────────────────────────────────────
async function placeOrder() {
    if (!cart.length) { showToast('Cart is empty', 'warning'); return; }

    const btn = document.getElementById('placeOrderBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spin me-2"></i>Processing...';

    const discount = parseFloat(document.getElementById('discountAmount').value || 0);
    const taxRate = parseFloat(document.getElementById('taxRate').value || 0);
    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'cash';

    const payload = {
        customer_name: document.getElementById('customerName').value.trim() || 'Walk-in Customer',
        customer_phone: document.getElementById('customerPhone').value.trim(),
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        discount,
        tax_rate: taxRate,
        payment_method: paymentMethod,
    };

    const res = await apiRequest('/api/orders', { method: 'POST', body: JSON.stringify(payload) });

    if (res.data.success) {
        currentOrderId = res.data.order.id;
        showInvoice(res.data.order);
        showToast('Order placed successfully!', 'success');
        cart = [];
        renderCart();
        loadPosProducts(); // refresh stock
    } else {
        showToast(res.data.message || 'Failed to place order', 'danger');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-bag-check-fill me-2"></i>Place Order';
}

// ─── Invoice ──────────────────────────────────────────────────
function showInvoice(order) {
    const content = document.getElementById('invoiceContent');
    content.innerHTML = buildInvoiceHTML(order);
    new bootstrap.Modal(document.getElementById('invoiceModal')).show();
}

function buildInvoiceHTML(order) {
    const itemsHTML = order.items.map(item => `
        <tr>
            <td>${item.product_name}</td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-end">${formatCurrency(item.unit_price)}</td>
            <td class="text-end">${formatCurrency(item.total_price)}</td>
        </tr>`).join('');

    return `
    <div class="invoice-wrapper">
        <div class="invoice-header">
            <div style="font-size:28px;color:#22c55e;margin-bottom:4px"><i class="bi bi-basket3-fill"></i></div>
            <div class="invoice-store-name">FreshMart</div>
            <div style="font-size:12px;color:#8892a4">Grocery Store</div>
        </div>
        <div class="row mb-3" style="font-size:13px;">
            <div class="col-6">
                <div style="color:#8892a4">Order #</div>
                <div style="font-weight:700;font-family:monospace">${order.order_number}</div>
            </div>
            <div class="col-6 text-end">
                <div style="color:#8892a4">Date</div>
                <div style="font-weight:600">${formatDateTime(order.created_at)}</div>
            </div>
            <div class="col-6 mt-2">
                <div style="color:#8892a4">Customer</div>
                <div>${order.customer_name}</div>
            </div>
            <div class="col-6 text-end mt-2">
                <div style="color:#8892a4">Payment</div>
                <div style="text-transform:capitalize">${order.payment_method}</div>
            </div>
        </div>
        <table class="invoice-table" style="border-collapse:collapse;">
            <thead>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.1);font-size:11px;color:#8892a4;">
                    <th class="pb-2">Item</th>
                    <th class="pb-2 text-center">Qty</th>
                    <th class="pb-2 text-end">Price</th>
                    <th class="pb-2 text-end">Total</th>
                </tr>
            </thead>
            <tbody style="font-size:13px;">${itemsHTML}</tbody>
        </table>
        <div style="border-top:1px solid rgba(255,255,255,0.1);margin-top:12px;padding-top:12px;">
            <div class="d-flex justify-content-between mb-1" style="font-size:13px;">
                <span style="color:#8892a4">Subtotal</span><span>${formatCurrency(order.subtotal)}</span>
            </div>
            ${order.discount > 0 ? `<div class="d-flex justify-content-between mb-1" style="font-size:13px;"><span style="color:#8892a4">Discount</span><span style="color:#ef4444">- ${formatCurrency(order.discount)}</span></div>` : ''}
            ${order.tax > 0 ? `<div class="d-flex justify-content-between mb-1" style="font-size:13px;"><span style="color:#8892a4">Tax</span><span>${formatCurrency(order.tax)}</span></div>` : ''}
            <div class="d-flex justify-content-between mt-2 pt-2" style="border-top:1px solid rgba(255,255,255,0.1);font-size:18px;font-weight:800;">
                <span>Total</span><span style="color:#22c55e;font-family:monospace">${formatCurrency(order.total_amount)}</span>
            </div>
        </div>
        <div style="text-align:center;margin-top:20px;font-size:12px;color:#8892a4;">
            Thank you for shopping at FreshMart!<br>Visit again soon.
        </div>
    </div>`;
}

function printInvoice() {
    const content = document.getElementById('invoiceContent').innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
        <html><head><title>Invoice</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
        <style>body{background:#fff;color:#000;font-family:'Plus Jakarta Sans',sans-serif;padding:30px;max-width:420px;margin:auto;}
        .invoice-store-name{font-size:22px;font-weight:800;color:#16a34a;}</style>
        </head><body>${content}<script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
    win.document.close();
}

function startNewSale() {
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('discountAmount').value = '0';
    document.getElementById('taxRate').value = '0';
}
