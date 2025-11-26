const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { requireRole } = require('../utils/roleGate');

const PRC_KEY = process.env.PRC_KEY || '';
const REQUIRED_ROLE_ID = process.env.ERLC_PLAYERS_REQUIRED_ROLE_ID || process.env.SESSIONS_REQUIRED_ROLE_ID || '';
const prc = axios.create({ baseURL: 'https://api.policeroleplay.community/v1/server', headers: { 'server-key': PRC_KEY, Accept: '*/*' }, timeout: 10000 });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('erlc_players')
    .setDescription('List ER:LC players, staff, and queue')
    .addStringOption(o => o.setName('filter').setDescription('Starts-with filter').setRequired(false)),
  async execute(interaction) {
    const ok = await requireRole(interaction, REQUIRED_ROLE_ID);
    if (!ok) return;
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const filter = interaction.options.getString('filter');
      const [playersRes, queueRes] = await Promise.all([prc.get('/players'), prc.get('/queue').catch(() => ({ data: [] }))]);
      let players = Array.isArray(playersRes.data) ? playersRes.data : [];
      let queue = Array.isArray(queueRes.data) ? queueRes.data : [];
      const staff = players.filter(p => p.Permission && p.Permission !== 'Normal');
      const normal = players.filter(p => !p.Permission || p.Permission === 'Normal');
      const nameOf = p => String(p.Player).split(':')[0];
      const idOf = p => String(p.Player).split(':')[1];
      if (filter) {
        const f = filter.toLowerCase();
        players = players.filter(p => nameOf(p).toLowerCase().startsWith(f));
        queue = queue.filter(p => String(p).toLowerCase().startsWith(f));
      }
      const embed = new EmbedBuilder().setTitle(`Server Players [${players.length}]`).setColor('#2b2d31');
      const staffLine = staff.map(p => `[${nameOf(p)} (${p.Team || 'Unknown'})](https://roblox.com/users/${idOf(p)}/profile)`).join(', ') || '> No players in this category.';
      const normalLine = normal.map(p => `[${nameOf(p)} (${p.Team || 'Unknown'})](https://roblox.com/users/${idOf(p)}/profile)`).join(', ') || '> No players in this category.';
      const queueLine = queue.map(q => `[${q}](https://roblox.com/users/${q}/profile)`).join(', ') || '> No players in this category.';
      embed.setDescription(`**Server Staff [${staff.length}]**\n${staffLine}\n\n**Online Players [${normal.length}]**\n${normalLine}\n\n**Queue [${queue.length}]**\n${queueLine}`);
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      await interaction.editReply({ content: `Failed to fetch players: ${e?.response?.status || e?.message || e}` });
    }
  }
};

