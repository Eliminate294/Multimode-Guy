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
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
}) as ExtendedClient;

client.commands = new Collection();

client.once(Events.ClientReady, async (readyClient) => {
	await deployCommands();
	console.log(`Discord bot logged in as ${readyClient.user.tag}`);
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

export default client;
