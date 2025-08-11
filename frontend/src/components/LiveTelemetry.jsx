import React from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import useWebSocketConnection from '../hooks/useWebSocketConnection';
import StatBox from './StatBox';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";

const LiveTelemetry = ({ panelName }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  
  // Récupérer le token JWT du localStorage
  const jwtToken = localStorage.getItem('jwt_token');
  
  // Utiliser notre hook personnalisé
  const { telemetryData, connectionStatus, error } = useWebSocketConnection(panelName, jwtToken);

  // Afficher un message d'erreur si présent
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Erreur: {error}
      </Alert>
    );
  }

  // Afficher un indicateur de chargement pendant la connexion
  if (connectionStatus === 'disconnected' || !telemetryData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          {connectionStatus === 'disconnected' ? 'Connexion en cours...' : 'Chargement des données...'}
        </Typography>
      </Box>
    );
  }

  console.log('Données de télémétrie reçues:', telemetryData);

  return (
    <Box
      display="grid"
      gridTemplateColumns="repeat(12, 1fr)"
      gridAutoRows="140px"
      gap="20px"
    >
      {/* Temperature */}
      <Box
        gridColumn="span 3"
        backgroundColor={colors.primary[400]}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <StatBox
          title="Température"
          value={telemetryData.data.temperature?.toFixed(1) || 'N/A'}
          subtitle="Celsius"
          progress={0.75}
          increase={telemetryData.data.temperature > 25 ? "Élevée" : "Normale"}
        />
      </Box>

      {/* Humidity */}
      <Box
        gridColumn="span 3"
        backgroundColor={colors.primary[400]}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <StatBox
          title="Humidité"
          value={telemetryData.data.humidity?.toFixed(1) || 'N/A'}
          subtitle="%"
          progress={0.50}
          increase={telemetryData.data.humidity > 60 ? "Élevée" : "Normale"}
        />
      </Box>

      {/* Luminosity Sensors */}
      {[1, 2, 3].map((sensorNum) => (
        <Box
          key={sensorNum}
          gridColumn="span 2"
          backgroundColor={colors.primary[400]}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <StatBox
            title={`Luminosité ${sensorNum}`}
            value={telemetryData.data[`luminosity${sensorNum}`]?.toFixed(1) || 'N/A'}
            subtitle="lux"
            progress={0.66}
            increase={telemetryData.data[`luminosity${sensorNum}`] > 1000 ? "Forte" : "Normale"}
          />
        </Box>
      ))}
    </Box>
  );
};
 
export default LiveTelemetry;
