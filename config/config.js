module.exports = {
  // Discord Configuration
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
  },

  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/onepanel-bot',
  },

  // Pterodactyl Configuration
  pterodactyl: {
    url: process.env.PTERODACTYL_URL,
    apiKey: process.env.PTERODACTYL_API_KEY,
    defaultLocation: parseInt(process.env.DEFAULT_LOCATION) || 1,
  },

  // Role Configuration
  roles: {
    member: process.env.MEMBER_ROLE_ID,
    admin: process.env.ADMIN_ROLE_ID,
    premium: process.env.PREMIUM_ROLE_ID,
  },

  // Channel Configuration
  channels: {
    ticketCategory: process.env.TICKET_CATEGORY_ID,
    logs: process.env.LOG_CHANNEL_ID,
  },

  // Ticket Configuration
  ticket: {
    maxActivePerUser: 3, // Max open tickets per user
    autoCloseInactive: 7, // Days before auto-close (optional)
  },

  // Bot Settings
  bot: {
    prefix: process.env.PREFIX || '!',
    embedColor: process.env.EMBED_COLOR || '#00ff9d',
  },

  // Wanyzx API Configuration
  wanyzxApi: {
    baseURL: process.env.WANYZX_API_URL || 'https://wanyzx.dev/api',
    apiKey: process.env.WANYZX_API_KEY || null,
  },

  // User Limits
  limits: {
    freeServers: 2,
    premiumServers: 999,
  },

  // Economy Settings
  economy: {
    dailyMin: 50,
    dailyMax: 500,
    weeklyBonus: 1500,
  },

  // Verification Settings
  verification: {
    codeLength: 6,
    codeExpiry: 15 * 60 * 1000, // 15 minutes in milliseconds
  },

  // Billing Settings
  billing: {
    checkInterval: 60 * 60 * 1000, // 1 hour in milliseconds
    notificationTimes: [24, 12, 1], // hours before expiry
  },
};