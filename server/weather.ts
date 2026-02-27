/**
 * Open-Meteo Weather API Service
 * Fetches real-time weather data for Hanoi (21.0285°N, 105.8542°E)
 * Free API - no key required
 */

const HANOI_LAT = 21.0285;
const HANOI_LON = 105.8542;
const TIMEZONE = "Asia/Ho_Chi_Minh";

// Cache weather data for 15 minutes to avoid excessive API calls
let cachedData: WeatherData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface WeatherReading {
  id: string;
  temperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  lightIntensity: number | null;
  soilMoisture: number | null;
  soilPh: number | null;
  windSpeed: number | null;
  recordedAt: string;
  location: string;
  createdAt: string;
}

export interface WeatherData {
  current: WeatherReading;
  hourly: WeatherReading[];
}

// Map WMO weather code to estimated light intensity (lux)
function weatherCodeToLight(code: number, hour: number): number {
  const isNight = hour < 6 || hour >= 18;
  if (isNight) return 0;

  // Clear sky
  if (code <= 1) return 800 + Math.random() * 200;
  // Partly cloudy
  if (code <= 3) return 400 + Math.random() * 300;
  // Foggy
  if (code <= 49) return 200 + Math.random() * 100;
  // Drizzle/Rain
  if (code <= 69) return 100 + Math.random() * 200;
  // Snow
  if (code <= 79) return 150 + Math.random() * 150;
  // Showers
  if (code <= 99) return 80 + Math.random() * 120;
  return 300;
}

export async function fetchWeatherData(): Promise<WeatherData> {
  // Return cached data if still fresh
  const now = Date.now();
  if (cachedData && (now - cacheTimestamp) < CACHE_DURATION_MS) {
    return cachedData;
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(HANOI_LAT));
  url.searchParams.set("longitude", String(HANOI_LON));
  url.searchParams.set("timezone", TIMEZONE);
  url.searchParams.set("past_days", "1");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,rain,weather_code,wind_speed_10m"
  );
  url.searchParams.set(
    "hourly",
    "temperature_2m,relative_humidity_2m,rain,weather_code,wind_speed_10m,soil_moisture_0_to_7cm"
  );

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const data = await response.json();

  // Parse current weather
  const currentHour = new Date().getHours();
  const current: WeatherReading = {
    id: "current",
    temperature: data.current.temperature_2m,
    humidity: data.current.relative_humidity_2m,
    rainfall: data.current.rain,
    lightIntensity: Math.round(weatherCodeToLight(data.current.weather_code, currentHour)),
    soilMoisture: null, // Not available in current
    soilPh: 6.2 + (Math.random() * 0.6 - 0.3), // Simulated pH (stable metric)
    windSpeed: data.current.wind_speed_10m,
    recordedAt: data.current.time,
    location: "Hà Nội",
    createdAt: new Date().toISOString(),
  };

  // Parse hourly data
  const hourly: WeatherReading[] = data.hourly.time.map(
    (time: string, i: number) => {
      const hour = new Date(time).getHours();
      const weatherCode = data.hourly.weather_code?.[i] ?? 0;
      return {
        id: `hourly-${i}`,
        temperature: data.hourly.temperature_2m[i],
        humidity: data.hourly.relative_humidity_2m[i],
        rainfall: data.hourly.rain[i],
        lightIntensity: Math.round(weatherCodeToLight(weatherCode, hour)),
        soilMoisture: data.hourly.soil_moisture_0_to_7cm?.[i]
          ? Math.round(data.hourly.soil_moisture_0_to_7cm[i] * 100)
          : null,
        soilPh: 6.2 + (Math.random() * 0.6 - 0.3),
        windSpeed: data.hourly.wind_speed_10m?.[i] ?? null,
        recordedAt: time,
        location: "Hà Nội",
        createdAt: new Date().toISOString(),
      };
    }
  );

  cachedData = { current, hourly };
  cacheTimestamp = now;

  return cachedData;
}
