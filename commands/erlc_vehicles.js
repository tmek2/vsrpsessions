const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { requireRole } = require('../utils/roleGate');

const PRC_KEY = process.env.PRC_KEY || '';
const REQUIRED_ROLE_ID = process.env.ERLC_VEHICLES_REQUIRED_ROLE_ID || process.env.SESSIONS_REQUIRED_ROLE_ID || '';
const prc = axios.create({ baseURL: 'https://api.policeroleplay.community/v1/server', headers: { 'server-key': PRC_KEY, Accept: '*/*' }, timeout: 10000 });

module.exports = {
  data: new SlashCommandBuilder().setName('erlc_vehicles').setDescription('See active vehicles in ER:LC'),
  async execute(interaction) {
    const ok = await requireRole(interaction, REQUIRED_ROLE_ID);
    if (!ok) return;
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const [playersRes, vehiclesRes] = await Promise.all([prc.get('/players'), prc.get('/vehicles')]);
      const players = Array.isArray(playersRes.data) ? playersRes.data : [];
      const vehicles = Array.isArray(vehiclesRes.data) ? vehiclesRes.data : [];
      const idOf = name => {
        const m = players.find(p => String(p.Player).split(':')[0] === name);
        return m ? String(m.Player).split(':')[1] : '';
      };
      const embed = new EmbedBuilder().setTitle(`Server Vehicles [${vehicles.length}/${players.length}]`).setColor('#2b2d31');
      if (!vehicles.length) {
        embed.setDescription('> There are no active vehicles in your server.');
      } else {
        const lines = vehicles.slice(0, 100).map(v => `[${v.Owner}](https://roblox.com/users/${idOf(v.Owner)}/profile) - ${v.Name} **(${v.Texture || 'Default'})**`);
        embed.setDescription(lines.join('\n'));
      }
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      await interaction.editReply({ content: `Failed to fetch vehicles: ${e?.response?.status || e?.message || e}` });
    }
  }
};

