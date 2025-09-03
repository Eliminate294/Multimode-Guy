import {
	ApplicationIntegrationType,
	ChatInputCommandInteraction,
	EmbedBuilder,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { get_osu_discord } from "../../func/psql/get_osu_discord.js";
import {
	CompleteModeStats,
	get_mode_stats,
} from "../../func/psql/get_mode_stats.js";
import { calculate_missing } from "../std_dev.js";
import { get_user_pp } from "../api/get_user.js";
import { get_osekai_data } from "../../func/psql/get_osekai_data.js";
import { count } from "console";

export default {
	data: new SlashCommandBuilder()
		.setName("stdev-missing")
		.setDescription(
			"Calculate how much PP you would need in each mode to reach a spp goal"
		)
		.setIntegrationTypes([
			ApplicationIntegrationType.UserInstall,
			ApplicationIntegrationType.GuildInstall,
		])
		.setContexts([
			InteractionContextType.Guild,
			InteractionContextType.BotDM,
			InteractionContextType.PrivateChannel,
		])
		.addIntegerOption((option) =>
			option
				.setName("goal")
				.setDescription(
					"Amount of standard deviated pp you are aiming for"
				)
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("username")
				.setDescription("The username of the player")
				.setRequired(false)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const user = interaction.options.getString("username", false);
		const discord_id = interaction.user.id;
		const db_info = await get_osu_discord(discord_id);

		if (!db_info) {
			console.log(
				"User does not have a valid database entry:",
				interaction.user.username
			);
			await interaction.reply({
				content:
					"You do not have a linked account with the bot, use /link to link your account",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		let mode_pp;
		let invokerUser: Record<string, number | string> = {};
		let username: string = user ? user : "N/A";
		if (user) {
			mode_pp = await get_user_pp(interaction.user.id, user);
			if (!mode_pp) {
				await interaction.reply({
					content: "Failed to fetch data for specified user",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			const invoker_stats = await get_osekai_data(
				undefined,
				interaction.user.id
			);
			invokerUser = {
				username: db_info.username,
				country: db_info.country,
				spp_rank: invoker_stats?.spp_rank ?? -1,
				tpp_rank: invoker_stats?.tpp_rank ?? -1,
			};
		} else {
			username = db_info.username;
			const mode_stats = await get_mode_stats(db_info.user_id, true);
			const invoker_stats = await get_osekai_data(db_info.user_id);
			invokerUser = {
				username: username,
				country: db_info.country,
				spp_rank: invoker_stats?.spp_rank ?? -1,
				tpp_rank: invoker_stats?.tpp_rank ?? -1,
			};
			mode_pp = {
				osu: mode_stats.osu[0].pp,
				taiko: mode_stats.taiko[0].pp,
				fruits: mode_stats.fruits[0].pp,
				mania: mode_stats.mania[0].pp,
			};
		}

		const goal = interaction.options.getInteger("goal", true);
		const result: Record<Mode, Record<string, number>> = {
			osu: { needed: 0, difference: 0 },
			taiko: { needed: 0, difference: 0 },
			fruits: { needed: 0, difference: 0 },
			mania: { needed: 0, difference: 0 },
		};
		for (const selected_mode of [
			"osu",
			"taiko",
			"fruits",
			"mania",
		] as const) {
			const otherModes = (
				["osu", "taiko", "fruits", "mania"] as const
			).filter((mode) => mode !== selected_mode);

			const pp: number[] = otherModes.map((mode) =>
				Number(mode_pp[mode])
			);

			const needed = calculate_missing(pp, goal);
			if (!needed) {
				result[selected_mode].needed = -1;
				continue;
			}
			result[selected_mode].needed = Math.floor(needed);
			result[selected_mode].difference =
				Math.floor(needed) - mode_pp[selected_mode];
		}

		const embed = {
			//title: "Calculate Missing PP",
			description: `To reach **${goal}** spp, **${username}** would need:`,
			color: 8171961,
			timestamp: new Date().toISOString(),
			footer: {
				icon_url: "https://cdn.discordapp.com/embed/avatars/0.png",
				text: "stdev-missing",
			},
			thumbnail: {
				url: "https://a.ppy.sh/9169747?1748281907.png",
			},
			author: {
				name: `${invokerUser.username} | #${invokerUser.spp_rank} spp | #${invokerUser.tpp_rank} tpp`,
				url: `https://osu.ppy.sh/users${db_info.user_id}`,
				icon_url: `https://osu.ppy.sh/images/flags/${invokerUser.country}.png`,
			},
			fields: [
				{
					name: "<:osu:1405592882085367808>",
					value: `\`${result.osu.needed.toFixed(2)}pp\`\n\`(${
						result.osu.difference >= 0 ? "+" : "-"
					}${result.osu.difference.toFixed(2)}pp)\``,
					inline: true,
				},
				{
					name: "\u200B",
					value: "\u200B",
					inline: true,
				},
				{
					name: "<:taiko:1405592907733270629>",
					value: `\`${result.taiko.needed.toFixed(2)}pp\`\n\`(${
						result.taiko.difference >= 0 ? "+" : "-"
					}${result.taiko.difference.toFixed(2)}pp)\``,
					inline: true,
				},
				{
					name: "<:catch:1405592919104294963>",
					value: `\`${result.fruits.needed.toFixed(2)}pp\`\n\`(${
						result.fruits.difference >= 0 ? "+" : "-"
					}${result.fruits.difference.toFixed(2)}pp)\``,
					inline: true,
				},
				{
					name: "\u200B",
					value: "\u200B",
					inline: true,
				},
				{
					name: "<:mania:1405592894630269069>",
					value: `\`${result.mania.needed.toFixed(2)}pp\`\n\`(${
						result.mania.difference >= 0 ? "+" : "-"
					}${result.mania.difference.toFixed(2)}pp)\``,
					inline: true,
				},
			],
		};
		await interaction.reply({ embeds: [embed] });
	},
};
