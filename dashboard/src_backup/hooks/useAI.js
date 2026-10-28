import { useState, useEffect } from 'react';
import { socketService } from '../services/socket';

export const useAI = () => {
  const [aiState, setAiState] = useState({
    event: 'NORMAL',
    risk: 'LOW',
    confidence: 0,
    drowsiness: 'NORMAL',
    objects: 0,
  });

  useEffect(() => {
    const socket = socketService.connect();

    const handleAI = (data) => {
      setAiState((prev) => ({ ...prev, ...data }));
    };

    socket.on('ai_prediction', handleAI);
    return () => socket.off('ai_prediction', handleAI);
  }, []);

  return aiState;
};
