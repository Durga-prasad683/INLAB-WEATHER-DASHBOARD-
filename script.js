// Open-Meteo: free weather API, no API key needed.
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

// WMO weather codes -> [label, background theme class]
const WEATHER_CODES = {
  0:  ["Clear sky", "clear"],
  1:  ["Mostly clear", "clear"],
  2:  ["Partly cloudy", "cloudy"],
  3:  ["Overcast", "cloudy"],
  45: ["Fog", "fog"],
  48: ["Freezing fog", "fog"],
  51: ["Light drizzle", "rain"],
  53: ["Drizzle", "rain"],
  55: ["Heavy drizzle", "rain"],
  56: ["Freezing drizzle", "rain"],
  57: ["Heavy freezing drizzle", "rain"],
  61: ["Light rain", "rain"],
  63: ["Rain", "rain"],
  65: ["Heavy rain", "rain"],
  66: ["Freezing rain", "rain"],
  67: ["Heavy freezing rain", "rain"],
  71: ["Light snow", "snow"],
  73: ["Snow", "snow"],
  75: ["Heavy snow", "snow"],
  77: ["Snow grains", "snow"],
  80: ["Light rain showers", "rain"],
  81: ["Rain showers", "rain"],
  82: ["Violent rain showers", "rain"],
  85: ["Light snow showers", "snow"],
  86: ["Heavy snow showers", "snow"],
  95: ["Thunderstorm", "storm"],
  96: ["Thunderstorm with hail", "storm"],
  99: ["Severe thunderstorm with hail", "storm"],
};

const form = document.getElementById("search-form");
const input = document.getElementById("city-input");
const button = document.getElementById("search-btn");
const messageEl = document.getElementById("message");
const resultEl = document.getElementById("result");

// Custom error so "city not found" can be told apart from network problems
class CityNotFoundError extends Error {}

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = "message " + type;
  messageEl.hidden = false;
}

function clearMessage() {
  messageEl.hidden = true;
}

// Step 1: city name -> coordinates
async function getCoordinates(city) {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Geocoding request failed (status ${response.status}).`);
  }

  const data = await response.json();

  // The API omits "results" entirely when nothing matches
  if (!data.results || data.results.length === 0) {
    throw new CityNotFoundError(city);
  }

  const { name, country, latitude, longitude } = data.results[0];
  return { name, country, latitude, longitude };
}

// Step 2: coordinates -> current weather
async function getWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code",
    timezone: "auto",
  });
  const response = await fetch(`${WEATHER_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`Weather request failed (status ${response.status}).`);
  }

  const data = await response.json();
  return data.current;
}

function displayWeather(place, current) {
  const [label, theme] = WEATHER_CODES[current.weather_code] || ["Unknown", "cloudy"];

  document.getElementById("city-name").textContent = place.name;
  document.getElementById("country-name").textContent = place.country || "";
  document.getElementById("temperature").textContent = `${Math.round(current.temperature_2m)}°C`;
  document.getElementById("condition").textContent = label;
  document.getElementById("humidity").textContent = `${current.relative_humidity_2m}%`;
  document.getElementById("feels-like").textContent = `${Math.round(current.apparent_temperature)}°C`;

  document.body.className = theme;
  resultEl.hidden = false;
}

async function handleSearch(event) {
  event.preventDefault();
  const city = input.value.trim();

  if (!city) {
    resultEl.hidden = true;
    showMessage("Enter a city name to see its weather.", "error");
    return;
  }

  button.disabled = true;
  resultEl.hidden = true;
  showMessage("Loading weather…", "info");

  try {
    const place = await getCoordinates(city);
    const current = await getWeather(place.latitude, place.longitude);
    clearMessage();
    displayWeather(place, current);
  } catch (error) {
    resultEl.hidden = true;
    document.body.className = "";

    if (error instanceof CityNotFoundError) {
      showMessage(`We couldn't find "${city}". Check the spelling or try a nearby city.`, "error");
    } else if (error instanceof TypeError) {
      // fetch() rejects with a TypeError when the network is down or the request is blocked
      showMessage("Couldn't reach the weather service. Check your internet connection and try again.", "error");
    } else {
      showMessage(`Something went wrong: ${error.message} Please try again.`, "error");
    }
  } finally {
    button.disabled = false;
  }
}

form.addEventListener("submit", handleSearch);