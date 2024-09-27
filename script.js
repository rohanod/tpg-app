document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = "https://transport.opendata.ch/v1";
    const busInfoContainer = document.getElementById('bus-info');
    const currentTimeDisplay = document.getElementById('current-time');
    const fetchBusTimingsButton = document.getElementById('fetch-bus-timings');

    function updateCurrentTime() {
        const now = new Date();
        currentTimeDisplay.textContent = now.toLocaleTimeString();
    }

    async function fetchAndDisplayBusInfo() {
        const stopName = document.getElementById('stop-name').value.trim();
        const busNumber = document.getElementById('bus-number').value.trim();

        if (!stopName) {
            busInfoContainer.innerHTML = "Please enter a bus stop name.";
            return;
        }

        let url;
        if (busNumber) {
            url = `${apiUrl}/connections?from=${stopName}&limit=5&transportations[]=bus`;
        } else {
            url = `${apiUrl}/stationboard?station=${stopName}&limit=5&transportations[]=bus`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            processBusData(data, busNumber);
        } catch (error) {
            console.error("Error fetching data:", error);
            busInfoContainer.innerHTML = "An error occurred while fetching bus information.";
        }
    }

    function processBusData(data, busNumber) {
        busInfoContainer.innerHTML = '';
        if (data.connections) {
            data.connections.forEach(connection => {
                const busLine = connection.sections[0].journey.number;
                const minutesAway = Math.round((new Date(connection.from.departure) - new Date()) / 60000);
                busInfoContainer.innerHTML += `<div>Bus ${busLine}: ${minutesAway} min</div>`;
            });
        } else if (data.stationboard) {
            data.stationboard.forEach(bus => {
                const minutesAway = Math.round((new Date(bus.stop.departure) - new Date()) / 60000);
                busInfoContainer.innerHTML += `<div>Bus ${bus.number}: ${minutesAway} min</div>`;
            });
        }
    }

    fetchBusTimingsButton.addEventListener('click', fetchAndDisplayBusInfo);

    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
});
