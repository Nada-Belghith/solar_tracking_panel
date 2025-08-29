import React from 'react';
import { Box } from '@mui/material';
import StatBox from './StatBox';
import SolarPanel from './SolarPanel';

const DashboardStats = ({ colors, inverterData, telemetry, telemetryStatus, formatTelemetryValue }) => {
  return (
    <>
      <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gridAutoRows="minmax(120px, auto)" gap="15px">
        <Box gridColumn="span 4" backgroundColor={colors.primary[400]} display="flex" alignItems="center" justifyContent="center">
          <StatBox
            title={inverterData.dailyProduction != null ? `${inverterData.dailyProduction} kWh` : "-- kWh"}
            subtitle="Production journalière"
            progress={inverterData.dailyProduction != null ? String(Math.min(1, inverterData.dailyProduction / 10)) : "0.0"}
            increase={inverterData.inverterStatus || ""}
            icon={<span role="img" aria-label="Soleil" style={{ fontSize: 26 }}>☀️</span>}
          />
        </Box>

        <Box gridColumn="span 4" backgroundColor={colors.primary[400]} display="flex" alignItems="center" justifyContent="center">
          <StatBox
            title={formatTelemetryValue(telemetry.temperature) != null ? `${formatTelemetryValue(telemetry.temperature)}°C` : "--"}
            subtitle="Température"
            progress={telemetry.temperature != null ? String(Math.min(1, Number(telemetry.temperature) / 50)) : "0.0"}
            increase={telemetryStatus('temperature', telemetry.temperature)}
            icon={<span role="img" aria-label="Thermomètre" style={{ fontSize: 26 }}>🌡️</span>}
          />
        </Box>

        <Box gridColumn="span 4" gridRow="span 2" backgroundColor={colors.primary[400]} display="flex" alignItems="center" justifyContent="center">
          <SolarPanel luminosity1={telemetry.luminosity1} luminosity2={telemetry.luminosity2} luminosity3={telemetry.luminosity3} />
        </Box>

        <Box gridColumn="span 4" backgroundColor={colors.primary[400]} display="flex" alignItems="center" justifyContent="center">
          <StatBox
            title={formatTelemetryValue(telemetry.windSpeed) != null ? `${formatTelemetryValue(telemetry.windSpeed)} m/s` : "-- m/s"}
            subtitle="Vitesse du vent"
            progress={telemetry.windSpeed != null ? String(Math.min(1, Number(telemetry.windSpeed) / 30)) : "0.0"}
            increase={telemetryStatus('windSpeed', telemetry.windSpeed)}
            icon={<img src="/assets/vent.png" alt="Vitesse du vent" style={{ width: 50, height: 50, objectFit: 'contain' }} />}
          />
        </Box>

        <Box gridColumn="span 4" backgroundColor={colors.primary[400]} display="flex" alignItems="center" justifyContent="center">
          <StatBox
            title={formatTelemetryValue(telemetry.pressure) != null ? `${formatTelemetryValue(telemetry.pressure)} hPa` : "-- hPa"}
            subtitle="Pression"
            progress={telemetry.pressure != null ? String(Math.min(1, (Number(telemetry.pressure) / 1100))) : "0.0"}
            increase={telemetryStatus('pressure', telemetry.pressure)}
            icon={
              <svg width="26" height="26" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <linearGradient id="gaugeGrad" x1="0" x2="1">
                    <stop offset="0" stopColor="#4caf50" />
                    <stop offset="0.6" stopColor="#ffeb3b" />
                    <stop offset="1" stopColor="#f44336" />
                  </linearGradient>
                </defs>
                <path d="M8 44 A24 24 0 0 1 56 44" fill="none" stroke="#e0e0e0" strokeWidth="6" strokeLinecap="round" />
                <path d="M12 44 A20 20 0 0 1 52 44" fill="none" stroke="url(#gaugeGrad)" strokeWidth="6" strokeLinecap="round" />
                <circle cx="32" cy="44" r="4" fill="#fffefeff" />
                <line x1="32" y1="44" x2="46" y2="26" stroke="#fdf8f8ff" strokeWidth="3" strokeLinecap="round" />
              </svg>
            }
          />
        </Box>
      </Box>
    </>
  );
};

export default DashboardStats;
