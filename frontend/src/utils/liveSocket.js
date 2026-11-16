// Live updates from the backend over Socket.IO.
// Connects to the same site as the API (the Vite dev server proxies /socket.io to the backend),
// signs in with the staff login token and joins the given rooms again after every reconnect.
import { io } from 'socket.io-client';
import { getAuthToken } from '../services/api';

/**
 * @param {object}   options
 * @param {string[]} options.rooms     e.g. ['admin']
 * @param {object}   options.events    { EVENT_NAME: handler(data) }
 * @param {function} [options.onStatus] called with 'connecting' | 'live' | 'offline' | 'denied'
 * @returns {function} call to disconnect
 */
export function connectLiveRooms({ rooms, events, onStatus = () => {} }) {
  const socket = io({
    path: '/socket.io',
    auth: { token: getAuthToken() || '' },
    transports: ['websocket', 'polling'],
    reconnectionDelayMax: 10000
  });

  onStatus('connecting');

  socket.on('connect', () => {
    let pending = rooms.length;
    let allJoined = true;
    rooms.forEach(room => {
      socket.emit('join_room', room, (ack) => {
        if (!ack || !ack.ok) allJoined = false;
        pending -= 1;
        if (pending === 0) onStatus(allJoined ? 'live' : 'denied');
      });
    });
  });
  socket.on('disconnect', () => onStatus('offline'));
  socket.on('connect_error', () => onStatus('offline'));

  Object.entries(events).forEach(([name, handler]) => socket.on(name, handler));

  return () => {
    socket.removeAllListeners();
    socket.disconnect();
  };
}
