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
