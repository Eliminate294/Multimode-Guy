import { stats } from "../../func/api/stats.js";
import { get_token } from "../../func/psql/get_token.js";

type Mode = "osu" | "taiko" | "fruits" | "mania";
const modes: Mode[] = ["osu", "taiko", "fruits", "mania"];

export async function get_user_pp(
	invokerId: string,
	username: string
): Promise<Record<Mode, number> | void> {
	const token = await get_token(invokerId, true);
	if (!token) {
		return;
	}
	const modePP: Record<Mode, number> = {
		osu: 0,
		taiko: 0,
		fruits: 0,
		mania: 0,
	};
	for (const mode of modes) {
		const data = await stats(username, token, mode);
		if (data) {
			modePP[mode] = data.statistics.pp;
		}
	}
	console.log(modePP);
	return modePP;
}
