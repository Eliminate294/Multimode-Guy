import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { get_stdev_pp, get_stdev_rank } from "../osekai.js";

export default {
	data: new SlashCommandBuilder()
		.setName("stdev-pp")
		.setDescription(
			"Calculate how much pp you need for a given osekai stdev rank"
		)
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

		const embed = new EmbedBuilder()
			.setColor(0xffffff)
			.setTitle("Standard Deviated Rank to PP")
			.addFields({
				name: "\u200B",
				value: `**#${rank}** is currently held by **${userData.username}**, and to snipe them you need **${userData.spp}spp**`,
				inline: true,
			});

		interaction.reply({ embeds: [embed] });
	},
};
