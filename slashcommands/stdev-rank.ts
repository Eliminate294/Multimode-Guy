import {
	ApplicationIntegrationType,
	ChatInputCommandInteraction,
	InteractionContextType,
	SlashCommandBuilder,
} from "discord.js";
import { get_stdev_rank } from "../osekai.js";
import { EmbedObject } from "../objects/embed.js";

export default {
	data: new SlashCommandBuilder()
		.setName("stdev-rank")
		.setDescription(
			"Calculate what osekai stdev rank you would be with a given pp value"
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
				.setName("pp")
				.setDescription("Total stdev pp")
				.setRequired(true)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const pp = interaction.options.getInteger("pp", true);
		const [rank, userId, username] = await get_stdev_rank(pp);

		const embed = new EmbedObject()
			.setDefaults(this.data.name)
			.setRankHeader(interaction.user.id)
			.setThumbnail(userId);
		if (rank === -1) {
			embed.setDescription(
				`With **${pp}spp**, your rank wouldn't be in the top 2500 on the **standard deviated** leaderboards`
			);
		} else {
			embed.setDescription(
				`With **${pp}spp**, your rank on the **standard deviated** leaderboards would be **#${rank}**, currently held by **${username}**`
			);
		}

		interaction.reply({ embeds: [embed] });
	},
};
