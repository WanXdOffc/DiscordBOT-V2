const axios = require('axios');
const config = require('../config/config');

const pterodactylAPI = axios.create({
  baseURL: `${config.pterodactyl.url}/api/application`,
  headers: {
    'Authorization': `Bearer ${config.pterodactyl.apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

/**
 * Create a new user in Pterodactyl
 */
async function createUser(email, username, firstName, lastName, password = null) {
  try {
    // Sanitize username (Pterodactyl requirement: alphanumeric + underscore only)
    const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    const payload = {
      email: email,
      username: sanitizedUsername,
      first_name: firstName,
      last_name: lastName,
      password: password || generatePassword()
    };
    
    console.log('Creating Pterodactyl user:', sanitizedUsername);
    
    const response = await pterodactylAPI.post('/users', payload);
    return response.data;
  } catch (error) {
    console.error('Pterodactyl API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
}

/**
 * Delete a user from Pterodactyl
 */
async function deleteUser(userId) {
  try {
    await pterodactylAPI.delete(`/users/${userId}`);
    return true;
  } catch (error) {
    console.error('Error deleting Pterodactyl user:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Update user to admin status
 */
async function setUserAdmin(userId, isAdmin = true) {
  try {
    const response = await pterodactylAPI.patch(`/users/${userId}`, {
      root_admin: isAdmin
    });
    return response.data;
  } catch (error) {
    console.error('Error setting user admin:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Create a server in Pterodactyl
 */
async function createServer(userId, name, ram, disk, cpu, egg, nest, location = null) {
  try {
    const response = await pterodactylAPI.post('/servers', {
      name: name,
      description: '',
      user: userId,
      egg: parseInt(egg),
      docker_image: 'docker.io/itzky/shell:latest',
      startup: 'bash /index.sh',

      environment: {
        PORT: '3000',
        USE_CLOUDFLARE_TUNNEL: '0',
        CLOUDFLARE_TUNNEL_TOKEN: '',
        DOMAIN: ''
      },

      limits: {
        memory: ram,
        swap: 0,
        disk: disk,
        io: 500,
        cpu: cpu
      },

      feature_limits: {
        databases: 0,
        allocations: 1,
        backups: 0
      },

      deploy: {
        locations: [parseInt(location || config.pterodactyl.defaultLocation)],
        dedicated_ip: false,
        port_range: []
      }
    });

    return response.data;
  } catch (error) {
    console.error(
      'Error creating Pterodactyl server:',
      error.response?.data || error.message
    );
    throw error;
  }
}

/**
 * Delete a server from Pterodactyl
 */
async function deleteServer(serverId) {
  try {
    await pterodactylAPI.delete(`/servers/${serverId}/force`);
    return true;
  } catch (error) {
    console.error('Error deleting Pterodactyl server:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get server details
 */
async function getServer(serverId) {
  try {
    const response = await pterodactylAPI.get(`/servers/${serverId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting Pterodactyl server:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get all servers
 */
async function getAllServers() {
  try {
    const response = await pterodactylAPI.get('/servers');
    return response.data;
  } catch (error) {
    console.error('Error getting all servers:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Generate random password
 */
function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

module.exports = {
  createUser,
  deleteUser,
  setUserAdmin,
  createServer,
  deleteServer,
  getServer,
  getAllServers,
  generatePassword
};