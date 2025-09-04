import {
	ApplicationIntegrationType,
	ChatInputCommandInteraction,
	EmbedBuilder,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { get_stdev_pp } from "../osekai.js";
import { EmbedObject } from "../objects/embed.js";
import { calculate_missing } from "../std_dev.js";
import { get_user_pp } from "../api/get_user.js";
import { get_osu_discord } from "../../func/psql/get_osu_discord.js";
import { MODES } from "../constants.js";

export default {
	data: new SlashCommandBuilder()
		.setName("stdev-pp")
		.setDescription(
			"Calculate how much pp you need for a given osekai stdev rank"
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
				.setName("rank")
				.setDescription("osekai stdev rank")
				.setRequired(true)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const rank = interaction.options.getInteger("rank", true);
		if (rank <= 0 || rank >= 2500) {
			interaction.reply({
				content: "Rank out of range (between 1-2499)",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const userData = await get_stdev_pp(rank);

		const result: Record<Mode, Record<string, number | undefined>> = {
			osu: { needed: 0, difference: 0 },
			taiko: { needed: 0, difference: 0 },
			fruits: { needed: 0, difference: 0 },
			mania: { needed: 0, difference: 0 },
		};

		const tokenData = await get_osu_discord(interaction.user.id);

		const mode_pp = await get_user_pp(
			interaction.user.id,
			tokenData!.user_id,
			tokenData!.access_token
		);
		if (!mode_pp) {
			await interaction.reply({
				content: "Failed to fetch data for specified user",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
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

			const needed = calculate_missing(pp, Number(userData.spp));
			if (!needed) {
				result[selected_mode].needed = undefined;
				continue;
			}
			result[selected_mode].needed = needed;
			result[selected_mode].difference =
				Math.floor(needed) - mode_pp[selected_mode];
		}

		// literally copy pasted everything below this point from stdev-missing
		// will probably make it a function instead
		// this is good for now...
		const modeEmotes = {
			osu: "<:osu:1405592882085367808>",
			taiko: "<:taiko:1405592907733270629>",
			fruits: "<:catch:1405592919104294963>",
			mania: "<:mania:1405592894630269069>",
		};
		const embed = new EmbedObject()
			.setDefaults(this.data.name)
			.setRankHeader(interaction.user.id)
			.setThumbnail(Number(userData.userid))
			.setDescription(
				`To reach **#${rank}** on osekai, you need **${userData.spp}** spp, which is currently held by **${userData.username}**`
			);
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

		interaction.reply({ embeds: [embed] });
	},
};
