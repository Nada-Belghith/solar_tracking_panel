import { Box, Typography, useTheme } from "@mui/material";
import { tokens } from "../../theme";

const SensorValue = ({ value, position }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
      sx={{
        position: 'absolute',
        ...position,
        width: '65px',
        height: '65px',
        backgroundColor: colors.primary[400],
        borderRadius: '50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        border: `2px solid ${colors.greenAccent[500]}`,
        zIndex: 2
      }}
    >
      <Typography
        variant="h6"
        sx={{ 
          color: colors.greenAccent[500], 
          fontWeight: 'bold',
          fontSize: '1.3rem',
          marginBottom: '-2px'
        }}
      >
        {value != null ? value : '--'}
      </Typography>
      <Typography 
        variant="body2" 
        sx={{ 
          color: colors.grey[100],
          fontSize: '0.9rem'
        }}
      >
        lux
      </Typography>
    </Box>
  );
};

const ConnectingLine = ({ start, end, color }) => (
  <svg
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 1
    }}
  >
    <line
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke={color}
      strokeWidth="2"
      strokeDasharray="4"
    />
  </svg>
);

const SolarPanel = ({ luminosity1, luminosity2, luminosity3 }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '300px',
        backgroundColor: colors.primary[400],
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: '10px',
        overflow: 'hidden',
        padding: '20px'
      }}
    >
      {/* Container pour l'image et les capteurs */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {/* Image du panneau solaire */}
        <Box
          component="img"
          src="/assets/panel.png"
          alt="Panneau solaire"
          sx={{
            height: '400px',
            width: 'auto',
            objectFit: 'contain',
            position: 'relative',
            zIndex: 1,
            transform: 'scale(1.5)',
            marginTop: '-50px',
            marginBottom: '-50px'
          }}
        />

        {/* Capteurs de luminosité */}
        <SensorValue
          value={luminosity1}
          position={{
            top: '0px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        />
        <SensorValue
          value={luminosity2}
          position={{
            top: '42%',
            left: '25px',
            transform: 'translateY(-50%)'
          }}
        />
        <SensorValue
          value={luminosity3}
          position={{
            top: '42%',
            right: '25px',
            transform: 'translateY(-50%)'
          }}
        />
      </Box>
    </Box>
  );
};

export default SolarPanel;
