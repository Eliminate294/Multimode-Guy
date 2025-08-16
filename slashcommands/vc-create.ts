import {
	ChannelType,
	ChatInputCommandInteraction,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
	VoiceChannel,
} from "discord.js";

export const private_vcs: Map<string, VoiceChannel> = new Map();

export default {
	data: new SlashCommandBuilder()
		.setName("vc-create")
		.setDescription("Creates a private voice channel"),

	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) {
			await interaction.reply({
				content: "This command must be used in a server",
				flags: MessageFlags.Ephemeral,
			});
			return;
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
		const channel = await interaction.guild?.channels.create({
			name: `${user.globalName}'s VC`,
			type: ChannelType.GuildVoice,
			parent: "1371190656298516522", // "Voice channels" category
			permissionOverwrites: [
				{
					id: interaction.guild.roles.everyone,
					deny: [
						PermissionFlagsBits.ViewChannel,
						PermissionFlagsBits.ReadMessageHistory,
						PermissionFlagsBits.Connect,
					],
				},
				{
					id: "1397401263485882448", // Verified role
					allow: [PermissionFlagsBits.ViewChannel],
				},
				{
					id: user.id,
					allow: [
						PermissionFlagsBits.Connect,
						PermissionFlagsBits.ReadMessageHistory,
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
