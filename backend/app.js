// import ValorantAPI from 'unofficial-valorant-api';

// const VAPI = new ValorantAPI();

import { set, get, getAll, remove } from './db.js';

import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import fs from 'fs';
const commands = JSON.parse(fs.readFileSync('./commands.json', 'utf-8'));

import { info, lastmatch } from './methods.js'
import { mapImages, agentImages } from './images.js';

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
        await interaction.deferReply();

        const name = interaction.options.getString('name');
        const tag = interaction.options.getString('tag');
        const region = interaction.options.getString('region') || 'ap';

        if (!name || !tag) {
            const userData = await get('users.json', interaction.user.id);
            if (!userData) {
                return interaction.editReply({
                    content: '⚠️ Please provide name and tag, or log in first using `/login`.'
                });
            }
            name = userData.name;
            tag = userData.tag;
            region = userData.region || 'ap';
        }
        
        const { matchData, leaderBoard } = await lastmatch(region, name, tag);

        if (matchData.error) {
            return interaction.editReply({
                content: `❌ Error:\n\`\`\`${JSON.stringify(matchData.error, null, 2)}\`\`\``
            });
        }
        const embed1 = new EmbedBuilder()
            .setTitle(`📊 Valorant Ranked Match Summary`)
            .setDescription(`Latest match details for **${matchData.currenttierpatched}** tier.`)
            .setColor(0x00BFFF)
            .setThumbnail(matchData.images.small)
            .setImage(`attachment://${matchData.map.name}.png`)
            .addFields(
                { name: '🏷️ Rank', value: `${matchData.currenttierpatched}`, inline: true },
                { name: '📈 ELO', value: `${matchData.elo}`, inline: true },
                { name: '📍 Map', value: `${matchData.map.name}`, inline: true },
                { name: '📊 Tier Ranking', value: `${matchData.ranking_in_tier}/100`, inline: true },
                { name: '🔺 MMR Change', value: `${matchData.mmr_change_to_last_game > 0 ? '+' : ''}${matchData.mmr_change_to_last_game}`, inline: true },
                { name: '🗓️ Date', value: `${matchData.date}`, inline: false }
            )
            .setFooter({ text: `Match ID: ${matchData.match_id}` })
            .setTimestamp(new Date(matchData.date_raw * 1000));

        // fs.writeFileSync('output.txt', JSON.stringify(leaderBoard), 'utf8');

        const { metadata, players } = leaderBoard.data;


        const redTeam = players.all_players.filter(p => p.team === 'Red');
        const blueTeam = players.all_players.filter(p => p.team === 'Blue');

        const formatTeam = (teamPlayers, teamColor) => {
            let str = `\`\`\`fix\n# Player            Agent     Tier       K/D/A     Score  Dmg\n-------------------------------------------------------------\n`;
            teamPlayers
                .sort((a, b) => b.stats.score - a.stats.score)
                .forEach((p, idx) => {
                    const nameTag = `${p.name}#${p.tag}`.padEnd(18);
                    const agent = p.character.padEnd(9);
                    const tier = p.currenttier_patched.padEnd(10);
                    const kda = `${p.stats.kills}/${p.stats.deaths}/${p.stats.assists}`.padEnd(9);
                    const score = p.stats.score.toString().padStart(5);
                    const dmg = p.damage_made.toString().padStart(4);
                    str += `${(idx + 1).toString().padStart(2)} ${nameTag}${agent}${tier}${kda}${score} ${dmg}\n`;
                });
            str += '```';
            return str;
        };

        const matchInfo =
            `🗺️ **Map:** ${metadata.map}\n` +
            `🎮 **Mode:** ${metadata.mode}\n` +
            `🕒 **Started:** ${metadata.game_start_patched}\n` +
            `📍 **Region:** ${metadata.region} (${metadata.cluster})\n` +
            `🔢 **Rounds Played:** ${metadata.rounds_played}`;

        const embed2 = new EmbedBuilder()
            .setTitle(`🏆 Valorant Match Summary`)
            .setDescription(matchInfo)
            .addFields(
                { name: '🔴 Red Team', value: formatTeam(redTeam, 'Red') },
                { name: '🔵 Blue Team', value: formatTeam(blueTeam, 'Blue') }
            )
            .setColor(0x5865F2)
            .setFooter({ text: 'Powered by Valorant Unofficial API' });


        return interaction.editReply({
            embeds: [embed1, embed2],
            files: [mapImages[matchData.map.name] || mapImages["Ascent"]]
        });
    }

    if (interaction.commandName === 'info') {
        try {
            await interaction.deferReply();

            const name = interaction.options.getString('name');
            const tag = interaction.options.getString('tag');
            const region = interaction.options.getString('region') || 'ap';

            if (!name || !tag) {
                const userData = await get('users.json', interaction.user.id);
                if (!userData) {
                    return interaction.editReply({
                        content: '⚠️ Please provide name and tag, or log in first using `/login`.'
                    });
                }
                name = userData.name;
                tag = userData.tag;
                region = userData.region || 'ap';
            }

            const infoData = await info(region, name, tag);

            if (infoData.error || !infoData.data) {
                return interaction.editReply({
                    content: `❌ Error:\n\`\`\`Something is wrong in the provided information!\`\`\``
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`📊 Rank Info - ${infoData.data.name}#${infoData.data.tag}`)
                .setThumbnail(infoData.data.images.small || null)
                .setImage(infoData.data.images.large || null)
                .addFields(
                    { name: "Current Rank", value: infoData.data.currenttierpatched || "Unknown", inline: true },
                    { name: "ELO", value: infoData.data.elo?.toString() || "N/A", inline: true },
                    { name: "Rank Progress", value: `${infoData.data.ranking_in_tier ?? "?"}/100`, inline: true },
                    { name: "Last Match MMR Change", value: `${infoData.data.mmr_change_to_last_game >= 0 ? "+" : ""}${infoData.data.mmr_change_to_last_game} MMR`, inline: true }
                )
                .setColor(0x5865F2)
                .setFooter({ text: "Powered by Valorant Unofficial API" });


            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error("❌ Failed to handle /info command:", err);

            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({
                    content: '⚠️ Something went wrong while processing the command.',
                    ephemeral: true
                }).catch(() => { });
            }

            return interaction.editReply({
                content: '⚠️ Something went wrong while processing the command.'
            });
        }
    }

    if (interaction.commandName === 'logout') {
        try {
            await interaction.deferReply({ ephemeral: true });

            const userData = await get('users.json', interaction.user.id);

            if (!userData) {
                return interaction.editReply({
                    content: "⚠️ You are not logged in. No data found.",
                    ephemeral: true
                });
            }

            await remove('users.json', interaction.user.id);

            const embed = new EmbedBuilder()
                .setTitle('🚪 Logged Out Successfully')
                .setDescription(`Your data has been removed from the database.`)
                .addFields(
                    { name: 'Username', value: userData.name, inline: true },
                    { name: 'Tag', value: userData.tag, inline: true },
                    { name: 'Region', value: userData.region || 'ap', inline: true }
                )
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setColor('Red')
                .setFooter({ text: `User ID: ${interaction.user.id}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error('Logout error:', err);
            return interaction.editReply({
                content: "❌ An error occurred while logging out.",
                ephemeral: true
            });
        }
    }

    if (interaction.commandName === 'login') {
        try {
            await interaction.deferReply();

            const name = interaction.options.getString('name');
            const tag = interaction.options.getString('tag');
            const region = interaction.options.getString('region') || 'ap';


            await set('users.json', interaction.user.id, {
                name: name,
                tag: tag,
                region: region || 'ap'
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ Logged In Successfully')
                .setDescription(`You have been logged in with the following credentials:`)
                .addFields(
                    { name: 'Username', value: name, inline: true },
                    { name: 'Tag', value: tag, inline: true },
                    { name: 'Region', value: region || 'ap', inline: true }
                )
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setColor('Green')
                .setFooter({ text: `User ID: ${interaction.user.id}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error("❌ Failed to handle /info command:", err);

            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({
                    content: '⚠️ Something went wrong while processing the command.',
                    ephemeral: true
                }).catch(() => { });
            }

            return interaction.editReply({
                content: '⚠️ Something went wrong while processing the command.'
            });
        }
    }



});


client.login(token);
