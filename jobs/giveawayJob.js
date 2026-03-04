const Giveaway = require('../models/Giveaway');
const { EmbedBuilder } = require('discord.js');

/**
 * Giveaway check job
 * Checks for giveaways that have ended and selects winners
 */
async function runGiveawayJob(client) {
  try {
    console.log('🔄 Running giveaway job...');

    // Get giveaways that should end
    const now = Date.now();
    const endedGiveaways = await Giveaway.find({
      status: 'active',
      endsAt: { $lte: now }
    });

    let processed = 0;
    let failed = 0;

    for (const giveaway of endedGiveaways) {
      try {
        // Get guild
        const channel = await client.channels.fetch(giveaway.channelId);
        if (!channel) {
          console.error(`Channel not found for giveaway ${giveaway.giveawayId}`);
          failed++;
          continue;
        }

        const guild = channel.guild;

        // Check if there are participants
        if (giveaway.participants.length === 0) {
          // No participants, cancel giveaway
          giveaway.status = 'cancelled';
          giveaway.endedAt = Date.now();
          await giveaway.save();

          // Update message
          try {
            const giveawayMessage = await channel.messages.fetch(giveaway.messageId);
            const embed = EmbedBuilder.from(giveawayMessage.embeds[0]);
            embed.setColor('#ff0000');
            embed.setTitle('❌ GIVEAWAY CANCELLED');
            embed.setDescription('No participants joined this giveaway.');

            await giveawayMessage.edit({ 
              embeds: [embed],
              components: [] 
            });
          } catch (error) {
            console.error('Error updating giveaway message:', error);
          }

          console.log(`❌ Giveaway ${giveaway.giveawayId} cancelled (no participants)`);
          processed++;
          continue;
        }

        // Select winner
        await giveaway.selectWinner(guild);
        const winner = giveaway.winner;

        // Update giveaway message
        try {
          const giveawayMessage = await channel.messages.fetch(giveaway.messageId);
          const embed = EmbedBuilder.from(giveawayMessage.embeds[0]);
          embed.setColor('#FFD700');
          embed.setTitle('🏆 GIVEAWAY ENDED');
          embed.addFields({
            name: '🎉 Winner',
            value: `<@${winner.userId}>`,
            inline: false
          });

          await giveawayMessage.edit({ 
            embeds: [embed],
            components: [] 
          });
        } catch (error) {
          console.error('Error updating giveaway message:', error);
        }

        // Send winner announcement
        try {
          const winnerEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎉 Giveaway Winner!')
            .setDescription(
              `**Prize:** ${giveaway.prize}\n\n` +
              `**Winner:** <@${winner.userId}>\n\n` +
              `Congratulations! 🎊`
            )
            .setFooter({ text: `Giveaway ID: ${giveaway.giveawayId}` })
            .setTimestamp();

          await channel.send({ 
            content: `<@${winner.userId}>`,
            embeds: [winnerEmbed] 
          });
        } catch (error) {
          console.error('Error sending winner announcement:', error);
        }

        // Send DM to winner
        try {
          const winnerUser = await client.users.fetch(winner.userId);
          
          const dmEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎉 You Won the Giveaway!')
            .setDescription(
              `Congratulations! You won the giveaway!\n\n` +
              `**Prize:** ${giveaway.prize}\n\n` +
              `Please contact the server admins to claim your prize.`
            )
            .setFooter({ text: `Giveaway ID: ${giveaway.giveawayId}` })
            .setTimestamp();

          await winnerUser.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          console.error('Could not send winner DM:', dmError);
        }

        processed++;
        console.log(`🏆 Giveaway ${giveaway.giveawayId} ended. Winner: ${winner.username}`);

      } catch (error) {
        failed++;
        console.error(`Error processing giveaway ${giveaway.giveawayId}:`, error);
      }
    }

    if (processed > 0 || failed > 0) {
      console.log(`📊 Giveaway job complete: ${processed} processed, ${failed} failed`);
    }

  } catch (error) {
    console.error('❌ Error in giveaway job:', error);
  }
}

/**
 * Start giveaway job interval
 */
function startGiveawayJob(client) {
  // Run immediately on start
  runGiveawayJob(client);

  // Run every 5 minutes
  setInterval(() => {
    runGiveawayJob(client);
  }, 5 * 60 * 1000); // 5 minutes

  console.log('✅ Giveaway job started (runs every 5 minutes)');
}

module.exports = {
  runGiveawayJob,
  startGiveawayJob,
};