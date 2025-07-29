import { Box, FormControl, Select, MenuItem, useTheme } from '@mui/material';
import { tokens } from '../../theme';
import Header from '../Header';
import { usePanelSelection } from '../../hooks/usePanelSelection';

const HeaderWithPanel = ({ onPanelChange }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { selectedPanelId, selectedPanelName, selectPanel, panels } = usePanelSelection();

  const handleChange = (event) => {
    const panelId = event.target.value;
    selectPanel(panelId);
    if (onPanelChange) {
      onPanelChange(panelId);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Header
          title="DASHBOARD"
          subtitle={selectedPanelName ? `Monitoring: ${selectedPanelName}` : "Sélectionnez un panneau"}
        />
      </Box>
      
      <Box mb={3}>
        <FormControl fullWidth variant="filled" sx={{
          backgroundColor: colors.primary[400],
          borderRadius: '4px',
          maxWidth: 300
        }}>
          <Select
            value={selectedPanelId}
            onChange={handleChange}
            displayEmpty
            sx={{
              color: colors.grey[100],
              '& .MuiSelect-icon': { color: colors.grey[100] }
            }}
          >
            <MenuItem value="">
              <em>Choisir un panneau</em>
            </MenuItem>
            {panels.map(panel => (
              <MenuItem key={panel.id} value={panel.id}>
                {panel.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};

export default HeaderWithPanel;
