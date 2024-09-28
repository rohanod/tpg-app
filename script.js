document.getElementById('bus-form').addEventListener('submit', function (e) {
    e.preventDefault();
    fetchAndDisplayBusInfo();
});

document.getElementById('fetch-bus-timings').addEventListener('click', fetchAndDisplayBusInfo);

async function fetchAndDisplayBusInfo() {
    const stopName = document.getElementById('stop-name').value.trim();
    if (!stopName) return;

    try {
        console.log(`Fetching data for stop: ${stopName}`);

        const locationResponse = await fetch(`https://transport.opendata.ch/v1/locations?query=${stopName}`);
        if (!locationResponse.ok) {
            throw new Error(`Network response was not ok: ${locationResponse.statusText}`);
        }
        
        const locationData = await locationResponse.json();
        console.log('Station data received:', locationData);

        if (!locationData || locationData.stations.length === 0) {
            alert('No matching station found.');
            return;
        }

        const stationId = locationData.stations[0].id;
        console.log(`Station ID for ${stopName}: ${stationId}`);

        const stationboardResponse = await fetch(`https://transport.opendata.ch/v1/stationboard?station=${stationId}&limit=50`);
        if (!stationboardResponse.ok) {
            throw new Error(`Network response was not ok: ${stationboardResponse.statusText}`);
        }

        const stationboardData = await stationboardResponse.json();
        console.log('Bus stationboard data received:', stationboardData);

        const busInfoContainer = document.getElementById('bus-info');
        busInfoContainer.innerHTML = '';

        const filteredBuses = stationboardData.stationboard.filter(bus => {
            return bus.passList.some(pass => pass.station && pass.station.name === stopName);
        });

        if (filteredBuses.length === 0) {
            busInfoContainer.innerHTML = `<p>No buses departing from ${stopName} were found.</p>`;
            return;
        }

        filteredBuses.forEach(bus => {
            const relevantStop = bus.passList.find(pass => pass.station && pass.station.name === stopName);
            const busItem = document.createElement('div');
            busItem.classList.add('bus-info-item');
            busItem.innerHTML = `
                <div class="bus-line">Bus ${bus.number} From ${stopName} → ${bus.to}</div>
                <div class="departure-time">Departure: ${new Date(relevantStop.departureTimestamp * 1000).toLocaleTimeString()}</div>
            `;
            busItem.addEventListener('click', () => showModal(bus, relevantStop));
            busInfoContainer.appendChild(busItem);
        });

    } catch (error) {
        console.error('Error fetching bus info:', error);
    }
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
