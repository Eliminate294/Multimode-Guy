import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	Interaction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { calculate_stdev } from "../std_dev.js";
import { get_osu_discord } from "../../func/psql/get_osu_discord.js";
import {
	CompleteModeStats,
	get_mode_stats,
} from "../../func/psql/get_mode_stats.js";

const modes = ["osu", "taiko", "fruits", "mania"] as const;

export default {
	data: new SlashCommandBuilder()
		.setName("stdev-whatif")
		.setDescription(
			"Calculate how much standard deviated PP you would have if you had x amount in each gamemode"
		)
		.addIntegerOption((option) =>
			option
				.setName("osu")
				.setDescription("Amount of pp in standard")
				.setRequired(false)
		)
		.addIntegerOption((option) =>
			option
				.setName("taiko")
				.setDescription("Amount of pp in taiko")
				.setRequired(false)
		)
		.addIntegerOption((option) =>
			option
				.setName("fruits")
				.setDescription("Amount of pp in catch the beat")
				.setRequired(false)
		)
		.addIntegerOption((option) =>
			option
				.setName("mania")
				.setDescription("Amount of pp in mania")
				.setRequired(false)
		),

	async execute(interaction: ChatInputCommandInteraction) {
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
		} else {
			console.log("No discord id");
			return;
		}

		let pp: number[] = [];
		const db_pp: CompleteModeStats = await get_mode_stats(
			db_info.user_id,
			true
		);
		for (const mode of modes) {
			const mode_pp = interaction.options.getInteger(mode);
			if (mode_pp) {
				pp.push(mode_pp);
			} else {
				pp.push(Math.round(db_pp[mode][0].pp));
			}
		}

		if (pp.length !== 4) {
			throw new Error("Haven't received 4 inputs from stdev command");
		}
		const stdev_pp = calculate_stdev(pp);
		console.log("pp array values:", pp);
		const embed = new EmbedBuilder()
			.setColor(0xffffff)
			.setTitle("Standard Deviated PP Calculation")
			.addFields(
				{
					name: "Modes",
					value: "Standard:\nTaiko:\nCTB:\nMania:",
					inline: true,
				},
				{
					name: "\u200B",
					value: `${pp[0]} pp\n${pp[1]} pp\n${pp[2]} pp\n${pp[3]} pp`,
					inline: true,
				},
				{
					name: "\u200B",
					value: `Would result in **${stdev_pp.toFixed(
						2
					)}pp** standard deviated`,
					inline: false,
				}
			);
		await interaction.reply({ embeds: [embed] });
	},
};
