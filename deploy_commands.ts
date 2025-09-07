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
		try {
			if ("data" in command) {
				commands.push(command.data.toJSON());
				client.commands.set(command.data.name, command);
			} else {
				console.warn(
					`Command at ${filePath} is missing "data" property`
				);
			}
		} catch {}
	}

	const rest = new REST({ version: "10" }).setToken(
		process.env.DEVMODE === "true"
			? process.env.DISCORD_DEV_TOKEN!
			: process.env.DISCORD_TOKEN!
	);

	try {
		if (process.env.DEVMODE !== "true") {
			await rest.put(Routes.applicationCommands("1383493582060654722"), {
				body: commands,
			});
		} else {
			console.log("Registering commands in dev server");
			await rest.put(
				Routes.applicationGuildCommands(
					"1412952345364664360",
					"1383496358341644418"
				),
				{
					body: commands,
				}
			);
		}
		for (const command of commands) {
			console.log(`Successfully imported ${command.name}`);
		}
	} catch (err) {
		console.error(err);
	}
}
