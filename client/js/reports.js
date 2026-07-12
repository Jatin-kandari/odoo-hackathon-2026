// API Base URL
const API_URL = 'http://localhost:5000/api';

// Chart instances (to destroy and recreate)
let revenueChart = null;
let topVehiclesChart = null;

// Store data for CSV export
let reportData = {};

// ============ UTILITY FUNCTIONS ============

function showAlert(message, type = 'success') {
    const alertContainer = document.getElementById('alertContainer');
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    alertContainer.innerHTML = `<div class="alert ${alertClass}"><span>${message}</span></div>`;
    setTimeout(() => { alertContainer.innerHTML = ''; }, 4000);
}

function formatCurrency(amount) {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', {
        maximumFractionDigits: 0
    })}`;
}

function formatNumber(num) {
    return parseFloat(num || 0).toLocaleString('en-IN');
}

// ============ LOAD DATA ============

async function loadFuelEfficiency() {
    try {
        const response = await fetch(`${API_URL}/dashboard/fuel-efficiency`);
        const result = await response.json();
        
        if (result.success) {
            const efficiency = result.data.efficiency;
            document.getElementById('fuelEfficiency').textContent = `${efficiency} km/l`;
            reportData.fuelEfficiency = result.data;
        }
    } catch (error) {
        console.error('Fuel efficiency error:', error);
    }
}

async function loadFleetUtilization() {
    try {
        const response = await fetch(`${API_URL}/dashboard/fleet-utilization`);
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('fleetUtilization').textContent = `${result.data.utilization}%`;
            reportData.fleetUtilization = result.data;
        }
    } catch (error) {
        console.error('Fleet utilization error:', error);
    }
}

async function loadOperationalCost() {
    try {
        const response = await fetch(`${API_URL}/dashboard/operational-cost`);
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('operationalCost').textContent = formatCurrency(result.data.total);
            reportData.operationalCost = result.data;
        }
    } catch (error) {
        console.error('Operational cost error:', error);
    }
}

async function loadVehicleROI() {
    try {
        const response = await fetch(`${API_URL}/dashboard/vehicle-roi`);
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('vehicleROI').textContent = `${result.data.averageROI}%`;
            reportData.vehicleROI = result.data;
            displayROITable(result.data.vehicles);
        }
    } catch (error) {
        console.error('Vehicle ROI error:', error);
    }
}

async function loadMonthlyRevenue() {
    try {
        const response = await fetch(`${API_URL}/dashboard/monthly-revenue`);
        const result = await response.json();
        
        if (result.success) {
            reportData.monthlyRevenue = result.data;
            renderRevenueChart(result.data);
        }
    } catch (error) {
        console.error('Monthly revenue error:', error);
    }
}

async function loadTopCostliestVehicles() {
    try {
        const response = await fetch(`${API_URL}/dashboard/top-costliest`);
        const result = await response.json();
        
        if (result.success) {
            reportData.topCostliest = result.data;
            renderTopVehiclesChart(result.data);
        }
    } catch (error) {
        console.error('Top vehicles error:', error);
    }
}

// ============ RENDER CHARTS ============

function renderRevenueChart(data) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    // Destroy existing chart
    if (revenueChart) {
        revenueChart.destroy();
    }
    
    revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(m => m.month),
            datasets: [{
                label: 'Revenue',
                data: data.map(m => m.revenue),
                backgroundColor: 'rgba(112, 145, 230, 0.7)',
                borderColor: '#3D52A0',
                borderWidth: 2,
                borderRadius: 8,
                hoverBackgroundColor: 'rgba(61, 82, 160, 0.9)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#3D52A0',
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return `Revenue: ${formatCurrency(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString('en-IN');
                        }
                    }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderTopVehiclesChart(data) {
    const ctx = document.getElementById('topVehiclesChart').getContext('2d');
    
    if (topVehiclesChart) {
        topVehiclesChart.destroy();
    }
    
    // Colors for bars
    const colors = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6'];
    
    topVehiclesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(v => v.name || v.registration_number),
            datasets: [{
                label: 'Total Cost',
                data: data.map(v => v.total_cost),
                backgroundColor: colors.slice(0, data.length),
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#3D52A0',
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return `Cost: ${formatCurrency(context.parsed.x)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString('en-IN');
                        }
                    }
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });
}

// ============ DISPLAY TABLE ============

function displayROITable(vehicles) {
    const container = document.getElementById('vehicleROITable');
    
    if (!vehicles || vehicles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <h3 class="empty-state-title">No vehicle data</h3>
                <p class="empty-state-description">Add vehicles and trips to see performance metrics.</p>
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
                        <th>Completed Trips</th>
                        <th>Revenue</th>
                        <th>Total Costs</th>
                        <th>ROI %</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    vehicles.forEach(v => {
        const roiColor = v.roi >= 0 ? '#047857' : '#B91C1C';
        const roiBadge = v.roi >= 0 ? 'badge-available' : 'badge-cancelled';
        
        html += `
            <tr>
                <td>
                    <div style="font-weight: 600;">${v.name || 'Unknown'}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${v.registration_number || ''}</div>
                </td>
                <td><strong>${v.completed_trips || 0}</strong></td>
                <td><strong style="color: var(--primary-dark);">${formatCurrency(v.revenue)}</strong></td>
                <td style="color: #B45309;">${formatCurrency(v.total_costs)}</td>
                <td>
                    <span class="badge ${roiBadge}" style="font-weight: 700;">
                        ${v.roi >= 0 ? '+' : ''}${v.roi}%
                    </span>
                </td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

// ============ CSV EXPORT ============

function exportToCSV() {
    try {
        let csv = 'TransitOps Reports Export\n';
        csv += `Generated: ${new Date().toLocaleString('en-IN')}\n\n`;
        
        // KPI Section
        csv += 'KEY PERFORMANCE INDICATORS\n';
        csv += 'Metric,Value\n';
        csv += `Fuel Efficiency,${reportData.fuelEfficiency?.efficiency || 0} km/l\n`;
        csv += `Fleet Utilization,${reportData.fleetUtilization?.utilization || 0}%\n`;
        csv += `Total Operational Cost,₹${reportData.operationalCost?.total || 0}\n`;
        csv += `Average Vehicle ROI,${reportData.vehicleROI?.averageROI || 0}%\n\n`;
        
        // Cost Breakdown
        csv += 'COST BREAKDOWN\n';
        csv += 'Category,Amount\n';
        csv += `Fuel Cost,₹${reportData.operationalCost?.totalFuel || 0}\n`;
        csv += `Maintenance Cost,₹${reportData.operationalCost?.totalMaintenance || 0}\n`;
        csv += `Other Expenses,₹${reportData.operationalCost?.totalExpenses || 0}\n\n`;
        
        // Monthly Revenue
        if (reportData.monthlyRevenue) {
            csv += 'MONTHLY REVENUE (Last 6 Months)\n';
            csv += 'Month,Trips,Revenue\n';
            reportData.monthlyRevenue.forEach(m => {
                csv += `${m.month},${m.trips},₹${m.revenue}\n`;
            });
            csv += '\n';
        }
        
        // Vehicle ROI Details
        if (reportData.vehicleROI?.vehicles) {
            csv += 'VEHICLE PERFORMANCE\n';
            csv += 'Vehicle,Registration,Completed Trips,Revenue,Total Costs,ROI %\n';
            reportData.vehicleROI.vehicles.forEach(v => {
                csv += `${v.name},${v.registration_number},${v.completed_trips},₹${v.revenue},₹${v.total_costs},${v.roi}%\n`;
            });
        }
        
        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `TransitOps_Report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
        showAlert('Report exported successfully!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showAlert('Failed to export report', 'danger');
    }
}

// ============ REFRESH ============

async function refreshReports() {
    showAlert('Refreshing reports...', 'success');
    await loadAllReports();
}

// ============ INITIALIZE ============

async function loadAllReports() {
    await Promise.all([
        loadFuelEfficiency(),
        loadFleetUtilization(),
        loadOperationalCost(),
        loadVehicleROI(),
        loadMonthlyRevenue(),
        loadTopCostliestVehicles()
    ]);
}

document.addEventListener('DOMContentLoaded', () => {
    loadAllReports();
});
