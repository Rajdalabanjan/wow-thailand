// ========================================================================
// WOW THAILAND: Customer Cab & Airport Transfer Portal
// Conforms to MakeMyTrip & Booking.com gold standard:
// Customers book by Vehicle Category (Sedan, SUV, VIP Van with "or similar").
// Individual cars and license plates are never browsed or chosen by customers;
// they are allocated by the dispatch monitor / fleet vendor on duty.
// ========================================================================

import React, { useEffect } from 'react';
import ThailandCustomerCabsPage from './ThailandCustomerCabsPage';

export default function CarsPage({
  currentUser = null,
  pickupLoc = '',
  dropLoc = '',
  pickupDate = '',
  pickupTime = '',
  onBack,
  ...rest
}) {
  useEffect(() => {
    try {
      sessionStorage.removeItem('tg_cabViewMode');
      sessionStorage.removeItem('tg_carCategoryFilter');
    } catch (e) {}
  }, []);

  return (
    <ThailandCustomerCabsPage
      currentUser={currentUser}
      initialPickup={pickupLoc}
      initialDropoff={dropLoc}
      initialDate={pickupDate}
      initialTime={pickupTime}
      onBack={onBack}
    />
  );
}
