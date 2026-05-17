/* products.js */
let currentPage = 1;
let productModal, restockModal, categoryModal;
let categories = [];
const debounceSearch = debounce(() => { currentPage = 1; loadProducts(); }, 400);

document.addEventListener('DOMContentLoaded', () => {
    productModal = new bootstrap.Modal(document.getElementById('productModal'));
    restockModal = new bootstrap.Modal(document.getElementById('restockModal'));
    categoryModal = new bootstrap.Modal(document.getElementById('categoryModal'));
    loadCategories();
    loadProducts();
});

async function loadCategories() {
    const res = await apiRequest('/api/categories');
    if (!res.ok) return;
    categories = res.data;
    // Fill filter dropdown
    const filter = document.getElementById('categoryFilter');
    const prodCat = document.getElementById('productCategory');
    filter.innerHTML = '<option value="">All Categories</option>' + categories.map(c => `<option value="${c.id}">${c.name} (${c.product_count})</option>`).join('');
    if (prodCat) prodCat.innerHTML = '<option value="">Select category</option>' + categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    // Category list in modal
    const list = document.getElementById('categoryList');
    if (list) list.innerHTML = categories.map(c => `<span class="category-tag">${c.name} <small>(${c.product_count})</small></span>`).join('');
}

async function loadProducts(page = currentPage) {
    currentPage = page;
    const search = document.getElementById('searchInput').value;
    const categoryId = document.getElementById('categoryFilter').value;
    const status = document.getElementById('statusFilter').value;
    const params = new URLSearchParams({ search, page, per_page: 15 });
    if (categoryId) params.set('category_id', categoryId);
    if (status) params.set('status', status);

    const tbody = document.getElementById('productsBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Loading...</td></tr>';

    const res = await apiRequest(`/api/products?${params}`);
    if (!res.ok) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Failed to load products</td></tr>'; return; }
    const { products, total, pages } = res.data;

    if (!products.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5"><i class="bi bi-box-seam fs-3 d-block mb-2"></i>No products found</td></tr>';
        document.getElementById('tablePagination').innerHTML = '';
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr>
            <td>
                <div style="font-weight:600;font-size:13.5px">${p.name}</div>
                ${p.barcode ? `<div style="font-size:11px;color:#8892a4;font-family:monospace">${p.barcode}</div>` : ''}
            </td>
            <td><span style="font-size:12px;color:#3b82f6">${p.category_name || '—'}</span></td>
            <td style="font-weight:700;font-family:monospace">${formatCurrency(p.price)}</td>
            <td>
                <div style="font-weight:700;font-family:monospace">${p.stock_quantity} <span style="font-weight:400;font-size:11px;color:#8892a4">${p.unit || ''}</span></div>
            </td>
            <td>${stockBadge(p.stock_status)}</td>
            <td>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-primary btn-action" onclick="editProduct(${p.id})" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success btn-action" onclick="openRestockModal(${p.id}, '${p.name.replace(/'/g, "\\'")}')" title="Restock">
                        <i class="bi bi-plus-circle"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')" title="Deactivate">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`).join('');

    buildPagination('tablePagination', currentPage, pages, 'loadProducts');
}

function openProductModal(productData = null) {
    document.getElementById('productModalTitle').textContent = productData ? 'Edit Product' : 'Add Product';
    document.getElementById('productId').value = productData?.id || '';
    document.getElementById('productName').value = productData?.name || '';
    document.getElementById('productPrice').value = productData?.price || '';
    document.getElementById('productCostPrice').value = productData?.cost_price || '';
    document.getElementById('productCategory').value = productData?.category_id || '';
    document.getElementById('productBarcode').value = productData?.barcode || '';
    document.getElementById('productQuantity').value = productData?.stock_quantity ?? '';
    document.getElementById('productThreshold').value = 10;
    document.getElementById('productUnit').value = 'pcs';
    document.getElementById('productDescription').value = productData?.description || '';
    document.getElementById('productActive').checked = productData ? productData.is_active : true;
    document.getElementById('productFormAlert').style.display = 'none';
    productModal.show();
}

async function editProduct(id) {
    const res = await apiRequest(`/api/products/${id}`);
    if (!res.ok) { showToast('Failed to load product', 'danger'); return; }
    openProductModal(res.data);
}

async function saveProduct() {
    const btn = document.getElementById('saveProductBtn');
    const alertEl = document.getElementById('productFormAlert');
    const id = document.getElementById('productId').value;

    const formData = new FormData();
    formData.append('name', document.getElementById('productName').value.trim());
    formData.append('price', document.getElementById('productPrice').value);
    formData.append('cost_price', document.getElementById('productCostPrice').value);
    formData.append('category_id', document.getElementById('productCategory').value);
    formData.append('barcode', document.getElementById('productBarcode').value.trim());
    formData.append('quantity', document.getElementById('productQuantity').value);
    formData.append('low_stock_threshold', document.getElementById('productThreshold').value);
    formData.append('unit', document.getElementById('productUnit').value);
    formData.append('description', document.getElementById('productDescription').value);
    formData.append('is_active', document.getElementById('productActive').checked ? '1' : '0');
    const imageFile = document.getElementById('productImage').files[0];
    if (imageFile) formData.append('image', imageFile);

    // Validate
    if (!formData.get('name') || !formData.get('price') || !formData.get('category_id')) {
        alertEl.className = 'alert alert-danger'; alertEl.textContent = 'Please fill in all required fields.'; alertEl.style.display = 'block'; return;
    }

    btn.disabled = true;
    const url = id ? `/api/products/${id}` : '/api/products';
    const method = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, { method, body: formData });
        const data = await res.json();
        if (data.success) {
            productModal.hide();
            showToast(data.message, 'success');
            loadProducts();
            loadCategories();
        } else {
            alertEl.className = 'alert alert-danger'; alertEl.textContent = data.message; alertEl.style.display = 'block';
        }
    } catch (e) {
        alertEl.className = 'alert alert-danger'; alertEl.textContent = 'Network error.'; alertEl.style.display = 'block';
    } finally {
        btn.disabled = false;
    }
}

