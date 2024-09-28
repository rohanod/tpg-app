document.getElementById('bus-form').addEventListener('submit', function (e) {
    e.preventDefault();
    fetchAndDisplayBusInfo();
});

document.getElementById('fetch-bus-timings').addEventListener('click', fetchAndDisplayBusInfo);

function fetchAndDisplayBusInfo() {
    const stopName = document.getElementById('stop-name').value.trim();
    if (!stopName) return;

    console.log(`Fetching data for stop: ${stopName}`); // Log the stop name for debug

    fetch(`https://transport.opendata.ch/v1/locations?query=${stopName}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Station data received:", data); // Log the response

            if (!data || data.stations.length === 0) {
                console.log("No stations found for the provided stop name.");
                alert('No matching station found.');
                return;
            }

            const stationId = data.stations[0].id;
            console.log(`Station ID for ${stopName}:`, stationId); // Log the station ID
            
            return fetch(`https://transport.opendata.ch/v1/stationboard?station=${stationId}&limit=50`);
        })
        .then(response => {
            if (!response) return; // Exit if no response from previous fetch
            return response.json();
        })
        .then(data => {
            console.log("Bus stationboard data received:", data); // Log the stationboard data

            const busInfoContainer = document.getElementById('bus-info');
            busInfoContainer.innerHTML = '';

            const filteredBuses = data.stationboard.filter(bus => {
                return bus.passList.some(pass => pass.station && pass.station.name && pass.station.name.toLowerCase() === stopName.toLowerCase());
            });

            if (filteredBuses.length === 0) {
                busInfoContainer.innerHTML = `<p>No buses departing from ${stopName} were found.</p>`;
                return;
            }

            filteredBuses.forEach(bus => {
                const relevantStop = bus.passList.find(pass => pass.station && pass.station.name && pass.station.name.toLowerCase() === stopName.toLowerCase());
                const busItem = document.createElement('div');
                busItem.classList.add('bus-info-item');
                busItem.innerHTML = `
                    <div class="bus-line">Bus ${bus.number} From ${stopName} → ${bus.to}</div>
                    <div class="departure-time">Departure: ${new Date(relevantStop.departureTimestamp * 1000).toLocaleTimeString()}</div>
                `;
                busItem.addEventListener('click', () => showModal(bus, relevantStop));
                busInfoContainer.appendChild(busItem);
            });
        })
        .catch(error => {
            console.error('Error fetching bus info:', error); // Log errors to console
        });
}

function showModal(bus, relevantStop) {
    const modal = document.getElementById('popup-modal');
    const modalBody = document.getElementById('modal-body');

    const subsequentStops = bus.passList.slice(
        bus.passList.indexOf(relevantStop) + 1,
        bus.passList.indexOf(relevantStop) + 6
    );

    modalBody.innerHTML = `
        <h2>Bus ${bus.number} → ${bus.to}</h2>
        <p>Departure from ${relevantStop.station.name}: ${new Date(relevantStop.departureTimestamp * 1000).toLocaleTimeString()}</p>
        <ul>
            ${subsequentStops.map(pass => `
                <li>${pass.station.name}: ${new Date(pass.departureTimestamp * 1000).toLocaleTimeString()}</li>
            `).join('')}
        </ul>
    `;
    modal.style.display = 'flex';
}

document.querySelector('.close').addEventListener('click', function () {
    document.getElementById('popup-modal').style.display = 'none';
});

window.onclick = function (event) {
    const modal = document.getElementById('popup-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};
