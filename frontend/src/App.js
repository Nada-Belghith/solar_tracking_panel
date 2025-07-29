import { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Topbar from "./scenes/global/Topbar";
import Sidebar from "./scenes/global/Sidebar";
import Dashboard from "./scenes/dashboard";
import { useEffect } from "react";
import Invoices from "./scenes/invoices";
import Contacts from "./scenes/contacts";
import Bar from "./scenes/bar";
import PanelConfig from "./scenes/config";
import Form from "./scenes/form";
import Line from "./scenes/line";
import Pie from "./scenes/pie";
import FAQ from "./scenes/faq";
import Geography from "./scenes/geography";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { ColorModeContext, useMode } from "./theme";
import Calendar from "./scenes/calendar/calendar";
import { authService } from "./services/authService";
import Login from "./scenes/auth/Login";
import Register from "./scenes/auth/Register";
import AuthSuccess from "./scenes/auth/AuthSuccess";
import ClientSelector from "./scenes/auth/ClientSelector";
import PanelProtectedRoute from "./components/PanelProtectedRoute";

function App() {
  const [theme, colorMode] = useMode();
  const [isSidebar, setIsSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Démarrer la surveillance de l'activité si un JWT existe
    const jwt = localStorage.getItem("jwt");
    if (jwt) {
      try {
        const payload = authService.parseToken(jwt);
        if (!payload || Date.now() >= payload.exp * 1000) {
          authService.logout();
        } else {
          authService.startActivityMonitoring();
        }
      } catch (error) {
        authService.logout();
      }
    }

    // Nettoyage lors du démontage du composant
    return () => {
      authService.stopActivityMonitoring();
    };
  }, [location]); // Redémarrer la surveillance à chaque changement de route

  // Redirection si déjà authentifié avec un token valide
  if ((location.pathname === "/" || location.pathname === "/login" || location.pathname === "/register") && localStorage.getItem("jwt")) {
    window.location.href = "/dashboard";
    return null;
  }

  // Protection du dashboard : redirige vers /login si pas de token
  function ProtectedRoute({ children }) {
    if (!localStorage.getItem("jwt")) {
      window.location.href = "/login";
      return null;
    }
    return children;
  }

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="app" style={{ 
            display: 'flex', 
            height: '100vh', 
            width: '100vw', 
            overflow: 'hidden',
            position: 'relative'
          }}>
          {!(location.pathname === "/" || location.pathname === "/login" || location.pathname === "/register" || location.pathname === "/auth/success") && (
            <Sidebar isSidebar={isSidebar} setIsSidebar={setIsSidebar} />
          )}
          <main className="content" style={{
            flexGrow: 1,
            overflow: 'auto',
            padding: isMobile ? '10px' : '20px',
            transition: 'all 0.3s ease-in-out',
            width: '100%',
            maxWidth: '100vw',
            ...(isMobile && {
              marginLeft: isSidebar ? '250px' : '0',
              width: isSidebar ? 'calc(100vw - 250px)' : '100vw'
            })
          }}>
            {!(location.pathname === "/" || location.pathname === "/login" || location.pathname === "/register" || location.pathname === "/auth/success") && (
              <Topbar setIsSidebar={setIsSidebar} />
            )}
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/success" element={<AuthSuccess />} />
              <Route path="/select-client" element={<ProtectedRoute><ClientSelector /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><PanelProtectedRoute><Dashboard /></PanelProtectedRoute></ProtectedRoute>} />
              <Route path="/config" element={<ProtectedRoute><PanelConfig /></ProtectedRoute>} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/form" element={<Form />} />
              <Route path="/bar" element={<Bar />} />
              <Route path="/pie" element={<Pie />} />
              <Route path="/line" element={<Line />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/geography" element={<Geography />} />
            </Routes>
          </main>
        </div>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
