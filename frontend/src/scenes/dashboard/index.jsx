import { Box, Button, IconButton, Typography, useTheme } from "@mui/material";
import { tokens } from "../../theme";
import { mockTransactions } from "../../data/mockData";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import Header from "../../components/Header";
import LineChart from "../../components/LineChart";
import GeographyChart from "../../components/GeographyChart";
import BarChart from "../../components/BarChart";
import StatBox from "../../components/StatBox";
import ProgressCircle from "../../components/ProgressCircle";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const Dashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // Ajout des états pour température et humidité
  const [telemetry, setTelemetry] = useState({ temperature: null, humidity: null });

  useEffect(() => {
    console.log("[FRONT] useEffect dashboard déclenché");
    let socket;
    try {
      socket = io("http://localhost:3001", {
        transports: ["websocket"]
      });

      socket.on("connect", () => {
        console.log("🟢 Connecté au WebSocket backend");
      });

      socket.on("connect_error", (err) => {
        console.error("❌ Erreur de connexion WebSocket:", err.message);
      });

     

      socket.on("telemetry", (data) => {
        console.log("[FRONT] Données telemetry reçues:", data);
        // Les valeurs sont déjà au format nombre
        setTelemetry({
          temperature: data.temperature,
          humidity: data.humidity
        });
      });

      socket.on("disconnect", () => {
        console.log("🔴 Déconnecté du WebSocket backend");
      });
    } catch (e) {
      console.error("❌ Impossible d'initialiser le WebSocket:", e);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  return (
    <Box m="20px">
      {/* HEADER */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Header title="SMART SOLAR TRACKING PANEL" subtitle="Suivi en temps réel de votre installation solaire" />

        <Box>
          <Button
            sx={{
              backgroundColor: colors.blueAccent[700],
              color: colors.grey[100],
              fontSize: "14px",
              fontWeight: "bold",
              padding: "10px 20px",
            }}
          >
            <DownloadOutlinedIcon sx={{ mr: "10px" }} />
            Télécharger les données solaires
          </Button>
        </Box>
      </Box>

   
      {/* GRID & CHARTS */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(12, 1fr)"
        gridAutoRows="140px"
        gap="20px"
      >
        {/* ROW 1 */}
        <Box
          gridColumn="span 3"
          backgroundColor={colors.primary[400]}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <StatBox
            title="5.2 kWh"
            subtitle="Production actuelle"
            progress="0.85"
            increase="+8% aujourd'hui"
            icon={
              <span role="img" aria-label="Soleil" style={{ fontSize: 26 }}>☀️</span>
            }
          />
        </Box>
        <Box
          gridColumn="span 3"
          backgroundColor={colors.primary[400]}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <StatBox
            title={telemetry.temperature !== null ? `${telemetry.temperature}°C` : "--"}
            subtitle="Température du panneau"
            progress="0.60"
            increase="+2°C aujourd'hui"
            icon={
              <span role="img" aria-label="Thermomètre" style={{ fontSize: 26 }}>🌡️</span>
            }
          />
        </Box>
        <Box
          gridColumn="span 3"
          backgroundColor={colors.primary[400]}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <StatBox
            title={telemetry.humidity !== null ? `${telemetry.humidity}%` : "--"}
            subtitle="Humidité de l'air"
            progress="0.57"
            increase="+1% aujourd'hui"
            icon={
              <span role="img" aria-label="Goutte" style={{ fontSize: 26 }}>💧</span>
            }
          />
        </Box>
        <Box
          gridColumn="span 3"
          backgroundColor={colors.primary[400]}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <StatBox
            title="OK"
            subtitle="Système opérationnel"
            progress="1.00"
            increase=""
            icon={
              <span role="img" aria-label="Panneau solaire" style={{ fontSize: 26 }}>🔋</span>
            }
          />
        </Box>

        {/* ROW 2 */}
        <Box
          gridColumn="span 8"
          gridRow="span 2"
          backgroundColor={colors.primary[400]}
        >
          <Box
            mt="25px"
            p="0 30px"
            display="flex "
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography
                variant="h5"
                fontWeight="600"
                color={colors.grey[100]}
              >
                Énergie totale produite
              </Typography>
              <Typography
                variant="h3"
                fontWeight="bold"
                color={colors.greenAccent[500]}
              >
                59,3 kWh
              </Typography>
            </Box>
            <Box>
              <IconButton>
                <DownloadOutlinedIcon
                  sx={{ fontSize: "26px", color: colors.greenAccent[500] }}
                />
              </IconButton>
            </Box>
          </Box>
          <Box height="250px" m="-20px 0 0 0">
            <LineChart isDashboard={true} />
          </Box>
        </Box>
        <Box
          gridColumn="span 4"
          gridRow="span 2"
          backgroundColor={colors.primary[400]}
          overflow="auto"
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            borderBottom={`4px solid ${colors.primary[500]}`}
            colors={colors.grey[100]}
            p="15px"
          >
            <Typography color={colors.grey[100]} variant="h5" fontWeight="600">
              Dernières mesures reçues
            </Typography>
          </Box>
          {mockTransactions.map((transaction, i) => (
            <Box
              key={`${transaction.txId}-${i}`}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              borderBottom={`4px solid ${colors.primary[500]}`}
              p="15px"
            >
              <Box>
                <Typography
                  color={colors.greenAccent[500]}
                  variant="h5"
                  fontWeight="600"
                >
                  {transaction.txId}
                </Typography>
                <Typography color={colors.grey[100]}>
                  {transaction.user}
                </Typography>
              </Box>
              <Box color={colors.grey[100]}>{transaction.date}</Box>
              <Box
                backgroundColor={colors.greenAccent[500]}
                p="5px 10px"
                borderRadius="4px"
              >
                {transaction.cost} kWh
              </Box>
            </Box>
          ))}
        </Box>

        {/* ROW 3 */}
        <Box
          gridColumn="span 4"
          gridRow="span 2"
          backgroundColor={colors.primary[400]}
          p="30px"
        >
          <Typography variant="h5" fontWeight="600">
            Performance solaire
          </Typography>
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            mt="25px"
          >
            <ProgressCircle size="125" />
            <Typography
              variant="h5"
              color={colors.greenAccent[500]}
              sx={{ mt: "15px" }}
            >
              48,3 kWh générés ce mois
            </Typography>
            <Typography>Donnees issues de tous les panneaux connectés</Typography>
          </Box>
        </Box>
        <Box
          gridColumn="span 4"
          gridRow="span 2"
          backgroundColor={colors.primary[400]}
        >
          <Typography
            variant="h5"
            fontWeight="600"
            sx={{ padding: "30px 30px 0 30px" }}
          >
            Nombre de cycles solaires
          </Typography>
          <Box height="250px" mt="-20px">
            <BarChart isDashboard={true} />
          </Box>
        </Box>
        <Box
          gridColumn="span 4"
          gridRow="span 2"
          backgroundColor={colors.primary[400]}
          padding="30px"
        >
          <Typography
            variant="h5"
            fontWeight="600"
            sx={{ marginBottom: "15px" }}
          >
            Production par zone géographique
          </Typography>
          <Box height="200px">
            <GeographyChart isDashboard={true} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
