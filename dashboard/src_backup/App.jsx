import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';

function App() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <>
      {showDashboard ? (
        <Dashboard />
      ) : (
        <Landing onLaunch={() => setShowDashboard(true)} />
      )}
    </>
  );
}

export default App;
