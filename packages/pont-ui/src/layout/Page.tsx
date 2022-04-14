/**
 * @author jasonHzq
 * @description API Page Content
 */
import * as React from "react";
import * as PontSpec from "pont-spec";

export class PageProps {
  api: PontSpec.Interface;
}

export const Page: React.FC<PageProps> = (props) => {
  return (
    <div className='pont-ui-page'>
      <div className='header'>
        <div className='title'>{props.api.name}</div>
        <div className='desc'>
          {props.api.method?.toUpperCase()} {props.api.path}{" "}
          {props.api.description}
        </div>
      </div>
      <div className='content'>
        <div className='mod'>
          <div className='mod-title'>Request Syntax</div>
          <div className='mod-content'></div>
        </div>
      </div>
    </div>
  );
};

Page.defaultProps = new PageProps();
