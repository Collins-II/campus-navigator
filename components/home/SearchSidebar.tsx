'use client';

import { Search, ChevronDown } from 'lucide-react';
import React, { useMemo, useState } from 'react';

export type CampusLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tag: string;
  status?: 'open' | 'closed' | 'busy';
  occupancy?: number;
};

export type LocationFilter = {
  id: string;
  label: string;
  isActive?: boolean;
};

export interface SearchSidebarConfig {
  /** Subtitle label above the main title */
  sectionLabel?: string;
  /** Main section title */
  title?: string;
  /** Status badge label - can be dynamic (e.g., from real-time data) */
  statusBadge?: string;
  /** Search input placeholder text */
  searchPlaceholder?: string;
  /** Empty state message when no locations are found */
  emptyStateMessage?: string;
  /** Available filter options */
  filters?: LocationFilter[];
  /** Loading state indicator */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Maximum height for locations container (default: 400px) */
  maxHeight?: string;
  /** Show filter toggle on mobile (default: true) */
  showFilterToggleOnMobile?: boolean;
}

type SearchSidebarProps = SearchSidebarConfig & {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  locations: CampusLocation[];
  selectedLocationId: string;
  onSelectLocation: (location: CampusLocation) => void;
  onFilterChange?: (filterId: string) => void;
};

// Default configuration for the sidebar
const DEFAULT_CONFIG: Required<SearchSidebarConfig> = {
  sectionLabel: 'Explore',
  title: 'Campus routes',
  statusBadge: 'Live',
  searchPlaceholder: 'Search rooms, halls, labs...',
  emptyStateMessage: 'No locations match your search.',
  filters: [],
  isLoading: false,
  error: null,
  maxHeight: '400px',
  showFilterToggleOnMobile: true,
};

// Utility function to get status badge styling
const getStatusBadgeClasses = (status?: CampusLocation['status']): string => {
  switch (status) {
    case 'closed':
      return 'bg-red-100 text-red-700 ring-1 ring-red-300';
    case 'busy':
      return 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300';
    case 'open':
    default:
      return 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300';
  }
};

// Utility function to get status label
const getStatusLabel = (status?: CampusLocation['status']): string => {
  switch (status) {
    case 'closed':
      return 'Closed';
    case 'busy':
      return 'Busy';
    case 'open':
    default:
      return 'Open';
  }
};

/**
 * SearchSidebar Component
 * 
 * Production-ready sidebar for searching and filtering campus locations.
 * All text content is configurable via props to support multiple languages
 * and use cases. Status information is dynamic based on location data.
 * 
 * @example
 * ```tsx
 * <SearchSidebar
 *   searchQuery={query}
 *   onSearchChange={setQuery}
 *   locations={campusLocations}
 *   selectedLocationId={selectedId}
 *   onSelectLocation={handleSelect}
 *   filters={filterOptions}
 *   onFilterChange={handleFilterChange}
 *   isLoading={loading}
 * />
 * ```
 */
