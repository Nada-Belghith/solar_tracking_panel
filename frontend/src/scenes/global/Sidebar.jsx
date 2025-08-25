import { useState } from "react";
import { ProSidebar, Menu, MenuItem } from "react-pro-sidebar";
import { Box, IconButton, Typography, useTheme } from "@mui/material";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import "react-pro-sidebar/dist/css/styles.css";
import { tokens } from "../../theme";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import ContactsOutlinedIcon from "@mui/icons-material/ContactsOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import PieChartOutlineOutlinedIcon from "@mui/icons-material/PieChartOutlineOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import SettingsInputAntennaIcon from '@mui/icons-material/SettingsInputAntenna';

import { getRedirectUrl } from '../../utils/panelProtection';
import { useNavigate } from 'react-router-dom';

const Item = ({ title, to, icon, selected, setSelected }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const handleClick = () => {
    setSelected(title);
    const redirectTo = getRedirectUrl(to);
    navigate(redirectTo);
  };
  return (
    <MenuItem
      active={selected === title}
      style={{
        color: colors.grey[100],
      }}
      onClick={handleClick}
      icon={icon}
    >
      <Typography>{title}</Typography>
    </MenuItem>
  );
};

const Sidebar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selected, setSelected] = useState("Dashboard");
  const isMobile = window.innerWidth <= 768;

  // Effet pour gérer la sidebar sur mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Récupère le nom ou l'email du user depuis le JWT
  let userName = "";
  let userPicture = null;
  const jwt = localStorage.getItem("jwt");
  if (jwt) {
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      // Récupère le nom complet ou l'email, préfère le nom s'il existe
      userName = payload.name || payload.email || "Utilisateur";
      if (payload.picture) {
        userPicture = payload.picture;
      } else {
        // Si pas de photo, on n'utilise pas Gravatar, on affichera l'initiale
        userPicture = null;
      }
    } catch (e) {
      userName = "Utilisateur";
      userPicture = null;
    }
  }

  // Fonction md5 pour Gravatar
  function md5(str) {
    function L(k, d) { return (k << d) | (k >>> (32 - d)); }
    function K(G, k) { var I, d, F, H, x; F = (G & 2147483648); H = (k & 2147483648); I = (G & 1073741824); d = (k & 1073741824); x = (G & 1073741823) + (k & 1073741823); if (I & d) { return (x ^ F ^ H); } if (I | d) { if (x & 1073741824) { return (x ^ F ^ H); } else { return (x ^ F ^ H); } } else { return (x ^ F ^ H); } }
    function r(d, F, k) { return (d & F) | ((~d) & k); }
    function q(d, F, k) { return (d & k) | (F & (~k)); }
    function p(d, F, k) { return d ^ F ^ k; }
    function n(d, F, k) { return F ^ (d | (~k)); }
    function u(G, F, aa, Z, k, H, I) { G = K(G, K(K(r(F, aa, Z), k), I)); return K(L(G, H), F); }
    function f(G, F, aa, Z, k, H, I) { G = K(G, K(K(q(F, aa, Z), k), I)); return K(L(G, H), F); }
    function D(G, F, aa, Z, k, H, I) { G = K(G, K(K(p(F, aa, Z), k), I)); return K(L(G, H), F); }
    function t(G, F, aa, Z, k, H, I) { G = K(G, K(K(n(F, aa, Z), k), I)); return K(L(G, H), F); }
    function e(G) { var k; var F = G.length; var x = F + 8; var aa = (x - (x % 64)) / 64; var Z = (aa + 1) * 16; var I = Array(Z - 1); var d = 0; var H = 0; while (H < F) { k = (H - (H % 4)) / 4; d = (H % 4) * 8; I[k] = (I[k] | (G.charCodeAt(H) << d)); H++; } k = (H - (H % 4)) / 4; d = (H % 4) * 8; I[k] = I[k] | (128 << d); I[Z - 2] = F << 3; I[Z - 1] = F >>> 29; return I; }
    function B(x) { var k = "", F = "", G, d; for (d = 0; d <= 3; d++) { G = (x >>> (d * 8)) & 255; F = "0" + G.toString(16); k += F.substr(F.length - 2, 2); } return k; }
    var S = Array(); var P, h, E, v, g, Y, X, W, V; var C = 7, Q = 12, R = 17, O = 22; var A = 5, z = 9, y = 14, w = 20; var s = 4, l = 11, j = 16, i = 23; S = e(str); Y = 1732584193; X = 4023233417; W = 2562383102; V = 271733878; for (P = 0; P < S.length; P += 16) { h = Y; E = X; v = W; g = V; Y = u(Y, X, W, V, S[P + 0], C, 3614090360); V = u(V, Y, X, W, S[P + 1], Q, 3905402710); W = u(W, V, Y, X, S[P + 2], R, 606105819); X = u(X, W, V, Y, S[P + 3], O, 3250441966); Y = u(Y, X, W, V, S[P + 4], C, 4118548399); V = u(V, Y, X, W, S[P + 5], Q, 1200080426); W = u(W, V, Y, X, S[P + 6], R, 2821735955); X = u(X, W, V, Y, S[P + 7], O, 4249261313); Y = u(Y, X, W, V, S[P + 8], C, 1770035416); V = u(V, Y, X, W, S[P + 9], Q, 2336552879); W = u(W, V, Y, X, S[P + 10], R, 4294925233); X = u(X, W, V, Y, S[P + 11], O, 2304563134); Y = u(Y, X, W, V, S[P + 12], C, 1804603682); V = u(V, Y, X, W, S[P + 13], Q, 4254626195); W = u(W, V, Y, X, S[P + 14], R, 2792965006); X = u(X, W, V, Y, S[P + 15], O, 1236535329); Y = f(Y, E, v, g, S[P + 1], s, 4129170786); g = f(g, Y, E, v, S[P + 6], l, 3225465664); v = f(v, g, Y, E, S[P + 11], j, 643717713); E = f(E, v, g, Y, S[P + 0], i, 3921069994); Y = f(Y, E, v, g, S[P + 5], s, 3593408605); g = f(g, Y, E, v, S[P + 10], l, 38016083); v = f(v, g, Y, E, S[P + 15], j, 3634488961); E = f(E, v, g, Y, S[P + 4], i, 3889429448); Y = f(Y, E, v, g, S[P + 9], s, 568446438); g = f(g, Y, E, v, S[P + 14], l, 3275163606); v = f(v, g, Y, E, S[P + 3], j, 4107603335); E = f(E, v, g, Y, S[P + 8], i, 1163531501); Y = f(Y, E, v, g, S[P + 13], s, 2850285829); g = f(g, Y, E, v, S[P + 2], l, 4243563512); v = f(v, g, Y, E, S[P + 7], j, 1735328473); E = f(E, v, g, Y, S[P + 12], i, 2368359562); Y = D(Y, E, v, g, S[P + 5], C, 4294588738); g = D(g, Y, E, v, S[P + 8], Q, 2272392833); v = D(v, g, Y, E, S[P + 11], R, 1839030562); E = D(E, v, g, Y, S[P + 14], O, 4259657740); Y = D(Y, E, v, g, S[P + 1], C, 2763975236); g = D(g, Y, E, v, S[P + 4], Q, 3113631427); v = D(v, g, Y, E, S[P + 7], R, 2850705349); E = D(E, v, g, Y, S[P + 10], O, 3257057990); Y = D(Y, E, v, g, S[P + 13], C, 2433635283); g = D(g, Y, E, v, S[P + 0], Q, 16807026); v = D(v, g, Y, E, S[P + 3], R, 539946071); E = D(E, v, g, Y, S[P + 6], O, 3756756832); Y = D(Y, E, v, g, S[P + 9], C, 4094571909); g = D(g, Y, E, v, S[P + 12], Q, 2466948901); v = D(v, g, Y, E, S[P + 15], R, 3756231416); E = D(E, v, g, Y, S[P + 2], O, 168717936); Y = t(Y, E, v, g, S[P + 0], A, 2368359562); g = t(g, Y, E, v, S[P + 7], z, 4294588738); v = t(v, g, Y, E, S[P + 14], y, 2272392833); E = t(E, v, g, Y, S[P + 5], w, 1839030562); Y = t(Y, E, v, g, S[P + 12], A, 4259657740); g = t(g, Y, E, v, S[P + 3], z, 2763975236); v = t(v, g, Y, E, S[P + 10], y, 3113631427); E = t(E, v, g, Y, S[P + 1], w, 2850705349); Y = t(Y, E, v, g, S[P + 8], A, 3257057990); g = t(g, Y, E, v, S[P + 15], z, 2433635283); v = t(v, g, Y, E, S[P + 6], y, 16807026); E = t(E, v, g, Y, S[P + 13], w, 539946071); Y = t(Y, E, v, g, S[P + 4], A, 3756756832); g = t(g, Y, E, v, S[P + 11], z, 4094571909); v = t(v, g, Y, E, S[P + 2], y, 2466948901); E = t(E, v, g, Y, S[P + 9], w, 3756231416); Y = K(Y, h); X = K(X, E); W = K(W, v); V = K(V, g); } var T = B(Y) + B(X) + B(W) + B(V); return T.toLowerCase(); }

  return (
    <Box
      sx={{
        "& .pro-sidebar": {
          height: "100vh",
          width: isCollapsed ? "80px" : "250px",
          minWidth: isCollapsed ? "80px" : "250px",
          transition: "all 0.3s ease-in-out",
          "@media (max-width: 768px)": {
            position: "fixed",
            left: isCollapsed ? "-80px" : 0,
            zIndex: 1000,
            boxShadow: isCollapsed ? "none" : "4px 0 8px rgba(0,0,0,0.2)",
          },
        },
        "& .pro-sidebar-inner": {
          background: `${colors.primary[400]} !important`,
          height: "100%",
          overflowY: "auto",
          "@media (max-width: 768px)": {
            width: "250px",
          },
        },
        "& .pro-icon-wrapper": {
          backgroundColor: "transparent !important",
        },
        "& .pro-inner-item": {
          padding: "5px 35px 5px 20px !important",
        },
        "& .pro-inner-item:hover": {
          color: "#868dfb !important",
        },
        "& .pro-menu-item.active": {
          color: "#6870fa !important",
        },
      }}
    >
      <ProSidebar collapsed={isCollapsed}>
        <Menu iconShape="square">
          {/* LOGO AND MENU ICON */}
          <MenuItem
            onClick={() => setIsCollapsed(!isCollapsed)}
            icon={<MenuOutlinedIcon />}
            style={{
              margin: "10px 0 20px 0",
              color: colors.grey[100],
            }}
          >
            {!isCollapsed && (
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                ml="15px"
              >
                <Typography variant="h3" color={colors.grey[100]}>
                  MENU
                </Typography>
              </Box>
            )}
          </MenuItem>

          {!isCollapsed && (
            <Box mb="25px">
              <Box display="flex" justifyContent="center" alignItems="center">
                {userPicture ? (
                  <img
                    alt="profile-user"
                    width="100px"
                    height="100px"
                    src={userPicture}
                    style={{ cursor: "pointer", borderRadius: "50%" }}
                  />
                ) : (
                  <svg 
                    width="100" 
                    height="100" 
                    viewBox="0 0 100 100"
                    style={{ display: 'block', margin: 'auto' }}
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="50"
                      fill={colors.greenAccent[500]}
                    />
                    <text 
                      x="50"
                      y="60"
                      textAnchor="middle"
                      fill="#fff"
                      fontSize="40"
                      fontFamily="Arial"
                      style={{ userSelect: 'none' }}
                    >
                      {userName.charAt(0).toUpperCase()}
                    </text>
                  </svg>
                )}
              </Box>
              <Box textAlign="center">
                <Typography
                  variant="h2"
                  color={colors.grey[100]}
                  fontWeight="bold"
                  sx={{ m: "10px 0 0 0" }}
                >
                  {userName}
                </Typography>
                <Typography variant="h5" color={colors.greenAccent[500]}>
                </Typography>
              </Box>
            </Box>
          )}

          <Box paddingLeft={isCollapsed ? undefined : "10%"}>
            <Item
              title="Dashboard"
              to="/dashboard"
              icon={<HomeOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
            />

            <Typography
              variant="h6"
              color={colors.grey[300]}
              sx={{ m: "15px 0 5px 20px" }}
            >
              Data
            </Typography>
            <Item
              title="Contacts Information"
              to="/contacts"
              icon={<ContactsOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
            />
            <Typography
              variant="h6"
              color={colors.grey[300]}
              sx={{ m: "15px 0 5px 20px" }}
            >
              Pages
            </Typography>
            <Item
              title="Profile Form"
              to="/form"
              icon={<PersonOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
            />

            <Typography
              variant="h6"
              color={colors.grey[300]}
              sx={{ m: "15px 0 5px 20px" }}
            >
              Configuration
            </Typography>
            <Item
              title="Config Carte"
              to="/config"
              icon={<SettingsInputAntennaIcon />}
              selected={selected}
              setSelected={setSelected}
            />
            <Item
              title="Config Onduleur"
              to="/config-inverter"
              icon={<SettingsInputAntennaIcon />}
              selected={selected}
              setSelected={setSelected}
            />
          </Box>
        </Menu>
      </ProSidebar>
    </Box>
  );
};

export default Sidebar;
