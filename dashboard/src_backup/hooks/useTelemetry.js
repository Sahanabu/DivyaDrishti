import { useState, useEffect } from 'react';
import { socketService } from '../services/socket';

export const useTelemetry = () => {
  const [telemetry, setTelemetry] = useState({
    speed: 0,
    mq3Value: 0,
    latitude: 0,
    longitude: 0,
    pitch: 0,
    roll: 0,
    accelMagnitude: 0,
    gyroMagnitude: 0,
  });

  useEffect(() => {
    const socket = socketService.connect();

    const handleTelemetry = (data) => {
      setTelemetry((prev) => ({
        ...prev,
        speed: data.speed ?? prev.speed,
        mq3Value: data.mq3 ?? prev.mq3Value,
        latitude: data.gps?.latitude ?? prev.latitude,
        longitude: data.gps?.longitude ?? prev.longitude,
        pitch: data.motion?.pitch ?? prev.pitch,
        roll: data.motion?.roll ?? prev.roll,
        accelMagnitude: data.motion?.magnitude ?? prev.accelMagnitude,
        gyroMagnitude: data.motion?.gyroMagnitude ?? prev.gyroMagnitude,
      }));
    };

    socket.on('telemetry_update', handleTelemetry);
    return () => socket.off('telemetry_update', handleTelemetry);
  }, []);

  return telemetry;
};
