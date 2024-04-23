/**
 * @author
 * @description
 */
import * as React from "react";

export class SemixCardProps {
  children?: any;
}

export const SemixCard: React.FC<SemixCardProps> = (props) => {
  return <div className="semix-card">{props.children}</div>;
};

SemixCard.defaultProps = new SemixCardProps();
