import { get_users } from "../../func/api/get_users.js";
import { stats } from "../../func/api/stats.js";
import { get_token } from "../../func/psql/get_token.js";

type Mode = "osu" | "taiko" | "fruits" | "mania";
const modes: Mode[] = ["osu", "taiko", "fruits", "mania"];

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
	const modePP: Record<Mode, number> = {
		osu: 0,
		taiko: 0,
		fruits: 0,
		mania: 0,
	};
	const data = await get_users(osuId!, token);
	if (!data) {
		return;
	}
	for (const mode of Object.keys(
		data.users[0].statistics_rulesets
	) as Mode[]) {
		modePP[mode] = data.users[0].statistics_rulesets[mode].pp;
	}
	return modePP;
}
