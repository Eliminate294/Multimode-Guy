import {
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { generate_token } from "../auth/embed.js";

export default {
	data: new SlashCommandBuilder()
		.setName("link")
		.setDescription("Link your osu account with the bot"),

	async execute(interaction: ChatInputCommandInteraction) {
		const token = generate_token();
		const oauth = `https://osu.ppy.sh/oauth/authorize?client_id=${
			process.env.OSU_CLIENT_ID
		}&redirect_uri=${encodeURIComponent(
			"https://api.elimin.net/auth/discord"
		)}&response_type=code&scope=public+identify&state=${token}`;
		await interaction.reply({
			content: oauth,
			flags: MessageFlags.Ephemeral,
		});
	},
};
