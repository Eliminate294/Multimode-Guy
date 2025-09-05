function calc_weighted(pp_values: number[]) {
	return pp_values.reduce(
		(total, pp, index) => total + pp * Math.pow(0.95, index),
		0
	);
}

export function pp_change(
	pp_values: number[],
	total_pp: number,
	new_pp: number
): { total: number; change: number; position: number } {
	const current_weighted = calc_weighted(pp_values);
	const bonusPP = total_pp - current_weighted;

	const sorted = [...pp_values, new_pp].sort((a, b) => b - a);

	const new_weighted = calc_weighted(sorted);

	const position = sorted.indexOf(new_pp);

	const new_total = new_weighted + bonusPP;

	let loss = 0;
	for (let i = position; i < sorted.length; i++) {
		loss += 0.05 * sorted[i] * Math.pow(0.95, i);
	}

	return {
		total: new_total,
		change: new_total - total_pp,
		position: position + 1,
	};
}
