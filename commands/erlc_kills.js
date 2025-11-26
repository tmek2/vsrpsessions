const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { requireRole } = require('../utils/roleGate');

const PRC_KEY = process.env.PRC_KEY || '';
const REQUIRED_ROLE_ID = process.env.ERLC_KILLS_REQUIRED_ROLE_ID || process.env.SESSIONS_REQUIRED_ROLE_ID || '';
const prc = axios.create({ baseURL: 'https://api.policeroleplay.community/v1/server', headers: { 'server-key': PRC_KEY, Accept: '*/*' }, timeout: 10000 });

module.exports = {
  data: new SlashCommandBuilder().setName('erlc_kills').setDescription('See ER:LC Kill Logs'),
  async execute(interaction) {
    const ok = await requireRole(interaction, REQUIRED_ROLE_ID);
    if (!ok) return;
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const res = await prc.get('/killlogs');
      const logs = Array.isArray(res.data) ? res.data : [];
      const embed = new EmbedBuilder().setTitle('Server Kill Logs').setColor('#2b2d31');
      const lines = logs.sort((a,b) => b.Timestamp - a.Timestamp).slice(0, 50).map(l => `> [${l.Killer.split(':')[0]}](https://roblox.com/users/${l.Killer.split(':')[1]}/profile) killed [${l.Killed.split(':')[0]}](https://roblox.com/users/${l.Killed.split(':')[1]}/profile) • <t:${Number(l.Timestamp)}:R>`);
      embed.setDescription(lines.length ? lines.join('\n') : '> No kill logs found.');
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      await interaction.editReply({ content: `Failed to fetch kill logs: ${e?.response?.status || e?.message || e}` });
    }
  }
};

