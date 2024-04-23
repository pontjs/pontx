/**
 * @description 门户组件
 * 1、用于api-design-form
 * 2、用于api-debugger
 */

import { String } from "./string";
import { BooleanSwitch } from "./swtich";
import { NumberInput } from "./number";
import { SimpleList } from "./list";
import { EnumSelect } from "./enum";
import { SimpleMap } from "./map";
import { RenderObject } from "./Object";
import { RadioGroup } from "./radio";
import { CheckboxGroup } from "./checkbox";
import { Title } from "./Title";
import { StringList } from "./stringList";

export const flowbiteWidgets = {
  object: RenderObject,
  radio: RadioGroup,
  string: String,
  stringList: StringList,
  checkbox: CheckboxGroup,
  booleanSwitch: BooleanSwitch,
  number: NumberInput,
  integer: NumberInput,
  enum: EnumSelect,
  simpleMap: SimpleMap,
  list: SimpleList,
  title: Title,
};
