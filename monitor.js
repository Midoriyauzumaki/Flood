// WebSocket and data management
let ws = null;
let isConnecting = false;
const RECONNECT_DELAY = 2000;
let dataPoints = [];
const maxDataPoints = 100;

// DOM elements
const waterLevel = document.getElementById('water-level');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const avgLevel = document.getElementById('avg-level');
const maxLevel = document.getElementById('max-level');
const minLevel = document.getElementById('min-level');
const alertsList = document.getElementById('alerts-list');

// Chart configuration
const layout = {
    title: 'Water Level Over Time',
    xaxis: { title: 'Time' },
    yaxis: { 
        title: 'Water Level (cm)',
        range: [0, 300]
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: document.body.classList.contains('dark-theme') ? '#fff' : '#000' }
};

// Initialize chart
function initChart() {
    if (typeof Plotly === 'undefined') return;
    
    Plotly.newPlot('chart', [{
        x: [],
        y: [],
        type: 'scatter',
        name: 'Water Level',
        line: { color: '#1E90FF' }
    }], layout);
}

// WebSocket connection handler
async function connectWebSocket() {
    if (isConnecting || ws?.readyState === WebSocket.OPEN) return;
    isConnecting = true;
    
    try {
        const serverPort = 8080; // Make sure this matches your server port
        ws = new WebSocket(`ws://localhost:${serverPort}`);
        
        ws.onopen = () => {
            console.log('Connected to server');
            waterLevel.style.color = 'inherit';
            isConnecting = false;
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                updateDisplay(data);
                updateChart(data);
                updateStatistics();
                checkAlerts(data);
            } catch (error) {
                console.error('Data parsing error:', error);
            }
        };

        ws.onclose = () => {
            waterLevel.style.color = 'red';
            isConnecting = false;
            setTimeout(connectWebSocket, RECONNECT_DELAY);
        };

        ws.onerror = () => {
            waterLevel.style.color = 'red';
            ws.close();
        };
    } catch (error) {
        console.error('WebSocket connection error:', error);
        isConnecting = false;
        setTimeout(connectWebSocket, RECONNECT_DELAY);
    }
}

function updateDisplay(data) {
    waterLevel.textContent = `${data.distance} cm`;
    statusText.textContent = data.status.toUpperCase();
    
    // Add color coding based on status
    let statusColor;
    switch(data.status) {
        case 'normal':
            statusColor = '#2ecc71'; // Green
            break;
        case 'warning':
            statusColor = '#f39c12'; // Orange
            break;
        case 'danger':
            statusColor = '#e74c3c'; // Red
            break;
        default:
            statusColor = 'inherit';
    }
    
    statusText.style.color = statusColor;
    waterLevel.style.color = statusColor;
    statusIndicator.className = 'indicator ' + data.status;
    waterLevel.className = 'level ' + data.status;
}

// Modify updateChart function
function updateChart(data) {
    if (!document.getElementById('chart')) return;
    
    const now = new Date();
    dataPoints.push({ time: now, level: data.distance });
    
    if (dataPoints.length > maxDataPoints) {
        dataPoints.shift();
    }

    // Filter data points based on current time range
    const filtered = dataPoints.filter(point => 
        (now - point.time) <= timeRange
    );

    const trace = {
        x: filtered.map(point => point.time),
        y: filtered.map(point => point.level),
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#1E90FF' }
    };

    Plotly.newPlot('chart', [trace], layout);
}

function updateStatistics() {
    const levels = dataPoints.map(point => point.level);
    if (levels.length === 0) return;
    
    avgLevel.textContent = `${average(levels).toFixed(1)} cm`;
    maxLevel.textContent = `${Math.max(...levels).toFixed(1)} cm`;
    minLevel.textContent = `${Math.min(...levels).toFixed(1)} cm`;
}

