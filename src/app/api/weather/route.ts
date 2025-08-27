import { NextRequest, NextResponse } from 'next/server';

// For server-side API routes, use the regular env var name (not NEXT_PUBLIC_)
const OPENWEATHER_API_KEY =
  process.env.OPENWEATHER_API_KEY || process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!OPENWEATHER_API_KEY) {
      return NextResponse.json({ error: 'Weather API key not configured' }, { status: 500 });
    }

    if (!city && (!lat || !lon)) {
      return NextResponse.json(
        { error: 'Missing required parameters: city or lat/lon' },
        { status: 400 }
      );
    }

    // Log API key for debugging (only first few characters for security)
    const apiKeyPreview = OPENWEATHER_API_KEY
      ? `${OPENWEATHER_API_KEY.substring(0, 8)}...`
      : 'NOT_FOUND';
    console.log('🔑 Using API key:', apiKeyPreview);

    let url: string;

    if (lat && lon) {
      // Use coordinates
      url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=en`;
    } else {
      // Use city name
      url = `${BASE_URL}/weather?q=${encodeURIComponent(city!)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=en`;
    }

    console.log(
      '🌤️ Proxying weather request to:',
      url.replace(OPENWEATHER_API_KEY, '***HIDDEN***')
    );

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Weather API error:', response.status, response.statusText);
      console.error('❌ Error details:', errorText);

      return NextResponse.json(
        {
          error: `Weather API error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Weather data received successfully');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error in weather proxy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
