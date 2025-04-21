const waterLevelSlider = document.getElementById('waterLevel');
const levelValue = document.getElementById('levelValue');
const waterLevelDisplay = document.getElementById('water-level');
const statusIndicator = document.getElementById('status-indicator');

function updateStatus(distance) {
    waterLevelDisplay.textContent = `${distance} cm`;
    statusIndicator.className = 'indicator';
    
    if (distance >= 200) {
        statusIndicator.classList.add('normal');
    } else if (distance > 100) {
        statusIndicator.classList.add('warning');
    } else {
        statusIndicator.classList.add('danger');
    }
}

waterLevelSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    levelValue.textContent = value;
    updateStatus(value);
});

// Initial update
updateStatus(waterLevelSlider.value);
