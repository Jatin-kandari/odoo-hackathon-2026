// API Base URL
const API_URL = 'http://localhost:5000/api';

// DOM Elements
const alertContainer = document.getElementById('alertContainer');
const fuelForm = document.getElementById('fuelForm');
const expenseForm = document.getElementById('expenseForm');
const fuelLogsList = document.getElementById('fuelLogsList');
const expensesList = document.getElementById('expensesList');

// Set today's date as default
document.getElementById('fuelDate').valueAsDate = new Date();
document.getElementById('expenseDate').valueAsDate = new Date();

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

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function getCategoryBadge(category) {
    const colors = {
        toll: 'badge-on-trip',
        parking: 'badge-in-shop',
        insurance: 'badge-completed',
        repair: 'badge-cancelled',
        other: 'badge-off-duty'
    };
    return `<span class="badge ${colors[category] || 'badge-off-duty'}">${category}</span>`;
}

// ============ MODAL FUNCTIONS ============

function openFuelModal() {
    document.getElementById('fuelModal').classList.remove('hidden');
    loadVehiclesInto('fuelVehicleId');
}

function closeFuelModal() {
    document.getElementById('fuelModal').classList.add('hidden');
    fuelForm.reset();
    document.getElementById('fuelDate').valueAsDate = new Date();
    document.getElementById('totalPreview').style.display = 'none';
}

function openExpenseModal() {
    document.getElementById('expenseModal').classList.remove('hidden');
    loadVehiclesInto('expenseVehicleId');
}

function closeExpenseModal() {
    document.getElementById('expenseModal').classList.add('hidden');
    expenseForm.reset();
    document.getElementById('expenseDate').valueAsDate = new Date();
}

// ============ LOAD DATA ============

async function loadVehiclesInto(selectId) {
    try {
        const response = await fetch(`${API_URL}/vehicles`);
        const result = await response.json();
        
        if (!result.success) throw new Error(result.error);
        
        const select = document.getElementById(selectId);
        let options = '<option value="">Select vehicle</option>';
        result.data.forEach(v => {
            options += `<option value="${v.id}">${v.name} (${v.registration_number})</option>`;
        });
        select.innerHTML = options;
    } catch (error) {
        console.error('Load vehicles error:', error);
    }
}

async function loadFuelLogs() {
    try {
        const response = await fetch(`${API_URL}/fuel-logs`);
        const result = await response.json();
        
        if (!result.success) throw new Error(result.error);
        
        document.getElementById('fuelCount').textContent = `${result.count} records`;
        displayFuelLogs(result.data);
    } catch (error) {
        console.error('Load fuel logs error:', error);
        fuelLogsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3 class="empty-state-title">Error loading data</h3>
                <p class="empty-state-description">${error.message}</p>
            </div>
        `;
    }
}

async function loadExpenses() {
    try {
        const response = await fetch(`${API_URL}/expenses`);
        const result = await response.json();
        
        if (!result.success) throw new Error(result.error);
        
        document.getElementById('expenseCount').textContent = `${result.count} records`;
        displayExpenses(result.data);
    } catch (error) {
        console.error('Load expenses error:', error);
        expensesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3 class="empty-state-title">Error loading data</h3>
                <p class="empty-state-description">${error.message}</p>
            </div>
        `;
    }
}

async function loadOperationalCost() {
    try {
        const response = await fetch(`${API_URL}/expenses/operational-cost`);
        const result = await response.json();
        
        if (!result.success) throw new Error(result.error);
        
        document.getElementById('totalFuel').textContent = formatCurrency(result.data.totalFuel);
        document.getElementById('totalMaintenance').textContent = formatCurrency(result.data.totalMaintenance);
        document.getElementById('totalExpenses').textContent = formatCurrency(result.data.totalExpenses);
        document.getElementById('totalCost').textContent = formatCurrency(result.data.total);
    } catch (error) {
        console.error('Load cost error:', error);
    }
}

// ============ DISPLAY FUNCTIONS ============

