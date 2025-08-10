import {
	EmbedBuilder,
	ButtonBuilder,
	ActionRowBuilder,
	ButtonStyle,
	Guild,
	TextChannel,
	MessageFlags,
	Interaction,
	ButtonInteraction,
} from "discord.js";
import client from "./client.js";
import { callback } from "../constants.js";

let guild: Guild;
let channel: TextChannel;

const embed = new EmbedBuilder()
	.setTitle("Verify")
	.setDescription(
		"Click the button below to get started with the verification process!"
	);

const button = new ButtonBuilder()
	.setCustomId("verify_button")
	.setLabel("Verify")
	.setStyle(ButtonStyle.Primary);

const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

type states<T> = Map<string, { value: T; timeout: NodeJS.Timeout }>;
const discordAuth: states<string> = new Map();

function generate_token(length = 16): string {
	const chars =
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	return Array.from(
		{ length },
		() => chars[Math.floor(Math.random() * chars.length)]
	).join("");
}

function discord_token(discordId: string, ttlMs: number = 300_000): string {
	const token = generate_token();
	const timeout = setTimeout(() => {
		discordAuth.delete(token);
	}, ttlMs);

	discordAuth.set(token, { value: discordId, timeout });
	return token;
}

export function get_token(token: string): string | null {
	const entry = discordAuth.get(token);
	return entry?.value ?? null;
}

client.once("ready", async () => {
	guild = await client.guilds.fetch("1371190654922657954");
	channel = (await guild.channels.fetch(
		"1397415134401527959"
	)) as TextChannel;
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isButton()) return;

	if (interaction.customId === "verify_button") {
		const token = discord_token(interaction.user.id);
		const oauth = `https://osu.ppy.sh/oauth/authorize?client_id=${
			process.env.OSU_CLIENT_ID
		}&redirect_uri=${encodeURIComponent(
			callback + "/auth/discord"
		)}&response_type=code&scope=public+identify&state=${token}`;
		await interaction.reply({
			content: oauth,
			flags: MessageFlags.Ephemeral,
		});
	}
});

export async function check_state(
	userData: Record<string, any>
): Promise<boolean> {
	const team = userData?.team;
	console.log(team);
	if (!team || team.id !== 5969) {
		return false;
	}
	return true;
}
