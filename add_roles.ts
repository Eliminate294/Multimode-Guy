import { Guild, GuildMember, Role, TextChannel } from "discord.js";
import client from "./client.js";
import { get_osekai } from "./osekai.js";
import { check_state } from "./embed.js";
import { insert_new_discord } from "../func/psql/insert_new_discord.js";

let guild: Guild;
let channel: TextChannel;
let verifiedRole: string | undefined;
const milestones = [
	1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000,
];

client.once("ready", async () => {
	guild = await client.guilds.fetch("1371190654922657954");
	channel = (await guild.channels.fetch(
		"1397415134401527959"
	)) as TextChannel;
	verifiedRole = guild.roles.cache.find(
		(role) => role.name.toLowerCase() === "verified"
	)?.id;
});

export async function check_user(
	userData: Record<string, any>,
	discordId: string
): Promise<void> {
	const success: boolean = await check_state(discordId, userData);
	if (!success) {
		return;
	}

	const member = await add_verified(discordId);
	if (member) {
		await add_rank(member, userData);
		await insert_new_discord(Number(userData.id), Number(member.id));
	}
}

async function add_verified(discordId: string): Promise<GuildMember | void> {
	if (!verifiedRole) {
		console.error("Verified role not found");
		return;
	}
	try {
		const member = await guild.members.fetch(discordId);
		await member.roles.add(verifiedRole);
		return member;
	} catch (err) {
		console.error(err);
	}
}

async function get_milestone(rank: number): Promise<Role | void> {
	for (const milestone of milestones) {
		if (rank <= milestone) {
			const roleName = `Top ${milestone}`;
			const milestoneRole = guild.roles.cache.find(
				(r) => r.name === roleName
			);
			if (milestoneRole) {
				return milestoneRole;
			}
			break;
		}
	}
}

async function add_rank(
	member: GuildMember,
	userData: Record<string, any>
): Promise<void> {
	try {
		const osuId = userData.id;
		const data = await get_osekai(osuId);
		if (!data) {
			console.log(`Couldnt get Osekai user data for user ${osuId}`);
			return;
		}

		const rank: number | null = data[0]?.rank;

		if (!rank) {
			await member.setNickname(userData.username);
			return;
		}

		let milestoneRole = await get_milestone(rank);
		if (milestoneRole) {
			await member.roles.add(milestoneRole);
		}

		await member.setNickname(`${data[0].name} | #${rank}`);
	} catch (err) {
		console.error(err);
	}
}

export async function update_rank(discordId: string, osuId: number) {
	let member = guild.members.cache.get(discordId);
	if (!member) {
		try {
			member = await guild.members.fetch(discordId);
		} catch (error) {
			console.log(`Discord user ${discordId} has left the guild`);
			console.error(error);
			return;
		}
	}

	const data = await get_osekai(osuId);
	if (!data) {
		console.log(`Couldnt get Osekai user data for user ${osuId}`);
		return;
	}

	const rank: number | null = data[0]?.rank;
	const username: string | null = data[0]?.name;

	if (!rank || !username) {
		return;
	}

	let milestoneRole = await get_milestone(rank);
	if (milestoneRole && verifiedRole) {
		await member.roles.set([verifiedRole, milestoneRole.id]);
	} else if (milestoneRole) {
		await member.roles.add(milestoneRole);
	}

	await member.setNickname(`${username} | #${rank}`);
}
