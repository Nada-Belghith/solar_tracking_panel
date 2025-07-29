import { Navigate } from 'react-router-dom';
import { isPanelSelected } from '../utils/panelProtection';

const PanelProtectedRoute = ({ children }) => {
  const hasSelectedPanel = isPanelSelected();

  if (!hasSelectedPanel) {
    return <Navigate to="/select-panel" replace />;
  }

  return children;
};

export default PanelProtectedRoute;
