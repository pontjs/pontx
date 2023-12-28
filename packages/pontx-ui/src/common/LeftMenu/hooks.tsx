import { PontSpec } from "pontx-spec";
import * as React from "react";
import { DirectoryNode } from "./type";

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useLeftMenuState = (pontxSpec: PontSpec) => {
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [dirs, setDirs] = React.useState([]);
  const [currentKey, setCurrentKey] = React.useState("");
  const [isPending, startTransition] = (React as any).useTransition();

  React.useEffect(() => {
    if (pontxSpec) {
      // todo currentKey
      const myDirs = DirectoryNode.constructorPontxDir(pontxSpec, currentKey);
      setDirs(myDirs);
    }
  }, [pontxSpec]);

  const filteredDirs = React.useMemo(() => {
    return DirectoryNode.filterNodeBySearch(dirs, debouncedSearch);
  }, [debouncedSearch, dirs]);

  const selectNode = (nodeName: string, nodeType: string) => {
    setCurrentKey(`${nodeType}/${nodeName}`);

    // todo: 路由跳转
  };

  return {
    search,
    setSearch,
    debouncedSearch,
    dirs: filteredDirs,
    changeDirs: setDirs,
    currentKey,
    setCurrentKey,
    allDirs: dirs,
    isPending,
    startTransition,
    selectNode,
  };
};
