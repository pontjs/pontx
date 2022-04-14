/**
 * @author jasonHzq
 * @description parse oas spec from web page https://swagger.io/specification/v2/
 */

const getClazzName = (name: string) => {
	return name
		.split("-")
		.map(field => {
			return field.slice(0, 1).toUpperCase() + field.slice(1);
		})
		.join("");
};

const classeItemes = Array.from(
	document.querySelectorAll("h3[id=schema] ~ h4")
).map(dom => {
	return {
		name:
			(dom.childNodes[1] as any)?.wholeText?.split(" ")?.join("") ||
			getClazzName(dom.id),
		id: dom.id
	};
});

const classes = classeItemes
	.map((item, itemIndex) => {
		const { name, id } = item;
		const trs = classeItemes[itemIndex + 1]
			? document.querySelectorAll(
					`h4[id=${id}] ~ table tbody tr:not(h4[id=${
						classeItemes[itemIndex + 1].id
					}] ~ table tbody tr)`
			  )
			: document.querySelectorAll(`h4[id=${id}] ~ table tbody tr`);
		// const tbody = document.querySelector(`h4[id=${id}] ~ table tbody`);
		const description = document.querySelector(`h4[id=${id}] ~ p`)?.innerHTML;
		if (!trs.length) {
			console.error(id + " not found body");
			return null;
		}
		let required = false;
		const properties = Array.from(trs)
			.map(tr => {
				const [nameTd, typeSpan, descSpan] = Array.from(tr.children);

				let name = (nameTd.childNodes[1] as any)?.wholeText as string;
				if (name?.startsWith("^")) {
					return null;
				} else if (name?.match(/[\/\{\}]/)) {
					name = `[key: string]`;
					required = true;
				}
				let type = (typeSpan.children[0] as any)?.innerHTML
					?.split(" ")
					.join("");

				if (typeSpan?.childNodes?.length > 1) {
					if (
						(typeSpan.childNodes[0] as any)?.wholeText === "[" &&
						(typeSpan.childNodes[typeSpan?.childNodes?.length - 1] as any)
							?.wholeText === "]"
					) {
						type =
							"Array<" +
							Array.from(typeSpan.childNodes)
								.slice(1, typeSpan.childNodes.length - 1)
								.map((el: any) => {
									return el.wholeText || el?.innerHTML?.split(" ").join("");
								}).map(str => {
									return str === ' | '  ? ' & ' : str;
								})
								.join("") +
							">";
					}
				}

				if (type === "integer") {
					type = "number";
				}

				const descContent = descSpan.innerHTML;
				if (descContent?.startsWith("<strong>Required.</strong>")) {
					required = true;
					return {
						name,
						type,
						required,
						desc: descContent.slice("<strong>Required.</strong>".length)?.trim()
					};
				} else {
					return {
						name,
						type,
						required,
						desc: descContent?.trim()
					};
				}
			})
			.filter(id => id);
		return {
			name,
			description: description?.trim(),
			properties
		};
	})
	.filter(id => id);

console.log(JSON.stringify(classes, null, 2));
