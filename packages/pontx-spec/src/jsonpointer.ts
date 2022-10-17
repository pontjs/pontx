import immutableSet from "lodash/fp/set";
import { removeMapKeys } from "./utils";

interface JsonPointerNode {
  name?: string | number;
  exp?: {
    left: string;
    op: "=";
    right: string;
  };
}

function judgeExp(left: string, op: "=", right: string) {
  switch (op) {
    case "=": {
      return left === right;
    }
  }
  return false;
}

function parseJsonpointer(jsonpointer: string): JsonPointerNode[] {
  if (!jsonpointer) {
    return [];
  }
  const strs = (jsonpointer || "").split(/[\.\[\]]+/);

  return strs
    .map((str, strIndex) => {
      if (strIndex === 0 && str === "") {
        return false as any;
      } else if (strIndex === strs.length - 1 && str === "") {
        return false as any;
      }

      if (str.includes("=")) {
        const [left, right] = str.split("=");
        return {
          exp: { left, right, op: "=" },
        };
      }
      return { name: str };
    })
    .filter((id) => id);
}

function _get(json: any, nodes: JsonPointerNode[]) {
  if (!nodes.length) {
    return json;
  }

  const [current, ...restNodes] = nodes;
  if (current?.exp) {
    if (Array.isArray(json)) {
      const { left, op, right } = current.exp;
      const foundItem = json.find((item) => judgeExp(item[left], op, right));
      return _get(foundItem, restNodes);
    }
    return undefined;
  }

  return _get(json?.[current?.name], restNodes);
}

function _update(json: any, nodes: JsonPointerNode[], updator: (val: any) => any) {
  const value = _get(json, nodes);
  const newValue = updator(value);
  return _set(json, nodes, newValue);
}

function _set(json: any, nodes: JsonPointerNode[], newValue: any) {
  if (!nodes.length) {
    return newValue;
  }
  const [current, ...restNodes] = nodes;

  let pathValue = undefined,
    path;
  if (current.exp) {
    const { left, op, right } = current.exp;
    if (Array.isArray(json)) {
      path = json.find((item) => judgeExp(item[left], op, right));
      pathValue = path === -1 ? undefined : json[path];
      path = path === -1 ? 0 : path;
    }
  } else {
    pathValue = json?.[current?.name];
    path = current?.name;
  }
  if (restNodes.length) {
    const newPathValue = _set(pathValue, restNodes, newValue);
    return immutableSet(path, newPathValue, json);
  } else {
    return immutableSet(path, newValue, json);
  }
}
function _remove(json: any, nodes: JsonPointerNode[]) {
  if (!nodes.length) {
    return json;
  }
  const nodesCnt = nodes.length;
  const lastValue = _get(json, nodes.slice(0, nodesCnt - 1));
  const lastNode = nodes[nodesCnt - 1];
  let lastNodeKey = lastNode.name;
  if (lastNode.exp) {
    const { left, op, right } = lastNode.exp;
    if (Array.isArray(lastValue)) {
      lastNodeKey = lastValue.findIndex((item) => judgeExp(item[left], op, right));
      if (lastNodeKey === -1) {
        return json;
      }
    } else {
      return json;
    }
  }

  let newLastValue;
  if (Array.isArray(lastValue)) {
    newLastValue = lastValue.filter((item, index) => index !== lastNodeKey);
  } else if (typeof lastValue === "object") {
    const copyValue = { ...lastValue };
    delete copyValue[lastNodeKey];
    newLastValue = copyValue;
  } else {
    return json;
  }

  return _set(json, nodes.slice(0, nodesCnt - 1), newLastValue);
}

function get(json: any, jsonpointer: string) {
  const nodes = parseJsonpointer(jsonpointer);
  return _get(json, nodes);
}
function set(json: any, jsonpointer: string, newValue: any) {
  const nodes = parseJsonpointer(jsonpointer);
  return _set(json, nodes, newValue);
}
function _removeMapKeyBy(json: any, nodes: JsonPointerNode[], checkRemoveKey: (key: string | number) => boolean) {
  const value = _get(json, nodes);
  let newValue;

  if (Array.isArray(value)) {
    newValue = value.filter((item, index) => !checkRemoveKey(index));
  } else if (typeof newValue === "object") {
    newValue = removeMapKeys(newValue, checkRemoveKey);
  }
  return _set(json, nodes, newValue);
}
function remove(json: any, jsonpointer: string) {
  const nodes = parseJsonpointer(jsonpointer);
  return _remove(json, nodes);
}
function update(json: any, jsonpointer: string, updator: (val: any) => any) {
  const nodes = parseJsonpointer(jsonpointer);
  return _update(json, nodes, updator);
}
function removeMapKeyBy(json: any, jsonpointer: string, checkRemoveKey: (key: string | number) => boolean) {
  const nodes = parseJsonpointer(jsonpointer);
  return _removeMapKeyBy(json, nodes, checkRemoveKey);
}

export const PontJsonPointer = {
  get,
  set,
  update,
  removeMapKeyBy,
  remove,
};
