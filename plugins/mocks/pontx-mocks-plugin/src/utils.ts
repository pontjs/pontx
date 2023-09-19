export const mapPromiseValues = (promiseValues: { [x: string]: Promise<any> }) => {
  return Promise.all(Object.values(promiseValues)).then((values) => {
    return Object.keys(promiseValues).reduce((result, key, index) => {
      result[key] = values[index];
      return result;
    }, {} as { [x: string]: any });
  });
};
