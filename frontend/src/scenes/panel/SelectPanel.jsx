import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { tokens } from '../../theme';
import { useTheme } from '@mui/material';

const SelectPanel = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  useEffect(() => {
    // Nettoyer le panneau sélectionné au chargement de cette page
    localStorage.removeItem('selectedDevice');
  }, []);

  const handlePanelSelect = (panelId) => {
    // Sauvegarder le panneau sélectionné
    localStorage.setItem('selectedDevice', panelId);
    
    // Rediriger vers la page précédente ou dashboard par défaut
    const returnPath = localStorage.getItem('returnPath') || '/dashboard';
    localStorage.removeItem('returnPath'); // Nettoyer
    navigate(returnPath);
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      p={3}
      bgcolor={colors.primary[400]}
      minHeight="100vh"
    >
      <Typography variant="h2" color={colors.grey[100]} mb={4}>
        Sélectionnez un Panneau Solaire
      </Typography>
      
      <Typography variant="h5" color={colors.grey[300]} mb={3}>
        Veuillez sélectionner un panneau pour accéder au monitoring
      </Typography>

      {/* Liste des panneaux - À adapter selon votre structure de données */}
      <Box display="flex" flexWrap="wrap" gap={3} justifyContent="center">
        {/* Exemple de panneau */}
        <Box
          onClick={() => handlePanelSelect('panel1')}
          sx={{
            bgcolor: colors.primary[300],
            p: 3,
            borderRadius: 2,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: colors.primary[200],
            },
            width: 250,
            textAlign: 'center'
          }}
        >
          <Typography variant="h4" color={colors.grey[100]}>
            Panneau 1
          </Typography>
          <Typography color={colors.grey[300]}>
            Description du panneau
          </Typography>
        </Box>

        {/* Ajoutez d'autres panneaux ici */}
      </Box>
    </Box>
  );
};

export default SelectPanel;
