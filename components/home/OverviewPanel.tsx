'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { type LucideIcon, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

const CampusMap = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 animate-pulse">
      <div className="text-center">
        <div className="h-8 w-8 mx-auto rounded-lg bg-gray-300 mb-2" />
        <p className="text-sm text-gray-500">Loading map...</p>
      </div>
    </div>
  ),
});

/**
 * Represents a single overview statistic
 */
export interface OverviewStat {
  /** Display label for the statistic */
  label: string;
  /** Value to display */
  value: string | number;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Tailwind color tone classes for icon background */
  tone: string;
  /** Optional tooltip or additional info */
  description?: string;
}

/**
 * Campus destination object
 */
export interface CampusDestination {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tag: string;
}

/**
 * Props for OverviewPanel component
 */
export interface OverviewPanelProps {
  /** Selected destination to display on map */
  selectedDestination: CampusDestination;
  /** Quick statistics to display */
  quickStats: OverviewStat[];
  /** Optional custom map content */
  children?: ReactNode;
  /** Loading state indicator */
  isLoading?: boolean;
  /** Error message if any */
  error?: string | null;
  /** Custom section title */
  title?: string;
  /** Custom section subtitle */
  subtitle?: string;
}

// Responsive grid column configuration
const STATS_GRID_CLASSES = 'flex flex-wrap gap-2 sm:gap-3';

/**
 * OverviewPanel Component
 *
 * Displays campus overview with map, quick statistics, and navigation options.
 * Fully responsive with mobile-first design approach.
 *
 * @example
 * ```tsx
 * <OverviewPanel
 *   selectedDestination={destination}
 *   quickStats={stats}
 *   title="Campus Overview"
 * />
 * ```
 */
export function OverviewPanel({
  selectedDestination,
  quickStats,
  children,
  isLoading = false,
  error = null,
  title = 'Campus map',
  subtitle = 'Overview',
}: OverviewPanelProps) {
  const navigationUrl = `/navigation?destination=${encodeURIComponent(selectedDestination.name)}`;

  return (
    <section className="w-full space-y-4 sm:space-y-6" aria-label="Campus overview">
      <div className="rounded-lg sm:rounded-2xl lg:rounded-[30px] border border-gray-300 bg-white/80 p-3 sm:p-4 md:p-5 shadow-md backdrop-blur-md transition-all">
        {/* Header Section */}
        <div className="mb-4 sm:mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-emerald-600 truncate">
              {subtitle}
            </p>
            <h2 className="mt-1.5 sm:mt-1 text-xl sm:text-2xl font-semibold text-gray-900 break-words">
              {title}
            </h2>
          </div>

          {/* Route Suggestion Link */}
          <Link
            href={navigationUrl}
            className="inline-flex items-center justify-center sm:justify-start gap-2 rounded-full border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-xs font-medium text-gray-700 transition-all hover:border-emerald-300 hover:bg-emerald-50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 flex-shrink-0"
            aria-label={`Get route suggestion to ${selectedDestination.name}`}
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
            <span>Route</span>
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <div
            className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 sm:p-4 flex gap-3"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Unable to load overview</p>
              <p className="text-xs sm:text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className={`mb-4 sm:mb-5 ${STATS_GRID_CLASSES}`}>
          {quickStats.map(({ label, value, icon: Icon, tone, description }) => (
            <div
              key={label}
              className="group flex items-center gap-2 sm:gap-2.5 rounded-full border border-gray-200 bg-gradient-to-r from-white to-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm hover:shadow-md hover:border-gray-300 hover:bg-white transition-all cursor-default"
              title={description}
            >
              <div className={`flex-shrink-0 inline-flex h-7 sm:h-8 w-7 sm:w-8 items-center justify-center rounded-full ${tone} transition-transform group-hover:scale-110`}>
                <Icon className="h-3.5 w-3.5 sm:h-4 w-4" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">{value}</div>
                <div className="text-[10px] sm:text-[11px] text-gray-600 truncate">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Map Container */}
        <div className="overflow-hidden rounded-lg sm:rounded-2xl lg:rounded-[24px] border border-gray-300 bg-white/60 shadow-sm">
          {!isLoading && !error ? (
            children ?? <CampusMap destination={selectedDestination} />
          ) : isLoading ? (
            <div className="flex h-96 items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 animate-pulse">
              <div className="text-center">
                <div className="h-8 w-8 mx-auto rounded-lg bg-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Loading map...</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * OverviewActionLink Component
 *
 * Standalone action button for starting navigation from any context.
 * Fully responsive with proper states.
 *
 * @example
 * ```tsx
 * <OverviewActionLink destinationName="Library" />
 * ```
 */
export function OverviewActionLink({
  destinationName,
  variant = 'primary',
  fullWidth = true,
}: {
  destinationName: string;
  /** Button style variant */
  variant?: 'primary' | 'secondary';
  /** Whether button should take full width */
  fullWidth?: boolean;
}) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-lg sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantClasses = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-300',
    secondary:
      'bg-white border border-gray-300 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 focus:ring-emerald-300',
  };

  return (
    <Link
      href={`/navigation?destination=${encodeURIComponent(destinationName)}`}
      className={`${baseClasses} ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''}`}
      aria-label={`Start navigation to ${destinationName}`}
    >
      Start navigation
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
