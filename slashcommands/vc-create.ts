import {
	ChannelType,
	ChatInputCommandInteraction,
	MessageFlags,
	OverwriteData,
	PermissionFlagsBits,
	SlashCommandBuilder,
	VoiceChannel,
} from "discord.js";
import { guildObjects } from "../client.js";
import { ClientPermissions } from "../permissions.js";

export const private_vcs: Map<string, VoiceChannel> = new Map();

export default {
	data: new SlashCommandBuilder()
		.setName("vc-create")
		.setDescription("Creates a private voice channel")
		.addBooleanOption((option) =>
			option
				.setName("public")
				.setDescription(
					"Whether other users can join without needing to whitelist (default false)"
				)
				.setRequired(false)
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
		const everyonePermissions: OverwriteData = {
			id: interaction.guild.roles.everyone,
			deny: [
				PermissionFlagsBits.ReadMessageHistory,
				PermissionFlagsBits.Connect,
			],
			allow: [],
		};
		const isPublic =
			interaction.options.getBoolean("public", false) ?? false;
		if (isPublic) {
			everyonePermissions.deny = [];
		}
		const user = interaction.user;
		if (private_vcs.get(user.id)) {
			await interaction.reply({
				content: `You already have a private VC created: <#${
					private_vcs.get(user.id)!.id
				}>`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		const channel = await interaction.guild.channels.create({
			name: `${user.globalName}'s VC`,
			type: ChannelType.GuildVoice,
			//parent: "1371190656298516522", // "Voice channels" category
			permissionOverwrites: [
				everyonePermissions,
				{
					id: user.id,
					allow: [
						PermissionFlagsBits.Connect,
						PermissionFlagsBits.ReadMessageHistory,
						PermissionFlagsBits.SendMessages,
					],
				},
			],
		});
		private_vcs.set(user.id, channel);
		await interaction.reply({
			content: `Channel created: <#${channel.id}>`,
			flags: MessageFlags.Ephemeral,
		});
	},
};
