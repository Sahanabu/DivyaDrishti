// DivyaDrishti Smart Helmet Hardware Sensor Data Definitions

export const initialSensorData = {
  mq3: 0,
  acceleration: 1.0,
  pitch: 0,
  roll: 0,
  speed: 0.0,
  drowsiness: 'Normal',
  drowsinessLevel: 'LOW',
  blinkRate: 16,
  eyeClosure: 'Normal',
  emergency: false,
  helmetStatus: 'Standby',
  gps: {
    latitude: 15.4318,
    longitude: 75.6586,
    accuracy: '±4m',
    placeName: 'Gangavathi',
    locationStatus: 'RESOLVED',
  },
  battery: 88,
  wifi: 'Connected',
  timestamp: new Date().toISOString(),
  devices: {
    esp32: 'offline',
    rfid: 'connected',
    mq3: 'connected',
    oled: 'connected',
    gps: 'connected',
    imu: 'connected',
    wifi: 'connected',
  },
};

export const generateTimeLabel = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
};

export const initialChartData = Array.from({ length: 15 }, (_, i) => ({
  time: `T-${15 - i}`,
  acceleration: 1.0,
  mq3: 0,
  speed: 0,
}));

export const mockAlerts = [];

export const mockHistory = [];
