import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, TextField, Typography, IconButton, useTheme } from "@mui/material";
import { ColorModeContext } from "../../theme";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    try {
      const res = await fetch("http://localhost:3001/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (data.status === "ok") {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setError(data.error || "Erreur d'inscription");
      }
    } catch (err) {
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
      <Typography variant="h4" mb={2}>Créer un compte</Typography>
      <form onSubmit={handleRegister}>
        <TextField
          label="Nom"
          fullWidth
          margin="normal"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
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
        {success && <Typography color="success.main" mt={1}>Inscription réussie !</Typography>}
        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
          S'inscrire
        </Button>
      </form>
      <Button
        variant="text"
        fullWidth
        sx={{ mt: 2 }}
        onClick={() => navigate("/login")}
      >
        Déjà un compte ? Se connecter
      </Button>
    </Box>
  );
};

export default Register;
