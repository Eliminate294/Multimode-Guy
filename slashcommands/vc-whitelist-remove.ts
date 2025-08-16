import {
	ChatInputCommandInteraction,
	GuildMember,
	MessageFlags,
	SlashCommandBuilder,
	User,
} from "discord.js";
import { private_vcs } from "./vc-create.js";

export default {
	data: new SlashCommandBuilder()
		.setName("vc-whitelist-remove")
		.setDescription(
			"Disallows a user from joining your private voice channel (if created)"
		)
		.addMentionableOption((option) =>
			option
				.setName("user")
				.setDescription("Choose a user from the server to whitelist")
				.setRequired(true)
		),

	async execute(interaction: ChatInputCommandInteraction) {
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

		await channel.permissionOverwrites.delete(user.id);
		channel.members.forEach(async (member: GuildMember) => {
			const canConnect = channel.permissionsFor(member).has("Connect");
			if (!canConnect) {
				try {
					await member.voice.disconnect();
				} catch (err) {
					console.error(
						`Couldn't remove ${member.displayName} | ${member.id} from ${channel.name}: ${err}`
					);
				}
			}
		});

		await interaction.reply({
			content: `<@${user.id}> has been removed from whitelist to: <#${channel.id}>`,
			flags: MessageFlags.Ephemeral,
		});
	},
};
