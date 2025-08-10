import {
	Client,
	GatewayIntentBits,
	Events,
	Collection,
	SlashCommandBuilder,
	CommandInteraction,
} from "discord.js";
import { deployCommands } from "./deploy_commands.js";

interface ExtendedClient extends Client {
	commands: Collection<
		string,
		{
			data: SlashCommandBuilder;
			execute: (interaction: CommandInteraction) => Promise<void>;
		}
	>;
}

const client: ExtendedClient = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
}) as ExtendedClient;

client.commands = new Collection();

client.once(Events.ClientReady, async (readyClient) => {
	await deployCommands();
	console.log(`Discord bot logged in as ${readyClient.user.tag}`);
	//await give_verified_all_roles("1403448698393854014");
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const command = client.commands.get(interaction.commandName);
	if (!command) {
		console.error(`No command matching ${interaction.commandName}`);
		return;
	}
	try {
		await command.execute(interaction);
	} catch (err) {
		console.error(err);
	}
});

export const startBot = async () => {
	await client.login(process.env.DISCORD_BOT_TOKEN);
};

async function give_verified_all_roles(role: string) {
	console.log("running verified roles");
	const guild = await client.guilds.cache.get("1371190654922657954");
	console.log(guild);
	const members = await guild!.members.fetch();
	console.log(members);
	for (const member of members.values()) {
		if (member.roles.cache.has("1397401263485882448")) {
			try {
				await member.roles.add(role);
				console.log(`Added role to ${member.user.tag}`);
			} catch (err) {
				console.error(`Couldn't add role to ${member.user.tag}:`, err);
			}
		} else {
			console.log(`${member.user.tag} does not have verified role`);
		}
	}
}

export default client;
