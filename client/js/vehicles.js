const API_URL = 'http://localhost:5000/api';

// State
let allVehicles = [];
let editingId = null;

// DOM Elements
const alertContainer = document.getElementById('alertContainer');
const vehiclesList = document.getElementById('vehiclesList');
const vehicleForm = document.getElementById('vehicleForm');
const modal = document.getElementById('vehicleModal');
const modalTitle = document.getElementById('modalTitle');
const saveBtn = document.getElementById('saveBtn');
const searchInput = document.getElementById('searchInput');
const filterType = document.getElementById('filterType');
const filterStatus = document.getElementById('filterStatus');

// ============ UTILITY FUNCTIONS ============

function showAlert(message, type = 'success') {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    alertContainer.innerHTML = `<div class="alert ${alertClass}"><span>${message}</span></div>`;
    setTimeout(() => { alertContainer.innerHTML = ''; }, 4000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatCurrency(amount) {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', {
        maximumFractionDigits: 0
    })}`;
}

function formatNumber(num) {
    return parseFloat(num || 0).toLocaleString('en-IN');
}

function getStatusBadge(status) {
    const statusText = status.replace('_', ' ');
    return `<span class="badge badge-${status}">${statusText}</span>`;
}

function getTypeBadge(type) {
    const icons = {
        truck: '🚛',
        van: '🚐',
        car: '🚗',
        mini: '🚙',
        bike: '🏍️'
    };
    return `${icons[type] || '🚗'} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
}

// ============ MODAL FUNCTIONS ============

function openAddModal() {
    editingId = null;
    modalTitle.textContent = 'Add Vehicle';
    saveBtn.textContent = 'Save Vehicle';
    vehicleForm.reset();
    document.getElementById('vehicleId').value = '';
    document.getElementById('registrationNumber').disabled = false;
    modal.classList.remove('hidden');
}

function openEditModal(vehicle) {
    editingId = vehicle.id;
    modalTitle.textContent = 'Edit Vehicle';
    saveBtn.textContent = 'Update Vehicle';
    
    document.getElementById('vehicleId').value = vehicle.id;
    document.getElementById('registrationNumber').value = vehicle.registration_number;
    document.getElementById('vehicleName').value = vehicle.name;
    document.getElementById('vehicleType').value = vehicle.type;
    document.getElementById('vehicleStatus').value = vehicle.status;
    document.getElementById('maxLoadCapacity').value = vehicle.max_load_capacity;
    document.getElementById('currentOdometer').value = vehicle.current_odometer || 0;
    document.getElementById('acquisitionCost').value = vehicle.acquisition_cost;
    
    // Disable status change if vehicle is on trip
    document.getElementById('vehicleStatus').disabled = vehicle.status === 'on_trip';
    
    modal.classList.remove('hidden');
}

function closeModal() {
    modal.classList.add('hidden');
    editingId = null;
    vehicleForm.reset();
}

// ============ LOAD DATA ============

async function loadVehicles() {
    try {
        const response = await fetch(`${API_URL}/vehicles`);
        const result = await response.json();
        
        if (!result.success) throw new Error(result.error);
        
        allVehicles = result.data;
        applyFilters();
    } catch (error) {
        console.error('Load vehicles error:', error);
        vehiclesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3 class="empty-state-title">Error loading data</h3>
                <p class="empty-state-description">${error.message}</p>
            </div>
        `;
    }
}

// ============ FILTERS ============

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const typeFilter = filterType.value;
    const statusFilter = filterStatus.value;
    
    let filtered = allVehicles.filter(v => {
        const matchesSearch = !searchTerm || 
            v.registration_number.toLowerCase().includes(searchTerm) ||
            v.name.toLowerCase().includes(searchTerm);
        const matchesType = !typeFilter || v.type === typeFilter;
        const matchesStatus = !statusFilter || v.status === statusFilter;
        
        return matchesSearch && matchesType && matchesStatus;
    });
    
    displayVehicles(filtered);
}

// ============ DISPLAY ============

function displayVehicles(vehicles) {
    document.getElementById('vehicleCount').textContent = `${vehicles.length} vehicles`;
    
    if (!vehicles || vehicles.length === 0) {
        vehiclesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🚚</div>
                <h3 class="empty-state-title">No vehicles found</h3>
                <p class="empty-state-description">Add your first vehicle to get started.</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="overflow-x: auto;">
            <table class="table">
                <thead>
                    <tr>
                        <th>Reg. Number</th>
                        <th>Name/Model</th>
                        <th>Type</th>
                        <th>Capacity</th>
                        <th>Odometer</th>
                        <th>Acq. Cost</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    vehicles.forEach(v => {
        html += `
            <tr>
                <td><strong style="color: var(--primary-dark);">${v.registration_number}</strong></td>
                <td><strong>${v.name}</strong></td>
                <td>${getTypeBadge(v.type)}</td>
                <td>${formatNumber(v.max_load_capacity)} kg</td>
                <td>${formatNumber(v.current_odometer || 0)} km</td>
                <td>${formatCurrency(v.acquisition_cost)}</td>
                <td>${getStatusBadge(v.status)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-outline" onclick='openEditModal(${JSON.stringify(v)})'>
                            Edit
                        </button>
                        ${v.status !== 'on_trip' ? 
                            `<button class="btn btn-sm btn-danger" onclick="deleteVehicle(${v.id})">
                                Delete
                            </button>` : ''
                        }
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    vehiclesList.innerHTML = html;
}

// ============ CRUD FUNCTIONS ============

async function saveVehicle(formData) {
    try {
        const url = editingId ? `${API_URL}/vehicles/${editingId}` : `${API_URL}/vehicles`;
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
        await loadVehicles();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

async function deleteVehicle(id) {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    
    try {
        const response = await fetch(`${API_URL}/vehicles/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        showAlert('Vehicle deleted successfully', 'success');
        await loadVehicles();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

// ============ FORM HANDLER ============

vehicleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        registration_number: document.getElementById('registrationNumber').value.trim().toUpperCase(),
        name: document.getElementById('vehicleName').value.trim(),
        type: document.getElementById('vehicleType').value,
        max_load_capacity: parseFloat(document.getElementById('maxLoadCapacity').value),
        current_odometer: parseFloat(document.getElementById('currentOdometer').value) || 0,
        acquisition_cost: parseFloat(document.getElementById('acquisitionCost').value),
        status: document.getElementById('vehicleStatus').value
    };
    
    // Validations
    if (!formData.registration_number) return showAlert('Registration number required', 'danger');
    if (formData.registration_number.length < 4) return showAlert('Invalid registration number', 'danger');
    if (!formData.name) return showAlert('Vehicle name required', 'danger');
    if (!formData.type) return showAlert('Please select a type', 'danger');
    if (formData.max_load_capacity <= 0) return showAlert('Capacity must be greater than 0', 'danger');
    if (formData.acquisition_cost <= 0) return showAlert('Acquisition cost must be greater than 0', 'danger');
    
    await saveVehicle(formData);
});

// ============ FILTERS EVENT LISTENERS ============

searchInput.addEventListener('input', applyFilters);
filterType.addEventListener('change', applyFilters);
filterStatus.addEventListener('change', applyFilters);

// Close modal on outside click
modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) closeModal();
});

// ============ INITIALIZE ============

document.addEventListener('DOMContentLoaded', () => {
    loadVehicles();
});
