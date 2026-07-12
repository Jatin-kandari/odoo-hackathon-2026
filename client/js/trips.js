const API_URL = 'http://localhost:5000/api';

// State
let allVehicles = [];
let allDrivers = [];
let allTrips = [];
let selectedVehicle = null;

// DOM Elements
const alertContainer = document.getElementById('alertContainer');
const tripForm = document.getElementById('tripForm');
const vehicleSelect = document.getElementById('vehicleId');
const driverSelect = document.getElementById('driverId');
const cargoWeightInput = document.getElementById('cargoWeight');
const capacityAlert = document.getElementById('capacityAlert');
const liveTripsList = document.getElementById('liveTripsList');
const allTripsList = document.getElementById('allTripsList');
const statusFilter = document.getElementById('statusFilter');

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
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
}

function getStatusBadge(status) {
    const statusText = status.replace('_', ' ');
    return `<span class="badge badge-${status}">${statusText}</span>`;
}

// ============ LOAD DATA ============

async function loadAvailableVehicles() {
    try {
        const response = await fetch(`${API_URL}/vehicles/available`);
        const result = await response.json();
        
        if (!result.success) throw new Error(result.error);
        
        allVehicles = result.data;
        let options = '<option value="">Select vehicle</option>';
        result.data.forEach(v => {
            options += `<option value="${v.id}" data-capacity="${v.max_load_capacity}">${v.name} - ${v.max_load_capacity}kg capacity</option>`;
        });
        vehicleSelect.innerHTML = options;
    } catch (error) {
        console.error('Load vehicles error:', error);
    }
}

async function loadAvailableDrivers() {
    try {
        const response = await fetch(`${API_URL}/drivers/available`);
        const result = await response.json();
        
        if (!result.success) throw new Error(result.error);
        
        allDrivers = result.data;
        let options = '<option value="">Select driver</option>';
        result.data.forEach(d => {
            options += `<option value="${d.id}">${d.name} (${d.license_number})</option>`;
        });
        driverSelect.innerHTML = options;
    } catch (error) {
        console.error('Load drivers error:', error);
    }
}

