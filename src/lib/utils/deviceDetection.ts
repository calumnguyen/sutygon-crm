export const detectDeviceType = (): string => {
  if (typeof window === 'undefined') return 'Desktop';

  const userAgent = navigator.userAgent;
  const userAgentLower = userAgent.toLowerCase();

  console.log('User Agent:', userAgent);

  // iOS Devices
  if (/iphone/i.test(userAgent)) {
    if (/iphone 16/i.test(userAgent)) return 'iPhone 16';
    if (/iphone 15/i.test(userAgent)) return 'iPhone 15';
    if (/iphone 14/i.test(userAgent)) return 'iPhone 14';
    if (/iphone 13/i.test(userAgent)) return 'iPhone 13';
    if (/iphone 12/i.test(userAgent)) return 'iPhone 12';
    if (/iphone 11/i.test(userAgent)) return 'iPhone 11';
    return 'iPhone';
  }

  if (/ipad/i.test(userAgent)) {
    if (/ipad pro/i.test(userAgent)) return 'iPad Pro';
    if (/ipad air/i.test(userAgent)) return 'iPad Air';
    if (/ipad mini/i.test(userAgent)) return 'iPad Mini';
    return 'iPad';
  }

  // Android Devices
  if (/android/i.test(userAgent)) {
    if (/samsung/i.test(userAgent)) {
      if (/galaxy s24/i.test(userAgent)) return 'Samsung Galaxy S24';
      if (/galaxy s23/i.test(userAgent)) return 'Samsung Galaxy S23';
      if (/galaxy s22/i.test(userAgent)) return 'Samsung Galaxy S22';
      if (/galaxy tab/i.test(userAgent)) return 'Samsung Galaxy Tab';
      return 'Samsung Galaxy';
    }
    if (/pixel/i.test(userAgent)) {
      if (/pixel 8/i.test(userAgent)) return 'Google Pixel 8';
      if (/pixel 7/i.test(userAgent)) return 'Google Pixel 7';
      return 'Google Pixel';
    }
    if (/oneplus/i.test(userAgent)) return 'OnePlus';
    if (/xiaomi/i.test(userAgent)) return 'Xiaomi';
    return 'Android Device';
  }

  // Desktop/Laptop Detection - Check Mac first
  if (/macintosh|mac os x/i.test(userAgentLower)) {
    console.log('Mac detected, checking specific model...');
    // Check for specific Mac models in the user agent
    if (/macbook pro/i.test(userAgentLower)) {
      console.log('MacBook Pro detected');
      return 'MacBook Pro';
    }
    if (/macbook air/i.test(userAgentLower)) {
      console.log('MacBook Air detected');
      return 'MacBook Air';
    }
    if (/imac/i.test(userAgentLower)) {
      console.log('iMac detected');
      return 'iMac';
    }
    if (/mac mini/i.test(userAgentLower)) {
      console.log('Mac Mini detected');
      return 'Mac Mini';
    }
    if (/mac pro/i.test(userAgentLower)) {
      console.log('Mac Pro detected');
      return 'Mac Pro';
    }

    // If it's a Mac but no specific model, try to detect based on screen size
    if (typeof window !== 'undefined') {
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      console.log(`Screen size: ${screenWidth}x${screenHeight}`);

      // MacBook Pro typically has higher resolution
      if (screenWidth >= 1440 || screenHeight >= 900) {
        console.log('Detected as MacBook Pro based on screen size');
        return 'MacBook Pro';
      } else {
        console.log('Detected as MacBook Air based on screen size');
        return 'MacBook Air';
      }
    }

    console.log('Generic Mac detected');
    return 'Mac';
  }

  if (/windows/i.test(userAgent)) {
    if (/surface/i.test(userAgent)) {
      if (/surface pro/i.test(userAgent)) return 'Surface Pro';
      if (/surface laptop/i.test(userAgent)) return 'Surface Laptop';
      return 'Surface';
    }
    return 'Windows PC';
  }

  if (/linux/i.test(userAgent)) return 'Linux PC';

  // Mobile detection fallback
  if (/mobile|phone|blackberry|opera mini|iemobile/i.test(userAgentLower)) {
    return 'Mobile Device';
  }

  return 'Desktop';
};

