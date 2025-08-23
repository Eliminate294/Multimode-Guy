import {
	Client,
	GatewayIntentBits,
	Events,
	Collection,
	SlashCommandBuilder,
	CommandInteraction,
	Guild,
} from "discord.js";
import { deployCommands } from "./deploy_commands.js";
import { privateVCListener } from "./private_channels.js";
import { GuildObject } from "./guild.js";
import { get_discord_servers } from "../func/psql/get_discord_servers.js";
import { update_server } from "../func/psql/update_server.js";
import { remove_server } from "../func/psql/remove_server.js";

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
		GatewayIntentBits.GuildVoiceStates,
	],
}) as ExtendedClient;

client.commands = new Collection();

export const guildObjects = new Map<string, GuildObject>();
const defaultPermissions = 0;

client.once(Events.ClientReady, async (readyClient) => {
	const guilds = await get_discord_servers();
	if (!guilds) {
		throw new Error("No guilds found in database (discord.servers)");
	}
	const dbGuildMap = new Map<string, number>();
	guilds.forEach((row) => {
		dbGuildMap.set(row.guild_id, row.permissions);
	});

	const cacheSet = new Set(client.guilds.cache.map((guild) => guild.id));

	console.log(dbGuildMap.keys());
	const removedServers = Array.from(dbGuildMap.keys()).filter(
		(id) => !cacheSet.has(id)
	);
	removedServers.forEach((guildId) => {
		remove_server(guildId);
		console.log("removed server:", guildId);
	});

	cacheSet.forEach((guildId) => {
		let permissions = dbGuildMap.get(guildId);
		if (!permissions) {
			update_server(guildId, defaultPermissions);
			permissions = defaultPermissions;
		}
		guildObjects.set(guildId, new GuildObject(guildId, permissions));
	});
	await deployCommands();
	await privateVCListener(client);

	console.log(`Discord bot logged in as ${readyClient.user.tag}`);
	console.log(guildObjects);
});

client.on("guildCreate", async (guild: Guild) => {
	console.log(`Joined server: ${guild.name} | ${guild.id}`);
	await update_server(guild.id, defaultPermissions);
	guildObjects.set(guild.id, new GuildObject(guild.id, defaultPermissions));
});

client.on("guildDelete", async (guild: Guild) => {
	console.log(`Left server: ${guild.name} | ${guild.id}`);
	await remove_server(guild.id);
	guildObjects.delete(guild.id);
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
