/* dashboard.js */
let salesChartInstance = null;
let categoryChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadSalesChart();
    loadCategoryChart();
    loadRecentOrders();
    loadLowStockAlerts();
});

async function loadStats() {
    const res = await apiRequest('/api/dashboard/stats');
    if (!res.ok) return;
    const d = res.data;
    document.getElementById('todaySales').textContent = formatCurrency(d.today_sales);
    document.getElementById('monthSales').textContent = `Month: ${formatCurrency(d.month_sales)}`;
    document.getElementById('todayOrders').textContent = d.today_orders;
    document.getElementById('totalOrders').textContent = `Total: ${d.total_orders} orders`;
    document.getElementById('totalProducts').textContent = d.total_products;
    document.getElementById('totalCategories').textContent = `${d.total_categories} categories`;
    document.getElementById('lowStockCount').textContent = d.low_stock_count;
    document.getElementById('outOfStockCount').textContent = `${d.out_of_stock_count} out of stock`;
}

async function loadSalesChart() {
    const res = await apiRequest('/api/dashboard/sales-chart');
    if (!res.ok) return;
    const { labels, values } = res.data;
    const ctx = document.getElementById('salesChart').getContext('2d');
    if (salesChartInstance) salesChartInstance.destroy();
    salesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Sales (₹)',
                data: values,
                backgroundColor: 'rgba(34,197,94,0.2)',
                borderColor: '#22c55e',
                borderWidth: 2,
                borderRadius: 6,
                hoverBackgroundColor: 'rgba(34,197,94,0.4)',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1a1d27',
                    borderColor: '#22c55e',
                    borderWidth: 1,
                    titleColor: '#8892a4',
                    bodyColor: '#e8ecf0',
                    callbacks: { label: ctx => '₹' + ctx.raw.toLocaleString('en-IN') }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8892a4', font: { size: 11 } } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8892a4', font: { size: 11 }, callback: v => '₹' + v.toLocaleString('en-IN') } }
            }
        }
    });
}

async function loadCategoryChart() {
    const res = await apiRequest('/api/dashboard/category-distribution');
    if (!res.ok) return;
    const data = res.data;
    const ctx = document.getElementById('categoryChart').getContext('2d');
    const colors = ['#22c55e','#3b82f6','#a855f7','#f97316','#06b6d4','#f43f5e','#eab308','#10b981','#6366f1','#ec4899'];
    if (categoryChartInstance) categoryChartInstance.destroy();
    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.name),
            datasets: [{
                data: data.map(d => d.count),
                backgroundColor: colors.slice(0, data.length),
                borderWidth: 2,
                borderColor: '#1a1d27',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#8892a4', padding: 12, font: { size: 11 } } },
                tooltip: { backgroundColor: '#1a1d27', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#8892a4', bodyColor: '#e8ecf0' }
            },
            cutout: '68%'
        }
    });
}

async function loadRecentOrders() {
    const res = await apiRequest('/api/dashboard/recent-orders');
    const tbody = document.getElementById('recentOrdersBody');
    if (!res.ok) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Failed to load</td></tr>'; return; }
    if (!res.data.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">No orders yet</td></tr>'; return; }
    tbody.innerHTML = res.data.map(o => `
        <tr>
            <td><span style="font-family:monospace;font-size:12px;color:#3b82f6">${o.order_number}</span></td>
            <td>${o.customer_name || 'Walk-in'}</td>
            <td style="font-weight:700;font-family:monospace">${formatCurrency(o.total_amount)}</td>
            <td>${orderStatusBadge(o.payment_status)}</td>
            <td style="font-size:12px;color:#8892a4">${formatDateTime(o.created_at)}</td>
        </tr>`).join('');
}

async function loadLowStockAlerts() {
    const res = await apiRequest('/api/dashboard/low-stock');
    const container = document.getElementById('lowStockList');
    if (!res.ok || !res.data.length) {
        container.innerHTML = '<div class="text-center text-muted py-4"><i class="bi bi-check-circle-fill text-success fs-4 d-block mb-2"></i>All items well stocked</div>';
        return;
    }
    container.innerHTML = res.data.map(item => `
        <div class="low-stock-item">
            <div>
                <div class="low-stock-name">${item.product_name}</div>
                <div class="low-stock-qty">${item.category}</div>
            </div>
            <div class="text-end">
                <div style="font-family:monospace;font-weight:700;font-size:15px;color:${item.status === 'out_of_stock' ? '#ef4444' : '#f97316'}">${item.quantity}</div>
                <div style="font-size:10px;color:#8892a4">/ ${item.threshold} min</div>
            </div>
        </div>`).join('');
}
