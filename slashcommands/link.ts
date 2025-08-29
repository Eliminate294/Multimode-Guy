import {
	ApplicationIntegrationType,
	ChatInputCommandInteraction,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { discord_token } from "../auth/embed.js";

export default {
	data: new SlashCommandBuilder()
		.setName("link")
		.setDescription("Link your osu account with the bot")
		.setIntegrationTypes([
			ApplicationIntegrationType.UserInstall,
			ApplicationIntegrationType.GuildInstall,
		])
		.setContexts([
			InteractionContextType.Guild,
			InteractionContextType.BotDM,
			InteractionContextType.PrivateChannel,
		]),

	async execute(interaction: ChatInputCommandInteraction) {
		const token = discord_token(interaction.user.id);
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
