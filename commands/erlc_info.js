const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { requireRole } = require('../utils/roleGate');

const PRC_KEY = process.env.PRC_KEY || '';
const REQUIRED_ROLE_ID = process.env.ERLC_INFO_REQUIRED_ROLE_ID || process.env.SESSIONS_REQUIRED_ROLE_ID || '';
const prc = axios.create({ baseURL: 'https://api.policeroleplay.community/v1/server', headers: { 'server-key': PRC_KEY, Accept: '*/*' }, timeout: 10000 });

module.exports = {
  data: new SlashCommandBuilder().setName('erlc_info').setDescription('Get information about current ER:LC server status'),
  async execute(interaction) {
    const ok = await requireRole(interaction, REQUIRED_ROLE_ID);
    if (!ok) return;
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const [statusRes, queueRes] = await Promise.all([
        prc.get('/'),
        prc.get('/queue').catch(() => ({ data: [] }))
      ]);
      const s = statusRes.data || {};
      const queueCount = Array.isArray(queueRes.data) ? queueRes.data.length : Number(queueRes.data?.length || 0);
      const embed = new EmbedBuilder()
        .setTitle(String(s.Name || 'Server'))
        .setColor('#2b2d31')
        .addFields(
          { name: 'Basic Info', value: `> **Join Code:** ${s.JoinKey}\n> **Current Players:** ${s.CurrentPlayers}/${s.MaxPlayers}\n> **Queue:** ${queueCount}` }
        );
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      await interaction.editReply({ content: `Failed to fetch server info: ${e?.response?.status || e?.message || e}` });
    }
  }
};