export const getLocationFromIP = async (): Promise<string> => {
  // Enhanced list of reliable IP geolocation providers for precision
  const providers = [
    {
      name: 'ipapi.co',
      url: 'https://ipapi.co/json/',
      parser: (data: Record<string, unknown>) => {
        if (data.city && data.country_name) {
          return `${data.city}, ${data.country_name}`;
        }
        return null;
      },
    },
    {
      name: 'ipinfo.io',
      url: 'https://ipinfo.io/json',
      parser: (data: Record<string, unknown>) => {
        if (data.city && data.country) {
          return `${data.city}, ${data.country}`;
        }
        return null;
      },
    },
    {
      name: 'ip-api.com',
      url: 'https://ip-api.com/json/',
      parser: (data: Record<string, unknown>) => {
        if (data.city && data.country) {
          return `${data.city}, ${data.country}`;
        }
        return null;
      },
    },
    {
      name: 'freegeoip.app',
      url: 'https://freegeoip.app/json/',
      parser: (data: Record<string, unknown>) => {
        if (data.city_name && data.country_name) {
          return `${data.city_name}, ${data.country_name}`;
        }
        return null;
      },
    },
    {
      name: 'ipapi.com',
      url: 'https://api.ipapi.com/api/check?access_key=test',
      parser: (data: Record<string, unknown>) => {
        if (data.city && data.country_name) {
          return `${data.city}, ${data.country_name}`;
        }
        return null;
      },
    },
    {
      name: 'ipgeolocation.io',
      url: 'https://api.ipgeolocation.io/ipgeo?apiKey=test',
      parser: (data: Record<string, unknown>) => {
        if (data.city && data.country_name) {
          return `${data.city}, ${data.country_name}`;
        }
        return null;
      },
    },
  ];

  for (const provider of providers) {
    try {
      console.log(`🌐 Trying ${provider.name} for precise IP geolocation...`);
      const response = await fetch(provider.url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.log(`❌ ${provider.name} failed with status: ${response.status}`);
        continue;
      }

      const data = await response.json();
      console.log(`📡 ${provider.name} response:`, data);

      const location = provider.parser(data);
      if (location) {
        console.log(`✅ Precise city location from ${provider.name}: ${location}`);
        return location;
      }
    } catch (error) {
      console.error(`❌ ${provider.name} failed:`, error);
      continue;
    }
  }

  // Method 3: Advanced browser-based detection with network info
  console.log('🌐 All IP providers failed, using advanced browser detection...');
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language || navigator.languages?.[0] || 'en';
    const userAgent = navigator.userAgent;

    console.log(`📍 Browser timezone: ${timezone}`);
    console.log(`🌍 Browser language: ${language}`);
    console.log(`🔧 User agent: ${userAgent.substring(0, 100)}...`);

    // Enhanced timezone to location mappings for Vietnam and Asia
    const timezoneMap: Record<string, string> = {
      // Vietnam - precise cities
      'Asia/Ho_Chi_Minh': 'Ho Chi Minh City, VN',
      'Asia/Hanoi': 'Hanoi, VN',
      'Asia/Saigon': 'Ho Chi Minh City, VN',

      // Southeast Asia - major cities
      'Asia/Bangkok': 'Bangkok, TH',
      'Asia/Singapore': 'Singapore, SG',
      'Asia/Manila': 'Manila, PH',
      'Asia/Jakarta': 'Jakarta, ID',
      'Asia/Kuala_Lumpur': 'Kuala Lumpur, MY',
      'Asia/Yangon': 'Yangon, MM',
      'Asia/Phnom_Penh': 'Phnom Penh, KH',
      'Asia/Vientiane': 'Vientiane, LA',

      // East Asia - major cities
      'Asia/Tokyo': 'Tokyo, JP',
      'Asia/Seoul': 'Seoul, KR',
      'Asia/Shanghai': 'Shanghai, CN',
      'Asia/Beijing': 'Beijing, CN',
      'Asia/Hong_Kong': 'Hong Kong, HK',
      'Asia/Taipei': 'Taipei, TW',

      // South Asia - major cities
      'Asia/Kolkata': 'Mumbai, IN',
      'Asia/Dhaka': 'Dhaka, BD',
      'Asia/Karachi': 'Karachi, PK',
      'Asia/Colombo': 'Colombo, LK',
    };

    // Language-based location hints
    const languageMap: Record<string, string> = {
      vi: 'Vietnam',
      'vi-VN': 'Vietnam',
      th: 'Thailand',
      'th-TH': 'Thailand',
      id: 'Indonesia',
      'id-ID': 'Indonesia',
      ms: 'Malaysia',
      'ms-MY': 'Malaysia',
      tl: 'Philippines',
      'tl-PH': 'Philippines',
      my: 'Myanmar',
      'my-MM': 'Myanmar',
      km: 'Cambodia',
      'km-KH': 'Cambodia',
      lo: 'Laos',
      'lo-LA': 'Laos',
    };

    // Check timezone first for precise city
    if (timezoneMap[timezone]) {
      console.log(`✅ Precise location detected from timezone: ${timezoneMap[timezone]}`);
      return timezoneMap[timezone];
    }

    // Check language hints
    const langCode = language.split('-')[0];
    if (languageMap[language] || languageMap[langCode]) {
      const country = languageMap[language] || languageMap[langCode];
      console.log(`✅ Location detected from language: ${country}`);
      return `${country}`;
    }

    // If timezone is not in our map, try to extract region info
    if (timezone.includes('Asia/')) {
      const region = timezone.replace('Asia/', '');
      console.log(`🌏 Using timezone region: ${region}`);
      return `${region}, Asia`;
    }

    // Last resort: use language to guess region
    if (language.includes('vi')) {
      console.log(`🇻🇳 Detected Vietnamese language, defaulting to Vietnam`);
      return 'Vietnam';
    }
  } catch (browserError) {
    console.error('❌ Advanced browser detection failed:', browserError);
  }

  console.error('❌ All precise location detection methods failed');
  return 'Unknown Location';
};

