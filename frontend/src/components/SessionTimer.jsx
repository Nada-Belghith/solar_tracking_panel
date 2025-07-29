import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const SessionTimer = () => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const jwt = localStorage.getItem('jwt');
      if (!jwt) return '';

      try {
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        const expirationTime = payload.exp * 1000;
        const now = Date.now();
        const difference = expirationTime - now;

        if (difference <= 0) {
          localStorage.removeItem('jwt');
          window.location.href = '/login';
          return '';
        }

        // Convertir en heures, minutes et secondes
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        return `${hours}h ${minutes}m ${seconds}s`;
      } catch (error) {
        return '';
      }
    };

    // Mettre à jour toutes les secondes
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Calcul initial
    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, []);

  if (!timeLeft) return null;

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <AccessTimeIcon fontSize="small" />
      <Typography variant="body2">
        Session: {timeLeft}
      </Typography>
    </Box>
  );
};

export default SessionTimer;