function displayFuelLogs(logs) {
    if (!logs || logs.length === 0) {
        fuelLogsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⛽</div>
                <h3 class="empty-state-title">No fuel logs yet</h3>
                <p class="empty-state-description">Click "Log Fuel" to record your first fuel entry.</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="overflow-x: auto;">
            <table class="table">
                <thead>
                    <tr>
                        <th>Vehicle</th>
                        <th>Date</th>
                        <th>Liters</th>
                        <th>Cost/L</th>
                        <th>Total Cost</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    logs.forEach(log => {
        html += `
            <tr>
                <td>
                    <div style="font-weight: 600;">${log.vehicle_name || 'Unknown'}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${log.registration_number || ''}</div>
                </td>
                <td>${formatDate(log.date)}</td>
                <td><strong>${log.liters} L</strong></td>
                <td>${formatCurrency(log.cost_per_liter)}</td>
                <td><strong style="color: var(--primary-dark);">${formatCurrency(log.total_cost)}</strong></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteFuelLog(${log.id})">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    fuelLogsList.innerHTML = html;
}

function displayExpenses(expenses) {
    if (!expenses || expenses.length === 0) {
        expensesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💰</div>
                <h3 class="empty-state-title">No expenses recorded</h3>
                <p class="empty-state-description">Click "Add Expense" to record tolls, parking, or other costs.</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="overflow-x: auto;">
            <table class="table">
                <thead>
                    <tr>
                        <th>Vehicle</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Description</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    expenses.forEach(exp => {
        html += `
            <tr>
                <td>
                    <div style="font-weight: 600;">${exp.vehicle_name || 'Unknown'}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${exp.registration_number || ''}</div>
                </td>
                <td>${getCategoryBadge(exp.category)}</td>
                <td><strong style="color: var(--primary-dark);">${formatCurrency(exp.amount)}</strong></td>
                <td style="max-width: 200px;">${exp.description || '-'}</td>
                <td>${formatDate(exp.date)}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteExpense(${exp.id})">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    expensesList.innerHTML = html;
}

// ============ CREATE FUNCTIONS ============

async function createFuelLog(formData) {
    try {
        const response = await fetch(`${API_URL}/fuel-logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        showAlert(result.message, 'success');
        closeFuelModal();
        await loadFuelLogs();
        await loadOperationalCost();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

async function createExpense(formData) {
    try {
        const response = await fetch(`${API_URL}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        showAlert(result.message, 'success');
        closeExpenseModal();
        await loadExpenses();
        await loadOperationalCost();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

async function deleteFuelLog(id) {
    if (!confirm('Delete this fuel log?')) return;
    
    try {
        const response = await fetch(`${API_URL}/fuel-logs/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        showAlert('Fuel log deleted', 'success');
        await loadFuelLogs();
        await loadOperationalCost();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

async function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    
    try {
        const response = await fetch(`${API_URL}/expenses/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        showAlert('Expense deleted', 'success');
        await loadExpenses();
        await loadOperationalCost();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

// ============ FORM HANDLERS ============

// Live total cost preview for fuel
document.getElementById('fuelLiters').addEventListener('input', updateTotalPreview);
document.getElementById('fuelCostPerLiter').addEventListener('input', updateTotalPreview);

function updateTotalPreview() {
    const liters = parseFloat(document.getElementById('fuelLiters').value) || 0;
    const cost = parseFloat(document.getElementById('fuelCostPerLiter').value) || 0;
    const total = liters * cost;
    
    if (total > 0) {
        document.getElementById('totalCostPreview').textContent = formatCurrency(total);
        document.getElementById('totalPreview').style.display = 'flex';
    } else {
        document.getElementById('totalPreview').style.display = 'none';
    }
}

fuelForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        vehicle_id: parseInt(document.getElementById('fuelVehicleId').value),
        liters: parseFloat(document.getElementById('fuelLiters').value),
        cost_per_liter: parseFloat(document.getElementById('fuelCostPerLiter').value),
        date: document.getElementById('fuelDate').value
    };
    
    if (!formData.vehicle_id) return showAlert('Please select a vehicle', 'danger');
    if (formData.liters <= 0) return showAlert('Liters must be greater than 0', 'danger');
    if (formData.cost_per_liter <= 0) return showAlert('Cost must be greater than 0', 'danger');
    
    await createFuelLog(formData);
});

expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        vehicle_id: parseInt(document.getElementById('expenseVehicleId').value),
        category: document.getElementById('expenseCategory').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        description: document.getElementById('expenseDescription').value,
        date: document.getElementById('expenseDate').value
    };
    
    if (!formData.vehicle_id) return showAlert('Please select a vehicle', 'danger');
    if (!formData.category) return showAlert('Please select a category', 'danger');
    if (formData.amount <= 0) return showAlert('Amount must be greater than 0', 'danger');
    
    await createExpense(formData);
});

// Close modals when clicking outside
document.getElementById('fuelModal').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) closeFuelModal();
});

document.getElementById('expenseModal').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) closeExpenseModal();
});

// ============ INITIALIZE ============

document.addEventListener('DOMContentLoaded', () => {
    loadFuelLogs();
    loadExpenses();
    loadOperationalCost();
});

