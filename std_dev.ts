export function calculate_stdev(pp: number[]): number {
	if (pp.length !== 4) {
		throw new Error(
			`Received ${pp.length} values instead of 4 in std dev calculation`
		);
	}

	var total: number = pp.reduce((acc, curr) => acc + curr, 0);

	const mean = total / 4;
	const variance = pp.reduce((sum, val) => sum + (val - mean) ** 2, 0) / 3;

	const stdev = Math.sqrt(variance);

	return total - 2 * stdev;
}

export function calculate_missing(pp: number[], goal: number): number | null {
	if (pp.length !== 3) {
		throw new Error("Calculate pp does not have 3 values");
	}
	const k: number = pp.reduce((acc, curr) => acc + curr, 0);

	const missingPP =
		(4 * (pp[0] ** 2 + pp[1] ** 2 + pp[2] ** 2) -
			k ** 2 -
			3 * (goal - k) ** 2) /
		(8 * k - 6 * goal);
	const gigasum = k + missingPP;
	return goal <= gigasum ? missingPP : null;
}
