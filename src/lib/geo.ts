export interface Landmark {
  id: string;
  name: string;
  city: string;
  category: 'airport' | 'holy_site' | 'hotel_hub' | 'station' | 'city';
  latitude: number;
  longitude: number;
  popular?: boolean;
}

export const SAUDI_LANDMARKS: Landmark[] = [
  {
    id: 'jed-airport-t1',
    name: 'King Abdulaziz International Airport (Terminal 1)',
    city: 'Jeddah',
    category: 'airport',
    latitude: 21.6826,
    longitude: 39.1564,
    popular: true,
  },
  {
    id: 'jed-airport-hajj',
    name: 'King Abdulaziz International Airport (Hajj & Umrah Terminal)',
    city: 'Jeddah',
    category: 'airport',
    latitude: 21.6980,
    longitude: 39.1610,
    popular: true,
  },
  {
    id: 'jed-airport-north',
    name: 'King Abdulaziz Airport (North Terminal)',
    city: 'Jeddah',
    category: 'airport',
    latitude: 21.7058,
    longitude: 39.1481,
    popular: true,
  },
  {
    id: 'makkah-clock-tower',
    name: 'Abraj Al Bait (Clock Tower) / Haram Gate',
    city: 'Makkah',
    category: 'holy_site',
    latitude: 21.4187,
    longitude: 39.8256,
    popular: true,
  },
  {
    id: 'makkah-haram-ajyad',
    name: 'Grand Mosque (Masjid al-Haram) - Ajyad Area',
    city: 'Makkah',
    category: 'holy_site',
    latitude: 21.4225,
    longitude: 39.8262,
    popular: true,
  },
  {
    id: 'makkah-haram-shubaika',
    name: 'Grand Mosque (Masjid al-Haram) - Shubaika',
    city: 'Makkah',
    category: 'holy_site',
    latitude: 21.4233,
    longitude: 39.8209,
    popular: false,
  },
  {
    id: 'makkah-train-station',
    name: 'Haramain High Speed Railway Station (Makkah)',
    city: 'Makkah',
    category: 'station',
    latitude: 21.4262,
    longitude: 39.7904,
    popular: true,
  },
  {
    id: 'madinah-prophet-mosque',
    name: 'The Prophet\'s Mosque (Al-Masjid an-Nabawi)',
    city: 'Madinah',
    category: 'holy_site',
    latitude: 24.4672,
    longitude: 39.6111,
    popular: true,
  },
  {
    id: 'madinah-airport',
    name: 'Prince Mohammad Bin Abdulaziz Airport (MED)',
    city: 'Madinah',
    category: 'airport',
    latitude: 24.5534,
    longitude: 39.7051,
    popular: true,
  },
  {
    id: 'madinah-train-station',
    name: 'Haramain High Speed Railway Station (Madinah)',
    city: 'Madinah',
    category: 'station',
    latitude: 24.4539,
    longitude: 39.6385,
    popular: true,
  },
  {
    id: 'jeddah-corniche',
    name: 'Jeddah Waterfront (Corniche)',
    city: 'Jeddah',
    category: 'hotel_hub',
    latitude: 21.5794,
    longitude: 39.1118,
    popular: true,
  },
];

// Haversine formula to compute great circle distance in Kilometers
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const roadFactor = 1.25; // Highway factor approximating real road distance
  return parseFloat((R * c * roadFactor).toFixed(1));
}

// Estimate drive duration based on highway vs urban speeds
export function estimateDurationMinutes(distanceKm: number): number {
  if (distanceKm <= 10) {
    // City driving ~ 30 km/h average with traffic
    return Math.round((distanceKm / 30) * 60 + 5);
  } else if (distanceKm <= 50) {
    // Mixed ~ 60 km/h
    return Math.round((distanceKm / 60) * 60 + 10);
  } else {
    // Highway (e.g. Jeddah to Makkah 85-95 km ~ 90 km/h)
    return Math.round((distanceKm / 90) * 60 + 15);
  }
}
