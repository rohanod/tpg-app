let debounceTimer;

document.getElementById('bus-form').addEventListener('submit', function (e) {
    e.preventDefault();
    fetchAndDisplayBusInfo();
});

document.getElementById('fetch-bus-timings').addEventListener('click', fetchAndDisplayBusInfo);

document.getElementById('stop-name').addEventListener('keyup', function (e) {
    if (e.key === 'Enter') {
        fetchAndDisplayBusInfo();
    }
});

function debounceFetch(callback, delay = 300) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(callback, delay);
}

function fetchAndDisplayBusInfo() {
    const stopName = document.getElementById('stop-name').value.trim();
    if (!stopName) return displayError('Please enter a bus stop name.');

    debounceFetch(() => {
        fetch(`https://transport.opendata.ch/v1/locations?query=${stopName}`)
            .then(response => response.json())
            .then(data => {
                if (!data.stations.length) throw new Error('No bus stop found.');
                const stationId = data.stations[0].id;
                return fetch(`https://transport.opendata.ch/v1/stationboard?station=${stationId}&limit=100`);
            })
            .then(response => response.json())
            .then(data => {
                displayBusInfo(data.stationboard);
            })
            .catch(error => displayError(error.message));
    });
}

function displayBusInfo(busList) {
    const busInfoContainer = document.getElementById('bus-info');
    busInfoContainer.innerHTML = '';

    busList.forEach((bus) => {
        const busItem = document.createElement('div');
        busItem.classList.add('bus-info-item');
        busItem.innerHTML = `<div class="bus-line">Bus ${bus.number} → ${bus.to}</div>`;
        busItem.addEventListener('click', () => showModal(bus));
        busInfoContainer.appendChild(busItem);
    });
}

function showModal(bus) {
    const modal = document.getElementById('popup-modal');
    const modalBody = document.getElementById('modal-body');

    modalBody.innerHTML = `
        <h2>Bus ${bus.number} → ${bus.to}</h2>
        <p>Departure: ${new Date(bus.stop.departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        <ul>
            ${bus.passList.slice(0, 5).map(stop => `<li>${stop.station.name}: ${new Date(stop.departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</li>`).join('')}
        </ul>
    `;

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10); // Smooth transition
}

function closeModal() {
    const modal = document.getElementById('popup-modal');
    modal.classList.remove('visible');
    setTimeout(() => modal.style.display = 'none', 300); // Match the transition duration
}

document.querySelector('.close').addEventListener('click', closeModal);

window.onclick = function (event) {
    const modal = document.getElementById('popup-modal');
    if (event.target === modal) {
        closeModal();
    }
};

function displayError(message) {
    const busInfoContainer = document.getElementById('bus-info');
    busInfoContainer.innerHTML = `<div class="error-message">${message}</div>`;
}
