import {
	APIEmbed,
	ApplicationIntegrationType,
	ChatInputCommandInteraction,
	EmbedBuilder,
	InteractionContextType,
	JSONEncodable,
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
import { userObjects } from "../client.js";
import { EmbedObject } from "../objects/embed.js";
import { MODES } from "../constants.js";

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
		const result: Record<Mode, Record<string, number | undefined>> = {
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
				result[selected_mode].needed = undefined;
				continue;
			}
			result[selected_mode].needed = needed;
			result[selected_mode].difference =
				Math.floor(needed) - mode_pp[selected_mode];
		}
		const embed = new EmbedObject()
			.setRankHeader(userObjects.get(interaction.user.id)!)
			.setDefaults(this.data.name)
			.setDescription(
				`To reach **${goal}** spp, **${username}** would need:`
			);
		const modeEmotes = {
			osu: "<:osu:1405592882085367808>",
			taiko: "<:taiko:1405592907733270629>",
			fruits: "<:catch:1405592919104294963>",
			mania: "<:mania:1405592894630269069>",
		};
		for (const mode of MODES) {
			let value: string;
			if (result[mode].needed === undefined) {
				value = "`inf\n(inf)`";
			} else {
				const increase: boolean = result[mode].difference! >= 0;
				value = `\`${result[mode].needed!.toFixed(2)}\`\n\`(${
					increase ? "+" : ""
				}${result[mode].difference!.toFixed(2)} ${
					increase ? "\u25B2" : "\u25BC"
				}${(
					Math.abs(
						(result[mode].needed! - mode_pp[mode]) / mode_pp[mode]
					) * 100
				).toFixed(0)}%)\``;
			}
			embed.addField(modeEmotes[mode], value, true);
			if (mode === "osu" || mode === "fruits") {
				embed.addBlankField();
			}
		}

		await interaction.reply({
			embeds: [embed as JSONEncodable<APIEmbed>],
		});
	},
};
