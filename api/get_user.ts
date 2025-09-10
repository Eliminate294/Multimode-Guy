import { beatmaps } from "../../func/api/beatmaps.js";
import { get_users } from "../../func/api/get_users.js";
import { stats } from "../../func/api/stats.js";
import { get_token } from "../../func/psql/get_token.js";
import { userCache } from "../client.js";
import { MODES } from "../constants.js";
import { calculate_stdev } from "../std_dev.js";

type Mode = "osu" | "taiko" | "fruits" | "mania";
const modes: Mode[] = ["osu", "taiko", "fruits", "mania"];

async function get_users_data(
	token: string,
	osuId: number
): Promise<Record<string, any> | void> {
	const data = await get_users(osuId, token);
	console.log(data);
	if (data) {
		return data;
	}
}

export async function get_user_pp(
	invokerId: string,
	osuId: number,
	token?: string | void
): Promise<Record<Mode, number> | void> {
	if (!token) {
		token = await get_token(invokerId, true);
		if (!token) {
			return;
		}
	}
	const data = await get_users_data(token, osuId);
	if (!data) {
		return;
	}
	const modePP: Record<Mode, number> = {
		osu: 0,
		taiko: 0,
		fruits: 0,
		mania: 0,
	};
	for (const mode of Object.keys(
		data.users[0].statistics_rulesets
	) as Mode[]) {
		modePP[mode] = data.users[0].statistics_rulesets[mode].pp;
	}
	const userObj = userCache.get(invokerId);
	if (userObj && userObj.osuId === osuId) {
		userObj.tpp = Object.values(modePP).reduce((sum, val) => sum + val, 0);
		userObj.spp = calculate_stdev(Object.values(modePP));
	}
	return modePP;
}

export async function get_user(
	invokerId: string,
	osuId: number,
	mode?: Mode,
	token?: string | void
): Promise<void | Record<string, any>> {
	if (!token) {
		token = await get_token(invokerId, true);
		if (!token) {
			return;
		}
	}

	const data = await stats(osuId, token, mode);
	if (!data) {
		return;
	}

	return data;
}

export async function get_user_scores(
	invokerId: string,
	osuId: number,
	mode?: Mode,
	token?: string | void
): Promise<Record<string, any>[] | void> {
	if (!token) {
		token = await get_token(invokerId, true);
		if (!token) {
			return;
		}
	}

	const data = await beatmaps(osuId, token, mode, "best");
	if (!data) {
		return;
	}

	return data;
}
