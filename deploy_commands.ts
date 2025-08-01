import client from "./client.js";
import {
	REST,
	RESTPostAPIApplicationCommandsJSONBody,
	Routes,
} from "discord.js";
import path from "path";
import { readdirSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";

export async function deployCommands(): Promise<void> {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);

	const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];

	const commandsPath = path.join(__dirname, "slashcommands");
	const commandFiles = readdirSync(commandsPath).filter(
		(file) => file.endsWith(".ts") || file.endsWith(".js")
	);

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = (await import(pathToFileURL(filePath).href)).default;
		if ("data" in command) {
			commands.push(command.data.toJSON());
			client.commands.set(command.data.name, command);
		} else {
			console.warn(`Command at ${filePath} is missing "data" property`);
		}
	}

	const rest = new REST({ version: "10" }).setToken(
		process.env.DISCORD_TOKEN!
	);

	try {
		await rest.put(Routes.applicationCommands("1383493582060654722"), {
			body: commands,
		});
		console.log("Successfully imported slash commands:", commands);
	} catch (err) {
		console.error(err);
	}
}
