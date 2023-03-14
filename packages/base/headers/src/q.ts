export function parseQValue(value?: string | null): number {
	if (!value) {
		return 1;
	}

	const q = Number(value);
	return isNaN(q) ? 1 : q;
}
