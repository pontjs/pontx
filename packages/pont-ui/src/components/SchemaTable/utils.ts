import * as PontSpec from "pont-spec";

export function getCopyName(names: string[], name: string) {
  let newName = name + "-copy";
  let index = 1;

  while (names.includes(newName)) {
    newName = `${name}-copy-${index++}`;
  }

  return newName;
}

const EMPTY_FIELD_NAME_PREFIX = "pontSchemaField/";
let fieldIndex = 1;

export const isEmptyFieldName = (fieldName: string) => (fieldName || "").startsWith(EMPTY_FIELD_NAME_PREFIX);

export const getEmptyFieldName = () => EMPTY_FIELD_NAME_PREFIX + fieldIndex++;

export function calculatePadding(indentLevel: number, isObject: boolean, rowType) {
  const padLeft = 20 * indentLevel + 11;
  // Objects have arrows before them, hence they are already padded
  if (isObject) {
    return padLeft;
  }
  return padLeft;
}

export function copyParameter(parameters: PontSpec.Parameter[], paramIndex: number) {
  const byCopyParam = parameters[paramIndex];
  const copyName = getCopyName(
    parameters.map((param) => param.name),
    byCopyParam.name,
  );

  return [
    ...parameters.slice(0, paramIndex + 1),
    { ...byCopyParam, name: copyName },
    ...parameters.slice(paramIndex + 1),
  ];
}
