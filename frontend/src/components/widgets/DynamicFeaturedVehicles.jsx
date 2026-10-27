import React from 'react';
import SelfDriveCategoryShowcase from './SelfDriveCategoryShowcase';

export default function DynamicFeaturedVehicles({ 
  config, 
  cars = [], 
  bikes = [], 
  markups = [],
  onBook, 
  onBookVehicle, 
  onViewVehicle, 
  onViewDetails,
  onSelectCategory,
  setActiveTab,
  searchQuery
}) {
  if (config && !config.visible) return null;

  return (
    <div className="py-2">
      <SelfDriveCategoryShowcase
        cars={cars}
        bikes={bikes}
        markups={markups}
        onBookVehicle={onBookVehicle || onBook}
        onViewVehicle={onViewVehicle || onViewDetails}
        onSelectCategory={onSelectCategory}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
      />
    </div>
  );
}
