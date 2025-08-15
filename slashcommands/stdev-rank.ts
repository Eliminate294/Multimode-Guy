import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { get_stdev_rank } from "../osekai.js";

export default {
	data: new SlashCommandBuilder()
		.setName("stdev-rank")
		.setDescription(
			"Calculate what osekai stdev rank you would be with a given pp value"
		)
		.addIntegerOption((option) =>
			option
				.setName("pp")
				.setDescription("Total stdev pp")
				.setRequired(true)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const pp = interaction.options.getInteger("pp", true);
		const rank = await get_stdev_rank(pp);

		const embed = new EmbedBuilder()
			.setColor(0xffffff)
			.setTitle("Standard Deviated Rank Calculation")
			.addFields({
				name: "\u200B",
				value: `Your stdev rank would be **#${rank}** with **${pp}pp**`,
				inline: true,
			});

		interaction.reply({ embeds: [embed] });
	},
};