// New improved location detection function
export const getAccurateLocation = async (): Promise<string> => {
  if (typeof window === 'undefined') {
    return 'Unknown Location';
  }

  // Method 1: Try browser geolocation with improved reliability
  if ('geolocation' in navigator) {
    try {
      console.log('📍 Attempting precise browser geolocation...');

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Geolocation timeout after 15 seconds'));
        }, 15000);

        const cleanup = () => {
          clearTimeout(timeoutId);
        };

        // Try with high accuracy first
        const tryHighAccuracy = () => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              cleanup();
              resolve(pos);
            },
            (error) => {
              console.log('📍 High accuracy failed, trying low accuracy...');
              // Fallback to low accuracy
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  cleanup();
                  resolve(pos);
                },
                (lowAccuracyError) => {
                  cleanup();
                  console.log('📍 Low accuracy also failed:', lowAccuracyError);
                  reject(lowAccuracyError);
                },
                {
                  enableHighAccuracy: false,
                  timeout: 10000,
                  maximumAge: 300000,
                }
              );
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000,
            }
          );
        };

        tryHighAccuracy();
      });

      const { latitude, longitude } = position.coords;
      console.log(`✅ Precise GPS coordinates obtained: ${latitude}, ${longitude}`);
      console.log(`📍 Accuracy: ${position.coords.accuracy} meters`);

      // Use multiple reverse geocoding services for maximum accuracy
      const geocodingServices = [
        {
          name: 'BigDataCloud',
          url: `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
        },
        {
          name: 'Nominatim',
          url: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12&addressdetails=1`,
        },
        {
          name: 'LocationIQ',
          url: `https://us1.locationiq.com/v1/reverse.php?key=pk.test&lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=12`,
        },
        {
          name: 'Google Geocoding',
          url: `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=test&language=en`,
        },
      ];

      for (const service of geocodingServices) {
        try {
          console.log(`🌐 Trying ${service.name} for precise reverse geocoding...`);
          const response = await fetch(service.url, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(6000),
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`${service.name} response:`, data);

            let city = '';
            let country = '';

            if (service.name === 'BigDataCloud') {
              city = data.city || data.locality || data.town || data.county;
              country = data.countryName || data.country;
            } else if (service.name === 'Nominatim') {
              const address = data.address || {};
              city =
                address.city || address.town || address.village || address.county || address.state;
              country = address.country;
            } else if (service.name === 'LocationIQ') {
              const address = data.address || {};
              city = address.city || address.town || address.village || address.county;
              country = address.country;
            } else if (service.name === 'Google Geocoding') {
              if (data.results && data.results.length > 0) {
                const result = data.results[0];
                const addressComponents = result.address_components || [];

                for (const component of addressComponents) {
                  if (
                    component.types.includes('locality') ||
                    component.types.includes('administrative_area_level_2')
                  ) {
                    city = component.long_name;
                  }
                  if (component.types.includes('country')) {
                    country = component.long_name;
                  }
                }
              }
            }

            if (city && country) {
              const location = `${city}, ${country}`;
              console.log(`✅ Precise city location from ${service.name}: ${location}`);
              return location;
            }
          }
        } catch (error) {
          console.error(`${service.name} failed:`, error);
          continue;
        }
      }

      console.log('❌ All reverse geocoding services failed for GPS coordinates');
    } catch (geolocationError) {
      console.log('📍 Browser geolocation failed, trying alternative methods...');

      // Log detailed error information
      if (geolocationError instanceof GeolocationPositionError) {
        console.log('📍 Geolocation error code:', geolocationError.code);
        console.log('📍 Geolocation error message:', geolocationError.message);
      } else if (geolocationError instanceof Error) {
        console.log('📍 Geolocation error message:', geolocationError.message);
      }
    }
  }

  // Method 2: Enhanced IP geolocation with multiple providers for precision
  console.log('🔄 Using enhanced IP geolocation for precise city detection...');
  return await getLocationFromIP();
};

export const getBrowserInfo = (): string => {
  if (typeof window === 'undefined') return 'Unknown Browser';

  const userAgent = navigator.userAgent;
  console.log('Browser detection - User Agent:', userAgent);

  // Check for Edge first (Edge includes Chrome in user agent)
  if (userAgent.includes('Edg/')) {
    console.log('Microsoft Edge detected');
    return 'Microsoft Edge';
  }

  // Check for other browsers
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg/')) {
    console.log('Chrome detected');
    return 'Chrome';
  }

  if (userAgent.includes('Firefox')) {
    console.log('Firefox detected');
    return 'Firefox';
  }

  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    console.log('Safari detected');
    return 'Safari';
  }

  if (userAgent.includes('Opera') || userAgent.includes('OPR/')) {
    console.log('Opera detected');
    return 'Opera';
  }

  if (userAgent.includes('Brave')) {
    console.log('Brave detected');
    return 'Brave';
  }

  console.log('Unknown browser detected');
  return 'Unknown Browser';
};
