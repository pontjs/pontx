[pontx-spec](../README.md) / [Exports](../modules.md) / PontAPI

# Class: PontAPI

## Table of contents

### Constructors

- [constructor](PontAPI.md#constructor)

### Properties

- [consumes](PontAPI.md#consumes)
- [deprecated](PontAPI.md#deprecated)
- [description](PontAPI.md#description)
- [ext](PontAPI.md#ext)
- [externalDocs](PontAPI.md#externaldocs)
- [method](PontAPI.md#method)
- [name](PontAPI.md#name)
- [parameters](PontAPI.md#parameters)
- [path](PontAPI.md#path)
- [produces](PontAPI.md#produces)
- [responses](PontAPI.md#responses)
- [security](PontAPI.md#security)
- [summary](PontAPI.md#summary)
- [title](PontAPI.md#title)

### Methods

- [getUsedStructNames](PontAPI.md#getusedstructnames)

## Constructors

### constructor

• **new PontAPI**()

## Properties

### consumes

• `Optional` **consumes**: `string`[] = `[]`

#### Defined in

[pontx-spec/src/type.ts:23](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L23)

___

### deprecated

• `Optional` **deprecated**: `boolean`

#### Defined in

[pontx-spec/src/type.ts:34](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L34)

___

### description

• `Optional` **description**: `string`

#### Defined in

[pontx-spec/src/type.ts:26](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L26)

___

### ext

• `Optional` **ext**: `any`

#### Defined in

[pontx-spec/src/type.ts:35](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L35)

___

### externalDocs

• `Optional` **externalDocs**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `description?` | `string` |
| `url?` | `string` |

#### Defined in

[pontx-spec/src/type.ts:39](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L39)

___

### method

• **method**: `string`

#### Defined in

[pontx-spec/src/type.ts:30](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L30)

___

### name

• `Optional` **name**: `string`

**`Deprecated`**

#### Defined in

[pontx-spec/src/type.ts:22](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L22)

___

### parameters

• `Optional` **parameters**: [`Parameter`](Parameter.md)[] = `[]`

#### Defined in

[pontx-spec/src/type.ts:25](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L25)

___

### path

• **path**: `string`

#### Defined in

[pontx-spec/src/type.ts:33](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L33)

___

### produces

• `Optional` **produces**: `string`[] = `[]`

#### Defined in

[pontx-spec/src/type.ts:24](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L24)

___

### responses

• **responses**: `Object`

#### Index signature

▪ [key: `string`]: [`ResponseObject`](../modules.md#responseobject)

#### Defined in

[pontx-spec/src/type.ts:27](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L27)

___

### security

• `Optional` **security**: \{ `[x: string]`: `string`[];  }[]

#### Defined in

[pontx-spec/src/type.ts:36](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L36)

___

### summary

• `Optional` **summary**: `string`

#### Defined in

[pontx-spec/src/type.ts:32](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L32)

___

### title

• `Optional` **title**: `string`

#### Defined in

[pontx-spec/src/type.ts:31](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L31)

## Methods

### getUsedStructNames

▸ `Static` **getUsedStructNames**(`api`): `string`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `api` | [`PontAPI`](PontAPI.md) |

#### Returns

`string`[]

#### Defined in

[pontx-spec/src/type.ts:44](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L44)
