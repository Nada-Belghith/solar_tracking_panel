import { Box, Button, IconButton, Typography, useTheme, Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { tokens } from "../../theme";
import { mockTransactions } from "../../data/mockData";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import Header from "../../components/Header";
import LineChart from "../../components/LineChart";

import GeographyChart from "../../components/GeographyChart";
import BarChart from "../../components/BarChart";
import StatBox from "../../components/StatBox";
import ProgressCircle from "../../components/ProgressCircle";
import SolarPanel from "../../components/SolarPanel";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const Dashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();

  // États pour la gestion des panneaux
  const [selectedPanelName, setSelectedPanelName] = useState("");
  const [selectedPanel, setSelectedPanel] = useState(localStorage.getItem('selectedDevice') || "");
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const selectedDevice = localStorage.getItem('selectedDevice');
    if (selectedDevice) {
      const selectedPanelData = panels.find(panel => panel.panel_id === selectedDevice);
      if (selectedPanelData) {
        setSelectedPanelName(selectedPanelData.panel_name);
        // Stocker les informations ThingsBoard du panneau sélectionné
        localStorage.setItem('tbDeviceId', selectedPanelData.device_id_thingsboard);
        localStorage.setItem('tbDeviceToken', selectedPanelData.token_thingsboard);
      } else {
        setSelectedPanelName('Panneau inconnu');
      }
    }
  }, [panels]);

  // Ajout des états pour température et humidité
  // Charge les dernières valeurs du localStorage si présentes
  const getLastTelemetry = () => {
    try {
      const last = localStorage.getItem("lastTelemetry");
      if (last) return JSON.parse(last);
    } catch {}
    return { 
      temperature: null, 
      humidity: null, 
      luminosity1: null,
      luminosity2: null,
      luminosity3: null 
    };
  };
  const [telemetry, setTelemetry] = useState(getLastTelemetry());

  // Référence au socket pour pouvoir le déconnecter plus tard
  const [socket, setSocket] = useState(null);

  const initializeWebSocket = () => {
    if (socket) {
      console.log("🔌 [DEBUG] Disconnecting old WebSocket connection");
      socket.disconnect();
      socket.off("connect");
      socket.off("telemetry");
      socket.off("connect_error");
      socket.off("disconnect");
    }

    console.log("🚀 [DEBUG] Initializing new WebSocket connection...");
    
    try {
      // Récupérer les informations ThingsBoard du panneau sélectionné
      const deviceId = localStorage.getItem('tbDeviceId');
      const deviceToken = localStorage.getItem('tbDeviceToken');

      if (!deviceId || !deviceToken) {
        console.log("⚠️ [FRONT] Aucun panneau sélectionné ou informations ThingsBoard manquantes");
        return null;
      }

      console.log("📡 [FRONT] Tentative de connexion WebSocket à http://localhost:3001", {
        deviceId,
        deviceToken
      });
      
      const newSocket = io("http://localhost:3001", {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        query: {
          deviceId,
          deviceToken
        },
        forceNew: true // Force une nouvelle connexion à chaque fois
      });

      newSocket.on("connect", () => {
        console.log("🟢 [FRONT] Connecté au WebSocket backend");
        console.log("🔄 [FRONT] Demande des dernières données télémétrie...");
        newSocket.emit("getLastTelemetry", { deviceId });
        
        // S'abonner aux mises à jour en temps réel
        console.log("📥 [FRONT] Abonnement aux mises à jour en temps réel...");
        newSocket.emit("subscribeTelemetry", { deviceId });
      });

      newSocket.on("telemetry", (data) => {
        console.log("🔍 [FRONT] Real-time telemetry data received:", data);

        // Validate and update telemetry state
        if (data && typeof data === 'object') {
          const newTelemetry = {
            temperature: data.temperature !== undefined ? Number(data.temperature) : null,
            humidity: data.humidity !== undefined ? Number(data.humidity) : null,
            luminosity1: data.luminosity1 !== undefined ? Number(data.luminosity1) : null,
            luminosity2: data.luminosity2 !== undefined ? Number(data.luminosity2) : null,
            luminosity3: data.luminosity3 !== undefined ? Number(data.luminosity3) : null
          };

          // Update state only if values have changed
          if (JSON.stringify(newTelemetry) !== JSON.stringify(telemetry)) {
            console.log("✨ Updating telemetry state with new data:", newTelemetry);
            setTelemetry(newTelemetry);
            localStorage.setItem("lastTelemetry", JSON.stringify(newTelemetry));
          }
        } else {
          console.error("❌ Invalid telemetry data received:", data);
        }
      });

      newSocket.on("connect_error", (err) => {
        console.error("❌ [FRONT] Erreur de connexion WebSocket:", err.message);
      });

      newSocket.on("disconnect", (reason) => {
        console.log("🔴 Déconnecté du WebSocket backend", reason);
        
        // Tentative de reconnexion si la déconnexion n'est pas volontaire
        if (reason === "transport close" || reason === "ping timeout") {
          console.log("🔄 Tentative de reconnexion automatique...");
          setTimeout(() => {
            if (!newSocket.connected) {
              newSocket.connect();
            }
          }, 2000);
        }
      });

      newSocket.on("reconnect", (attemptNumber) => {
        console.log("🎉 Reconnecté au serveur après", attemptNumber, "tentatives");
        
        // Réabonnement après reconnexion
        const deviceId = localStorage.getItem('tbDeviceId');
        if (deviceId) {
          console.log("📥 Réabonnement aux mises à jour en temps réel...");
          newSocket.emit("subscribeTelemetry", { deviceId });
          newSocket.emit("getLastTelemetry", { deviceId });
        }
      });

      newSocket.on("reconnect_attempt", (attemptNumber) => {
        console.log("🔄 Tentative de reconnexion #", attemptNumber);
      });

      newSocket.on("reconnect_error", (error) => {
        console.error("❌ Erreur lors de la tentative de reconnexion:", error.message);
      });

      setSocket(newSocket);
      return newSocket;
    } catch (error) {
      console.error("❌ Erreur d'initialisation WebSocket:", error);
      return null;
    }
  };

  // Gestion de la connexion WebSocket
  useEffect(() => {
    console.log("🔄 Initialisation d'une nouvelle connexion WebSocket pour le panneau:", selectedPanel);
    const newSocket = initializeWebSocket();

    // Polling pour maintenir les données à jour
    const pollingInterval = setInterval(() => {
      if (newSocket && newSocket.connected) {
        const deviceId = localStorage.getItem('tbDeviceId');
        if (deviceId) {
          console.log("� Demande de mise à jour des données...");
          newSocket.emit("getLastTelemetry", { deviceId });
        }
      }
    }, 5000); // Polling toutes les 5 secondes

    return () => {
      console.log("🧹 Nettoyage de la connexion WebSocket");
      clearInterval(pollingInterval);
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [selectedPanel]); // Se réinitialise quand le panneau sélectionné change

  const handlePanelSelect = async (event) => {
    const panelId = event.target.value;
    setSelectedPanel(panelId);
    const selectedPanelData = panels.find(panel => panel.panel_id === panelId);
    if (selectedPanelData) {
      setSelectedPanelName(selectedPanelData.panel_name);
      localStorage.setItem('selectedDevice', panelId);

      // Update ThingsBoard information
      const deviceId = selectedPanelData.device_id_thingsboard;
      const deviceToken = selectedPanelData.token_thingsboard;
      localStorage.setItem('tbDeviceId', deviceId);
      localStorage.setItem('tbDeviceToken', deviceToken);

      // Send deviceId and token to the backend
      try {
        const response = await fetch("http://localhost:3001/api/update-thingsboard", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ deviceId, deviceToken }),
        });

        if (!response.ok) {
          throw new Error("Failed to update ThingsBoard connection on the backend");
        }

        console.log("✅ [FRONT] Successfully updated ThingsBoard connection on the backend");
      } catch (error) {
        console.error("❌ [FRONT] Error updating ThingsBoard connection on the backend:", error);
      }

      // Reinitialize WebSocket connection
      if (socket) {
        socket.disconnect();
      }
      initializeWebSocket();
    }
  };

  // Récupération des panneaux depuis l'API
  useEffect(() => {
    const fetchPanels = async () => {
      try {
        const token = localStorage.getItem("jwt");
        const response = await fetch("http://localhost:3001/api/panels/list", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("Erreur lors de la récupération des panneaux");

        const data = await response.json();
        console.log("Données des panneaux reçues:", data);
        setPanels(data);
        
        // Mise à jour du nom du panneau sélectionné
        if (selectedPanel) {
          const panel = data.find(p => p.panel_id === selectedPanel);
          if (panel) {
            setSelectedPanelName(panel.panel_name);
          }
        }
      } catch (err) {
        setError("Erreur lors du chargement des panneaux");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPanels();
  }, [selectedPanel]);

  return (
    <Box m="20px">
      {/* HEADER WITH PANEL SELECTOR */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Header title="SMART SOLAR TRACKING PANEL" subtitle="Suivi en temps réel de votre installation solaire" />
        <Box width="250px">
          <FormControl fullWidth>
            <InputLabel>Panneau solaire</InputLabel>
            <Select
              value={selectedPanel}
              onChange={handlePanelSelect}
              label="Panneau solaire"
            >
              {panels.map((panel) => (
                <MenuItem
                  key={panel.panel_id}
                  value={panel.panel_id}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
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
            title={telemetry.temperature != null ? `${Number(telemetry.temperature).toFixed(1)}°C` : "--"}
            subtitle="Température du panneau"
            progress="0.60"
            increase={telemetry.temperature != null ? `${telemetry.temperature}°C` : "N/A"}
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
            title={telemetry.pressure !== null ? `${telemetry.pressure} hPa` : (getLastTelemetry().pressure !== null ? `${getLastTelemetry().pressure} hPa` : "--")}
            subtitle="Pression atmosphérique"
            progress="0.57"
            increase="+2 hPa aujourd'hui"
            icon={
              <span role="img" aria-label="Baromètre" style={{ fontSize: 26 }}>🌡️</span>
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
              <span role="img" aria-label="Panneau solaire" style={{ fontSize: 26 }}>�</span>
            }
          />
        </Box>
        <Box
          gridColumn="span 4"
          gridRow="span 2"
          backgroundColor={colors.primary[400]}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <SolarPanel
            luminosity1={telemetry.luminosity1}
            luminosity2={telemetry.luminosity2}
            luminosity3={telemetry.luminosity3}
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

        {/* ROW 4 - Liste des panneaux solaires */}
        <Box
          gridColumn="span 12"
          backgroundColor={colors.primary[400]}
          p="20px"
        >
          <Typography variant="h5" fontWeight="600">
            Liste des Panneaux Solaires
          </Typography>
          {loading ? (
            <Typography>Chargement...</Typography>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : (
            <FormControl fullWidth>
              <InputLabel>Panneau solaire</InputLabel>
              <Select
                value={selectedPanel}
                onChange={handlePanelSelect}
                label="Panneau solaire"
              >
                {panels.map((panel) => (
                  <MenuItem
                    key={panel.panel_id}
                    value={panel.panel_id}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                    }}
                  >
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
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
