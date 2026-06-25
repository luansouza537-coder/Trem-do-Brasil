import React from 'react';
import { Edge } from '../../types';
import { CITY_MAP } from '../../data/cities';
import { getPassengerMonthlyRevenue, getCityPassengerDemand } from '../../utils/gameRules';

interface PassengersTabProps {
  passengerEdges: Edge[];
  gameYear: number;
  activeEffects: string[];
  onSetFare: (edgeId: string, fare: number) => void;
  onBuyExtraFleet: (edgeId: string) => void;
}

const fmt = (v: number) =>
  v >= 1e9 ? `R$${(v / 1e9).toFixed(1)}B` : `R$${(v / 1e6).toFixed(0)}M`;

function getOccupancy(edge: Edge): number {
  const cityA = CITY_MAP.get(edge.from);
  const cityB = CITY_MAP.get(edge.to);
  const demandA = getCityPassengerDemand(cityA?.type ?? 'cidade');
  const demandB = getCityPassengerDemand(cityB?.type ?? 'cidade');
  const demandBase = (demandA + demandB) / 2;
  const fare = edge.fare ?? 150;
  const elasticity = Math.max(0.2, 1 - (fare - 120) / 400);
  const capacityBase = Math.round((edge.distance / 100) * 300);
  const capacity = Math.max(300, capacityBase + (edge.extraFleets ?? 0) * 150);
  const pax = Math.min(demandBase * elasticity, capacity);
  return Math.round((pax / capacity) * 100);
}

export default function PassengersTab({
  passengerEdges,
  gameYear,
  activeEffects,
  onSetFare,
  onBuyExtraFleet,
}: PassengersTabProps) {
  const completed = passengerEdges.filter(e => e.status === 'complete');
  const building = passengerEdges.filter(e => e.status === 'building');
  const cities = Array.from(CITY_MAP.values());
  const totalRevenue = getPassengerMonthlyRevenue(completed, cities, gameYear, activeEffects);

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Summary */}
      <div className="bg-purple-950/40 border border-purple-700/30 rounded-xl p-3">
        <div className="text-[9px] text-purple-400 font-bold uppercase tracking-wider mb-2">
          Rede de Passageiros
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[9px] text-slate-500">Linhas ativas</div>
            <div className="text-sm font-black text-white">{completed.length}</div>
          </div>
          <div>
            <div className="text-[9px] text-slate-500">Receita/mês</div>
            <div className="text-sm font-black text-emerald-400">{fmt(totalRevenue)}</div>
          </div>
          <div>
            <div className="text-[9px] text-slate-500">Em construção</div>
            <div className="text-sm font-black text-amber-400">{building.length}</div>
          </div>
          <div>
            <div className="text-[9px] text-slate-500">Custo/km</div>
            <div className="text-sm font-black text-slate-300">R$30M</div>
          </div>
        </div>
      </div>

      {/* Building */}
      {building.length > 0 && (
        <div>
          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">
            Em construção
          </div>
          {building.map(edge => {
            const cityA = CITY_MAP.get(edge.from);
            const cityB = CITY_MAP.get(edge.to);
            return (
              <div key={edge.id} className="bg-slate-900/60 border border-purple-900/30 rounded-lg p-2 mb-1">
                <div className="text-[10px] text-purple-300 font-bold">
                  🚆 {cityA?.name} ↔ {cityB?.name}
                </div>
                <div className="text-[9px] text-slate-500">{edge.distance.toFixed(0)} km · em obra</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {completed.length === 0 && building.length === 0 && (
        <div className="text-center text-slate-600 text-[11px] py-8 leading-relaxed">
          Nenhuma linha de passageiros ainda.
          <br />
          <span className="text-purple-500">
            Ative o modo 🚆 no mapa e conecte duas cidades.
          </span>
        </div>
      )}

      {/* Active lines */}
      {completed.map(edge => {
        const cityA = CITY_MAP.get(edge.from);
        const cityB = CITY_MAP.get(edge.to);
        const occ = getOccupancy(edge);
        const fare = edge.fare ?? 150;
        const sat = edge.satisfaction ?? 100;
        const occColor =
          occ >= 90 ? 'text-rose-400' : occ >= 70 ? 'text-amber-400' : 'text-emerald-400';
        const satColor =
          sat >= 70 ? 'text-emerald-400' : sat >= 40 ? 'text-amber-400' : 'text-rose-400';

        return (
          <div
            key={edge.id}
            className="bg-slate-900/60 border border-purple-900/40 rounded-xl p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-purple-200 font-bold">
                🚆 {cityA?.name} ↔ {cityB?.name}
              </span>
              <span className="text-[9px] text-slate-500">{edge.distance.toFixed(0)} km</span>
            </div>

            {/* Occupancy bar */}
            <div>
              <div className="flex justify-between text-[9px] mb-0.5">
                <span className="text-slate-500">Ocupação</span>
                <span className={occColor}>{occ}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    occ >= 90 ? 'bg-rose-500' : occ >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${occ}%` }}
                />
              </div>
            </div>

            {/* Satisfaction */}
            <div className="flex justify-between text-[9px]">
              <span className="text-slate-500">Satisfação dos passageiros</span>
              <span className={satColor}>{sat}%</span>
            </div>

            {/* Fare slider */}
            <div>
              <div className="flex justify-between text-[9px] mb-1">
                <span className="text-slate-500">Tarifa</span>
                <span className="text-white font-bold">R$ {fare}</span>
              </div>
              <input
                type="range"
                min={50}
                max={800}
                step={10}
                value={fare}
                onChange={e => onSetFare(edge.id, Number(e.target.value))}
                className="w-full h-1 accent-purple-500 cursor-pointer"
              />
              <div className="flex justify-between text-[8px] text-slate-600 mt-0.5">
                <span>R$50</span>
                <span className="text-purple-400">Ideal ~R$120</span>
                <span>R$800</span>
              </div>
            </div>

            {/* Buy extra fleet */}
            <button
              onClick={() => onBuyExtraFleet(edge.id)}
              className="w-full py-1.5 rounded-lg bg-purple-950/60 border border-purple-700/40 text-purple-300 text-[9px] font-bold hover:bg-purple-900/60 transition"
            >
              + Frota Extra · R$2B · +150 lugares/mês
              {edge.extraFleets ? ` (${edge.extraFleets}×)` : ''}
            </button>
          </div>
        );
      })}
    </div>
  );
}
