import {
	Client,
	GatewayIntentBits,
	Events,
	Collection,
	SlashCommandBuilder,
	CommandInteraction,
	Guild,
	MessageFlagsBitField,
} from "discord.js";
import { deployCommands } from "./deploy_commands.js";
import { privateVCListener } from "./private_channels.js";
import { GuildObject } from "./objects/guild.js";
import { get_discord_servers } from "../func/psql/get_discord_servers.js";
import { update_server } from "../func/psql/update_server.js";
import { remove_server } from "../func/psql/remove_server.js";
import { UserObject } from "./objects/user.js";
import { get_osu_discord } from "../func/psql/get_osu_discord.js";
import { get_osekai_data } from "../func/psql/get_osekai_data.js";
import { UserCache } from "./objects/cache/user-cache.js";
import { insert_osekai_stats } from "../func/psql/insert_osekai_stats.js";

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
export const userCache = new UserCache(1000 * 60 * 20, (user) =>
	insert_osekai_stats(
		user.osuId,
		user.tpp_rank,
		user.spp_rank,
		user.spp,
		user.tpp
	)
);
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
	guildObjects.forEach((guild) => {
		console.log(
			`${client.guilds.cache.get(guild.guildId)?.name} => ${
				guild.guildId
			}`
		);
	});
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
		if (!userCache.has(interaction.user.id)) {
			if (command.data.name === "link") {
				await command.execute(interaction);
				return;
			}
			const osuData = await get_osu_discord(interaction.user.id);
			const osekaiData = await get_osekai_data(
				undefined,
				interaction.user.id
			);
			if (!osuData || !osekaiData) {
				interaction.reply({
					content:
						"Failed to fetch user data, is your account linked? (try /link)",
					flags: MessageFlagsBitField.Flags.Ephemeral,
				});
				return;
			}
			userCache.set(
				new UserObject(
					osuData.user_id,
					interaction.user.id,
					osuData.username,
					osekaiData.spp_rank,
					osekaiData.tpp_rank,
					osekaiData.spp,
					osekaiData.tpp,
					osuData.country
				)
			);
		}
		await command.execute(interaction);
	} catch (err) {
		console.error(err);
	}
});

export const startBot = async () => {
	if (process.env.DEVMODE === "true") {
		await client.login(process.env.DISCORD_DEV_TOKEN);
	} else {
		await client.login(process.env.DISCORD_TOKEN);
	}
};

export default client;
