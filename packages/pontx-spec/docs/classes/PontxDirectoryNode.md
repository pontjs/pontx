[pontx-spec](../README.md) / [Exports](../modules.md) / PontxDirectoryNode

# Class: PontxDirectoryNode

## Table of contents

### Constructors

- [constructor](PontxDirectoryNode.md#constructor)

### Properties

- [children](PontxDirectoryNode.md#children)
- [name](PontxDirectoryNode.md#name)
- [title](PontxDirectoryNode.md#title)
- [titleIntl](PontxDirectoryNode.md#titleintl)
- [type](PontxDirectoryNode.md#type)

### Methods

- [constructorApiDir](PontxDirectoryNode.md#constructorapidir)
- [constructorPontxDir](PontxDirectoryNode.md#constructorpontxdir)
- [constructorPureApiItems](PontxDirectoryNode.md#constructorpureapiitems)
- [getAPIsInDir](PontxDirectoryNode.md#getapisindir)
- [removeNode](PontxDirectoryNode.md#removenode)

## Constructors

### constructor

• **new PontxDirectoryNode**()

## Properties

### children

• **children**: [`PontxDirectoryNode`](PontxDirectoryNode.md)[] = `[]`

#### Defined in

[pontx-spec/src/type.ts:78](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L78)

___

### name

• **name**: `string`

#### Defined in

[pontx-spec/src/type.ts:80](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L80)

___

### title

• `Optional` **title**: `string`

目录标题

#### Defined in

[pontx-spec/src/type.ts:76](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L76)

___

### titleIntl

• `Optional` **titleIntl**: [`ObjectMap`](../modules.md#objectmap)\<`string`\> = `{}`

#### Defined in

[pontx-spec/src/type.ts:77](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L77)

___

### type

• **type**: [`PontxDirectoryNodeType`](../enums/PontxDirectoryNodeType.md)

#### Defined in

[pontx-spec/src/type.ts:79](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L79)

## Methods

### constructorApiDir

▸ `Static` **constructorApiDir**(`pontxSpec`): \{ `children`: [`PontxDirectoryNode`](PontxDirectoryNode.md)[] ; `name`: `string` ; `title`: `string` ; `type`: [`PontxDirectoryNodeType`](../enums/PontxDirectoryNodeType.md) = PontxDirectoryNodeType.Directory }[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `pontxSpec` | [`PontSpec`](PontSpec.md) |

#### Returns

\{ `children`: [`PontxDirectoryNode`](PontxDirectoryNode.md)[] ; `name`: `string` ; `title`: `string` ; `type`: [`PontxDirectoryNodeType`](../enums/PontxDirectoryNodeType.md) = PontxDirectoryNodeType.Directory }[]

#### Defined in

[pontx-spec/src/type.ts:112](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L112)

___

### constructorPontxDir

▸ `Static` **constructorPontxDir**(`pontxSpec`): [`PontxDirectoryNode`](PontxDirectoryNode.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `pontxSpec` | [`PontSpec`](PontSpec.md) |

#### Returns

[`PontxDirectoryNode`](PontxDirectoryNode.md)[]

#### Defined in

[pontx-spec/src/type.ts:125](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L125)

___

### constructorPureApiItems

▸ `Static` **constructorPureApiItems**(`pontxSpec`, `namespaceName?`): [`PontxDirectoryNode`](PontxDirectoryNode.md)[]

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `pontxSpec` | [`PontSpec`](PontSpec.md) | `undefined` |
| `namespaceName` | `string` | `""` |

#### Returns

[`PontxDirectoryNode`](PontxDirectoryNode.md)[]

#### Defined in

[pontx-spec/src/type.ts:82](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L82)

___

### getAPIsInDir

▸ `Static` **getAPIsInDir**(`dir`): `string`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `dir` | [`PontxDirectoryNode`](PontxDirectoryNode.md) |

#### Returns

`string`[]

#### Defined in

[pontx-spec/src/type.ts:206](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L206)

___

### removeNode

▸ `Static` **removeNode**(`dirs`, `nodeType`, `nodeName?`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `dirs` | [`PontxDirectoryNode`](PontxDirectoryNode.md)[] |
| `nodeType` | [`PontxDirectoryNodeType`](../enums/PontxDirectoryNodeType.md) |
| `nodeName?` | `string` |

#### Returns

`any`

#### Defined in

[pontx-spec/src/type.ts:178](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L178)
