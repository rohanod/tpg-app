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

    const now = new Date();
    
    const sortedTimes = bus.passList
        .map(stop => {
            const departureTime = new Date(stop.departure);
            if (!isNaN(departureTime.getTime())) {
                const timeDiffInMinutes = Math.floor((departureTime - now) / 60000);
                return {
                    stationName: stop.station.name ? stop.station.name : 'Unknown stop',
                    departureTime: timeDiffInMinutes
                };
            }
            return null;
        })
        .filter(stop => stop !== null && stop.departureTime >= 0)
        .sort((a, b) => a.departureTime - b.departureTime)
        .slice(0, 5);

    modalBody.innerHTML = `
        <h2>Bus ${bus.number} → ${bus.to}</h2>
        <ul>
            ${sortedTimes.map(stop => `<li>${stop.stationName}: in ${stop.departureTime} minutes</li>`).join('')}
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
