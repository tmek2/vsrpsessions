const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { requireRole } = require('../utils/roleGate');

const PRC_KEY = process.env.PRC_KEY || '';
const REQUIRED_ROLE_ID = process.env.ERLC_BANS_REQUIRED_ROLE_ID || process.env.SESSIONS_REQUIRED_ROLE_ID || '';
const prc = axios.create({ baseURL: 'https://api.policeroleplay.community/v1/server', headers: { 'server-key': PRC_KEY, Accept: '*/*' }, timeout: 10000 });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('erlc_bans')
    .setDescription('Filter bans in ER:LC')
    .addStringOption(o => o.setName('username').setDescription('Username to filter').setRequired(false))
    .addStringOption(o => o.setName('user_id').setDescription('User ID to filter').setRequired(false)),
  async execute(interaction) {
    const ok = await requireRole(interaction, REQUIRED_ROLE_ID);
    if (!ok) return;
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const username = interaction.options.getString('username');
      const userId = interaction.options.getString('user_id');
      const res = await prc.get('/bans');
      const bansObj = res.data || {};
      const entries = Object.entries(bansObj);
      const filtered = entries.filter(([id, name]) => {
        return (username ? String(name).toLowerCase().includes(username.toLowerCase()) : true) && (userId ? String(id).includes(userId) : true);
      });
      const embed = new EmbedBuilder().setTitle('Bans').setColor('#2b2d31');
      embed.setDescription(filtered.length ? filtered.slice(0, 100).map(([id,name]) => `> [${name}:${id}](https://roblox.com/users/${id}/profile)`).join('\n') : (username || userId ? '> This ban was not found.' : '> Bans were not found in your server.'));
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      await interaction.editReply({ content: `PRC API error: ${e?.response?.status || e?.message || e}` });
    }
  }
};