function checkAlerts(data) {
    // Create alert for all status changes
    const alert = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString();
    
    // Add status-specific colors and icons
    let statusIcon, statusColor;
    switch(data.status) {
        case 'normal':
            statusIcon = '✅';
            statusColor = '#2ecc71'; // Green
            break;
        case 'warning':
            statusIcon = '⚠️';
            statusColor = '#f39c12'; // Orange
            break;
        case 'danger':
            statusIcon = '🚨';
            statusColor = '#e74c3c'; // Red
            break;
        default:
            statusIcon = 'ℹ️';
            statusColor = '#3498db';
    }

    // Format status text
    const statusText = data.status === 'normal' ? 'SAFE' : data.status.toUpperCase();

    alert.className = `alert-item ${data.status}`;
    alert.style.borderLeft = `4px solid ${statusColor}`;
    alert.innerHTML = `
        <div class="alert-header">
            <span class="alert-icon">${statusIcon}</span>
            <span class="alert-time">${timestamp}</span>
        </div>
        <div class="alert-message" style="color: ${statusColor}">
            ${statusText}: Water level at ${data.distance} cm
        </div>
    `;
    
    alertsList.insertBefore(alert, alertsList.firstChild);
    
    // Keep only last 5 alerts
    if (alertsList.children.length > 5) {
        alertsList.removeChild(alertsList.lastChild);
    }
}

function average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Time range handlers
document.getElementById('hourView')?.addEventListener('click', () => updateTimeRange(60 * 60 * 1000));
document.getElementById('dayView')?.addEventListener('click', () => updateTimeRange(24 * 60 * 60 * 1000));
document.getElementById('weekView')?.addEventListener('click', () => updateTimeRange(7 * 24 * 60 * 60 * 1000));

// Remove duplicate updateTimeRange handlers and keep only one version
function updateTimeRange(range) {
    const now = new Date();
    
    // Remove active class from all buttons
    [hourButton, dayButton, weekButton].forEach(btn => {
        btn.classList.remove('active');
    });

    // Set time range and active button
    switch(range) {
        case '1H':
            hourButton.classList.add('active');
            timeRange = 60 * 60 * 1000;
            break;
        case '24H':
            dayButton.classList.add('active');
            timeRange = 24 * 60 * 60 * 1000;
            break;
        case '7D':
            weekButton.classList.add('active');
            timeRange = 7 * 24 * 60 * 60 * 1000;
            break;
    }

    // Update chart with current data and new time range
    if (dataPoints.length > 0) {
        const filtered = dataPoints.filter(point => 
            (now - point.time) <= timeRange
        );
        
        Plotly.update('chart', {
            x: [filtered.map(point => point.time)],
            y: [filtered.map(point => point.level)]
        });
    }
}

// Initialize on page load
window.addEventListener('load', () => {
    initChart();
    connectWebSocket();
});

// Theme toggle handler
document.getElementById('theme-toggle')?.addEventListener('click', () => {
    layout.font.color = document.body.classList.contains('dark-theme') ? '#fff' : '#000';
    Plotly.relayout('chart', layout);
});

// Time range functionality
const hourButton = document.getElementById('hourView');
const dayButton = document.getElementById('dayView');
const weekButton = document.getElementById('weekView');

let timeRange = 60 * 60 * 1000; // Default to 1 hour view

// Add click event listeners
hourButton.addEventListener('click', () => updateTimeRange('1H'));
dayButton.addEventListener('click', () => updateTimeRange('24H'));
weekButton.addEventListener('click', () => updateTimeRange('7D'));

// Initialize with 1 hour view when page loads
window.addEventListener('load', () => {
    initChart();
    connectWebSocket();
    updateTimeRange('1H');
});

// Get sensor ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const sensorId = parseInt(urlParams.get('sensorId'));
const riverName = urlParams.get('river');

// Data storage for monitoring
let monitoringData = {
    waterLevels: [],
    timestamps: [],
    alerts: []
};

// Add this after the monitoringData declaration
const historicalData = {
    waterLevels: [],
    timestamps: [],
    maxDataPoints: 1000 // Store up to 1000 historical points
};

// Function to receive data from waterLevelMap.js
function receiveWaterLevelUpdate(data) {
    if (data.sensorId === sensorId) {
        monitoringData.waterLevels.push(data.waterLevel);
        monitoringData.timestamps.push(new Date());
        
        // Keep only last 100 readings
        if (monitoringData.waterLevels.length > 100) {
            monitoringData.waterLevels.shift();
            monitoringData.timestamps.shift();
        }
        
        // Add to historical data
        historicalData.waterLevels.push(data.waterLevel);
        historicalData.timestamps.push(new Date());
        
        // Maintain max length
        if (historicalData.waterLevels.length > historicalData.maxDataPoints) {
            historicalData.waterLevels.shift();
            historicalData.timestamps.shift();
        }
        
        // Store in localStorage
        localStorage.setItem('floodHistory', JSON.stringify({
            waterLevels: historicalData.waterLevels,
            timestamps: historicalData.timestamps
        }));
        
        updateMonitoringDisplay();
    }
}

