import {
	ChatInputCommandInteraction,
	GuildMember,
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

export default {
	data: new SlashCommandBuilder()
		.setName("stdev-mode-value")
		.setDescription("Calculate how much spp you gain per 1pp in each mode")
		.addMentionableOption((option) =>
			option
				.setName("user")
				.setDescription("Choose a user from the server")
				.setRequired(false)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const param = interaction.options.getMentionable("user", false);
		const user: GuildMember = (
			param ? param : interaction.user
		) as GuildMember;
		const tokenData = await get_osu_discord(user.id);
		if (!tokenData) {
			await interaction.reply({
				content:
					"User could not be found, use /link to add your account to the bot, or tell the user you are using to do so",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		const allStats = await get_mode_stats(tokenData.user_id);
		let pp: Map<string, number> = new Map();

		for (const mode in allStats) {
			pp.set(
				mode,
				Number(allStats[mode as keyof CompleteModeStats][0].pp)
			);
		}
		const stdev = calculate_stdev(Array.from(pp.values()));
		let calcStdev: Map<string, number> = new Map();
		console.log(stdev);

		console.log(pp);
		for (const mode in allStats) {
			const calcPP: Map<string, number> = new Map();
			pp.forEach((pp, mode_key) => {
				if (mode_key !== mode) {
					calcPP.set(mode_key, pp);
				} else {
					calcPP.set(mode_key, pp + 1);
				}
			});
			const modeStdev = await calculate_stdev(
				Array.from(calcPP.values())
			);
			calcStdev.set(
				mode,
				Math.round(Math.abs(stdev - modeStdev) * 100) / 100
			);
			console.log(Math.abs(stdev - modeStdev));
		}

		const embed = new EmbedBuilder()
			.setColor(0xffffff)
			.setTitle("Standard Deviated Mode Value")
			.addFields(
				{
					name: "Modes",
					value: "Standard:\nTaiko:\nCTB:\nMania:",
					inline: true,
				},
				{
					name: "\u200B",
					value: `${calcStdev.get("osu")} spp\n${calcStdev.get(
						"taiko"
					)} spp\n${calcStdev.get("fruits")} spp\n${calcStdev.get(
						"mania"
					)} spp`,
					inline: true,
				}
			);

		interaction.reply({ embeds: [embed] });
	},
};
