import {
	ApplicationIntegrationType,
	ChatInputCommandInteraction,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { get_osu_discord } from "../../func/psql/get_osu_discord.js";
import { get_user_pp } from "../api/get_user.js";
import { EmbedObject } from "../objects/embed.js";
import { stats } from "../../func/api/stats.js";
import { MODEEMOTES } from "../constants.js";
import { calculate_stdev } from "../std_dev.js";

export default {
	data: new SlashCommandBuilder()
		.setName("pp-stats")
		.setDescription(
			"Display the amount of pp, tpp, and spp a given user has"
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
		.addStringOption((option) =>
			option
				.setName("username")
				.setDescription("Username of the player")
				.setRequired(false)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const discord_id = interaction.user.id;
		const username = interaction.options.getString("username", false);
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
		let osuId = tokenData.user_id;
		if (username) {
			osuId = await stats(username, tokenData.access_token, "osu").then(
				(data) => data?.id
			);
		}
		const data = await get_user_pp(
			discord_id,
			osuId,
			tokenData.access_token
		);
		if (!data) {
			await interaction.reply({
				content:
					"Failed to fetch data for specified user, maybe use /link then try again",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const embed = new EmbedObject()
			.setRankHeader(interaction.user.id)
			.setDefaults(this.data.name)
			.setThumbnail(osuId)
			.setDescription(
				`${username ?? tokenData.username}'s current pp statistics:`
			);

		let modeString = "";
		for (const key in data) {
			const mode = key as Mode;
			modeString += `${MODEEMOTES[mode]} **${data[mode]}pp**\n`;
		}
		embed
			.addField("Modes:", modeString, false)
			.addField(
				"Stdev PP:",
				`**${calculate_stdev(Object.values(data)).toFixed(2)}** spp`,
				true
			)
			.addField(
				"Total PP:",
				`**${Object.values(data)
					.reduce((acc, val) => acc + val, 0)
					.toFixed(2)}** tpp`,
				true
			);

		await interaction.reply({ embeds: [embed] });
	},
};
