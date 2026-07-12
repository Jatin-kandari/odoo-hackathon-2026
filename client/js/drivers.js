const API_URL = 'http://localhost:5000/api';

// State
let allDrivers = [];
let editingId = null;

// DOM Elements
const alertContainer = document.getElementById('alertContainer');
const driversList = document.getElementById('driversList');
const driverForm = document.getElementById('driverForm');
const modal = document.getElementById('driverModal');
const modalTitle = document.getElementById('modalTitle');
const saveBtn = document.getElementById('saveBtn');
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
const filterLicense = document.getElementById('filterLicense');

// ============ UTILITY FUNCTIONS ============

function showAlert(message, type = 'success') {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    alertContainer.innerHTML = `<div class="alert ${alertClass}"><span>${message}</span></div>`;
    setTimeout(() => { alertContainer.innerHTML = ''; }, 4000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function getDaysUntilExpiry(expiryDate) {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getStatusBadge(status) {
    const statusText = status.replace('_', ' ');
    return `<span class="badge badge-${status}">${statusText}</span>`;
}

function getLicenseStatus(expiryDate) {
    const days = getDaysUntilExpiry(expiryDate);
    
    if (days < 0) {
        return `<span style="color: #B91C1C; font-weight: 600;">EXPIRED</span>
                <div style="font-size: 11px; color: #B91C1C;">${Math.abs(days)} days ago</div>`;
    } else if (days <= 30) {
        return `<span style="color: #B45309; font-weight: 600;">${formatDate(expiryDate)}</span>
                <div style="font-size: 11px; color: #B45309;">⚠️ Expires in ${days} days</div>`;
    } else if (days <= 90) {
        return `<span>${formatDate(expiryDate)}</span>
                <div style="font-size: 11px; color: var(--text-muted);">${days} days left</div>`;
    } else {
        return `<span>${formatDate(expiryDate)}</span>`;
    }
}

function getSafetyScoreDisplay(score) {
    let color = '#10B981';
    let bg = '#D1FAE5';
    if (score < 50) { color = '#B91C1C'; bg = '#FEE2E2'; }
    else if (score < 70) { color = '#B45309'; bg = '#FEF3C7'; }
    else if (score < 90) { color = '#1E40AF'; bg = '#DBEAFE'; }
    
    return `<span style="background: ${bg}; color: ${color}; padding: 4px 10px; border-radius: 12px; font-weight: 600; font-size: 12px;">${score}/100</span>`;
}

// ============ MODAL FUNCTIONS ============

function openAddModal() {
    editingId = null;
    modalTitle.textContent = 'Add Driver';
    saveBtn.textContent = 'Save Driver';
    driverForm.reset();
    document.getElementById('driverId').value = '';
    document.getElementById('safetyScore').value = 100;
    modal.classList.remove('hidden');
}

function openEditModal(driver) {
    editingId = driver.id;
    modalTitle.textContent = 'Edit Driver';
    saveBtn.textContent = 'Update Driver';
    
    document.getElementById('driverId').value = driver.id;
    document.getElementById('driverName').value = driver.name;
    document.getElementById('licenseNumber').value = driver.license_number;
    document.getElementById('licenseCategory').value = driver.license_category;
    document.getElementById('licenseExpiryDate').value = driver.license_expiry_date;
    document.getElementById('contactNumber').value = driver.contact_number;
    document.getElementById('safetyScore').value = driver.safety_score;
    document.getElementById('driverStatus').value = driver.status;
    
    // Disable status change if driver is on trip
    document.getElementById('driverStatus').disabled = driver.status === 'on_trip';
    
    modal.classList.remove('hidden');
}

function closeModal() {
    modal.classList.add('hidden');
    editingId = null;
    driverForm.reset();
}

// ============ LOAD DATA ============

async function loadDrivers() {
    try {
        const response = await fetch(`${API_URL}/drivers`);
        const result = await response.json();
        
        if (!result.success) throw new Error(result.error);
        
        allDrivers = result.data;
        updateKPIs();
        applyFilters();
    } catch (error) {
        console.error('Load drivers error:', error);
        driversList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3 class="empty-state-title">Error loading data</h3>
                <p class="empty-state-description">${error.message}</p>
            </div>
        `;
    }
}

// ============ KPI UPDATES ============

function updateKPIs() {
    const total = allDrivers.length;
    const available = allDrivers.filter(d => d.status === 'available' && !d.license_expired).length;
    const expiringSoon = allDrivers.filter(d => {
        const days = getDaysUntilExpiry(d.license_expiry_date);
        return days > 0 && days <= 30;
    }).length;
    const expiredSuspended = allDrivers.filter(d => 
        d.license_expired || d.status === 'suspended'
    ).length;
    
    document.getElementById('totalDrivers').textContent = total;
    document.getElementById('availableDrivers').textContent = available;
    document.getElementById('expiringSoon').textContent = expiringSoon;
    document.getElementById('expiredSuspended').textContent = expiredSuspended;
}

// ============ FILTERS ============

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilter = filterStatus.value;
    const licenseFilter = filterLicense.value;
    
    let filtered = allDrivers.filter(d => {
        const matchesSearch = !searchTerm || 
            d.name.toLowerCase().includes(searchTerm) ||
            d.license_number.toLowerCase().includes(searchTerm);
        const matchesStatus = !statusFilter || d.status === statusFilter;
        
        let matchesLicense = true;
        if (licenseFilter === 'valid') matchesLicense = !d.license_expired;
        else if (licenseFilter === 'expired') matchesLicense = d.license_expired;
        
        return matchesSearch && matchesStatus && matchesLicense;
    });
    
    displayDrivers(filtered);
}

// ============ DISPLAY ============

function displayDrivers(drivers) {
    document.getElementById('driverCount').textContent = `${drivers.length} drivers`;
    
    if (!drivers || drivers.length === 0) {
        driversList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👤</div>
                <h3 class="empty-state-title">No drivers found</h3>
                <p class="empty-state-description">Add your first driver to get started.</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="overflow-x: auto;">
            <table class="table">
                <thead>
                    <tr>
                        <th>Driver</th>
                        <th>License No.</th>
                        <th>Category</th>
                        <th>Expiry</th>
                        <th>Contact</th>
                        <th>Safety Score</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    drivers.forEach(d => {
        const rowStyle = d.license_expired ? 'background-color: #FEF2F2;' : '';
        
        html += `
            <tr style="${rowStyle}">
                <td>
                    <div style="font-weight: 600;">${d.name}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">ID: ${d.id}</div>
                </td>
                <td><strong style="color: var(--primary-dark);">${d.license_number}</strong></td>
                <td>${d.license_category}</td>
                <td>${getLicenseStatus(d.license_expiry_date)}</td>
                <td>${d.contact_number}</td>
                <td>${getSafetyScoreDisplay(d.safety_score)}</td>
                <td>${getStatusBadge(d.status)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-outline" onclick='openEditModal(${JSON.stringify(d)})'>
                            Edit
                        </button>
                        ${d.status !== 'on_trip' ? 
                            `<button class="btn btn-sm btn-danger" onclick="deleteDriver(${d.id})">
                                Delete
                            </button>` : ''
                        }
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    driversList.innerHTML = html;
}

// ============ CRUD FUNCTIONS ============

async function saveDriver(formData) {
    try {
        const url = editingId ? `${API_URL}/drivers/${editingId}` : `${API_URL}/drivers`;
        const method = editingId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        showAlert(result.message, 'success');
        closeModal();
        await loadDrivers();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

async function deleteDriver(id) {
    if (!confirm('Are you sure you want to delete this driver?')) return;
    
    try {
        const response = await fetch(`${API_URL}/drivers/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        showAlert('Driver deleted successfully', 'success');
        await loadDrivers();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

// ============ FORM HANDLER ============

driverForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('driverName').value.trim(),
        license_number: document.getElementById('licenseNumber').value.trim().toUpperCase(),
        license_category: document.getElementById('licenseCategory').value,
        license_expiry_date: document.getElementById('licenseExpiryDate').value,
        contact_number: document.getElementById('contactNumber').value.trim(),
        safety_score: parseInt(document.getElementById('safetyScore').value),
        status: document.getElementById('driverStatus').value
    };
    
    // Validations
    if (!formData.name) return showAlert('Name is required', 'danger');
    if (formData.name.length < 2) return showAlert('Name too short', 'danger');
    if (!formData.license_number) return showAlert('License number required', 'danger');
    if (!formData.license_category) return showAlert('Please select license category', 'danger');
    if (!formData.license_expiry_date) return showAlert('License expiry date required', 'danger');
    if (!formData.contact_number) return showAlert('Contact number required', 'danger');
    if (!/^\d{10}$/.test(formData.contact_number)) return showAlert('Contact number must be 10 digits', 'danger');
    if (formData.safety_score < 0 || formData.safety_score > 100) return showAlert('Safety score must be 0-100', 'danger');
    
    await saveDriver(formData);
});

// ============ EVENT LISTENERS ============

searchInput.addEventListener('input', applyFilters);
filterStatus.addEventListener('change', applyFilters);
filterLicense.addEventListener('change', applyFilters);

modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) closeModal();
});

// ============ INITIALIZE ============

document.addEventListener('DOMContentLoaded', () => {
    loadDrivers();
});
