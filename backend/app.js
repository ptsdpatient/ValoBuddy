// import ValorantAPI from 'unofficial-valorant-api';

// const VAPI = new ValorantAPI();

import { set, get, getAll, remove } from './db.js';

import {
    Client, GatewayIntentBits, ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle, REST, Routes, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ComponentType
} from 'discord.js';
import fs from 'fs';
const commands = JSON.parse(fs.readFileSync('./commands.json', 'utf-8'));

import { info, lastmatch } from './methods.js'
import { mapImages, agentImages, agentRoles } from './images.js';

import dotenv from 'dotenv';
dotenv.config();

const tiers = ["best", "better", "good"];
const roles = ["Duelist", "Initiator", "Controller", "Sentinel"];


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

        try {
            let name = interaction.options.getString('name');
            let tag = interaction.options.getString('tag');
            let region = interaction.options.getString('region') || 'ap';

            if (!name || !tag) {
                const userData = await get('users.json', interaction.user.id);

                if (!userData) {
                    console.log("no user data")
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

            // fs.writeFileSync('output.txt', JSON.stringify(leaderBoard), 'utf8');

            const { metadata, players } = leaderBoard.data;


            const redTeam = players.all_players.filter(p => p.team === 'Red');
            const blueTeam = players.all_players.filter(p => p.team === 'Blue');

            const formatTeam = (teamPlayers) => {
                let str = "```fix\n";
                str += "Player              K/D/A     Tier         (Agent)\n\n";


                teamPlayers
                    .sort((a, b) => b.stats.score - a.stats.score)
                    .forEach((p) => {
                        const nameTag = `${p.name}#${p.tag}`.padEnd(20).slice(0, 20);
                        const kda = `${p.stats.kills}/${p.stats.deaths}/${p.stats.assists}`.padEnd(9);
                        const tier = p.currenttier_patched.padEnd(13).slice(0, 13);
                        const agent = p.character.padEnd(10).slice(0, 10);
                        str += `${nameTag}${kda}${tier}(${agent})\n`;
                    });

                str += "```";
                return str;
            };

            const embed = new EmbedBuilder()
                .setTitle(`🏆 Valorant Match Summary`)
                // .setDescription(`\nEnemy Team\n${formatTeam(redTeam, 'Red')}\nPlayer Team\n${formatTeam(blueTeam, 'Blue')}`)
                // .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))

                .addFields(
                    {
                        name: "Started",
                        value: String(metadata.game_start_patched || "Unknown"),
                        inline: true
                    }, {
                    name: "Map",
                    value: String(metadata.map || "Unknown"),
                    inline: true
                }, {
                    name: "Mode",
                    value: String(metadata.mode || "Unknown"),
                    inline: true
                }, {
                    name: "Region",
                    value: String(metadata.region || "Unknown"),
                    inline: true
                }, {
                    name: "Rounds Played",
                    value: String(metadata.rounds_played || "Unknown"),
                    inline: true
                },
                    { name: 'Enemy Team', value: formatTeam(redTeam, 'Red') },
                    { name: 'Player Team', value: formatTeam(blueTeam, 'Blue') }
                )
                .setImage(`attachment://${matchData.map.name}.png`)
                .setColor(0xFF4F4F)
                .setFooter({ text: 'Powered by Valorant Unofficial API' });


            return interaction.editReply({
                embeds: [embed],
                files: [mapImages[matchData.map.name] || mapImages["Ascent"]]
            });
        } catch (err) {
            console.log("Error ocurred : ", err)
        }
    }


    if (interaction.commandName === 'agents') {
        await interaction.deferReply();

        try {

            let map = interaction.options.getString('map');
            let agent = interaction.options.getString('agent');

            if (!map && !agent) {

                let agents = await getAll("agents.json");

                const roles = Object.keys(agentRoles);
                const agentsByRole = {};
                for (const role of roles) {
                    agentsByRole[role] = agents.filter(a => a.role === role);
                }

                const embeds = [];
                const files = [];

                roles.forEach(role => {
                    const agentList = agentsByRole[role]
                        .map(a => `• **${a.agent}**`)
                        .join('\n');

                    const file = agentRoles[role];

                    files.push(file);

                    const embed = new EmbedBuilder()
                        .setTitle(`${role}s`)
                        .setDescription(agentList || 'No agents found.')
                        .setThumbnail(`attachment://${file.name}`)
                        .setColor(0xFF4F4F)
                        .setFooter({ text: `Total: ${agentsByRole[role].length} ${role}s` });

                    embeds.push(embed);
                });

                let currentIndex = 0;
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('⬅️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('➡️')
                        .setStyle(ButtonStyle.Secondary)
                );

                const message = await interaction.editReply({
                    embeds: [embeds[currentIndex]],
                    files: [files[currentIndex]],
                    components: [row],
                    fetchReply: true
                });

                const collector = message.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 60000
                });

                collector.on('collect', async i => {
                    if (i.user.id !== interaction.user.id)
                        return i.reply({ content: 'Only the command user can interact.', ephemeral: true });

                    if (i.customId === 'next') currentIndex = (currentIndex + 1) % embeds.length;
                    if (i.customId === 'prev') currentIndex = (currentIndex - 1 + embeds.length) % embeds.length;

                    await i.update({
                        embeds: [embeds[currentIndex]],
                        files: [files[currentIndex]],
                        components: [row]
                    });
                });
            }

            if (map && !agent) {

                const embeds = [];
                const mapData =  (await getAll("map.json"))[map];
                for (const tier of tiers) {
                    const embed = new EmbedBuilder()
                        .setTitle(` ${tier.charAt(0).toUpperCase() + tier.slice(1)} Agents`)
                        .setColor(0xFF4F4F);

                    for (const role of roles) {
                        const agentList = mapData[tier]?.[role];

                        if (!agentList || agentList.length === 0) continue;

                        const formatted = agentList.map(agent => {
                            if (typeof agent === 'string') {
                                return `• **${agent}**`;
                            } else {
                                const { name, complement } = agent;
                                const compStr = complement.length > 0
                                    ? ` _(w/ ${complement.join(', ')})_`
                                    : '';
                                return `• **${name}**${compStr}`;
                            }
                        }).join('\n');

                        embed.addFields({ name: role, value: formatted, inline: false });
                    }

                    embeds.push(embed);
                }

                // Buttons
                let currentIndex = 0;
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Secondary)
                );

                // Send initial embed
                const message = await interaction.editReply({
                    embeds: [embeds[currentIndex]],
                    components: [row],
                    fetchReply: true
                });

                // Collector
                const collector = message.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 60000
                });

                collector.on('collect', async i => {
                    if (i.user.id !== interaction.user.id)
                        return i.reply({ content: 'Only you can interact with this.', ephemeral: true });

                    if (i.customId === 'next') currentIndex = (currentIndex + 1) % embeds.length;
                    if (i.customId === 'prev') currentIndex = (currentIndex - 1 + embeds.length) % embeds.length;

                    await i.update({
                        embeds: [embeds[currentIndex]],
                        components: [row]
                    });
                });

                collector.on('end', async () => {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(true),
                        new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(true)
                    );

                    await message.edit({
                        components: [disabledRow]
                    });
                });
            }

        } catch (err) {
            console.log("Error ocurred : ", err)
        }

    }



    if (interaction.commandName === 'info') {
        await interaction.deferReply();

        try {

            let name = interaction.options.getString('name');
            let tag = interaction.options.getString('tag');
            let region = interaction.options.getString('region') || 'ap';

            if (!name || !tag) {
                const userData = await get('users.json', interaction.user.id);
                if (!userData) {
                    console.log("User info not found")
                    return interaction.editReply({
                        content: '⚠️ Please provide name and tag, or log in first using `/login`.'
                    });
                }
                name = userData.name;
                tag = userData.tag;
                region = userData.region || 'ap';
            }

            const { infoData, accountData } = (await info(region, name, tag));

            if (infoData.error) {
                return interaction.editReply({
                    content: `❌ Error:\n\`\`\`Something is wrong in the provided information!\`\`\``
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`📊 Rank Info - ${infoData.data.name}#${infoData.data.tag}`)
                .setThumbnail(infoData.data.images?.large || null)
                .setImage(accountData.data.card?.wide || null)
                .addFields(
                    {
                        name: "Current Rank",
                        value: String(infoData.data.currenttierpatched || "Unknown"),
                        inline: true
                    },
                    {
                        name: "Account Level",
                        value: String(accountData.data.account_level ?? "Unknown"),
                        inline: true
                    },
                    {
                        name: "ELO",
                        value: String(infoData.data.elo ?? "N/A"),
                        inline: true
                    },
                    {
                        name: "Rank Progress",
                        value: `${infoData.data.ranking_in_tier ?? "?"}/100`,
                        inline: true
                    },
                    {
                        name: "Last Match MMR Change",
                        value: `${infoData.data.mmr_change_to_last_game >= 0 ? "+" : ""}${infoData.data.mmr_change_to_last_game ?? "?"} MMR`,
                        inline: true
                    }
                )
                .setColor(0xFF4F4F)
                .setFooter({
                    text: "Powered by ValoBuddy API and services.",
                    iconURL: accountData.data.card?.small || null
                });

            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error("❌ Failed to handle /info command:", err);

            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({
                    content: '⚠️ Something went wrong while processing the command.'
                }).catch((err) => { console.log("Error ocurred : ", err) });
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