async function loadAllTrips() {
    try {
        const response = await fetch(`${API_URL}/trips`);
        const result = await response.json();
        
        if (!result.success) throw new Error(result.error);
        
        allTrips = result.data;
        displayLiveTrips();
        applyStatusFilter();
    } catch (error) {
        console.error('Load trips error:', error);
        allTripsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3 class="empty-state-title">Error loading trips</h3>
            </div>
        `;
    }
}

// ============ CAPACITY VALIDATION ============

vehicleSelect.addEventListener('change', () => {
    const option = vehicleSelect.options[vehicleSelect.selectedIndex];
    selectedVehicle = option.dataset.capacity ? {
        id: vehicleSelect.value,
        capacity: parseFloat(option.dataset.capacity)
    } : null;
    validateCapacity();
});

cargoWeightInput.addEventListener('input', validateCapacity);

function validateCapacity() {
    const cargoWeight = parseFloat(cargoWeightInput.value) || 0;
    
    if (!selectedVehicle || cargoWeight === 0) {
        capacityAlert.innerHTML = '';
        document.getElementById('createBtn').disabled = false;
        return;
    }
    
    if (cargoWeight > selectedVehicle.capacity) {
        const excess = cargoWeight - selectedVehicle.capacity;
        capacityAlert.innerHTML = `
            <div class="capacity-alert capacity-warning">
                ⚠️ <strong>Capacity Exceeded!</strong><br>
                Vehicle Capacity: ${selectedVehicle.capacity}kg | Cargo: ${cargoWeight}kg<br>
                Exceeds by ${excess}kg - Dispatch will be blocked
            </div>
        `;
        document.getElementById('createBtn').disabled = true;
    } else {
        const remaining = selectedVehicle.capacity - cargoWeight;
        capacityAlert.innerHTML = `
            <div class="capacity-alert capacity-ok">
                ✓ <strong>Capacity OK</strong><br>
                Vehicle Capacity: ${selectedVehicle.capacity}kg | Cargo: ${cargoWeight}kg<br>
                Remaining capacity: ${remaining}kg
            </div>
        `;
        document.getElementById('createBtn').disabled = false;
    }
}

// ============ CREATE TRIP ============

tripForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        source: document.getElementById('source').value.trim(),
        destination: document.getElementById('destination').value.trim(),
        vehicle_id: parseInt(vehicleSelect.value),
        driver_id: parseInt(driverSelect.value),
        cargo_weight: parseFloat(cargoWeightInput.value),
        planned_distance: parseFloat(document.getElementById('plannedDistance').value)
    };
    
    if (!formData.source) return showAlert('Source required', 'danger');
    if (!formData.destination) return showAlert('Destination required', 'danger');
    if (!formData.vehicle_id) return showAlert('Please select a vehicle', 'danger');
    if (!formData.driver_id) return showAlert('Please select a driver', 'danger');
    if (formData.cargo_weight <= 0) return showAlert('Cargo weight must be > 0', 'danger');
    if (formData.planned_distance <= 0) return showAlert('Distance must be > 0', 'danger');
    
    try {
        const response = await fetch(`${API_URL}/trips`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        showAlert(result.message, 'success');
        resetForm();
        await refreshAll();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
});

function resetForm() {
    tripForm.reset();
    capacityAlert.innerHTML = '';
    selectedVehicle = null;
    document.getElementById('createBtn').disabled = false;
}

// ============ LIVE TRIPS BOARD ============

function displayLiveTrips() {
    const activeTrips = allTrips.filter(t => 
        t.status === 'draft' || t.status === 'dispatched'
    );
    
    document.getElementById('activeTripsCount').textContent = `${activeTrips.length} active`;
    
    if (activeTrips.length === 0) {
        liveTripsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🗺️</div>
                <h3 class="empty-state-title">No active trips</h3>
                <p class="empty-state-description">Create a trip to see it here.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    activeTrips.forEach(t => {
        const statusColor = t.status === 'dispatched' ? '#3B82F6' : '#6B7280';
        html += `
            <div class="live-trip-item" style="border-left-color: ${statusColor};">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <strong style="color: var(--primary-dark);">${t.trip_number}</strong>
                    ${getStatusBadge(t.status)}
                </div>
                <div style="font-size: 13px; margin-bottom: 6px;">
                    <strong>${t.source}</strong> → <strong>${t.destination}</strong>
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">
                    ${t.vehicle_name || 'No vehicle'} / ${t.driver_name || 'No driver'}
                </div>
                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">
                    Cargo: ${t.cargo_weight}kg | Distance: ${t.planned_distance}km
                </div>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    ${t.status === 'draft' ? 
                        `<button class="btn btn-sm btn-primary" onclick="dispatchTrip(${t.id})">
                            🚀 Dispatch
                        </button>` : ''
                    }
                    ${t.status === 'dispatched' ? 
                        `<button class="btn btn-sm btn-success" onclick="openCompleteModal(${t.id})">
                            ✅ Complete
                        </button>` : ''
                    }
                    <button class="btn btn-sm btn-danger" onclick="cancelTrip(${t.id})">
                        Cancel
                    </button>
                </div>
            </div>
        `;
    });
    
    liveTripsList.innerHTML = html;
}

// ============ ALL TRIPS TABLE ============

function applyStatusFilter() {
    const filter = statusFilter.value;
    const filtered = filter ? allTrips.filter(t => t.status === filter) : allTrips;
    displayAllTrips(filtered);
}

statusFilter.addEventListener('change', applyStatusFilter);

function displayAllTrips(trips) {
    if (trips.length === 0) {
        allTripsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3 class="empty-state-title">No trips found</h3>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="overflow-x: auto;">
            <table class="table">
                <thead>
                    <tr>
                        <th>Trip #</th>
                        <th>Route</th>
                        <th>Vehicle</th>
                        <th>Driver</th>
                        <th>Cargo</th>
                        <th>Distance</th>
                        <th>Status</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    trips.forEach(t => {
        html += `
            <tr>
                <td><strong style="color: var(--primary-dark);">${t.trip_number}</strong></td>
                <td>
                    <div style="font-size: 13px;">${t.source}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">→ ${t.destination}</div>
                </td>
                <td>${t.vehicle_name || '-'}</td>
                <td>${t.driver_name || '-'}</td>
                <td>${t.cargo_weight}kg</td>
                <td>${t.planned_distance}km</td>
                <td>${getStatusBadge(t.status)}</td>
                <td style="font-size: 12px;">${formatDate(t.created_at)}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    allTripsList.innerHTML = html;
}

// ============ TRIP ACTIONS ============

async function dispatchTrip(id) {
    if (!confirm('Dispatch this trip? Vehicle and driver will be marked On Trip.')) return;
    
    try {
        const response = await fetch(`${API_URL}/trips/${id}/dispatch`, { method: 'POST' });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        showAlert(result.message, 'success');
        await refreshAll();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function openCompleteModal(id) {
    const trip = allTrips.find(t => t.id === id);
    if (!trip) return;
    
    document.getElementById('completeTripId').value = id;
    document.getElementById('startOdoHelp').textContent = `Start odometer: ${trip.start_odometer} km`;
    document.getElementById('endOdometer').value = '';
    document.getElementById('endOdometer').min = trip.start_odometer + 1;
    document.getElementById('fuelConsumed').value = '';
    
    document.getElementById('tripDetails').innerHTML = `
        <div style="padding: 12px; background: #F9FAFB; border-radius: 8px; font-size: 13px;">
            <strong>${trip.trip_number}</strong>: ${trip.source} → ${trip.destination}<br>
            Vehicle: ${trip.vehicle_name} | Driver: ${trip.driver_name}
        </div>
    `;
    
    document.getElementById('completeModal').classList.remove('hidden');
}

function closeCompleteModal() {
    document.getElementById('completeModal').classList.add('hidden');
}

document.getElementById('completeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('completeTripId').value;
    const endOdo = parseFloat(document.getElementById('endOdometer').value);
    const fuel = parseFloat(document.getElementById('fuelConsumed').value);
    
    try {
        const response = await fetch(`${API_URL}/trips/${id}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ end_odometer: endOdo, fuel_consumed: fuel })
        });
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        showAlert(result.message, 'success');
        closeCompleteModal();
        await refreshAll();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
});

async function cancelTrip(id) {
    if (!confirm('Cancel this trip?')) return;
    
    try {
        const response = await fetch(`${API_URL}/trips/${id}/cancel`, { method: 'POST' });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        showAlert(result.message, 'success');
        await refreshAll();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

// ============ REFRESH ALL ============

async function refreshAll() {
    await Promise.all([
        loadAvailableVehicles(),
        loadAvailableDrivers(),
        loadAllTrips()
    ]);
}

// Close modal on outside click
document.getElementById('completeModal').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) closeCompleteModal();
});

// ============ INITIALIZE ============

document.addEventListener('DOMContentLoaded', () => {
    refreshAll();
});
