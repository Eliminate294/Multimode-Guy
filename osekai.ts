export let stats: Record<number, Record<string, string>>;

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

		const data = await response.json();
		if (data) {
			stats = data;
		}
	} catch (err) {
		console.error("Error fetching Osekai data", err);
	}
}

export async function get_stdev_rank(pp: number): Promise<number> {
	if (!stats) {
		throw new Error("Stats not defined");
	}

	let right = Object.keys(stats).length - 1;
	let left = 0;

	while (left < right) {
		let mid: number = Math.floor((left + right) / 2);
		const spp = Number(stats[mid].spp);

		if (spp >= pp) {
			left = mid + 1;
		} else {
			right = mid;
		}
	}

	return left + 1;
}

await update_osekai_site();