// Function to load historical data
function loadHistoricalData() {
    const saved = localStorage.getItem('floodHistory');
    if (saved) {
        const data = JSON.parse(saved);
        historicalData.waterLevels = data.waterLevels;
        historicalData.timestamps = data.timestamps.map(t => new Date(t));
    }
}

// Function to update monitoring display
function updateMonitoringDisplay() {
    // Update charts and displays
    if (typeof updateChart === 'function') {
        updateChart(monitoringData);
    }
}

// Enhanced monitoring interface
window.monitorInterface = {
    receiveWaterLevelUpdate: function(data) {
        // Add data to monitoring history
        monitoringData.waterLevels.push(data.waterLevel);
        monitoringData.timestamps.push(data.timestamp);
        
        // Add status and alert if needed
        if (data.status === 'critical' || data.status === 'warning') {
            monitoringData.alerts.push({
                time: data.timestamp,
                level: data.waterLevel,
                status: data.status,
                message: `${data.river} at ${data.location}: Water level ${data.waterLevel}m`
            });
        }
        
        // Keep data within limits
        if (monitoringData.waterLevels.length > 100) {
            monitoringData.waterLevels.shift();
            monitoringData.timestamps.shift();
        }
        
        // Update displays
        updateMonitoringDisplay();
        updateChart(monitoringData);
        checkAlerts(data);
    },
    getSensorId: () => sensorId,
    getRiverName: () => riverName
};

// Call this when page loads
window.addEventListener('load', () => {
    loadHistoricalData();
    initChart();
    connectWebSocket();
    updateTimeRange('1H');
});

function exportData(format) {
    const data = {
        river: riverName,
        readings: monitoringData.waterLevels.map((level, index) => ({
            timestamp: monitoringData.timestamps[index],
            waterLevel: level
        }))
    };

    switch(format) {
        case 'csv':
            exportCSV(data);
            break;
        case 'json':
            exportJSON(data);
            break;
        case 'pdf':
            exportPDF(data);
            break;
    }
}

function exportCSV(data) {
    const csv = data.readings.map(reading => 
        `${reading.timestamp},${reading.waterLevel}`
    ).join('\n');
    downloadFile(csv, 'flood-data.csv', 'text/csv');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

function exportJSON(data) {
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, 'flood-data.json', 'application/json');
}

function exportPDF(data) {
    const docDefinition = {
        content: [
            { text: 'Flood Monitoring Data Report', style: 'header' },
            { text: `River: ${data.river}`, style: 'subheader' },
            {
                table: {
                    headerRows: 1,
                    widths: ['*', '*'],
                    body: [
                        ['Timestamp', 'Water Level (m)'],
                        ...data.readings.map(reading => [
                            new Date(reading.timestamp).toLocaleString(),
                            reading.waterLevel.toFixed(2)
                        ])
                    ]
                }
            }
        ],
        styles: {
            header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
            subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] }
        }
    };

    pdfMake.createPdf(docDefinition).download('flood-data.pdf');
}

// ...existing code...

function addExportControls() {
    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', () => {
        const container = document.querySelector('.monitor-container');
        
        if (!container) {
            console.warn('Monitor container not found, creating one');
            const newContainer = document.createElement('div');
            newContainer.className = 'monitor-container';
            document.body.insertBefore(newContainer, document.body.firstChild);
            return addExportControls(); // Retry after creating container
        }

        // Check if export controls already exist
        if (container.querySelector('.export-controls')) {
            return;
        }

        const controls = document.createElement('div');
        controls.className = 'export-controls';
        controls.innerHTML = `
            <div class="export-dropdown">
                <button class="export-btn">Export Data ▼</button>
                <div class="export-menu">
                    <button onclick="exportData('csv')">CSV</button>
                    <button onclick="exportData('json')">JSON</button>
                    <button onclick="exportData('pdf')">PDF</button>
                </div>
            </div>
        `;
        
        container.insertBefore(controls, container.firstChild);
    });
}

// Update the load event listener to ensure proper initialization order
window.addEventListener('load', () => {
    loadHistoricalData();
    initChart();
    connectWebSocket();
    updateTimeRange('1H');
    addExportControls();
});

// ...existing code...