async function deleteProduct(id, name) {
    if (!confirm(`Deactivate "${name}"? It will be hidden from sales but not deleted.`)) return;
    const res = await apiRequest(`/api/products/${id}`, { method: 'DELETE' });
    if (res.data.success) { showToast(res.data.message, 'success'); loadProducts(); }
    else showToast(res.data.message, 'danger');
}

function openRestockModal(id, name) {
    document.getElementById('restockProductId').value = id;
    document.getElementById('restockProductName').textContent = name;
    document.getElementById('restockQty').value = 10;
    document.getElementById('restockAlert').style.display = 'none';
    restockModal.show();
}

async function submitRestock() {
    const id = document.getElementById('restockProductId').value;
    const qty = parseInt(document.getElementById('restockQty').value);
    const alertEl = document.getElementById('restockAlert');
    if (!qty || qty <= 0) { alertEl.className = 'alert alert-danger'; alertEl.textContent = 'Enter valid quantity.'; alertEl.style.display = 'block'; return; }
    const res = await apiRequest('/api/inventory/restock', { method: 'POST', body: JSON.stringify({ product_id: parseInt(id), quantity: qty }) });
    if (res.data.success) { restockModal.hide(); showToast(res.data.message, 'success'); loadProducts(); }
    else { alertEl.className = 'alert alert-danger'; alertEl.textContent = res.data.message; alertEl.style.display = 'block'; }
}

async function addCategory() {
    const name = document.getElementById('newCategoryName').value.trim();
    if (!name) { showToast('Enter a category name', 'warning'); return; }
    const res = await apiRequest('/api/categories', { method: 'POST', body: JSON.stringify({ name }) });
    if (res.data.success) { document.getElementById('newCategoryName').value = ''; loadCategories(); showToast('Category added', 'success'); }
    else showToast(res.data.message, 'danger');
}

function openCategoryModal() { categoryModal.show(); }

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('statusFilter').value = '';
    loadProducts(1);
}
