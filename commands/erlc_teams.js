const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { requireRole } = require('../utils/roleGate');

const PRC_KEY = process.env.PRC_KEY || '';
const REQUIRED_ROLE_ID = process.env.ERLC_TEAMS_REQUIRED_ROLE_ID || process.env.SESSIONS_REQUIRED_ROLE_ID || '';
const prc = axios.create({ baseURL: 'https://api.policeroleplay.community/v1/server', headers: { 'server-key': PRC_KEY, Accept: '*/*' }, timeout: 10000 });

module.exports = {
  data: new SlashCommandBuilder().setName('erlc_teams').setDescription('See players grouped by team').addStringOption(o => o.setName('filter').setDescription('Starts-with filter').setRequired(false)),
  async execute(interaction) {
    const ok = await requireRole(interaction, REQUIRED_ROLE_ID);
    if (!ok) return;
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const filter = interaction.options.getString('filter');
      const res = await prc.get('/players');
      const players = Array.isArray(res.data) ? res.data : [];
      const nameOf = p => String(p.Player).split(':')[0];
      const teams = {};
      for (const plr of players) {
        if (filter && !nameOf(plr).toLowerCase().startsWith(filter.toLowerCase())) continue;
        const t = plr.Team || 'Unknown';
        if (!teams[t]) teams[t] = [];
        teams[t].push(plr);
      }
      const embed = new EmbedBuilder().setTitle(`Server Players by Team [${players.length}]`).setColor('#2b2d31');
      const order = ['Police','Sheriff','Fire','DOT','Civilian','Unknown'];
      let desc = '';
      for (const team of order) {
        const arr = teams[team] || [];
        const line = arr.map(p => `[${nameOf(p)}](https://roblox.com/users/${String(p.Player).split(':')[1]}/profile)`).join(', ');
        desc += `**${team} [${arr.length}]**\n${line}\n\n`;
      }
      embed.setDescription(desc.trim() || '> There are no players in-game.');
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      await interaction.editReply({ content: `Failed to fetch teams: ${e?.response?.status || e?.message || e}` });
    }
  }
};

