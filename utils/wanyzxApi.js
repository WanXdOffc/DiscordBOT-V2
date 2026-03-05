const axios = require('axios');
const config = require('../config/config');

// ─────────────────────────────────────────────────────────────────────────────
// Axios instance untuk wanyzx.dev API
// ─────────────────────────────────────────────────────────────────────────────
const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
};

if (config.wanyzxApi.apiKey) {
    headers['Authorization'] = `Bearer ${config.wanyzxApi.apiKey}`;
}

const wanyzxClient = axios.create({
    baseURL: config.wanyzxApi.baseURL,
    headers,
    timeout: 30_000, // 30 detik — AI endpoint butuh lebih lama
});

// Interceptor: log error response biar gampang debug
wanyzxClient.interceptors.response.use(
    (res) => res,
    (error) => {
        console.error('[WanyzxAPI] Error:', {
            url: error.config?.url,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
        });
        return Promise.reject(error);
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// Generic request helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic GET request ke endpoint wanyzx API.
 * @param {string} path  - Path endpoint, contoh: '/tools/waifu'
 * @param {object} params - Query params opsional
 * @returns {Promise<object>} Data dari API
 */
async function get(path, params = {}) {
    const response = await wanyzxClient.get(path, { params });
    return response.data;
}

/**
 * Generic POST request ke endpoint wanyzx API.
 * @param {string} path   - Path endpoint
 * @param {object} body   - Request body
 * @param {object} params - Query params opsional
 * @returns {Promise<object>} Data dari API
 */
async function post(path, body = {}, params = {}) {
    const response = await wanyzxClient.post(path, body, { params });
    return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tools: Waifu
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ambil random waifu image dari API.
 * @returns {Promise<{ url: string, base64: string }>}
 */
async function getWaifu() {
    const result = await get('/tools/waifu');
    if (!result.success) {
        throw new Error(`[WanyzxAPI] getWaifu() gagal: ${JSON.stringify(result)}`);
    }
    return result.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI: Venice
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kirim pesan ke Venice AI dan dapatkan balasannya.
 * POST /ai/venice — { message: string }
 * @param {string} message - Pesan yang dikirim ke AI
 * @returns {Promise<string>} Teks balasan dari AI
 */
async function getVeniceAI(message) {
    if (!message || typeof message !== 'string') {
        throw new Error('[WanyzxAPI] getVeniceAI() butuh parameter message (string).');
    }
    const result = await post('/ai/venice', { message });
    if (!result.success) {
        throw new Error(`[WanyzxAPI] getVeniceAI() gagal: ${JSON.stringify(result)}`);
    }
    return result.text;
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
    // Generic helpers — gunakan ini untuk buat fitur baru dengan cepat
    get,
    post,

    // Tools
    getWaifu,

    // AI
    getVeniceAI,
};
