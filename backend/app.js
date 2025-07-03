import ValorantAPI from 'unofficial-valorant-api';

// const VAPI = new ValorantAPI();

import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
const commands = JSON.parse(fs.readFileSync('./commands.json', 'utf-8'));

import {mmr, latestMatch } from './methods.js'

import dotenv from 'dotenv';
dotenv.config();


const token = process.env.TOKEN

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// VAPI.getMMR({ region: 'na', name: 'TenZ', tag: 'GOAT', version: 'v1' }).then( async (res) => {
//     console.log("MMR Info:", JSON.stringify(res));
// }).catch(err => {
//     console.error("API Error:", err);   
// });

const rest = new REST({ version: '10' }).setToken(token);


client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log('📋 Connected to the following servers:');
    (async () => {
        try {
            console.log('🔁 Registering slash commands from JSON...');
            await rest.put(
            Routes.applicationCommands(process.env.ID),
            { body: commands }
            );
            console.log('✅ Slash commands registered!');
        } catch (err) {
            console.error('❌ Failed to register commands:', err);
        }
    })();
    client.guilds.cache.forEach(guild => {
    console.log(`- ${guild.name} (ID: ${guild.id})`);
    });
});


client.on('interactionCreate', async (interaction) => {

  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'lastmatch') {
    await interaction.deferReply({ flags: 64 });

    const name = interaction.options.getString('name');
    const tag = interaction.options.getString('tag');
    const region = interaction.options.getString('region') || 'ap';

    const match = await getLatestMatch(region, name, tag);

    if (match.error) {
      return interaction.editReply({
        content: `❌ Error:\n\`\`\`${JSON.stringify(match.error, null, 2)}\`\`\``
      });
    }

    return interaction.editReply({
      content: `🕹️ **Latest Match for ${name}#${tag}**\n` +
               `📍 Map: ${match.map}\n` +
               `🏷️ Rank: ${match.rank} (${match.elo} ELO)\n` +
               `📈 MMR Change: ${match.mmr_change > 0 ? '+' : ''}${match.mmr_change}\n` +
               `🗓️ Date: ${new Date(match.date).toLocaleString()}\n` +
               `📅 Season: ${match.season}`
    });
  }

  if (interaction.commandName === 'mmr') {
    await interaction.deferReply({ flags: 64 });

    const name = interaction.options.getString('name');
    const tag = interaction.options.getString('tag');
    const region = interaction.options.getString('region') || 'ap';

    const mmrData = await mmr(region, name, tag);

    if (mmrData.error || !mmrData.data) {
      return interaction.editReply({
        content: `❌ Error:\n\`\`\`Something is wrong in the provided information!\`\`\``
      });
    }

    const { currenttierpatched, elo, ranking_in_tier } = mmrData.data;

    return interaction.editReply({
      content: `🎯 **${name}#${tag}**\n${currenttierpatched} (${elo} ELO)\nRank progress: ${ranking_in_tier}/100`
    });
  }
});


client.login(token);
