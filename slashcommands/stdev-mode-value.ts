import {
	ApplicationIntegrationType,
	ChatInputCommandInteraction,
	GuildMember,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import {
	CompleteModeStats,
	get_mode_stats,
} from "../../func/psql/get_mode_stats.js";
import { get_osu_discord } from "../../func/psql/get_osu_discord.js";
import { calculate_stdev } from "../std_dev.js";
import { EmbedBuilder } from "@discordjs/builders";
import { EmbedObject } from "../objects/embed.js";
import { get_user_pp } from "../api/get_user.js";
import { MODEEMOTES, MODES } from "../constants.js";
import { stats } from "../../func/api/stats.js";

export default {
	data: new SlashCommandBuilder()
		.setName("stdev-mode-value")
		.setDescription("Calculate how much spp you gain per 1pp in each mode")
		.setIntegrationTypes([
			ApplicationIntegrationType.UserInstall,
			ApplicationIntegrationType.GuildInstall,
		])
		.setContexts([
			InteractionContextType.Guild,
			InteractionContextType.BotDM,
			InteractionContextType.PrivateChannel,
		])
		.addStringOption((option) =>
			option
				.setName("username")
				.setDescription("Username of the player")
				.setRequired(false)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const user = interaction.options.getString("username", false);
		const tokenData = await get_osu_discord(interaction.user.id);
		if (!tokenData) {
			await interaction.reply({
				content:
					"You do not have a linked account with the bot, use /link to link your account",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		await interaction.deferReply();
		let osuId: number = tokenData.user_id;
		if (user) {
			osuId = await stats(user, tokenData.access_token, "osu").then(
				(data) => data?.id
			);
		}
		const pp = await get_user_pp(
			interaction.user.id,
			osuId,
			tokenData.access_token
		);
		if (!pp) {
			await interaction.followUp({
				content: "Failed to fetch user pp data",
				flags: MessageFlags.Ephemeral,
			});
		}
		const stdev = calculate_stdev(Object.values(pp!));
		let calcStdev: Map<string, number> = new Map();

		for (const mode of MODES) {
			const calcPP: Map<string, number> = new Map();
			Object.entries(pp!).forEach(([mode_key, pp]) => {
				if (mode_key !== mode) {
					calcPP.set(mode_key, pp);
				} else {
					calcPP.set(mode_key, pp + 1);
				}
			});
			const modeStdev = calculate_stdev(Array.from(calcPP.values()));
			calcStdev.set(
				mode,
				Math.round(Math.abs(stdev - modeStdev) * 100) / 100
			);
		}

		const embed = new EmbedObject()
			.setDefaults(this.data.name)
			.setRankHeader(interaction.user.id)
			.setThumbnail(osuId)
			.setDescription(
				`Standard deviated pp gained **per 1pp** in each gamemode for **${
					user ? user : tokenData.username
				}**`
			)
			.addField(
				"Modes",
				`${MODEEMOTES.osu} Standard:\n${MODEEMOTES.taiko} Taiko:\n${MODEEMOTES.fruits} CTB:\n${MODEEMOTES.mania} Mania:`,
				true
			)
			.addField(
				"\u200B",
				`${calcStdev.get("osu")} spp\n${calcStdev.get(
					"taiko"
				)}\n${calcStdev.get("fruits")} spp\n${calcStdev.get(
					"mania"
				)} spp`,
				true
			);

		interaction.followUp({ embeds: [embed] });
	},
};
