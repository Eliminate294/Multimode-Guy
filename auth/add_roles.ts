import {
	DiscordAPIError,
	Guild,
	GuildMember,
	Role,
	TextChannel,
} from "discord.js";
import client from "../client.js";
import { get_osekai, OSEKAI_STATS } from "../osekai.js";
import { check_state } from "./embed.js";
import { insert_osekai_stats } from "../../func/psql/insert_osekai_stats.js";

let guild: Guild;
let channel: TextChannel;
let verifiedRole: string | undefined;
const milestones = [
	1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000,
];
let milestoneRoles: string[];

client.once("ready", async () => {
	try {
		guild = await client.guilds.fetch("1371190654922657954");
	} catch {
		try {
			guild = await client.guilds.fetch("1383496358341644418");
		} catch {
			console.error("Failed to fetch both guilds");
		}
	}
	try {
		channel = (await guild.channels.fetch(
			"1397415134401527959"
		)) as TextChannel;
	} catch {
		try {
			channel = (await guild.channels.fetch(
				"1383496359373574146"
			)) as TextChannel;
		} catch {
			console.error("Failed to fetch both channels");
		}
	}
	verifiedRole = guild.roles.cache.find(
		(role) => role.name.toLowerCase() === "verified"
	)?.id;
	milestoneRoles = guild.roles.cache
		.filter((role) => milestones.some((m) => role.name.includes(`${m}`)))
		.map((role) => role.id);
});

export async function check_user(
	userData: Record<string, any>,
	discordId: string
): Promise<void> {
	const inTeam: boolean = await check_state(userData);
	const member = await guild.members.fetch(discordId);
	if (!member) {
		console.error("Member not found:", discordId);
		return;
	}
	if (inTeam) {
		try {
			await member.roles.add("1403448698393854014");
		} catch (err) {
			console.error(err);
		}
	}

	await add_verified(member);
	await add_rank(member, userData);
}

async function add_verified(member: GuildMember): Promise<void> {
	if (!verifiedRole) {
		console.error("Verified role not found");
		return;
	}
	try {
		await member.roles.add(verifiedRole);
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
			return;
		}
	}
	let data: Record<string, any> | undefined;
	Object.entries(OSEKAI_STATS).forEach(([key, value], index) => {
		if (value.userid === osuId.toString()) {
			data = value;
			return;
		}
	});
	if (!data) {
		data = await get_osekai(osuId);
		if (!data) {
			console.log(`Couldnt get Osekai user data for user ${osuId}`);
			return;
		}
	}

	const rank: number | null = Number(data[0]?.rank);
	const username: string | null = data[0]?.name;

	if (!rank || !username) {
		console.log(`Invalid osekai data for ${osuId}`);
		return;
	}

	let milestoneRole = await get_milestone(rank);

	if (milestoneRole && verifiedRole) {
		try {
			const keptRoles = member.roles.cache.filter(
				(role) => !milestoneRoles.includes(role.id)
			);

			keptRoles.set(milestoneRole.id, milestoneRole);
			await member.roles.set(keptRoles);
		} catch (err) {
			if (err instanceof DiscordAPIError && err.code !== 50013) {
				console.error(err);
			}
		}
	} else if (milestoneRole) {
		await member.roles.add(milestoneRole);
	}

	await member.setNickname(`${username} | #${rank}`);
	await insert_osekai_stats(
		osuId,
		-1,
		rank,
		data[0].stdev_pp,
		data[0].total_pp
	);
}
