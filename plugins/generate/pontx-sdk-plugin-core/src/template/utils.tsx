export const getPrefix = (controllerName: string, specName: string) => {
	if (controllerName) {
		return `API.${controllerName}`;
	}
}
