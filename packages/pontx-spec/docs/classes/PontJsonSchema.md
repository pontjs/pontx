[pontx-spec](../README.md) / [Exports](../modules.md) / PontJsonSchema

# Class: PontJsonSchema

pont 中的数据类型，集成 JSONSchema。
支持泛型类、泛型表达式、判断是否为业务数据结构。

## Hierarchy

- `CoreSchemaMetaSchema`

  ↳ **`PontJsonSchema`**

## Table of contents

### Constructors

- [constructor](PontJsonSchema.md#constructor)

### Properties

- [$comment](PontJsonSchema.md#$comment)
- [$id](PontJsonSchema.md#$id)
- [$ref](PontJsonSchema.md#$ref)
- [$schema](PontJsonSchema.md#$schema)
- [additionalItems](PontJsonSchema.md#additionalitems)
- [additionalProperties](PontJsonSchema.md#additionalproperties)
- [allOf](PontJsonSchema.md#allof)
- [anyOf](PontJsonSchema.md#anyof)
- [const](PontJsonSchema.md#const)
- [contains](PontJsonSchema.md#contains)
- [contentEncoding](PontJsonSchema.md#contentencoding)
- [contentMediaType](PontJsonSchema.md#contentmediatype)
- [default](PontJsonSchema.md#default)
- [dependencies](PontJsonSchema.md#dependencies)
- [description](PontJsonSchema.md#description)
- [else](PontJsonSchema.md#else)
- [enum](PontJsonSchema.md#enum)
- [example](PontJsonSchema.md#example)
- [examples](PontJsonSchema.md#examples)
- [exclusiveMaximum](PontJsonSchema.md#exclusivemaximum)
- [exclusiveMinimum](PontJsonSchema.md#exclusiveminimum)
- [ext](PontJsonSchema.md#ext)
- [externalDocs](PontJsonSchema.md#externaldocs)
- [format](PontJsonSchema.md#format)
- [if](PontJsonSchema.md#if)
- [items](PontJsonSchema.md#items)
- [maxItems](PontJsonSchema.md#maxitems)
- [maxLength](PontJsonSchema.md#maxlength)
- [maxProperties](PontJsonSchema.md#maxproperties)
- [maximum](PontJsonSchema.md#maximum)
- [minItems](PontJsonSchema.md#minitems)
- [minLength](PontJsonSchema.md#minlength)
- [minProperties](PontJsonSchema.md#minproperties)
- [minimum](PontJsonSchema.md#minimum)
- [multipleOf](PontJsonSchema.md#multipleof)
- [not](PontJsonSchema.md#not)
- [oneOf](PontJsonSchema.md#oneof)
- [pattern](PontJsonSchema.md#pattern)
- [patternProperties](PontJsonSchema.md#patternproperties)
- [properties](PontJsonSchema.md#properties)
- [propertyNames](PontJsonSchema.md#propertynames)
- [readOnly](PontJsonSchema.md#readonly)
- [required](PontJsonSchema.md#required)
- [requiredProps](PontJsonSchema.md#requiredprops)
- [templateArgs](PontJsonSchema.md#templateargs)
- [templateIndex](PontJsonSchema.md#templateindex)
- [then](PontJsonSchema.md#then)
- [title](PontJsonSchema.md#title)
- [type](PontJsonSchema.md#type)
- [typeName](PontJsonSchema.md#typename)
- [uniqueItems](PontJsonSchema.md#uniqueitems)

### Methods

- [checkIsMap](PontJsonSchema.md#checkismap)
- [create](PontJsonSchema.md#create)
- [getDescription](PontJsonSchema.md#getdescription)
- [getUsedStructNames](PontJsonSchema.md#getusedstructnames)
- [mapPontxSchema](PontJsonSchema.md#mappontxschema)
- [merge](PontJsonSchema.md#merge)
- [parseFromSample](PontJsonSchema.md#parsefromsample)
- [toString](PontJsonSchema.md#tostring)

## Constructors

### constructor

• **new PontJsonSchema**()

#### Inherited from

CoreSchemaMetaSchema.constructor

## Properties

### $comment

• `Optional` **$comment**: `string`

#### Inherited from

CoreSchemaMetaSchema.$comment

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:13

___

### $id

• `Optional` **$id**: `string`

#### Inherited from

CoreSchemaMetaSchema.$id

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:10

___

### $ref

• `Optional` **$ref**: `string`

#### Inherited from

CoreSchemaMetaSchema.$ref

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:12

___

### $schema

• `Optional` **$schema**: `string`

#### Inherited from

CoreSchemaMetaSchema.$schema

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:11

___

### additionalItems

• `Optional` **additionalItems**: `JsonSchema`

#### Inherited from

CoreSchemaMetaSchema.additionalItems

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:32

___

### additionalProperties

• `Optional` **additionalProperties**: [`PontJsonSchema`](PontJsonSchema.md)

#### Defined in

[pontx-spec/src/dataType.ts:40](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L40)

___

### allOf

• `Optional` **allOf**: `JsonSchemaArray`

#### Inherited from

CoreSchemaMetaSchema.allOf

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:48

___

### anyOf

• `Optional` **anyOf**: `JsonSchemaArray`

#### Inherited from

CoreSchemaMetaSchema.anyOf

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:49

___

### const

• `Optional` **const**: `any`

#### Inherited from

CoreSchemaMetaSchema.const

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:39

___

### contains

• `Optional` **contains**: `JsonSchema`

#### Inherited from

CoreSchemaMetaSchema.contains

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:30

___

### contentEncoding

• `Optional` **contentEncoding**: `string`

#### Inherited from

CoreSchemaMetaSchema.contentEncoding

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:44

___

### contentMediaType

• `Optional` **contentMediaType**: `string`

#### Inherited from

CoreSchemaMetaSchema.contentMediaType

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:43

___

### default

• `Optional` **default**: `any`

#### Inherited from

CoreSchemaMetaSchema.default

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:16

___

### dependencies

• `Optional` **dependencies**: `Object`

#### Index signature

▪ [k: `string`]: `JsonSchema` \| `StringArray`

#### Inherited from

CoreSchemaMetaSchema.dependencies

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:35

___

### description

• `Optional` **description**: `string`

#### Inherited from

CoreSchemaMetaSchema.description

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:15

___

### else

• `Optional` **else**: `JsonSchema`

#### Inherited from

CoreSchemaMetaSchema.else

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:47

___

### enum

• `Optional` **enum**: `any`[]

#### Inherited from

CoreSchemaMetaSchema.enum

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:40

___

### example

• `Optional` **example**: `string`

#### Defined in

[pontx-spec/src/dataType.ts:33](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L33)

___

### examples

• `Optional` **examples**: `any`[]

#### Inherited from

CoreSchemaMetaSchema.examples

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:18

___

### exclusiveMaximum

• `Optional` **exclusiveMaximum**: `number`

#### Inherited from

CoreSchemaMetaSchema.exclusiveMaximum

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:21

___

### exclusiveMinimum

• `Optional` **exclusiveMinimum**: `number`

#### Inherited from

CoreSchemaMetaSchema.exclusiveMinimum

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:23

___

### ext

• `Optional` **ext**: `any`

#### Defined in

[pontx-spec/src/dataType.ts:48](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L48)

___

### externalDocs

• `Optional` **externalDocs**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `description?` | `string` |
| `url?` | `string` |

#### Defined in

[pontx-spec/src/dataType.ts:43](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L43)

___

### format

• `Optional` **format**: `string`

#### Inherited from

CoreSchemaMetaSchema.format

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:42

___

### if

• `Optional` **if**: `JsonSchema`

#### Inherited from

CoreSchemaMetaSchema.if

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:45

___

### items

• `Optional` **items**: [`PontJsonSchema`](PontJsonSchema.md) \| `PontJsonSchemaArray`

#### Defined in

[pontx-spec/src/dataType.ts:39](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L39)

___

### maxItems

• `Optional` **maxItems**: `number`

#### Inherited from

CoreSchemaMetaSchema.maxItems

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:27

___

### maxLength

• `Optional` **maxLength**: `number`

#### Inherited from

CoreSchemaMetaSchema.maxLength

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:24

___

### maxProperties

• `Optional` **maxProperties**: `number`

#### Inherited from

CoreSchemaMetaSchema.maxProperties

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:31

___

### maximum

• `Optional` **maximum**: `number`

#### Inherited from

CoreSchemaMetaSchema.maximum

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:20

___

### minItems

• `Optional` **minItems**: `number`

#### Inherited from

CoreSchemaMetaSchema.minItems

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:28

___

### minLength

• `Optional` **minLength**: `number`

#### Inherited from

CoreSchemaMetaSchema.minLength

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:25

___

### minProperties

• `Optional` **minProperties**: `number`

#### Inherited from

CoreSchemaMetaSchema.minProperties

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:33

___

### minimum

• `Optional` **minimum**: `number`

#### Inherited from

CoreSchemaMetaSchema.minimum

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:22

___

### multipleOf

• `Optional` **multipleOf**: `number`

#### Inherited from

CoreSchemaMetaSchema.multipleOf

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:19

___

### not

• `Optional` **not**: `JsonSchema`

#### Inherited from

CoreSchemaMetaSchema.not

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:51

___

### oneOf

• `Optional` **oneOf**: `JsonSchemaArray`

#### Inherited from

CoreSchemaMetaSchema.oneOf

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:50

___

### pattern

• `Optional` **pattern**: `string`

#### Inherited from

CoreSchemaMetaSchema.pattern

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:26

___

### patternProperties

• `Optional` **patternProperties**: `JsonSchemaMap`

#### Inherited from

CoreSchemaMetaSchema.patternProperties

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:34

___

### properties

• `Optional` **properties**: `PontJsonSchemaMap`

#### Defined in

[pontx-spec/src/dataType.ts:41](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L41)

___

### propertyNames

• `Optional` **propertyNames**: `JsonSchema`

#### Inherited from

CoreSchemaMetaSchema.propertyNames

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:38

___

### readOnly

• `Optional` **readOnly**: `boolean`

#### Inherited from

CoreSchemaMetaSchema.readOnly

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:17

___

### required

• `Optional` **required**: `string`[]

#### Defined in

[pontx-spec/src/dataType.ts:35](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L35)

___

### requiredProps

• `Optional` **requiredProps**: `string`[]

#### Defined in

[pontx-spec/src/dataType.ts:37](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L37)

___

### templateArgs

• `Optional` **templateArgs**: [`PontJsonSchema`](PontJsonSchema.md)[] = `[]`

两种含义：
1、泛型表达式参数列表, 从 $ref 中解析出的泛型表达式
2、支持嵌套，例如 Pagination<List<Array<Biz>>, number | string>

#### Defined in

[pontx-spec/src/dataType.ts:31](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L31)

___

### templateIndex

• `Optional` **templateIndex**: `number` = `-1`

仅在数据结构子结构中定义。
-1 表示非泛型类型，泛型类型生成代码时为 T0, T1, T2, T3...

#### Defined in

[pontx-spec/src/dataType.ts:21](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L21)

___

### then

• `Optional` **then**: `JsonSchema`

#### Inherited from

CoreSchemaMetaSchema.then

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:46

___

### title

• `Optional` **title**: `string`

#### Inherited from

CoreSchemaMetaSchema.title

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:14

___

### type

• `Optional` **type**: `SimpleTypes` \| `SimpleTypes`[]

#### Inherited from

CoreSchemaMetaSchema.type

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:41

___

### typeName

• `Optional` **typeName**: `string`

从 $ref 中解析出的数据结构引用名

#### Defined in

[pontx-spec/src/dataType.ts:24](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L24)

___

### uniqueItems

• `Optional` **uniqueItems**: `boolean`

#### Inherited from

CoreSchemaMetaSchema.uniqueItems

#### Defined in

oas-spec-ts/lib/JsonSchema.d.ts:29

## Methods

### checkIsMap

▸ `Static` **checkIsMap**(`schema`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | [`PontJsonSchema`](PontJsonSchema.md) |

#### Returns

`boolean`

#### Defined in

[pontx-spec/src/dataType.ts:115](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L115)

___

### create

▸ `Static` **create**(): [`PontJsonSchema`](PontJsonSchema.md)

#### Returns

[`PontJsonSchema`](PontJsonSchema.md)

#### Defined in

[pontx-spec/src/dataType.ts:111](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L111)

___

### getDescription

▸ `Static` **getDescription**(`schema`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | [`PontJsonSchema`](PontJsonSchema.md) |

#### Returns

`void`

#### Defined in

[pontx-spec/src/dataType.ts:122](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L122)

___

### getUsedStructNames

▸ `Static` **getUsedStructNames**(`schema`): `string`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | [`PontJsonSchema`](PontJsonSchema.md) |

#### Returns

`string`[]

#### Defined in

[pontx-spec/src/dataType.ts:162](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L162)

___

### mapPontxSchema

▸ `Static` **mapPontxSchema**(`schema`, `mapper`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | [`PontJsonSchema`](PontJsonSchema.md) |
| `mapper` | (`schema`: [`PontJsonSchema`](PontJsonSchema.md)) => [`PontJsonSchema`](PontJsonSchema.md) |

#### Returns

`any`

#### Defined in

[pontx-spec/src/dataType.ts:124](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L124)

___

### merge

▸ `Static` **merge**(`schema`, `newSchema`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | [`PontJsonSchema`](PontJsonSchema.md) |
| `newSchema` | [`PontJsonSchema`](PontJsonSchema.md) |

#### Returns

`any`

#### Defined in

[pontx-spec/src/dataType.ts:226](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L226)

___

### parseFromSample

▸ `Static` **parseFromSample**(`json`): [`PontJsonSchema`](PontJsonSchema.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `json` | `any` |

#### Returns

[`PontJsonSchema`](PontJsonSchema.md)

#### Defined in

[pontx-spec/src/dataType.ts:175](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L175)

___

### toString

▸ `Static` **toString**(`schema`): `any`

生成表达式，用于预览读取类型信息

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | [`PontJsonSchema`](PontJsonSchema.md) |

#### Returns

`any`

#### Defined in

[pontx-spec/src/dataType.ts:51](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/dataType.ts#L51)
