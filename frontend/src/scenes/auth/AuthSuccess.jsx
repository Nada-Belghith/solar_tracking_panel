import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const tbToken = params.get("tbToken");
    if (token) {
      localStorage.setItem("jwt", token);
      if (tbToken) localStorage.setItem("tbToken", tbToken);
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  }, [navigate]);

  return <div>Authentification réussie, redirection...</div>;
};

export default AuthSuccess;
