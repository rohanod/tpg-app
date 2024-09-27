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
            if (!response.ok) throw new Error('Failed to fetch data.');
            const data = await response.json();
            processBusData(data, busNumber);
        } catch (error) {
            busInfoContainer.innerHTML = "Error fetching data. Please try again.";
        }
    }

    function processBusData(data, busNumber) {
        busInfoContainer.innerHTML = '';
        const buses = {};

        if (data.stationboard) {
            data.stationboard.forEach(bus => {
                const minutesAway = Math.round((new Date(bus.stop.departure) - new Date()) / 60000);
                const busLine = bus.number;
                const destination = bus.to;

                if (!buses[busLine]) buses[busLine] = { destination: destination, timings: [] };
                buses[busLine].timings.push(minutesAway);
            });

            Object.keys(buses).forEach(busLine => {
                const busDetails = buses[busLine];
                const busInfo = `<div class="bus-info-item">Bus ${busLine} to ${busDetails.destination}: ${busDetails.timings.join(' min, ')} min</div>`;
                busInfoContainer.innerHTML += busInfo;
            });
        }
    }

    fetchBusTimingsButton.addEventListener('click', fetchAndDisplayBusInfo);

    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
});
