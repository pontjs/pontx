[pontx-spec](../README.md) / [Exports](../modules.md) / PontDirectory

# Class: PontDirectory

## Table of contents

### Constructors

- [constructor](PontDirectory.md#constructor)

### Properties

- [children](PontDirectory.md#children)
- [namespace](PontDirectory.md#namespace)
- [title](PontDirectory.md#title)
- [titleIntl](PontDirectory.md#titleintl)

### Methods

- [getAPIsInDir](PontDirectory.md#getapisindir)

## Constructors

### constructor

• **new PontDirectory**()

## Properties

### children

• `Optional` **children**: (`string` \| [`PontDirectory`](PontDirectory.md))[] = `[]`

#### Defined in

[src/index.ts:36](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L36)

___

### namespace

• `Optional` **namespace**: `string`

生成 SDK 的 NameSpace, Controller

#### Defined in

[src/index.ts:32](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L32)

___

### title

• **title**: `string`

目录标题

#### Defined in

[src/index.ts:34](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L34)

___

### titleIntl

• `Optional` **titleIntl**: [`ObjectMap`](../modules.md#objectmap)<`string`\> = `{}`

#### Defined in

[src/index.ts:35](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L35)

## Methods

### getAPIsInDir

▸ `Static` **getAPIsInDir**(`dir`): `string`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `dir` | [`PontDirectory`](PontDirectory.md) |

#### Returns

`string`[]

#### Defined in

[src/index.ts:38](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L38)
