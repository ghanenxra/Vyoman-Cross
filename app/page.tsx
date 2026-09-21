'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ObserverLocation, TleRecord, VisiblePass, ForecastResponse } from '@/lib/types';
import seedSatellites from '@/data/satellites.json';
import TopBar from '@/components/dashboard/TopBar';
import Sidebar from '@/components/dashboard/Sidebar';
import Globe3D from '@/components/dashboard/Globe3D';
import TelemetryPanel from '@/components/dashboard/TelemetryPanel';
import PassesTable from '@/components/dashboard/PassesTable';
import PassTimeline from '@/components/dashboard/PassTimeline';
import SkyRadar from '@/components/dashboard/SkyRadar';
import SearchModal from '@/components/dashboard/SearchModal';
import LocationModal from '@/components/dashboard/LocationModal';
import ForecastList from '@/components/ForecastList';

// Default location: Kota, India (matches reference HUD)
const DEFAULT_LOCATION: ObserverLocation = {
  latitude: 25.18,
  longitude: 75.83,
  elevationMeters: 271,
};

export default function Home() {
  // State
  const [observerLocation, setObserverLocation] = useState<ObserverLocation>(DEFAULT_LOCATION);
  const [locationName, setLocationName] = useState('Kota, India');
  const [allSatellites] = useState<TleRecord[]>(seedSatellites as TleRecord[]);
  const [selectedSat, setSelectedSat] = useState<TleRecord>(
    (seedSatellites[0] as TleRecord) || null,
  );
  const [passes, setPasses] = useState<VisiblePass[]>([]);
  const [, setLoadingPasses] = useState(false);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tracking' | 'forecast' | 'skyview' | 'settings'>('dashboard');

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Fetch visible passes whenever observer location changes
  const fetchPasses = useCallback(async (loc: ObserverLocation) => {
    setLoadingPasses(true);
    try {
      const res = await fetch(
        `/api/passes/forecast?lat=${loc.latitude}&lng=${loc.longitude}&days=3`,
      );
      if (!res.ok) throw new Error('Pass fetch failed');
      const data: ForecastResponse = await res.json();
      setPasses(data.passes || []);
    } catch (err) {
      console.error('[Dashboard] Error fetching passes:', err);
    } finally {
      setLoadingPasses(false);
    }
  }, []);

  useEffect(() => {
    fetchPasses(observerLocation);
  }, [observerLocation, fetchPasses]);

  // Find next visible pass for the selected satellite
  const nextPassForSelectedSat = useMemo(() => {
    if (!selectedSat || passes.length === 0) return null;
    const nowMs = Date.now();
    const satPasses = passes.filter(
      (p) =>
        p.noradId === selectedSat.noradId &&
        new Date(p.endTime).getTime() > nowMs,
    );
    return satPasses[0] || null;
  }, [selectedSat, passes]);

  // Handle selecting a pass from table or timeline
  const handleSelectPass = useCallback(
    (pass: VisiblePass) => {
      const sat = allSatellites.find((s) => s.noradId === pass.noradId);
      if (sat) {
        setSelectedSat(sat);
      }
    },
    [allSatellites],
  );

  return (
    <div className="min-h-screen bg-[#050811] text-white flex flex-col antialiased selection:bg-cyan-500 selection:text-black">
      {/* Top Bar Header */}
      <TopBar
        observerLocation={observerLocation}
        locationName={locationName}
        onOpenSearch={() => setIsSearchOpen(true)}
        onChangeLocation={() => setIsLocationModalOpen(true)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Dashboard Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {activeTab === 'dashboard' && (
            <>
              {/* Top Row: 3D Earth Globe + Telemetry HUD */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-auto lg:h-[580px]">
                {/* 3D Interactive WebGL Globe */}
                <div className="lg:col-span-8 h-[480px] lg:h-full">
                  <Globe3D
                    selectedSat={selectedSat}
                    observerLocation={observerLocation}
                    onSelectSatellite={setSelectedSat}
                  />
                </div>

                {/* Real-time Telemetry Panel */}
                <div className="lg:col-span-4 h-auto lg:h-full">
                  <TelemetryPanel
                    selectedSat={selectedSat}
                    observerLocation={observerLocation}
                    nextPass={nextPassForSelectedSat}
                    onViewForecast={() => setActiveTab('forecast')}
                  />
                </div>
              </div>

              {/* Bottom Row: 3 Analytics & Tracking Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Column 1: Visible Passes (Next 24h) */}
                <div className="h-[280px]">
                  <PassesTable
                    passes={passes}
                    selectedNoradId={selectedSat?.noradId}
                    onSelectPass={handleSelectPass}
                  />
                </div>

                {/* Column 2: Pass Timeline & Elevation */}
                <div className="h-[280px]">
                  <PassTimeline
                    passes={passes}
                    selectedNoradId={selectedSat?.noradId}
                    onSelectPass={handleSelectPass}
                  />
                </div>

                {/* Column 3: Sky View Polar Radar */}
                <div className="h-[280px]">
                  <SkyRadar
                    pass={nextPassForSelectedSat}
                    selectedSat={selectedSat}
                    observerLocation={observerLocation}
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'tracking' && (
            <div className="h-[calc(100vh-100px)] grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-9 h-full">
                <Globe3D
                  selectedSat={selectedSat}
                  observerLocation={observerLocation}
                  onSelectSatellite={setSelectedSat}
                />
              </div>
              <div className="lg:col-span-3 h-full">
                <TelemetryPanel
                  selectedSat={selectedSat}
                  observerLocation={observerLocation}
                  nextPass={nextPassForSelectedSat}
                />
              </div>
            </div>
          )}

          {activeTab === 'forecast' && (
            <div className="max-w-4xl mx-auto space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold font-mono text-white">
                    7-DAY VISIBLE PASS FORECAST
                  </h2>
                  <p className="text-xs font-mono text-gray-400">
                    Predictions for {locationName} ({observerLocation.latitude.toFixed(2)}°N,{' '}
                    {observerLocation.longitude.toFixed(2)}°E)
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono text-cyan-300 transition-colors"
                >
                  ← Back to Cockpit
                </button>
              </div>
              <ForecastList data={{ passes }} />
            </div>
          )}

          {activeTab === 'skyview' && (
            <div className="max-w-3xl mx-auto py-6 space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold font-mono text-white">
                  POLAR RADAR HORIZON PLOT
                </h2>
                <p className="text-xs font-mono text-gray-400">
                  Real-time azimuth & elevation dome tracking for {selectedSat?.name}
                </p>
              </div>
              <div className="h-[420px] max-w-lg mx-auto">
                <SkyRadar
                  pass={nextPassForSelectedSat}
                  selectedSat={selectedSat}
                  observerLocation={observerLocation}
                />
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-xl mx-auto py-8 space-y-6">
              <div className="bg-[#0b1222] border border-white/10 rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold font-mono text-white">
                  Cockpit & Telemetry Configuration
                </h2>
                <div className="space-y-3 text-xs font-mono text-gray-300">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <span>Elevation Cutoff Threshold</span>
                    <span className="font-bold text-cyan-400">10° (Default)</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <span>Solar Sky Deprecator (Twilight)</span>
                    <span className="font-bold text-emerald-400">-6° (Civil)</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <span>Orbital Propagator</span>
                    <span className="font-bold text-gray-200">SGP4 / SDP4 (satellite.js)</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <span>Active Catalog Satellites</span>
                    <span className="font-bold text-cyan-300">203 Low Earth Orbit Objects</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Ctrl+K Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectSatellite={(sat) => setSelectedSat(sat)}
        onSetLocation={(loc, name) => {
          setObserverLocation(loc);
          setLocationName(name);
        }}
        satellites={allSatellites}
      />

      {/* Change Observer Location Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={observerLocation}
        currentName={locationName}
        onSaveLocation={(loc, name) => {
          setObserverLocation(loc);
          setLocationName(name);
        }}
      />
    </div>
  );
}
