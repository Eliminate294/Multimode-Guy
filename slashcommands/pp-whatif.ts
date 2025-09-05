import {
	ApplicationIntegrationType,
	ChatInputCommandInteraction,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { get_user_scores } from "../api/get_user.js";
import { get_osu_discord } from "../../func/psql/get_osu_discord.js";
import { pp_change } from "../scores/weighting.js";
import { stats } from "../../func/api/stats.js";
import { userCache } from "../client.js";
import { EmbedObject } from "../objects/embed.js";

export default {
	data: new SlashCommandBuilder()
		.setName("pp-whatif")
		.setDescription(
			"How much pp, spp, and tpp you would gain from an x pp play"
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
				.setDescription("PP play worth")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("mode")
				.setDescription("What mode the pp play is in")
				.setRequired(false)
				.addChoices(
					{ name: "osu", value: "osu" },
					{ name: "taiko", value: "taiko" },
					{ name: "catch", value: "fruits" },
					{ name: "mania", value: "mania" }
				)
		)
		.addStringOption((option) =>
			option
				.setName("username")
				.setDescription("Username of the player")
				.setRequired(false)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const discord_id = interaction.user.id;
		const user =
			interaction.options.getString("username", false) ??
			userCache.get(discord_id)!.username;
		const newPP = interaction.options.getInteger("pp", true);
		const mode =
			(interaction.options.getString("mode", false) as
				| Mode
				| undefined) ?? undefined;
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
		const osu_stats = await stats(user, tokenData.access_token, mode);
		if (!osu_stats) {
			await interaction.reply({
				content:
					"Failed to fetch data for specified user, use /link then try again",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		const osu_id = osu_stats.id;
		const total_pp: number = osu_stats.statistics.pp;
		const data = await get_user_scores(
			discord_id,
			osu_id,
			mode,
			tokenData.access_token
		);
		if (!data) {
			await interaction.reply({
				content:
					"Failed to fetch data for specified user, use /link then try again",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		const pp_values = data.map((item) => item.pp as number);
		const { total, change, position } = pp_change(
			pp_values,
			total_pp,
			newPP
		);
		if (position > pp_values.length) {
			await interaction.reply({
				content: `A ${newPP}pp play would not add any value to `,
				flags: MessageFlags.Ephemeral,
			});
		}

		const embed = new EmbedObject()
			.setDefaults(this.data.name)
			.setRankHeader(discord_id)
			.setThumbnail(osu_id)
			.setDescription(
				`A new **${newPP}pp** play would be ${
					osu_stats.username
				}'s **#${position}** play in **${
					osu_stats.playmode
				}**, where they would gain **${change.toFixed(
					2
				)}pp** pushing them up to **${total.toFixed(2)}pp in total.**`
			);

		await interaction.reply({
			embeds: [embed],
		});
	},
};
