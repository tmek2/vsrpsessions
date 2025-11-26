const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { requireRole } = require('../utils/roleGate');

const PRC_KEY = process.env.PRC_KEY || '';
const REQUIRED_ROLE_ID = process.env.ERLC_STAFF_REQUIRED_ROLE_ID || process.env.SESSIONS_REQUIRED_ROLE_ID || '';
const prc = axios.create({ baseURL: 'https://api.policeroleplay.community/v1/server', headers: { 'server-key': PRC_KEY, Accept: '*/*' }, timeout: 10000 });

module.exports = {
  data: new SlashCommandBuilder().setName('erlc_staff').setDescription('See online staff members in ER:LC'),
  async execute(interaction) {
    const ok = await requireRole(interaction, REQUIRED_ROLE_ID);
    if (!ok) return;
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const playersRes = await prc.get('/players');
      const players = Array.isArray(playersRes.data) ? playersRes.data : [];
      const staff = players.filter(p => p.Permission && p.Permission !== 'Normal');
      const admins = staff.filter(p => p.Permission === 'Server Administrator');
      const mods = staff.filter(p => p.Permission === 'Server Moderator');
      const owners = staff.filter(p => ['Server Owner','Server Co-Owner'].includes(p.Permission));
      const fmt = arr => arr.map(p => `[${String(p.Player).split(':')[0]}](https://roblox.com/users/${String(p.Player).split(':')[1]}/profile)`).join('\n') || '> There are no online staff members.';
      const embed = new EmbedBuilder().setTitle(`Online Staff Members [${staff.length}]`).setColor('#2b2d31');
      if (owners.length) embed.addFields({ name: `Server Owners [${owners.length}]`, value: fmt(owners) });
      if (admins.length) embed.addFields({ name: `Server Administrator [${admins.length}]`, value: fmt(admins) });
      if (mods.length) embed.addFields({ name: `Server Moderator [${mods.length}]`, value: fmt(mods) });
      if (!owners.length && !admins.length && !mods.length) embed.setDescription('> There are no online staff members.');
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      await interaction.editReply({ content: `Failed to fetch staff: ${e?.response?.status || e?.message || e}` });
    }
  }
};

