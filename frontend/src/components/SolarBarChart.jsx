import { useTheme } from "@mui/material";
import { ResponsiveBar } from "@nivo/bar";
import { tokens } from "../theme";
import { useEffect, useState } from "react";
import axios from "axios";
import { format } from "date-fns";

const SolarBarChart = ({ deviceSn, selectedDate, isDashboard = false }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!deviceSn || !selectedDate) {
      setData([]);
      setLoading(false);
      return;
    }

    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    let mounted = true;
    setLoading(true);
    setError(null);

    // Fetch data for the selected month
    axios.get(`http://localhost:3001/api/solarman/monthly/${deviceSn}/${year}/${month}`)
      .then(response => {
        if (!mounted) return;

        console.log('Raw API response:', response.data);
        
        if (response.data?.success && Array.isArray(response.data.data?.records)) {
          // Créer les données du graphique et trier par jour
          const chartData = response.data.data.records
            .map(record => ({
              day: record.day.toString().padStart(2, '0'), // Ajouter un zéro devant les jours < 10
              generationValue: record.generationValue || 0,
              fullPowerHours: record.fullPowerHoursDay || 0,
              tooltipInfo: `${format(new Date(year, month - 1, record.day), 'dd/MM/yyyy')}
Génération: ${record.generationValue?.toFixed(2) || 0} kWh
Heures pleines: ${record.fullPowerHoursDay?.toFixed(2) || 0} h`
            }))
            .sort((a, b) => parseInt(a.day) - parseInt(b.day));

          console.log('Chart data:', chartData); // Debug log
          setData(chartData);
          setError(null);
        } else {
          setError('Format de données invalide');
          setData([]);
        }
      })
      .catch(err => {
        if (mounted) {
          console.error('Error fetching daily data:', err);
          setError(err.message || 'Error fetching daily data');
          setData([]);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [deviceSn, selectedDate]);

  if (loading) {
    return <div style={{ color: colors.grey[100] }}>Loading monthly statistics...</div>;
  }

  if (error) {
    return <div style={{ color: colors.redAccent[500] }}>Error: {error}</div>;
  }

  return (
    <ResponsiveBar
      data={data}
      theme={{
        axis: {
          domain: {
            line: {
              stroke: colors.grey[100],
            },
          },
          legend: {
            text: {
              fill: colors.grey[100],
            },
          },
          ticks: {
            line: {
              stroke: colors.grey[100],
              strokeWidth: 1,
            },
            text: {
              fill: colors.grey[100],
            },
          },
        },
        legends: {
          text: {
            fill: colors.grey[100],
          },
        },
      }}
      keys={["generationValue"]}
      indexBy="day"
      margin={{ top: 50, right: 80, bottom: 50, left: 70 }}
      padding={0.3}
      valueScale={{ type: "linear" }}
      indexScale={{ type: "band", round: true }}
      colors={[colors.greenAccent[400]]}
      borderColor={{
        from: "color",
        modifiers: [["darker", "1.6"]],
      }}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: isDashboard ? undefined : "Jour du mois",
        legendPosition: "middle",
        legendOffset: 32,
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: isDashboard ? undefined : "Production (kWh)",
        legendPosition: "middle",
        legendOffset: -50,
      }}
      enableLabel={false}
      labelSkipWidth={12}
      labelSkipHeight={12}
      labelTextColor={{
        from: "color",
        modifiers: [["darker", 1.6]],
      }}
      tooltip={({ data }) => (
        <div
          style={{
            padding: 12,
            background: colors.primary[400],
            color: colors.grey[100],
          }}
        >
          <strong style={{ color: colors.greenAccent[500] }}>
            {data.tooltipInfo.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </strong>
        </div>
      )}
      role="application"
      ariaLabel="Monthly solar panel generation"
    />
  );
};

export default SolarBarChart;