export function SearchSidebar({
  searchQuery,
  onSearchChange,
  locations,
  selectedLocationId,
  onSelectLocation,
  onFilterChange,
  sectionLabel = DEFAULT_CONFIG.sectionLabel,
  title = DEFAULT_CONFIG.title,
  statusBadge = DEFAULT_CONFIG.statusBadge,
  searchPlaceholder = DEFAULT_CONFIG.searchPlaceholder,
  emptyStateMessage = DEFAULT_CONFIG.emptyStateMessage,
  filters = DEFAULT_CONFIG.filters,
  isLoading = DEFAULT_CONFIG.isLoading,
  error = DEFAULT_CONFIG.error,
  maxHeight = DEFAULT_CONFIG.maxHeight,
  showFilterToggleOnMobile = DEFAULT_CONFIG.showFilterToggleOnMobile,
}: SearchSidebarProps) {
  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => filters, [filters]);
  
  // State for mobile filter toggle
  const [showFilters, setShowFilters] = useState(false);

  return (
    <aside
      className="w-full rounded-lg sm:rounded-2xl md:rounded-[30px] border border-gray-300 bg-white/80 p-3 sm:p-4 md:p-5 shadow-md backdrop-blur-md md:sticky md:top-24 max-h-screen md:max-h-[calc(100vh-120px)] flex flex-col"
      role="complementary"
      aria-label="Campus location search sidebar"
    >
      {/* Header Section */}
      <div className="mb-4 sm:mb-5 flex items-center justify-between flex-shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-gray-600 truncate">
            {sectionLabel}
          </p>
          <h2 className="mt-1 text-base sm:text-lg font-semibold text-gray-900 truncate">
            {title}
          </h2>
        </div>
        <span
          className="ml-2 rounded-full border border-gray-300 bg-gray-50 px-2 sm:px-2.5 py-1 text-[9px] sm:text-[10px] font-medium text-gray-700 whitespace-nowrap flex-shrink-0"
          aria-live="polite"
          aria-label={`Status: ${statusBadge}`}
        >
          {statusBadge}
        </span>
      </div>

      {/* Search Input */}
      <label className="relative block mb-4 flex-shrink-0">
        <Search
          className="pointer-events-none absolute left-3 sm:left-3.5 top-3 sm:top-3.5 h-4 w-4 text-gray-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl sm:rounded-2xl border border-gray-300 bg-white py-2.5 sm:py-3 pl-10 sm:pl-11 pr-3 sm:pr-4 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors"
          aria-label="Search campus locations"
          disabled={isLoading}
        />
      </label>

      {/* Filter Buttons */}
      {memoizedFilters.length > 0 && (
        <div className="flex-shrink-0">
          {/* Mobile Filter Toggle */}
          {showFilterToggleOnMobile && (
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden mb-3 w-full flex items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-100 transition"
              aria-expanded={showFilters}
              aria-controls="filter-buttons"
            >
              <span>Filters</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  showFilters ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}

          {/* Filter Buttons Container */}
          <div
            id="filter-buttons"
            className={`${
              showFilterToggleOnMobile && !showFilters
                ? 'hidden md:flex'
                : 'flex'
            } flex-wrap gap-2 mb-4`}
            role="group"
            aria-label="Location filters"
          >
            {memoizedFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => {
                  onFilterChange?.(filter.id);
                }}
                className={`rounded-full border px-2.5 py-1.5 text-[10px] sm:text-[11px] font-medium transition ${
                  filter.isActive
                    ? 'border-emerald-400 bg-emerald-100 text-emerald-700'
                    : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-emerald-400 hover:text-emerald-700'
                }`}
                aria-pressed={filter.isActive}
                disabled={isLoading}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="mb-4 rounded-lg sm:rounded-2xl border border-red-300 bg-red-50 p-3 text-xs sm:text-sm text-red-700 flex-shrink-0"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Locations List or Loading/Empty States */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ maxHeight }}
      >
        {isLoading ? (
          <div className="space-y-2 pr-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 sm:h-20 rounded-lg sm:rounded-2xl border border-gray-200 bg-gray-100 animate-pulse"
              />
            ))}
          </div>
        ) : locations.length > 0 ? (
          <div role="list" className="space-y-2 pr-2">
            {locations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                role="listitem"
                onClick={() => onSelectLocation(loc)}
                className={`w-full rounded-lg sm:rounded-2xl border p-2.5 sm:p-3.5 text-left transition-all ${
                  selectedLocationId === loc.id
                    ? 'border-emerald-400 bg-gradient-to-r from-emerald-100 to-emerald-50 shadow-md'
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
                }`}
                aria-current={selectedLocationId === loc.id ? 'true' : undefined}
                aria-label={`${loc.name} - ${getStatusLabel(loc.status)}${
                  loc.occupancy ? ` - ${loc.occupancy}% occupied` : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                      {loc.name}
                    </div>
                    <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-gray-600 truncate">
                      {loc.tag}
                    </div>
                    {loc.occupancy !== undefined && (
                      <div className="mt-1 sm:mt-2 text-[9px] sm:text-[10px] text-gray-500">
                        Occupancy: {loc.occupancy}%
                      </div>
                    )}
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-1 text-[9px] sm:text-[10px] font-medium ${getStatusBadgeClasses(
                      loc.status
                    )}`}
                  >
                    {getStatusLabel(loc.status)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div
            className="rounded-lg sm:rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-3 sm:p-4 text-xs sm:text-sm text-gray-600 text-center"
            role="status"
          >
            {emptyStateMessage}
          </div>
        )}
      </div>
    </aside>
  );
}
