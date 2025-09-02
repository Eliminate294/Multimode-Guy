import {
	ApplicationIntegrationType,
	ChatInputCommandInteraction,
	EmbedBuilder,
	InteractionContextType,
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

export default {
	data: new SlashCommandBuilder()
		.setName("stdev-missing")
		.setDescription("Calculate how much PP you would need in a given mode ")
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
				.setName("mode")
				.setDescription("The mode you want to calculate for")
				.setRequired(true)
				.addChoices(
					{ name: "osu", value: "osu" },
					{ name: "taiko", value: "taiko" },
					{ name: "fruits", value: "fruits" },
					{ name: "mania", value: "mania" }
				)
		)
		.addStringOption((option) =>
			option
				.setName("username")
				.setDescription("The username of the player")
				.setRequired(false)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const user = interaction.options.getString("username", false);
		let mode_pp;
		if (user) {
			mode_pp = await get_user_pp(interaction.user.id, user);
			if (!mode_pp) {
				await interaction.reply({
					content: "Failed to fetch data for specified user",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
		} else {
			const discord_id = interaction.user.id;
			let db_info;
			if (discord_id) {
				db_info = await get_osu_discord(discord_id);
				if (!db_info) {
					console.log(
						"User does not have a valid database entry:",
						interaction.user.username
					);
					await interaction.reply({
						content:
							"User could not be found, use /link to link your osu account to the bot",
						flags: MessageFlags.Ephemeral,
					});
					return;
				}
				const mode_stats = await get_mode_stats(db_info.user_id, true);
				mode_pp = {
					osu: mode_stats.osu[0].pp,
					taiko: mode_stats.taiko[0].pp,
					fruits: mode_stats.fruits[0].pp,
					mania: mode_stats.mania[0].pp,
				};
			} else {
				console.log("No discord id");
				return;
			}
		}

		const selected_mode = interaction.options.getString(
			"mode",
			true
		) as keyof CompleteModeStats;
		const otherModes = (
			["osu", "taiko", "fruits", "mania"] as const
		).filter((mode) => mode !== selected_mode);

		const pp: number[] = otherModes.map((mode) => Number(mode_pp[mode]));
		const goal = interaction.options.getInteger("goal", true);
		console.log(goal);

		const needed = calculate_missing(pp, goal);
		if (!needed) {
			await interaction.reply({
				content: `You would require too much PP in ${selected_mode} to reach this amount of standard deviated pp`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		if (needed < 0) {
			await interaction.reply({
				content: `You would still surpass ${goal} standard deviated pp by ${Math.abs(
					needed
				).toFixed(2)}pp in ${selected_mode}`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		console.log(needed);
		const difference = Math.floor(needed) - mode_pp[selected_mode];

		const embed = new EmbedBuilder()
			.setColor(0xffffff)
			.setTitle("Missing PP Std Dev Calculation")
			.addFields({
				name: "\u200B",
				value: `To reach **${goal}** standard deviated pp, you need **${needed!.toFixed(
					2
				)}** pp in **${selected_mode}**\n**(${
					difference < 0
						? `${Math.abs(difference).toFixed(2)} less`
						: `${difference.toFixed(2)} more`
				} pp)**`,
				inline: false,
			});
		await interaction.reply({ embeds: [embed] });
	},
};
