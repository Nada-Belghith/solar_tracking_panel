// Fonction pour vérifier si un panneau est sélectionné
export const isPanelSelected = () => {
  const selectedDevice = localStorage.getItem('selectedDevice');
  return selectedDevice !== null && selectedDevice !== undefined;
};

// Fonction pour obtenir l'URL appropriée
export const getRedirectUrl = (currentPath) => {
  if (currentPath === '/dashboard' && !isPanelSelected()) {
    return '/select-panel';
  }
  return currentPath;
};

// Liste des routes qui nécessitent un panneau sélectionné
export const routesRequiringPanel = [
  '/dashboard',
  '/line',  // si ces routes nécessitent aussi un panneau sélectionné
  '/bar',
  '/pie'
];
