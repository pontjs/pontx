export function getDuplicateById<T>(arr: T[], idKey = "name"): null | T {
	if (!arr || !arr.length) {
		return null;
	}

	let result;

	arr.forEach((item, itemIndex) => {
		if (arr.slice(0, itemIndex).find(o => o[idKey] === item[idKey])) {
			result = item;
			return;
		}
	});

	return result;
}
