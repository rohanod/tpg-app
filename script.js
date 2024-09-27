document.addEventListener('DOMContentLoaded', function () {
const apiUrl = "https://transport.opendata.ch/v1/connections";
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

const params = {
from: stopName,
limit: 5,
transportations: "bus"
};

try {
const response = await fetch(`${apiUrl}?${new URLSearchParams(params).toString()}`);
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
const buses = {};

data.connections.forEach(connection => {
const busLine = connection.sections[0].journey.number;
const departure = connection.from.departure;
const minutesAway = Math.round((new Date(departure) - new Date()) / 60000);

if (!buses[busLine]) buses[busLine] = [];
buses[busLine].push(minutesAway);
});

Object.keys(buses).forEach(bus => {
if (!busNumber || bus == busNumber) {
const busInfo = document.createElement('div');
busInfo.textContent = `Bus ${bus}: ${buses[bus].join(' min, ')} min`;
busInfoContainer.appendChild(busInfo);
}
});
}

fetchBusTimingsButton.addEventListener('click', fetchAndDisplayBusInfo);
updateCurrentTime();
setInterval(updateCurrentTime, 1000);
});
