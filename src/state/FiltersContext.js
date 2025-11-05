import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

const FiltersContext = createContext(null);

/**
 * Estado de filtros:
 * mode: 'none' | 'emergency' | 'specialty'
 * specialty: string (solo se usa cuando mode === 'specialty')
 * severity: 1..5
 * patientProfile: 'adult' | 'child' | 'pregnant'
 */
export function FiltersProvider({ children }) {
  const [filters, setFiltersState] = useState({
    mode: 'none',
    specialty: '',
    severity: 1,
    patientProfile: 'adult',
  });

  const hasActiveFilters =
    filters.mode === 'emergency' ||
    (filters.mode === 'specialty' && Boolean(filters.specialty));

  // Mantenemos tu firma: acepta objeto o función(prev) -> next
  const setFilters = useCallback((fnOrObj) => {
    setFiltersState((prev) => {
      const next = typeof fnOrObj === 'function' ? fnOrObj(prev) : { ...prev, ...fnOrObj };
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({ mode: 'none', specialty: '', severity: 1, patientProfile: 'adult' });
  }, []);

  const value = useMemo(
    () => ({
      ...filters,          // <- expone patientProfile también
      hasActiveFilters,
      setFilters,
      clearFilters,
    }),
    [filters, hasActiveFilters, setFilters, clearFilters]
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error('useFilters debe usarse dentro de <FiltersProvider>');
  return ctx;
}
