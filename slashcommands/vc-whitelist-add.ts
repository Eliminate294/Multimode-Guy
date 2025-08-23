import {
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
	User,
} from "discord.js";
import { private_vcs } from "./vc-create.js";
import { guildObjects } from "../client.js";
import { ClientPermissions } from "../permissions.js";

export default {
	data: new SlashCommandBuilder()
		.setName("vc-whitelist-add")
		.setDescription(
			"Allows a user to join your private voice channel (if created)"
		)
		.addMentionableOption((option) =>
			option
				.setName("user")
				.setDescription("Choose a user from the server to whitelist")
				.setRequired(true)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) {
			await interaction.reply({
				content: "This command must be used in a server",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		const guildObject = guildObjects.get(interaction.guild.id);
		if (!guildObject) {
			await interaction.reply({
				content:
					"This command must be used in a server the bot exists in",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		if (!guildObject.hasPermission(ClientPermissions.CreatePrivateVoice)) {
			await interaction.reply({
				content:
					"This command is disabled in this server, use '/admin-permissions private-vcs:true' to use it",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		const channel = private_vcs.get(interaction.user.id);
		if (!channel) {
			await interaction.reply({
				content:
					"You have not created a channel, use /vc-create to create one",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const user: User = interaction.options.getMentionable(
			"user",
			true
		) as User;
		if (!user) {
			await interaction.reply({
				content:
					"The user specified does not exist or is not in the server",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await channel.permissionOverwrites.edit(user.id, {
			Connect: true,
			ViewChannel: true,
			ReadMessageHistory: true,
			SendMessages: true,
		});

		await interaction.reply({
			content: `<@${user.id}> has been whitelisted to: <#${channel.id}>`,
			flags: MessageFlags.Ephemeral,
		});
	},
};
