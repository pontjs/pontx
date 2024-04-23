import * as React from "react";
import { ErrorObject } from "semix-validate";
import * as _ from "lodash";

export const useRuleLintState = (
  errors: ErrorObject[],
  filterErrorByKeyword = (error: ErrorObject, keyword: string) => {
    if (error?.dataPath?.includes(keyword)) {
      return true;
    }
    if (error?.message?.includes(keyword)) {
      return true;
    }
    return false;
  }
) => {
  const errorCnt = errors?.filter((err) => err.level === "error")?.length;
  const warningCnt = errors?.filter((err) => err.level === "warning")?.length;
  const [activeLevels, setActiveLevels] = React.useState([]);

  const [search, setSearch] = React.useState("");
  const [keyword, setKeyword] = React.useState("");

  const debounceSetKeyword = React.useCallback(
    _.debounce((searchValue: string) => {
      return setKeyword(searchValue);
    }, 400),
    []
  );
  const tableShowErrors = React.useMemo(() => {
    const filteredErrors = errors.filter((err) => {
      if (!activeLevels.length) {
        return true;
      } else {
        return activeLevels.includes(err.level);
      }
    });

    return filteredErrors.filter((error) => {
      if (!keyword) {
        return true;
      }
      return filterErrorByKeyword(error, keyword);
    });
  }, [errors, keyword, activeLevels]);

  return {
    debounceSetKeyword,
    search,
    setSearch,
    tableShowErrors,
    warningCnt,
    errorCnt,
    activeLevels,
    setActiveLevels,
  };
};
