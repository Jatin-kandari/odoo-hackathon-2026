// API Base URL
const API_URL = 'http://localhost:5000/api';

// DOM Elements
const maintenanceForm = document.getElementById('maintenanceForm');
const vehicleSelect = document.getElementById('vehicleId');
const maintenanceList = document.getElementById('maintenanceList');
const alertContainer = document.getElementById('alertContainer');

// Set today's date as default
document.getElementById('startDate').valueAsDate = new Date();

// Show alert message
function showAlert(message, type = 'success') {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    alertContainer.innerHTML = `
        <div class="alert ${alertClass}">
            <span>${message}</span>
        </div>
    `;
    setTimeout(() => {
        alertContainer.innerHTML = '';
    }, 4000);
}

// Format currency
function formatCurrency(amount) {
    return `₹${parseFloat(amount).toLocaleString('en-IN', {
        maximumFractionDigits: 0
    })}`;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Get status badge HTML
function getStatusBadge(status) {
    return `<span class="badge badge-${status}">${status}</span>`;
}

// Load vehicles into dropdown
async function loadVehicles() {
    try {
        // For now, we'll fetch vehicles directly
        // Later this will use the vehicles API
        const response = await fetch(`${API_URL}/maintenance`);
        const data = await response.json();
        
        // Get unique vehicles from maintenance
        // For proper implementation, we need vehicles endpoint
        // For now, let's hardcode based on our test data
        vehicleSelect.innerHTML = `
            <option value="">Select vehicle</option>
            <option value="1">VAN-05 (GJ01AB1234)</option>
            <option value="2">TRUCK-11 (GJ01AB5678)</option>
            <option value="3">MINI-03 (GJ01AB9012)</option>
        `;
    } catch (error) {
        console.error('Error loading vehicles:', error);
    }
}

// Load maintenance records
async function loadMaintenance() {
    try {
        const response = await fetch(`${API_URL}/maintenance`);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        displayMaintenance(result.data);
    } catch (error) {
        console.error('Error loading maintenance:', error);
        maintenanceList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3 class="empty-state-title">Error loading data</h3>
                <p class="empty-state-description">${error.message}</p>
            </div>
        `;
    }
}

// Display maintenance records in table
function displayMaintenance(records) {
    if (records.length === 0) {
        maintenanceList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔧</div>
                <h3 class="empty-state-title">No maintenance records</h3>
                <p class="empty-state-description">Add your first maintenance record using the form.</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="table-container" style="box-shadow: none;">
            <table class="table">
                <thead>
                    <tr>
                        <th>Vehicle</th>
                        <th>Service</th>
                        <th>Cost</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    records.forEach(record => {
        html += `
            <tr>
                <td>
                    <div style="font-weight: 600;">${record.vehicle_name || 'Unknown'}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">${record.registration_number || ''}</div>
                </td>
                <td>${record.service_type}</td>
                <td>${formatCurrency(record.cost)}</td>
                <td>${formatDate(record.start_date)}</td>
                <td>${getStatusBadge(record.status)}</td>
                <td>
                    <div class="table-actions">
                        ${record.status === 'active' ? 
                            `<button class="btn btn-sm btn-success" onclick="closeMaintenance(${record.id})">
                                Close
                            </button>` : 
                            `<span style="color: var(--text-muted); font-size: 12px;">Completed</span>`
                        }
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    maintenanceList.innerHTML = html;
}

// Create maintenance record
async function createMaintenance(formData) {
    try {
        const response = await fetch(`${API_URL}/maintenance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        showAlert(result.message, 'success');
        maintenanceForm.reset();
        document.getElementById('startDate').valueAsDate = new Date();
        loadMaintenance();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

// Close maintenance
async function closeMaintenance(id) {
    if (!confirm('Are you sure you want to close this maintenance record?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/maintenance/${id}/close`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        showAlert(result.message, 'success');
        loadMaintenance();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

// Form submit handler
maintenanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        vehicle_id: parseInt(document.getElementById('vehicleId').value),
        service_type: document.getElementById('serviceType').value,
        description: document.getElementById('description').value,
        cost: parseFloat(document.getElementById('cost').value),
        start_date: document.getElementById('startDate').value
    };
    
    // Validation
    if (!formData.vehicle_id) {
        showAlert('Please select a vehicle', 'danger');
        return;
    }
    
    if (!formData.service_type) {
        showAlert('Please select a service type', 'danger');
        return;
    }
    
    if (formData.cost <= 0) {
        showAlert('Cost must be greater than 0', 'danger');
        return;
    }
    
    await createMaintenance(formData);
});

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadVehicles();
    loadMaintenance();
});
