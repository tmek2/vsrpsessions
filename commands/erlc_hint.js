const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { requireRole } = require('../utils/roleGate');

const PRC_KEY = process.env.PRC_KEY || '';
const REQUIRED_ROLE_ID = process.env.ERLC_HINT_REQUIRED_ROLE_ID || process.env.SESSIONS_REQUIRED_ROLE_ID || '';
const prc = axios.create({ baseURL: 'https://api.policeroleplay.community/v1/server', headers: { 'server-key': PRC_KEY, Accept: '*/*', 'Content-Type': 'application/json' }, timeout: 10000 });

module.exports = {
  data: new SlashCommandBuilder().setName('erlc_hint').setDescription('Send a server hint').addStringOption(o => o.setName('hint').setDescription('Hint text').setRequired(true)),
  async execute(interaction) {
    const ok = await requireRole(interaction, REQUIRED_ROLE_ID);
    if (!ok) return;
    const hint = interaction.options.getString('hint');
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await prc.post('/command', { command: `:h ${hint}` });
      const embed = new EmbedBuilder().setTitle('Successfully Sent').setDescription('This hint has been sent to the server!').setColor('#30c331');
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      const embed = new EmbedBuilder().setTitle('Not Executed').setDescription('This hint has not been sent successfully.').setColor('#2b2d31');
      await interaction.editReply({ embeds: [embed] });
    }
  }
};

