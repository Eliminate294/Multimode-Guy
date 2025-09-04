import {
	APIEmbed,
	ApplicationIntegrationType,
	ChatInputCommandInteraction,
	InteractionContextType,
	JSONEncodable,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { get_osu_discord } from "../../func/psql/get_osu_discord.js";
import { get_mode_stats } from "../../func/psql/get_mode_stats.js";
import { calculate_missing, calculate_stdev } from "../std_dev.js";
import { get_user_pp } from "../api/get_user.js";
import { EmbedObject } from "../objects/embed.js";
import { MODEEMOTES, MODES } from "../constants.js";
import { stats } from "../../func/api/stats.js";

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
				.setDescription("Username of the player")
				.setRequired(false)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const user = interaction.options.getString("username", false);
		const discord_id = interaction.user.id;
		const tokenData = await get_osu_discord(discord_id);

		if (!tokenData) {
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
		let username: string = user ? user : "N/A";
		let osuId: number = tokenData.user_id;
		if (user) {
			osuId = await stats(user, tokenData.access_token, "osu").then(
				(data) => data?.id
			);
			mode_pp = await get_user_pp(
				interaction.user.id,
				osuId,
				tokenData.access_token
			);
			if (!mode_pp) {
				await interaction.reply({
					content: "Failed to fetch data for specified user",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
		} else {
			username = tokenData.username;
			const mode_stats = await get_mode_stats(tokenData.user_id, true);
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
			.setRankHeader(interaction.user.id)
			.setDefaults(this.data.name)
			.setThumbnail(osuId)
			.setDescription(
				`Currently at **${calculate_stdev(
					Object.values(mode_pp).map((v) => Number(v))
				).toFixed(
					0
				)}** spp, in order to reach **${goal}** spp, **${username}** in one of the following modes would need:`
			);
		for (const mode of MODES) {
			let value: string;
			if (result[mode].needed === undefined) {
				value = "`Not Possible\n(+inf)`";
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
			embed.addField(MODEEMOTES[mode], value, true);
			if (mode === "osu" || mode === "fruits") {
				embed.addBlankField();
			}
		}

		await interaction.reply({
			embeds: [embed as JSONEncodable<APIEmbed>],
		});
	},
};
