document.getElementById('bus-form').addEventListener('submit', function (e) {
    e.preventDefault();
    fetchAndDisplayBusInfo();
});

document.getElementById('fetch-bus-timings').addEventListener('click', fetchAndDisplayBusInfo);

function fetchAndDisplayBusInfo() {
    const stopName = document.getElementById('stop-name').value;
    if (!stopName) return;

    fetch(`https://transport.opendata.ch/v1/locations?query=${stopName}`)
        .then(response => response.json())
        .then(data => {
            if (data.stations.length === 0) {
                alert('No bus stops found.');
                return;
            }
            const stationId = data.stations[0].id;
            return fetch(`https://transport.opendata.ch/v1/stationboard?station=${stationId}&limit=100`);
        })
        .then(response => response.json())
        .then(data => {
            const busInfoContainer = document.getElementById('bus-info');
            busInfoContainer.innerHTML = '';

            data.stationboard.forEach((bus) => {
                const busItem = document.createElement('div');
                busItem.classList.add('bus-info-item');
                busItem.innerHTML = `
                    <div class="bus-line">Bus ${bus.number} → ${bus.to}</div>
                `;
                busItem.addEventListener('click', () => showModal(bus));
                busInfoContainer.appendChild(busItem);
            });
        });
}

function showModal(bus) {
    const modal = document.getElementById('popup-modal');
    const modalBody = document.getElementById('modal-body');

    const sortedTimes = bus.passList
        .map(stop => {
            return {
                stationName: stop.station.name ? stop.station.name : 'Unknown stop',
                departureTime: stop.departure
            };
        })
        .slice(0, 5); // Limit to 5 times

    if (sortedTimes.length === 0) {
        modalBody.innerHTML = `<h2>Bus ${bus.number} → ${bus.to}</h2><p>No upcoming departures.</p>`;
    } else {
        modalBody.innerHTML = `
            <h2>Bus ${bus.number} → ${bus.to}</h2>
            <ul>
                ${sortedTimes.map(stop => `<li>${stop.stationName}: ${stop.departureTime}</li>`).join('')}
            </ul>
        `;
    }
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
