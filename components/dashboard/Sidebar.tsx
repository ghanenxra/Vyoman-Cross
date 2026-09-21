'use client';

import {
  Globe,
  Radio,
  Calendar,
  Compass,
  Settings,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'dashboard' | 'tracking' | 'forecast' | 'skyview' | 'settings';
  onTabChange: (tab: 'dashboard' | 'tracking' | 'forecast' | 'skyview' | 'settings') => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const navItems: {
    id: 'dashboard' | 'tracking' | 'forecast' | 'skyview' | 'settings';
    label: string;
    icon: typeof Globe;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Globe },
    { id: 'tracking', label: 'Live Tracking', icon: Radio },
    { id: 'forecast', label: 'Predictions', icon: Calendar },
    { id: 'skyview', label: 'Sky Radar', icon: Compass },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-16 md:w-56 bg-[#070b16]/95 border-r border-white/10 flex flex-col justify-between p-2 md:p-3 shrink-0 select-none z-20">
      {/* Top Nav Items */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 px-3 py-1 hidden md:block">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono transition-all group ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold shadow-lg shadow-cyan-950/40'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
              title={item.label}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-gray-200'
                }`}
              />
              <span className="hidden md:inline truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom System Status */}
      <div className="border-t border-white/10 pt-3 space-y-2">
        <div className="bg-[#0f172a]/80 border border-white/5 rounded-xl p-2.5 hidden md:block">
          <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>ORBITAL ENGINE</span>
          </div>
          <div className="text-[9px] font-mono text-gray-400 mt-1">
            SGP4 / SDP4 Propagator
            <br />
            203 Active LEO Satellites
          </div>
        </div>

        <div className="text-center md:text-left text-[9px] font-mono text-gray-400 px-1">
          <span className="hidden md:inline">v2.4 Production • </span>
          <span>Vyoman</span>
        </div>
      </div>
    </aside>
  );
}
