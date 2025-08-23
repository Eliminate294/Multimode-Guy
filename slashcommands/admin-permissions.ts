import {
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	MessageFlags,
	PermissionsBitField,
	SlashCommandBuilder,
} from "discord.js";
import { guildObjects } from "../client.js";
import { ClientPermissions } from "../permissions.js";
import { update_server } from "../../func/psql/update_server.js";

const options: Record<
	string,
	{ description: string; perm: ClientPermissions }
> = {
	"private-vcs": {
		description: "Allows users to create their own VCs using /vc-create",
		perm: ClientPermissions.CreatePrivateVoice,
	},
};

const data = new SlashCommandBuilder()
	.setName("admin-permissions")
	.setDescription("Enable bot configurations")
	.setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator);

for (const [name, meta] of Object.entries(options)) {
	data.addBooleanOption((option) =>
		option.setName(name).setDescription(meta.description).setRequired(false)
	);
}

export default {
	data,
	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) {
			await interaction.reply({
				content: "This command must be used in a server",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		let guildObject = guildObjects.get(interaction.guild.id);
		if (!guildObject) {
			await interaction.reply({
				content:
					"This command must be used in a server the bot exists in",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const selectedOptions = interaction.options.data.filter(
			(option) => option.value !== undefined
		);
		if (selectedOptions.length === 0) {
			await interaction.reply({
				content: "This command requires at least one argument",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		let perms = guildObject.permissions;
		for (const option of selectedOptions) {
			if (option.type !== ApplicationCommandOptionType.Boolean) {
				continue;
			}
			perms |= options[option.name].perm;
		}

		guildObject.permissions = perms;
		update_server(interaction.guild.id, perms);
		await interaction.reply({
			content: "Successfully updated settings",
			flags: MessageFlags.Ephemeral,
		});
	},
};
