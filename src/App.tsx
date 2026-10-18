import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { UnitSystem, WeatherData, WeatherLocation } from './types';

const CACHE_KEY = 'breeze-weather-cache';

const weatherCodeMap: Record<number, string> = {
  0: 'Clear',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Cloudy',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Heavy freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Heavy rain showers',
  82: 'Violent rain showers',
  85: 'Light snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm'
};

function cToF(c: number) {
  return (c * 9) / 5 + 32;
}

function formatTemp(value: number, unit: UnitSystem) {
  return `${unit === 'celsius' ? value.toFixed(1) : cToF(value).toFixed(1)}°${unit === 'celsius' ? 'C' : 'F'}`;
}

function formatWind(speed: number, unit: UnitSystem) {
  const kmh = speed;
  const mph = speed * 0.621371;
  const display = unit === 'celsius' ? kmh : mph;
  return `${display.toFixed(1)} ${unit === 'celsius' ? 'km/h' : 'mph'}`;
}

function getWeatherEmoji(code: number) {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '🌤️';
}

async function searchCity(name: string): Promise<WeatherLocation[]> {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=8&language=en&format=json`);
  if (!res.ok) throw new Error('City search failed');

  const data = await res.json();
  return (data.results || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    country: r.country,
    admin1: r.admin1,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone
  }));
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current_weather: 'true',
    hourly: 'temperature_2m,weathercode',
    daily: 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum',
    timezone: 'auto',
    forecast_days: '7'
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!res.ok) throw new Error('Weather fetch failed');
  return res.json();
}

function App() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<WeatherLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<WeatherLocation | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unit, setUnit] = useState<UnitSystem>('celsius');
  const [cachedCities, setCachedCities] = useState<WeatherLocation[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setCachedCities(Array.isArray(parsed) ? parsed : []);
      } catch {
        // ignore invalid cache
      }
    }
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const results = await searchCity(query);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const hourlyChartData = useMemo(() => {
    if (!weather) return [];
    return weather.hourly.time.slice(0, 24).map((time, index) => ({
      time: new Date(time).toLocaleTimeString([], { hour: 'numeric' }),
      temp: weather.hourly.temperature_2m[index]
    }));
  }, [weather]);

  const dailyCards = useMemo(() => {
    if (!weather) return [];
    return weather.daily.time.map((day, index) => ({
      day: new Date(day).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
      max: weather.daily.temperature_2m_max[index],
      min: weather.daily.temperature_2m_min[index],
      rain: weather.daily.precipitation_sum[index],
      code: weather.daily.weathercode[index]
    }));
  }, [weather]);

  const handleSelectLocation = async (loc: WeatherLocation) => {
    setSelectedLocation(loc);
    setQuery(`${loc.name}${loc.admin1 ? `, ${loc.admin1}` : ''}${loc.country ? `, ${loc.country}` : ''}`);
    setSuggestions([]);
    setLoading(true);
    setError('');

    try {
      const nextWeather = await fetchWeather(loc.latitude, loc.longitude);
      setWeather(nextWeather);

      const existing = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
      const list = [loc, ...existing.filter((item: WeatherLocation) => item.id !== loc.id)].slice(0, 6);
      localStorage.setItem(CACHE_KEY, JSON.stringify(list));
      setCachedCities(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          const data = await fetchWeather(lat, lon);
          setWeather(data);

          const fallbackLocation: WeatherLocation = {
            id: Date.now(),
            name: 'Your location',
            latitude: lat,
            longitude: lon,
            country: '',
            admin1: '',
            timezone: data.timezone
          };

          setSelectedLocation(fallbackLocation);
          setQuery('Your location');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Location weather fetch failed.');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Permission denied for location access.');
        setLoading(false);
      }
    );
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Forecast</p>
          <h1>Breeze</h1>
        </div>

        <div className="toolbar">
          <div className="search-wrap">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city..."
              aria-label="Search city"
            />
            {suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map((loc) => (
                  <button key={loc.id} type="button" onClick={() => handleSelectLocation(loc)}>
                    {loc.name}
                    {loc.admin1 ? `, ${loc.admin1}` : ''}
                    {loc.country ? `, ${loc.country}` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" className="secondary" onClick={handleUseMyLocation}>
            Use my location
          </button>

          <div className="segmented">
            <button
              type="button"
              className={unit === 'celsius' ? 'active' : ''}
              onClick={() => setUnit('celsius')}
            >
              °C
            </button>
            <button
              type="button"
              className={unit === 'fahrenheit' ? 'active' : ''}
              onClick={() => setUnit('fahrenheit')}
            >
              °F
            </button>
          </div>
        </div>
      </header>

      {error && <div className="status error">{error}</div>}

      {loading && <div className="status">Loading weather...</div>}

      {cachedCities.length > 0 && (
        <section className="recent">
          <h2>Recent locations</h2>
          <div className="chip-row">
            {cachedCities.map((loc) => (
              <button key={`${loc.id}-${loc.name}`} type="button" className="chip" onClick={() => handleSelectLocation(loc)}>
                {loc.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {weather && selectedLocation && (
        <>
          <section className="hero card">
            <div>
              <p className="label">Current weather</p>
              <h2>{selectedLocation.name}</h2>
              <div className="temp-block">
                <span className="temp">
                  {formatTemp(
                    unit === 'celsius' ? weather.current_weather.temperature : cToF(weather.current_weather.temperature),
                    unit
                  )}
                </span>
                <span className="weather-emoji">{getWeatherEmoji(weather.current_weather.weathercode)}</span>
              </div>
              <p className="meta">
                {weatherCodeMap[weather.current_weather.weathercode] || 'Weather'} •{' '}
                {formatWind(weather.current_weather.windspeed, unit)}
              </p>
            </div>
            <div className="today-summary">
              <div>
                <span>Updated</span>
                <strong>{new Date(weather.current_weather.time).toLocaleString()}</strong>
              </div>
              <div>
                <span>Timezone</span>
                <strong>{weather.timezone}</strong>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="section-head">
              <h3>Hourly forecast</h3>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyChartData}>
                  <defs>
                    <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6ee7b7" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#6ee7b7" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3b50" />
                  <XAxis dataKey="time" stroke="#a7b9d1" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#a7b9d1" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [
                      `${unit === 'celsius' ? value.toFixed(1) : cToF(value).toFixed(1)}°${unit === 'celsius' ? 'C' : 'F'}`,
                      'Temperature'
                    ]}
                  />
                  <Area type="monotone" dataKey="temp" stroke="#6ee7b7" fill="url(#tempFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card">
            <div className="section-head">
              <h3>7-day forecast</h3>
            </div>
            <div className="forecast-grid">
              {dailyCards.map((day) => (
                <div key={day.day} className="forecast-card">
                  <div className="forecast-day">{day.day}</div>
                  <div className="forecast-emoji">{getWeatherEmoji(day.code)}</div>
                  <div className="forecast-weather">{weatherCodeMap[day.code] || 'Weather'}</div>
                  <div className="forecast-temp">
                    {formatTemp(unit === 'celsius' ? day.max : cToF(day.max), unit)} /{' '}
                    {formatTemp(unit === 'celsius' ? day.min : cToF(day.min), unit)}
                  </div>
                  <div className="forecast-rain">Rain: {day.rain.toFixed(1)} mm</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default App;
