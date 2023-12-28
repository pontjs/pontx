/**
 * @file 高亮搜索词组件
 * @author 奇阳
 */

import * as React from "react";

interface HighlightWordProps {
  text: string;
  keyword: string | string[];
  className?: string;
}

const HighlightWord: React.FC<HighlightWordProps> = ({ text, keyword, className = "" }) => {
  if (!text || !keyword) {
    return <span className={className}>{text}</span>;
  }

  let wordMatchString = "";
  if (Array.isArray(keyword)) {
    keyword
      .sort((a, b) => b.length - a.length)
      .forEach((item) => {
        // 每个关键词都要做特殊字符处理
        const transformString = item.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        // 用'|'来表示或
        wordMatchString += `${wordMatchString ? "|" : ""}(${transformString})`;
      });
  } else {
    wordMatchString = keyword.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  }

  const reg = new RegExp(wordMatchString, "gi");

  let result = [];
  if (Array.isArray(keyword)) {
    result = text.split(reg).map((partial, i) => {
      return typeof partial === "string" && partial.match(reg)
        ? [
            <span className="highlight" key={i}>
              {partial}
            </span>,
          ]
        : partial;
    });
  } else {
    const matched = text.match(reg);
    result = text.split(reg).map((partial, i) => {
      return i > 0
        ? [
            <span className="highlight" key={i}>
              {matched[i - 1]}
            </span>,
            partial,
          ]
        : partial;
    });
  }

  return <span className={className}>{result}</span>;
};

export default HighlightWord;
