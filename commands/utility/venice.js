const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/config');
const { getVeniceAI } = require('../../utils/wanyzxApi');

module.exports = {
    cooldown: 15, // AI butuh waktu buat mikir, kita set cooldown lebih lama
    data: new SlashCommandBuilder()
        .setName('venice')
        .setDescription('Tanya apapun ke Venice AI 🤖')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Pesan yang ingin kamu tanyakan ke AI')
                .setRequired(true)
        ),

    async execute(interaction) {
        const message = interaction.options.getString('message');

        // Defer reply karena request ke AI bisa memakan waktu beberapa detik
        await interaction.deferReply();

        try {
            // Panggil fungsi getVeniceAI yang baru kita buat
            const replyText = await getVeniceAI(message);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor)
                .setTitle('🤖 Venice AI')
                .addFields(
                    { name: '👤 Kamu bertanya:', value: message },
                    { name: '💬 AI menjawab:', value: replyText.substring(0, 1024) } // Discord field limit is 1024 chars
                )
                .setFooter({ text: '📡 Powered by wanyzx.dev API' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('[/venice] Gagal memanggil AI:', error.message);

            const errorEmbed = new EmbedBuilder()
                .setColor('#ff4444')
                .setTitle('❌ AI sedang pusing')
                .setDescription('Maaf, Venice AI sedang tidak bisa merespon saat ini. Coba lagi nanti ya~')
                .setFooter({ text: 'wanyzx.dev API' })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
