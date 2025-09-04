export let OSEKAI_STATS: Map<string, OsekaiUser> = new Map();
export let OSEKAI_STATS_ARRAY: OsekaiUser[] = [];

type OsekaiUser = {
	rank: string;
	countrycode: string;
	country: string;
	username: string;
	spp: string;
	tpp: string;
	osupp: string;
	taikopp: string;
	catchpp: string;
	maniapp: string;
	userid: string;
};

export async function get_osekai(osuId: number): Promise<Record<string, any>> {
	const url = `${process.env.OSEKAI_URL}=${encodeURIComponent(osuId)}`;

	try {
		const response = await fetch(url, {
			headers: {
				"User-Agent": "Eliminate294/1.0.0 (https://api.elimin.net)",
			},
		});
		if (!response.ok) {
			throw new Error(`Osekai HTTP error, ${response.status}`);
		}
		const data = await response.json();
		return data;
	} catch (err) {
		console.error("Error fetching Osekai data", err);
		return {};
	}
}

export async function update_osekai_site(): Promise<void> {
	const url = `https://osekai.net/rankings/api/api.php`;
	const params = new URLSearchParams();
	params.append("App", "Standard Deviation");

	try {
		const response = await fetch(url, {
			method: "POST",
			body: params,
			headers: {
				"User-Agent": "Eliminate294/1.0.0 (https://api.elimin.net)",
				"Content-Type": "application/x-www-form-urlencoded",
			},
		});
		if (!response.ok) {
			throw new Error(`Osekai HTTP error, ${response.status}`);
		}

		const data = (await response.json()) as Record<string, OsekaiUser>;
		if (data) {
			OSEKAI_STATS_ARRAY = Object.values(data);
			OSEKAI_STATS = new Map(
				OSEKAI_STATS_ARRAY.map((user) => [user.userid, user])
			);
		}
	} catch (err) {
		console.error("Error fetching Osekai data", err);
	}
}

export async function get_stdev_rank(
	pp: number
): Promise<[number, number, string]> {
	if (!OSEKAI_STATS_ARRAY) {
		throw new Error("OSEKAI_STATS_ARRAY not defined");
	}

	let right = Object.keys(OSEKAI_STATS_ARRAY).length - 1;
	let left = 0;

	if (pp < Number(OSEKAI_STATS_ARRAY[right].spp)) {
		return [-1, 0, ""];
	}

	while (left < right) {
		let mid: number = Math.floor((left + right) / 2);
		const spp = Number(OSEKAI_STATS_ARRAY[mid].spp);

		if (spp >= pp) {
			left = mid + 1;
		} else {
			right = mid;
		}
	}

	return [
		left + 1,
		Number(OSEKAI_STATS_ARRAY[left].userid),
		OSEKAI_STATS_ARRAY[left].username,
	];
}

export async function get_stdev_pp(
	rank: number
): Promise<Record<string, string>> {
	if (!OSEKAI_STATS_ARRAY) {
		throw new Error("OSEKAI_STATS_ARRAY not defined");
	}

	return OSEKAI_STATS_ARRAY[rank - 1];
}

await update_osekai_site();
