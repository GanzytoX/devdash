import React, { useState, useEffect } from 'react';
import type { Service } from '../../services/apiService';
import { useServices } from '../../hooks/useServices';
import { X, Globe } from 'lucide-react';

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingService?: Service | null;
}

export const ServiceFormModal: React.FC<ServiceFormModalProps> = ({
  isOpen,
  onClose,
  editingService,
}) => {
  const { addService, updateService } = useServices();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<'GET' | 'POST' | 'HEAD'>('GET');
  const [interval, setIntervalVal] = useState(30);
  const [tags, setTags] = useState('');
  const [publicVisible, setPublicVisible] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState<{ name?: string; url?: string }>({});

  useEffect(() => {
    if (editingService) {
      setName(editingService.name);
      setUrl(editingService.url);
      setMethod(editingService.method);
      setIntervalVal(editingService.interval);
      setTags(editingService.tags || '');
      setPublicVisible(editingService.publicVisible ?? true);
    } else {
      setName('');
      setUrl('https://');
      setMethod('GET');
      setIntervalVal(30);
      setTags('');
      setPublicVisible(true);
    }
    setErrors({});
  }, [editingService, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = () => {
    const tempErrors: typeof errors = {};
    if (!name.trim()) tempErrors.name = 'El nombre es obligatorio';
    if (!url.trim() || url === 'https://' || url === 'http://') {
      tempErrors.url = 'La dirección URL es obligatoria';
    } else {
      // Basic URL pattern check
      const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
      const ipPattern = /^(https?:\/\/)?(?:[0-9]{1,3}\.){3}[0-9]{1,3}(:[0-9]+)?(\/.*)?$/;
      if (!urlPattern.test(url) && !ipPattern.test(url)) {
        tempErrors.url = 'Por favor introduce una dirección URL o IP válida (ej. https://ejemplo.com)';
      }
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Standardize URL to prepend http/https if missing
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    setSubmitting(true); setSubmitError('');
    try {
    if (editingService) {
      await updateService(editingService.id, {
        name,
        url: finalUrl,
        method,
        interval,
        tags,
        publicVisible,
      });
    } else {
      await addService({
        name,
        url: finalUrl,
        method,
        interval,
        paused: false,
        tags,
        publicVisible,
      });
    }
    onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo guardar el endpoint.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop blur overlay */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card container */}
      <div role="dialog" aria-modal="true" aria-labelledby="service-modal-title" className="relative w-full max-w-lg glass-panel rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in bg-slate-900/90">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 bg-slate-950/40 flex items-center justify-between">
          <h3 id="service-modal-title" className="text-sm font-semibold text-slate-100 font-sans tracking-tight">
            {editingService ? 'Editar servicio monitoreado' : 'Añadir servicio nuevo'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg border border-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Name Field */}
          <div>
            <label htmlFor="service-name" className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
              Nombre del Servicio
            </label>
            <div className="relative">
              <input
                type="text"
                id="service-name"
                placeholder="Ej. Servidor API Principal"
                value={name}
                onChange={e => setName(e.target.value)}
                className={`w-full px-3 py-2 text-xs glass-input ${errors.name ? 'border-red-500/50 focus:border-red-500' : ''}`}
              />
            </div>
            {errors.name && (
              <p className="text-[10px] text-red-400 font-mono mt-1">{errors.name}</p>
            )}
          </div>

          {/* URL Field */}
          <div>
            <label htmlFor="service-url" className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
              Dirección URL / IP
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                id="service-url"
                placeholder="https://mi-servicio.com/health"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-xs glass-input ${errors.url ? 'border-red-500/50 focus:border-red-500' : ''}`}
              />
            </div>
            {errors.url && (
              <p className="text-[10px] text-red-400 font-mono mt-1">{errors.url}</p>
            )}
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Method Select */}
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                Método HTTP
              </label>
              <div className="relative">
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs glass-input focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="GET" className="bg-slate-900 text-slate-100">GET (Salud Completa)</option>
                  <option value="POST" className="bg-slate-900 text-slate-100">POST (Envío Verificación)</option>
                  <option value="HEAD" className="bg-slate-900 text-slate-100">HEAD (Llamada Rápida)</option>
                </select>
              </div>
            </div>

            {/* Interval Select */}
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                Intervalo
              </label>
              <div className="relative">
                <select
                  value={interval}
                  onChange={e => setIntervalVal(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs glass-input focus:outline-none appearance-none cursor-pointer"
                >
                  <option value={30} className="bg-slate-900 text-slate-100">30 Segundos</option>
                  <option value={60} className="bg-slate-900 text-slate-100">1 Minuto</option>
                  <option value={120} className="bg-slate-900 text-slate-100">2 Minutos</option>
                  <option value={300} className="bg-slate-900 text-slate-100">5 Minutos</option>
                </select>
              </div>
            </div>

          </div>

          <div>
            <label htmlFor="service-tags" className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">Etiquetas</label>
            <input id="service-tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="api, producción, cubepath" className="w-full px-3 py-2 text-xs glass-input" />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer"><input type="checkbox" checked={publicVisible} onChange={e => setPublicVisible(e.target.checked)} /> Mostrar en la página pública de estado</label>
          {submitError && <p role="alert" className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{submitError}</p>}

          {/* Action Row */}
          <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs glass-btn font-sans cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs glass-btn-primary font-sans cursor-pointer"
            >
              {submitting ? 'Guardando…' : editingService ? 'Guardar cambios' : 'Añadir servicio'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
