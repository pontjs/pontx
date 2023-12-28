/**
 * @author
 * @description
 */
import { PontSpec } from "pontx-spec";
import * as React from "react";
import { useLeftMenuState } from "./hooks";
import { APIDirectoryComponent } from "./APIDirectory.component";

export class APIDirectoryProps {
  pontxSpec: PontSpec;
  onSelect?: (nodeName: string, nodeType: string) => void = () => {};
}

export const APIDirectory: React.FC<APIDirectoryProps> = (props) => {
  const {
    allDirs,
    startTransition,
    selectNode,
    dirs,
    search,
    setSearch,
    changeDirs,
    currentKey,
    debouncedSearch,
    setCurrentKey,
  } = useLeftMenuState(props.pontxSpec);

  return (
    <APIDirectoryComponent
      changeDirs={changeDirs}
      currentKey={currentKey}
      debouncedSearch={debouncedSearch}
      search={search}
      setSearch={setSearch}
      pontxSpec={props.pontxSpec}
      dirs={dirs}
      isAPIDocsLoading={false}
      selectNode={(name, type) => {
        selectNode(name, type);
        props.onSelect?.(name, type);
      }}
      startTransition={startTransition}
    />
  );
};

APIDirectory.defaultProps = new APIDirectoryProps();
