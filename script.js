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
    modalBody.innerHTML = `
        <h2>Bus ${bus.number} → ${bus.to}</h2>
        <p>Departure: ${new Date(bus.stop.departureTimestamp * 1000).toLocaleTimeString()}</p>
        <ul>
            ${bus.passList.slice(0, 5).map(pass => `
                <li>Stop: ${pass.station.name}, Departure: ${new Date(pass.departureTimestamp * 1000).toLocaleTimeString()}</li>
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
