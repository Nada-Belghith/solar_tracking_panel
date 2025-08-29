import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';
import Header from './Header';

const DashboardHeader = ({ panels, selectedPanel, handlePanelSelect }) => {
  return (
    <Box mb="20px">
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Header title="SMART SOLAR TRACKING PANEL" subtitle="Suivi en temps réel de votre installation solaire" />
        <Box width="250px">
          <FormControl fullWidth>
            <InputLabel>Panneau solaire</InputLabel>
            <Select value={selectedPanel} onChange={handlePanelSelect} label="Panneau solaire">
              {panels.map((panel) => (
                <MenuItem key={panel.panel_id} value={panel.panel_id}>
                  <Typography variant="body1">{panel.panel_name}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Client: {panel.client_name}
                    <br />
                    Adresse: {panel.address}
                  </Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardHeader;
