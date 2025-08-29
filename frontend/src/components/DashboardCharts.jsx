import React from 'react';
import { Box, Typography } from '@mui/material';
import PowerChart from './PowerChart';

const DashboardCharts = ({ colors, powerChartData, selectedDate, setSelectedDate }) => {
  return (
    <>
      <Box mt="30px" backgroundColor={colors.primary[400]} p="24px">
        <Typography variant="h5" fontWeight="650" gutterBottom>
          Puissance (Production vs Consommation)
        </Typography>
        <Box height="510px">
          <PowerChart data={powerChartData} ySegmentCm={2} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
        </Box>
      </Box>
    </>
  );
};

export default DashboardCharts;
