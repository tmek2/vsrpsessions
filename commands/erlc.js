const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { requireRole } = require('../utils/roleGate');

const PRC_KEY = process.env.PRC_KEY || '';
const prc = axios.create({ baseURL: 'https://api.policeroleplay.community/v1/server', headers: { 'server-key': PRC_KEY, Accept: '*/*', 'Content-Type': 'application/json' }, timeout: 10000 });

function envRole(sub) {
  const fallback = process.env.SESSIONS_REQUIRED_ROLE_ID || '';
  const map = {
    info: process.env.ERLC_INFO_REQUIRED_ROLE_ID,
    staff: process.env.ERLC_STAFF_REQUIRED_ROLE_ID,
    kills: process.env.ERLC_KILLS_REQUIRED_ROLE_ID,
    playerlogs: process.env.ERLC_PLAYERLOGS_REQUIRED_ROLE_ID,
    commandlogs: process.env.ERLC_COMMANDLOGS_REQUIRED_ROLE_ID,
    bans: process.env.ERLC_BANS_REQUIRED_ROLE_ID,
    players: process.env.ERLC_PLAYERS_REQUIRED_ROLE_ID,
    teams: process.env.ERLC_TEAMS_REQUIRED_ROLE_ID,
    vehicles: process.env.ERLC_VEHICLES_REQUIRED_ROLE_ID,
    message: process.env.ERLC_MESSAGE_REQUIRED_ROLE_ID,
    hint: process.env.ERLC_HINT_REQUIRED_ROLE_ID,
    command: process.env.ERLC_COMMAND_REQUIRED_ROLE_ID,
  };
  return map[sub] || fallback;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('erlc')
    .setDescription('ER:LC server utilities')
    .addSubcommand(s => s.setName('info').setDescription('Get ER:LC server info'))
    .addSubcommand(s => s.setName('staff').setDescription('See online staff'))
    .addSubcommand(s => s.setName('kills').setDescription('See kill logs'))
    .addSubcommand(s => s.setName('playerlogs').setDescription('See player join/leave logs'))
    .addSubcommand(s => s.setName('commandlogs').setDescription('See command logs'))
    .addSubcommand(s => s.setName('bans').setDescription('Filter bans')
      .addStringOption(o => o.setName('username').setDescription('Username to filter').setRequired(false))
      .addStringOption(o => o.setName('user_id').setDescription('User ID to filter').setRequired(false))
    )
    .addSubcommand(s => s.setName('players').setDescription('List players, staff and queue')
      .addStringOption(o => o.setName('filter').setDescription('Starts-with filter').setRequired(false))
    )
    .addSubcommand(s => s.setName('teams').setDescription('List players grouped by team')
      .addStringOption(o => o.setName('filter').setDescription('Starts-with filter').setRequired(false))
    )
    .addSubcommand(s => s.setName('vehicles').setDescription('See active vehicles'))
    .addSubcommand(s => s.setName('message').setDescription('Send a server message')
      .addStringOption(o => o.setName('message').setDescription('Text to send').setRequired(true))
    )
    .addSubcommand(s => s.setName('hint').setDescription('Send a server hint')
      .addStringOption(o => o.setName('hint').setDescription('Hint text').setRequired(true))
    )
    .addSubcommand(s => s.setName('command').setDescription('Send a direct ER:LC command')
      .addStringOption(o => o.setName('command').setDescription('Command (e.g. :pm ...)').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const globalRoles = process.env.ERLC_REQUIRED_ROLE_IDS || '';
    const subRoles = envRole(sub) || '';
    const combined = [globalRoles, subRoles].filter(Boolean).join(',');
    const ok = await requireRole(interaction, combined);
    if (!ok) return;
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      if (sub === 'info') {
        const [statusRes, queueRes] = await Promise.all([prc.get('/'), prc.get('/queue').catch(() => ({ data: [] }))]);
        const s = statusRes.data || {};
        const queueCount = Array.isArray(queueRes.data) ? queueRes.data.length : Number(queueRes.data?.length || 0);
        const embed = new EmbedBuilder().setTitle(String(s.Name || 'Server')).setColor('#2b2d31')
          .addFields({ name: 'Basic Info', value: `> **Join Code:** ${s.JoinKey}\n> **Current Players:** ${s.CurrentPlayers}/${s.MaxPlayers}\n> **Queue:** ${queueCount}` });
        await interaction.editReply({ embeds: [embed] });
      } else if (sub === 'staff') {
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
      } else if (sub === 'kills') {
        const res = await prc.get('/killlogs');
        const logs = Array.isArray(res.data) ? res.data : [];
        const embed = new EmbedBuilder().setTitle('Server Kill Logs').setColor('#2b2d31');
        const lines = logs.sort((a,b) => b.Timestamp - a.Timestamp).slice(0, 50).map(l => `> [${l.Killer.split(':')[0]}](https://roblox.com/users/${l.Killer.split(':')[1]}/profile) killed [${l.Killed.split(':')[0]}](https://roblox.com/users/${l.Killed.split(':')[1]}/profile) • <t:${Number(l.Timestamp)}:R>`);
        embed.setDescription(lines.length ? lines.join('\n') : '> No kill logs found.');
        await interaction.editReply({ embeds: [embed] });
      } else if (sub === 'playerlogs') {
        const res = await prc.get('/joinlogs');
        const logs = Array.isArray(res.data) ? res.data : [];
        const embed = new EmbedBuilder().setTitle('Player Join/Leave Logs').setColor('#2b2d31');
        const lines = logs.sort((a,b) => b.Timestamp - a.Timestamp).slice(0, 50).map(l => `> [${l.Player.split(':')[0]}](https://roblox.com/users/${l.Player.split(':')[1]}/profile) ${l.Join ? 'joined' : 'left'} • <t:${Number(l.Timestamp)}:R>`);
        embed.setDescription(lines.length ? lines.join('\n') : '> No player logs found.');
        await interaction.editReply({ embeds: [embed] });
      } else if (sub === 'commandlogs') {
        const res = await prc.get('/commandlogs');
        const logs = Array.isArray(res.data) ? res.data : [];
        const embed = new EmbedBuilder().setTitle('Command Logs').setColor('#2b2d31');
        const lines = logs.sort((a,b) => b.Timestamp - a.Timestamp).slice(0, 50).map(l => `> [${l.Player.split(':')[0]}](https://roblox.com/users/${l.Player.split(':')[1]}/profile) ran \`${l.Command}\` • <t:${Number(l.Timestamp)}:R>`);
        embed.setDescription(lines.length ? lines.join('\n') : '> No command logs found.');
        await interaction.editReply({ embeds: [embed] });
      } else if (sub === 'bans') {
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
      } else if (sub === 'players') {
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
          queue = queue.filter(q => String(q).toLowerCase().startsWith(f));
        }
        const embed = new EmbedBuilder().setTitle(`Server Players [${players.length}]`).setColor('#2b2d31');
        const staffLine = staff.map(p => `[${nameOf(p)} (${p.Team || 'Unknown'})](https://roblox.com/users/${idOf(p)}/profile)`).join(', ') || '> No players in this category.';
        const normalLine = normal.map(p => `[${nameOf(p)} (${p.Team || 'Unknown'})](https://roblox.com/users/${idOf(p)}/profile)`).join(', ') || '> No players in this category.';
        const queueLine = queue.map(q => `[${q}](https://roblox.com/users/${q}/profile)`).join(', ') || '> No players in this category.';
        embed.setDescription(`**Server Staff [${staff.length}]**\n${staffLine}\n\n**Online Players [${normal.length}]**\n${normalLine}\n\n**Queue [${queue.length}]**\n${queueLine}`);
        await interaction.editReply({ embeds: [embed] });
      } else if (sub === 'teams') {
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
      } else if (sub === 'vehicles') {
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
      } else if (sub === 'message') {
        const msg = interaction.options.getString('message');
        await prc.post('/command', { command: `:m ${msg}` });
        const embed = new EmbedBuilder().setTitle('Successfully Sent').setDescription('This message has been sent to the server!').setColor('#30c331');
        await interaction.editReply({ embeds: [embed] });
      } else if (sub === 'hint') {
        const hint = interaction.options.getString('hint');
        await prc.post('/command', { command: `:h ${hint}` });
        const embed = new EmbedBuilder().setTitle('Successfully Sent').setDescription('This hint has been sent to the server!').setColor('#30c331');
        await interaction.editReply({ embeds: [embed] });
      } else if (sub === 'command') {
        let cmd = interaction.options.getString('command');
        if (!cmd.startsWith(':')) cmd = ':' + cmd;
        await prc.post('/command', { command: cmd });
        const embed = new EmbedBuilder().setTitle('Successfully Ran').setDescription('This command should now be executed in your server.').setColor('#30c331');
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (e) {
      await interaction.editReply({ content: `PRC error: ${e?.response?.status || e?.message || e}` });
    }
  }
};
