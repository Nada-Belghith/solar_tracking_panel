import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, TextField, Typography, IconButton, useTheme } from "@mui/material";
import { ColorModeContext } from "../../theme";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      console.log('🔄 Réponse reçue du backend:', data); // Log de la réponse complète
      if (data.status === "ok" && data.token) {
        localStorage.setItem("jwt", data.token);
        console.log('✅ Token stocké dans localStorage:', data.token); // Log du token stocké
        if (data.tbToken) {
          localStorage.setItem("tbToken", data.tbToken);
          console.log('✅ Token ThingsBoard stocké dans localStorage:', data.tbToken); // Log du token ThingsBoard
        }
        navigate("/dashboard");
      } else {
        console.error('❌ Erreur reçue du backend:', data.error); // Log de l'erreur reçue
        setError(data.error || "Erreur de connexion");
      }
    } catch (err) {
      console.error('❌ Erreur lors de la requête:', err.message); // Log de l'erreur de requête
      setError("Erreur serveur");
    }
  };

  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  return (
    <Box maxWidth={400} mx="auto" mt={8} p={3} borderRadius={2} boxShadow={2}
      sx={{
        bgcolor: theme.palette.mode === "dark" ? "#222" : "#fff",
        border: theme.palette.mode === "dark" ? "1px solid #444" : "1px solid #eee"
      }}>
      <Box display="flex" justifyContent="flex-end" mb={1}>
        <IconButton onClick={colorMode.toggleColorMode}>
          {theme.palette.mode === "dark" ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
        </IconButton>
      </Box>
      <Typography variant="h4" mb={2}>Connexion</Typography>
      <form onSubmit={handleLogin}>
        <TextField
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          InputLabelProps={{ style: { color: theme.palette.mode === "dark" ? "#fff" : undefined } }}
          InputProps={{
            sx: {
              bgcolor: theme.palette.mode === "dark" ? "#333" : "#fff",
              color: theme.palette.mode === "dark" ? "#fff" : undefined,
              borderRadius: 1,
              border: theme.palette.mode === "dark" ? "1px solid #888" : "1px solid #ccc"
            }
          }}
        />
        <TextField
          label="Mot de passe"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          InputLabelProps={{ style: { color: theme.palette.mode === "dark" ? "#fff" : undefined } }}
          InputProps={{
            sx: {
              bgcolor: theme.palette.mode === "dark" ? "#333" : "#fff",
              color: theme.palette.mode === "dark" ? "#fff" : undefined,
              borderRadius: 1,
              border: theme.palette.mode === "dark" ? "1px solid #888" : "1px solid #ccc"
            }
          }}
        />
        {error && <Typography color="error" mt={1}>{error}</Typography>}
        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
          Se connecter
        </Button>
        <Button variant="outlined" color="secondary" fullWidth sx={{ mt: 2 }} onClick={() => window.location.href = "/register"}>
          Créer un compte
        </Button>
      </form>
      <Button
        variant="outlined"
        color="secondary"
        fullWidth
        sx={{ mt: 2 }}
        onClick={() => window.location.href = "http://localhost:3001/api/auth/google"}
      >
        Connexion avec Google
      </Button>
      <Button
        variant="text"
        fullWidth
        sx={{ mt: 2 }}
        onClick={() => navigate("/register")}
      >
        Créer un compte
      </Button>
    </Box>
  );
};

export default Login;
