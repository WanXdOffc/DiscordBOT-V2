const Ticket = require('../models/Ticket');

/**
 * Generate unique ticket ID
 */
function generateTicketId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `TKT_${timestamp}_${random}`.toUpperCase();
}

/**
 * Get next ticket number
 */
async function getNextTicketNumber() {
  const lastTicket = await Ticket.findOne().sort({ ticketNumber: -1 });
  return lastTicket ? lastTicket.ticketNumber + 1 : 1;
}

/**
 * Generate ticket channel name
 */
function generateTicketChannelName(ticketNumber, type) {
  return `ticket-${ticketNumber}-${type}`;
}

/**
 * Format ticket type display
 */
function formatTicketType(type) {
  const types = {
    'coins': '💰 Coin Purchase',
    'premium': '⭐ Premium Membership'
  };
  return types[type] || type;
}

/**
 * Get ticket status emoji
 */
function getTicketStatusEmoji(status) {
  const emojis = {
    'open': '🟢',
    'pending': '🟡',
    'closed': '🔴'
  };
  return emojis[status] || '⚪';
}

/**
 * Get active tickets count for user
 */
async function getUserActiveTickets(userId) {
  return await Ticket.countDocuments({
    userId: userId,
    status: { $in: ['open', 'pending'] }
  });
}

/**
 * Get all open tickets
 */
async function getOpenTickets() {
  return await Ticket.find({
    status: { $in: ['open', 'pending'] }
  }).sort({ createdAt: -1 });
}

module.exports = {
  generateTicketId,
  getNextTicketNumber,
  generateTicketChannelName,
  formatTicketType,
  getTicketStatusEmoji,
  getUserActiveTickets,
  getOpenTickets,
};