export const getRefSchema = (schemas) => ($ref: string) => {
  const schemaName = $ref.split("/").pop();
  const schema = schemas?.[schemaName];
  if (schema) {
    return schema;
  }
  return null;
};
