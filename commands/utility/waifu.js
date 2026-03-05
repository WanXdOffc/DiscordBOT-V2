const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/config');
const { getWaifu } = require('../../utils/wanyzxApi');

module.exports = {
    cooldown: 10, // override default — waifu fetch API, kasih 10 detik
    data: new SlashCommandBuilder()
        .setName('waifu')
        .setDescription('Dapatkan gambar waifu random 🌸'),

    async execute(interaction) {
        // Defer dulu biar ga timeout saat fetch ke API
        await interaction.deferReply();

        try {
            const data = await getWaifu();

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor)
                .setTitle('✨ Waifu~')
                .setImage(data.url)
                .setFooter({ text: '📡 Powered by wanyzx.dev API' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('[/waifu] Gagal fetch waifu:', error.message);

            const errorEmbed = new EmbedBuilder()
                .setColor('#ff4444')
                .setTitle('❌ Gagal mengambil waifu')
                .setDescription('API sedang tidak tersedia, coba lagi beberapa saat ya~')
                .setFooter({ text: 'wanyzx.dev API' })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
