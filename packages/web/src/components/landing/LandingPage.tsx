import React from "react";
import { Navbar } from "./Navbar";
import { HeroSection } from "./HeroSection";
import { ToolPillars } from "./ToolPillars";  
import { ProblemSolution } from "./ProblemSolution";
import { InteractiveDemo } from "./InteractiveDemo";
import { FeatureBento } from "./FeatureBento";
import { ComparisonSection } from "./ComparisonMatrix";
import { Footer } from "./Footer";

type LandingPageProps = {
  onOpenConsole: () => void;
  onOpenDocs: () => void;
};

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenConsole, onOpenDocs }) => {
  return (
    <div className="min-h-screen flex flex-col w-full relative selection:bg-purple-500/30 selection:text-purple-200">
      <Navbar onOpenConsole={onOpenConsole} onOpenDocs={onOpenDocs} />

      <main className="flex-1 space-y-8">
        <HeroSection onOpenConsole={onOpenConsole} onOpenDocs={onOpenDocs} />
        <ToolPillars onOpenConsole={onOpenConsole} />
        <ProblemSolution />
        <InteractiveDemo />
        <FeatureBento />
        <ComparisonSection />
      </main>

      <Footer />
    </div>
  );
};
