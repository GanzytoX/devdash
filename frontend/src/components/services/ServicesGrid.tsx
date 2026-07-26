import React, { useState } from 'react';
import { useServices } from '../../hooks/useServices';
import { ServiceCard } from './ServiceCard';
import type { Service } from '../../services/apiService';
import { Plus } from 'lucide-react';

interface ServicesGridProps {
  onAddClick: () => void;
  onEditClick: (service: Service) => void;
}

export const ServicesGrid: React.FC<ServicesGridProps> = ({ onAddClick, onEditClick }) => {
  const { services } = useServices();
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'degraded' | 'paused'>('all');

  // Filter services by selected status pill
  const filteredServices = services.filter(service => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'paused') return service.paused;
    if (service.paused) return false; // if another status filter is selected, hide paused ones
    return service.status === statusFilter;
  });

  const filterTabs: { id: typeof statusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Todos', count: services.length },
    { id: 'online', label: 'En línea', count: services.filter(s => !s.paused && s.status === 'online').length },
    { id: 'degraded', label: 'Degradados', count: services.filter(s => !s.paused && s.status === 'degraded').length },
    { id: 'offline', label: 'Fuera de línea', count: services.filter(s => !s.paused && s.status === 'offline').length },
    { id: 'paused', label: 'Pausados', count: services.filter(s => s.paused).length },
  ];

  return (
    <div className="space-y-6">
      {/* Filtering Pills Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-sans transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
                statusFilter === tab.id
                  ? 'bg-brand-blue-600/90 border-brand-blue-500 text-white shadow-md shadow-brand-blue-600/10'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                statusFilter === tab.id ? 'bg-brand-blue-600 text-brand-blue-100' : 'bg-slate-900/50 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Add Service Trigger Button */}
        <button
          onClick={onAddClick}
          className="glass-btn-primary flex items-center gap-2 px-4 py-2 text-xs font-sans cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Añadir servicio</span>
        </button>
      </div>

      {/* Services Cards Grid Layout */}
      {filteredServices.length === 0 ? (
        <div className="glass-panel rounded-2xl p-16 text-center border border-white/5">
          <p className="text-sm text-slate-300 mb-2 font-sans">
            {services.length === 0 ? 'Aún no hay servicios registrados' : 'No hay servicios con este estado'}
          </p>
          <p className="text-xs text-slate-500 font-sans">
            {services.length === 0
              ? 'Añade tu primer servicio para comenzar a monitorear su disponibilidad.'
              : 'Selecciona otro filtro para consultar los servicios disponibles.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={onEditClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};
