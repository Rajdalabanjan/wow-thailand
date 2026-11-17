// ========================================================================
// WOW THAILAND: Booking reference generator
// References look like TH-BKG-20261113-4821. The 4-digit part is random, so on a busy
// day two bookings can draw the same number; check the table before using one.
// ========================================================================

/**
 * Returns a booking id that is not in the bookings table yet.
 * @param {object} conn  mysql2 connection (inside the booking transaction)
 */
export async function generateBookingId(conn, prefix = 'TH-BKG') {
  const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  for (let attempt = 0; attempt < 30; attempt++) {
    const id = `${prefix}-${dateTag}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const [rows] = await conn.execute('SELECT 1 FROM bookings WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) return id;
  }
  // Almost every 4-digit number is taken today: use a longer suffix
  return `${prefix}-${dateTag}-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
}
