import React, { useState } from "react";
import LandingPage from "./components/LandingPage";
import LiveMonitor from "./components/LiveMonitor";
import RecordAnalyze from "./components/RecordAnalyze";
import FileUploader from "./components/FileUploader";
import "./App.css";

function App() {
  const [currentView, setCurrentView] = useState("landing");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const navigateTo = (view) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentView(view);
      setIsTransitioning(false);
    }, 300);
  };

  const renderView = () => {
    switch (currentView) {
      case "monitor":
        return <LiveMonitor onBack={() => navigateTo("landing")} />;
      case "record":
        return <RecordAnalyze onBack={() => navigateTo("landing")} />;
      case "upload":
        return <FileUploader onBack={() => navigateTo("landing")} />;
      default:
        return <LandingPage onNavigate={navigateTo} />;
    }
  };

  return (
    <div className={`app-container ${isTransitioning ? "transitioning" : ""}`}>
      {renderView()}
    </div>
  );
}

export default App;
