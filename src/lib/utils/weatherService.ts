interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  feelsLike: number;
  pressure: number;
  visibility: number;
  sunrise: string;
  sunset: string;
}

interface OpenWeatherResponse {
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  wind: {
    speed: number;
  };
  visibility: number;
  sys: {
    sunrise: number;
    sunset: number;
  };
}

class WeatherService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '470a0b9a125a0ebd92c74b652327972e';
    this.baseUrl = '/api/weather'; // Use our proxy API
  }

  async getWeatherData(lat: number, lon: number): Promise<WeatherData | null> {
    try {
      console.log('🌤️ Fetching weather data for coordinates:', { lat, lon });

      const url = `${this.baseUrl}?lat=${lat}&lon=${lon}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
      }

      const data: OpenWeatherResponse = await response.json();

      console.log('✅ Weather data received for coordinates:', data);

      const weatherData: WeatherData = {
        temperature: Math.round(data.main.temp),
        condition: data.weather[0]?.main || 'Unknown',
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
        description: data.weather[0]?.description || 'Unknown',
        icon: data.weather[0]?.icon || '01d',
        feelsLike: Math.round(data.main.feels_like),
        pressure: data.main.pressure,
        visibility: Math.round(data.visibility / 1000), // Convert to km
        sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      };

      return weatherData;
    } catch (error) {
      console.error('❌ Error fetching weather data for coordinates:', error);
      return null;
    }
  }

  async getWeatherByCity(city: string, countryCode?: string): Promise<WeatherData | null> {
    try {
      console.log('🌤️ Fetching weather data for city:', city);

      const location = countryCode ? `${city},${countryCode}` : city;
      const url = `${this.baseUrl}?city=${encodeURIComponent(location)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
      }

      const data: OpenWeatherResponse = await response.json();

      console.log('✅ Weather data received for city:', data);

      const weatherData: WeatherData = {
        temperature: Math.round(data.main.temp),
        condition: data.weather[0]?.main || 'Unknown',
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
        description: data.weather[0]?.description || 'Unknown',
        icon: data.weather[0]?.icon || '01d',
        feelsLike: Math.round(data.main.feels_like),
        pressure: data.main.pressure,
        visibility: Math.round(data.visibility / 1000), // Convert to km
        sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      };

      return weatherData;
    } catch (error) {
      console.error('❌ Error fetching weather data for city:', error);
      return null;
    }
  }

  getWeatherIcon(iconCode: string): string {
    // Map OpenWeather icon codes to weather conditions
    const iconMap: Record<string, string> = {
      '01d': '☀️', // clear sky day
      '01n': '🌙', // clear sky night
      '02d': '⛅', // few clouds day
      '02n': '☁️', // few clouds night
      '03d': '☁️', // scattered clouds
      '03n': '☁️', // scattered clouds
      '04d': '☁️', // broken clouds
      '04n': '☁️', // broken clouds
      '09d': '🌧️', // shower rain
      '09n': '🌧️', // shower rain
      '10d': '🌦️', // rain day
      '10n': '🌧️', // rain night
      '11d': '⛈️', // thunderstorm
      '11n': '⛈️', // thunderstorm
      '13d': '🌨️', // snow
      '13n': '🌨️', // snow
      '50d': '🌫️', // mist
      '50n': '🌫️', // mist
    };

    return iconMap[iconCode] || '🌤️';
  }

  getWeatherDescription(condition: string): string {
    const descriptions: Record<string, string> = {
      Clear: 'Trời quang',
      Clouds: 'Có mây',
      Rain: 'Mưa',
      Drizzle: 'Mưa phùn',
      Thunderstorm: 'Giông bão',
      Snow: 'Tuyết',
      Mist: 'Sương mù',
      Fog: 'Sương mù',
      Haze: 'Mù mịt',
      Smoke: 'Khói mù',
      Dust: 'Bụi',
      Sand: 'Cát',
      Ash: 'Tro',
      Squall: 'Gió mạnh',
      Tornado: 'Lốc xoáy',
    };

    return descriptions[condition] || condition;
  }
}

// Create singleton instance
const weatherService = new WeatherService();

export default weatherService;
export type { WeatherData };
