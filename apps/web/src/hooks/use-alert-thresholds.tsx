
'use client';

import { useToast } from "@/hooks/use-toast";
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

type ThresholdGroup = {
  group: string;
  items: string[];
};

type ThresholdsContextType = {
  alertThresholds: ThresholdGroup[];
  addThreshold: (group: string, item: string) => void;
};

const initialAlertThresholds: ThresholdGroup[] = [
    { group: "Automatic", items: ["Auto"] },
    { group: "Price Action", items: ["Price Gain > 10%", "Price Loss < 10%", "Near 52 Week High", "All time High", "15% Down from All time High", "Target"] },
    { group: "Valuation", items: ["PE > Industry PE by 15%", "PE < Industry PE", "Fair Value Alerts"] },
    { group: "Technical", items: ["Golden Crossover", "MACD Signals", "RSI Levels > 70"] },
    { group: "News & Events", items: ["Earnings Reports", "Insider Buying", "News Sentiment Shift"] },
    { group: "Custom", items: []}
];

const ThresholdsContext = createContext<ThresholdsContextType | undefined>(undefined);

export const ThresholdsProvider = ({ children, userId }: { children: ReactNode, userId: string | undefined }) => {
  const [alertThresholds, setAlertThresholds] = useState<ThresholdGroup[]>(initialAlertThresholds);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;
    try {
      const savedThresholds = localStorage.getItem(`alertThresholds_${userId}`);
      if (savedThresholds) {
        setAlertThresholds(JSON.parse(savedThresholds));
      } else {
        setAlertThresholds(initialAlertThresholds);
      }
    } catch (error) {
      console.error("Failed to load thresholds from localStorage", error);
      setAlertThresholds(initialAlertThresholds);
    }
  }, [userId]);

  const saveThresholds = useCallback((newThresholds: ThresholdGroup[]) => {
    if (!userId) return;
    try {
      localStorage.setItem(`alertThresholds_${userId}`, JSON.stringify(newThresholds));
      setAlertThresholds(newThresholds);
    } catch (error) {
      console.error("Failed to save thresholds to localStorage", error);
      toast({ title: "Error", description: "Could not save alert thresholds.", variant: "destructive" });
    }
  }, [userId, toast]);

  const addThreshold = useCallback((group: string, item: string) => {
    setAlertThresholds(currentThresholds => {
        const newThresholds = currentThresholds.map(g => {
            if (g.group === group) {
                if (g.items.includes(item)) {
                    toast({ title: "Duplicate", description: "This threshold already exists.", variant: "destructive" });
                    return g;
                }
                return { ...g, items: [...g.items, item] };
            }
            return g;
        });

        if (!newThresholds.find(g => g.group === group)) {
            newThresholds.push({ group, items: [item] });
        }

        saveThresholds(newThresholds);
        toast({ title: "Threshold Added", description: `Added "${item}" to ${group}.` });
        return newThresholds;
    });
  }, [saveThresholds, toast]);

  return (
    <ThresholdsContext.Provider value={{ alertThresholds, addThreshold }}>
      {children}
    </ThresholdsContext.Provider>
  );
};

export const useAlertThresholds = () => {
  const context = useContext(ThresholdsContext);
  if (context === undefined) {
    throw new Error('useAlertThresholds must be used within a ThresholdsProvider');
  }
  return context;
};
