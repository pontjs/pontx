[pontx-spec](../README.md) / [Exports](../modules.md) / PontSpec

# Class: PontSpec

## Table of contents

### Constructors

- [constructor](PontSpec.md#constructor)

### Properties

- [apis](PontSpec.md#apis)
- [basePath](PontSpec.md#basepath)
- [definitions](PontSpec.md#definitions)
- [description](PontSpec.md#description)
- [docDirectories](PontSpec.md#docdirectories)
- [envs](PontSpec.md#envs)
- [ext](PontSpec.md#ext)
- [externalDocs](PontSpec.md#externaldocs)
- [host](PontSpec.md#host)
- [name](PontSpec.md#name)
- [namespaces](PontSpec.md#namespaces)
- [pontx](PontSpec.md#pontx)
- [security](PontSpec.md#security)
- [securitySchemes](PontSpec.md#securityschemes)
- [title](PontSpec.md#title)
- [version](PontSpec.md#version)

### Methods

- [\_getSpecInfo](PontSpec.md#_getspecinfo)
- [addApi](PontSpec.md#addapi)
- [addMod](PontSpec.md#addmod)
- [addStruct](PontSpec.md#addstruct)
- [checkHasMods](PontSpec.md#checkhasmods)
- [constructorByName](PontSpec.md#constructorbyname)
- [diff](PontSpec.md#diff)
- [diffSpecs](PontSpec.md#diffspecs)
- [getApisInNamespace](PontSpec.md#getapisinnamespace)
- [getClazzCnt](PontSpec.md#getclazzcnt)
- [getCreatedMetas](PontSpec.md#getcreatedmetas)
- [getDirsDiff](PontSpec.md#getdirsdiff)
- [getMetaByKey](PontSpec.md#getmetabykey)
- [getMetasDiff](PontSpec.md#getmetasdiff)
- [getModByName](PontSpec.md#getmodbyname)
- [getMods](PontSpec.md#getmods)
- [getNamespaceNames](PontSpec.md#getnamespacenames)
- [getSubSpecWithAPI](PontSpec.md#getsubspecwithapi)
- [getSubSpecWithStruct](PontSpec.md#getsubspecwithstruct)
- [isEmptySpec](PontSpec.md#isemptyspec)
- [merge](PontSpec.md#merge)
- [moveApi](PontSpec.md#moveapi)
- [pickSpecByControllers](PontSpec.md#pickspecbycontrollers)
- [reNameApi](PontSpec.md#renameapi)
- [reOrder](PontSpec.md#reorder)
- [removeApi](PontSpec.md#removeapi)
- [removeMod](PontSpec.md#removemod)
- [removeStruct](PontSpec.md#removestruct)
- [removeUnUsedStructs](PontSpec.md#removeunusedstructs)
- [serialize](PontSpec.md#serialize)
- [udpateApi](PontSpec.md#udpateapi)
- [udpateStruct](PontSpec.md#udpatestruct)
- [updateMod](PontSpec.md#updatemod)
- [validateLock](PontSpec.md#validatelock)

## Constructors

### constructor

• **new PontSpec**(`ds?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `ds?` | [`PontSpec`](PontSpec.md) |

#### Defined in

[pontx-spec/src/type.ts:937](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L937)

## Properties

### apis

• **apis**: [`ObjectMap`](../modules.md#objectmap)\<[`PontAPI`](PontAPI.md)\>

如果有 namespace，则 map key 可能为 namespace.apiName，否则为 apiName

#### Defined in

[pontx-spec/src/type.ts:241](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L241)

___

### basePath

• `Optional` **basePath**: `string`

#### Defined in

[pontx-spec/src/type.ts:246](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L246)

___

### definitions

• **definitions**: [`ObjectMap`](../modules.md#objectmap)\<[`PontJsonSchema`](PontJsonSchema.md)\>

#### Defined in

[pontx-spec/src/type.ts:239](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L239)

___

### description

• `Optional` **description**: `string`

#### Defined in

[pontx-spec/src/type.ts:235](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L235)

___

### docDirectories

• `Optional` **docDirectories**: [`PontxDirectoryNode`](PontxDirectoryNode.md)[]

#### Defined in

[pontx-spec/src/type.ts:285](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L285)

___

### envs

• `Optional` **envs**: `Object`

#### Index signature

▪ [x: `string`]: `Partial`\<[`PontSpec`](PontSpec.md)\>

#### Defined in

[pontx-spec/src/type.ts:249](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L249)

___

### ext

• `Optional` **ext**: `any`

扩展字段

#### Defined in

[pontx-spec/src/type.ts:288](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L288)

___

### externalDocs

• `Optional` **externalDocs**: `ExternalDocumentationObject`

#### Defined in

[pontx-spec/src/type.ts:248](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L248)

___

### host

• `Optional` **host**: `string`

#### Defined in

[pontx-spec/src/type.ts:247](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L247)

___

### name

• **name**: `string`

#### Defined in

[pontx-spec/src/type.ts:234](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L234)

___

### namespaces

• **namespaces**: `Object` = `{}`

#### Index signature

▪ [x: `string`]: [`PontNamespace`](PontNamespace.md)

#### Defined in

[pontx-spec/src/type.ts:243](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L243)

___

### pontx

• `Optional` **pontx**: `string` = `"2.0"`

#### Defined in

[pontx-spec/src/type.ts:238](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L238)

___

### security

• `Optional` **security**: \{ `[x: string]`: `string`[];  }[]

#### Defined in

[pontx-spec/src/type.ts:252](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L252)

___

### securitySchemes

• `Optional` **securitySchemes**: `Object`

#### Index signature

▪ [x: `string`]: \{ `bearerFormat?`: `string` ; `description?`: `string` ; `flows?`: \{ `authorizationCode?`: \{ `authorizationUrl`: `string` ; `scopes`: \{ `[x: string]`: `string`;  } ; `tokenUrl`: `string`  } ; `clientCredentials?`: \{ `scopes`: \{ `[x: string]`: `string`;  } ; `tokenUrl`: `string`  } ; `implicit?`: \{ `authorizationUrl`: `string` ; `scopes`: \{ `[x: string]`: `string`;  }  } ; `password?`: \{ `scopes`: \{ `[x: string]`: `string`;  } ; `tokenUrl`: `string`  }  } ; `in?`: ``"query"`` \| ``"header"`` \| ``"cookie"`` ; `name?`: `string` ; `openIdConnectUrl?`: `string` ; `scheme?`: ``"basic"`` \| ``"bearer"`` ; `type?`: ``"apiKey"`` \| ``"http"`` \| ``"oauth2"`` \| ``"openIdConnect"``  }

#### Defined in

[pontx-spec/src/type.ts:255](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L255)

___

### title

• `Optional` **title**: `string`

#### Defined in

[pontx-spec/src/type.ts:236](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L236)

___

### version

• `Optional` **version**: `string`

#### Defined in

[pontx-spec/src/type.ts:237](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L237)

## Methods

### \_getSpecInfo

▸ `Static` **_getSpecInfo**(`spec`): \{ `basePath?`: `string` ; `description?`: `string` ; `docDirectories?`: [`PontxDirectoryNode`](PontxDirectoryNode.md)[] ; `envs?`: \{ `[x: string]`: `Partial`\<[`PontSpec`](PontSpec.md)\>;  } ; `ext?`: `any` ; `externalDocs?`: `ExternalDocumentationObject` ; `host?`: `string` ; `name`: `string` ; `pontx?`: `string` = "2.0"; `security?`: \{ `[x: string]`: `string`[];  }[] ; `securitySchemes?`: \{ `[x: string]`: \{ `bearerFormat?`: `string` ; `description?`: `string` ; `flows?`: \{ `authorizationCode?`: \{ `authorizationUrl`: `string` ; `scopes`: \{ `[x: string]`: `string`;  } ; `tokenUrl`: `string`  } ; `clientCredentials?`: \{ `scopes`: \{ `[x: string]`: `string`;  } ; `tokenUrl`: `string`  } ; `implicit?`: \{ `authorizationUrl`: `string` ; `scopes`: \{ `[x: string]`: `string`;  }  } ; `password?`: \{ `scopes`: \{ `[x: string]`: `string`;  } ; `tokenUrl`: `string`  }  } ; `in?`: ``"query"`` \| ``"header"`` \| ``"cookie"`` ; `name?`: `string` ; `openIdConnectUrl?`: `string` ; `scheme?`: ``"basic"`` \| ``"bearer"`` ; `type?`: ``"apiKey"`` \| ``"http"`` \| ``"oauth2"`` \| ``"openIdConnect"``  };  } ; `title?`: `string` ; `version?`: `string`  } \| {}

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |

#### Returns

\{ `basePath?`: `string` ; `description?`: `string` ; `docDirectories?`: [`PontxDirectoryNode`](PontxDirectoryNode.md)[] ; `envs?`: \{ `[x: string]`: `Partial`\<[`PontSpec`](PontSpec.md)\>;  } ; `ext?`: `any` ; `externalDocs?`: `ExternalDocumentationObject` ; `host?`: `string` ; `name`: `string` ; `pontx?`: `string` = "2.0"; `security?`: \{ `[x: string]`: `string`[];  }[] ; `securitySchemes?`: \{ `[x: string]`: \{ `bearerFormat?`: `string` ; `description?`: `string` ; `flows?`: \{ `authorizationCode?`: \{ `authorizationUrl`: `string` ; `scopes`: \{ `[x: string]`: `string`;  } ; `tokenUrl`: `string`  } ; `clientCredentials?`: \{ `scopes`: \{ `[x: string]`: `string`;  } ; `tokenUrl`: `string`  } ; `implicit?`: \{ `authorizationUrl`: `string` ; `scopes`: \{ `[x: string]`: `string`;  }  } ; `password?`: \{ `scopes`: \{ `[x: string]`: `string`;  } ; `tokenUrl`: `string`  }  } ; `in?`: ``"query"`` \| ``"header"`` \| ``"cookie"`` ; `name?`: `string` ; `openIdConnectUrl?`: `string` ; `scheme?`: ``"basic"`` \| ``"bearer"`` ; `type?`: ``"apiKey"`` \| ``"http"`` \| ``"oauth2"`` \| ``"openIdConnect"``  };  } ; `title?`: `string` ; `version?`: `string`  } \| {}

#### Defined in

[pontx-spec/src/type.ts:678](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L678)

___

### addApi

▸ `Static` **addApi**(`spec`, `apiName`, `apiSpec`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |
| `apiName` | `string` |
| `apiSpec` | [`PontAPI`](PontAPI.md) |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[pontx-spec/src/type.ts:366](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L366)

___

### addMod

▸ `Static` **addMod**(`spec`, `namespace`, `title`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |
| `namespace` | `string` |
| `title` | `string` |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[pontx-spec/src/type.ts:384](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L384)

___

### addStruct

▸ `Static` **addStruct**(`spec`, `structName`, `struct`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |
| `structName` | `string` |
| `struct` | [`PontAPI`](PontAPI.md) |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[pontx-spec/src/type.ts:375](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L375)

___

### checkHasMods

▸ `Static` **checkHasMods**(`spec`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |

#### Returns

`boolean`

#### Defined in

[pontx-spec/src/type.ts:298](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L298)

___

### constructorByName

▸ `Static` **constructorByName**(`name`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[pontx-spec/src/type.ts:943](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L943)

___

### diff

▸ `Static` **diff**(`preSpec`, `newSpec`): [`DiffItem`](DiffItem.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `preSpec` | [`PontSpec`](PontSpec.md) |
| `newSpec` | [`PontSpec`](PontSpec.md) |

#### Returns

[`DiffItem`](DiffItem.md)[]

#### Defined in

[pontx-spec/src/type.ts:614](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L614)

___

### diffSpecs

▸ `Static` **diffSpecs**(`preSpecs`, `newSpecs`): [`DiffItem`](DiffItem.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `preSpecs` | [`PontSpec`](PontSpec.md)[] |
| `newSpecs` | [`PontSpec`](PontSpec.md)[] |

#### Returns

[`DiffItem`](DiffItem.md)[]

#### Defined in

[pontx-spec/src/type.ts:639](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L639)

___

### getApisInNamespace

▸ `Static` **getApisInNamespace**(`spec`, `namespaceName`): `string`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |
| `namespaceName` | `string` |

#### Returns

`string`[]

#### Defined in

[pontx-spec/src/type.ts:496](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L496)

___

### getClazzCnt

▸ `Static` **getClazzCnt**(`spec`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |

#### Returns

`number`

#### Defined in

[pontx-spec/src/type.ts:962](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L962)

___

### getCreatedMetas

▸ `Static` **getCreatedMetas**(`preSpec`, `newSpec`): [`DiffItem`](DiffItem.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `preSpec` | [`PontSpec`](PontSpec.md) |
| `newSpec` | [`PontSpec`](PontSpec.md) |

#### Returns

[`DiffItem`](DiffItem.md)[]

#### Defined in

[pontx-spec/src/type.ts:899](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L899)

___

### getDirsDiff

▸ `Static` **getDirsDiff**(`preSpec`, `nextSpec`): [`DiffItem`](DiffItem.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `preSpec` | [`PontSpec`](PontSpec.md) |
| `nextSpec` | [`PontSpec`](PontSpec.md) |

#### Returns

[`DiffItem`](DiffItem.md)[]

#### Defined in

[pontx-spec/src/type.ts:685](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L685)

___

### getMetaByKey

▸ `Static` **getMetaByKey**(`spec`, `key`): [`PontJsonSchema`](PontJsonSchema.md) \| [`PontAPI`](PontAPI.md)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) | pontx-spec |
| `key` | `string` | type/namespace/name \| type/name |

#### Returns

[`PontJsonSchema`](PontJsonSchema.md) \| [`PontAPI`](PontAPI.md)

#### Defined in

[pontx-spec/src/type.ts:733](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L733)

___

### getMetasDiff

▸ `Static` **getMetasDiff**(`preSpec`, `newSpec`): [`DiffItem`](DiffItem.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `preSpec` | [`PontSpec`](PontSpec.md) |
| `newSpec` | [`PontSpec`](PontSpec.md) |

#### Returns

[`DiffItem`](DiffItem.md)[]

#### Defined in

[pontx-spec/src/type.ts:744](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L744)

___

### getModByName

▸ `Static` **getModByName**(`spec`, `modName`): [`Mod`](Mod.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |
| `modName` | `string` |

#### Returns

[`Mod`](Mod.md)

#### Defined in

[pontx-spec/src/type.ts:491](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L491)

___

### getMods

▸ `Static` **getMods**(`spec`): [`Mod`](Mod.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |

#### Returns

[`Mod`](Mod.md)[]

#### Defined in

[pontx-spec/src/type.ts:504](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L504)

___

### getNamespaceNames

▸ `Static` **getNamespaceNames**(`spec`): `string`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |

#### Returns

`string`[]

#### Defined in

[pontx-spec/src/type.ts:316](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L316)

___

### getSubSpecWithAPI

▸ `Static` **getSubSpecWithAPI**(`spec`, `controllerName`, `apiName`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |
| `controllerName` | `string` |
| `apiName` | `string` |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[pontx-spec/src/type.ts:844](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L844)

___

### getSubSpecWithStruct

▸ `Static` **getSubSpecWithStruct**(`spec`, `structName`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |
| `structName` | `string` |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[pontx-spec/src/type.ts:858](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L858)

___

### isEmptySpec

▸ `Static` **isEmptySpec**(`spec`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |

#### Returns

`boolean`

#### Defined in

[pontx-spec/src/type.ts:954](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L954)

___

### merge

▸ `Static` **merge**(`spec1`, `spec2`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec1` | [`PontSpec`](PontSpec.md) |
| `spec2` | [`PontSpec`](PontSpec.md) |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[pontx-spec/src/type.ts:345](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L345)

___

### moveApi

▸ `Static` **moveApi**(`spec`, `apiName`, `namespace`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |
| `apiName` | `string` |
| `namespace` | `string` |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[pontx-spec/src/type.ts:596](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L596)

___

### pickSpecByControllers

▸ `Static` **pickSpecByControllers**(`spec`, `controllers`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |
| `controllers` | `string`[] |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[pontx-spec/src/type.ts:819](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L819)

___

### reNameApi

▸ `Static` **reNameApi**(`spec`, `fullApiName`, `newApiName`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |
| `fullApiName` | `string` |
| `newApiName` | `string` |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[pontx-spec/src/type.ts:428](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L428)

___

### reOrder

▸ `Static` **reOrder**(`ds`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `ds` | [`PontSpec`](PontSpec.md) |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[pontx-spec/src/type.ts:290](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L290)

___

### removeApi

▸ `Static` **removeApi**(`spec`, `apiName`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |
| `apiName` | `string` |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[pontx-spec/src/type.ts:396](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L396)

___

### removeMod

▸ `Static` **removeMod**(`spec`, `modName`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |
| `modName` | `string` |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[pontx-spec/src/type.ts:584](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L584)

___

### removeStruct

▸ `Static` **removeStruct**(`spec`, `structName`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |
| `structName` | `string` |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[pontx-spec/src/type.ts:409](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L409)

___

### removeUnUsedStructs

▸ `Static` **removeUnUsedStructs**(`spec`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |

#### Returns

`Object`

| Name | Type | Description |
| :------ | :------ | :------ |
| `apis` | [`ObjectMap`](../modules.md#objectmap)\<[`PontAPI`](PontAPI.md)\> | 如果有 namespace，则 map key 可能为 namespace.apiName，否则为 apiName |
| `basePath?` | `string` | - |
| `definitions` | `Dictionary`\<[`PontJsonSchema`](PontJsonSchema.md)\> | - |
| `description?` | `string` | - |
| `docDirectories?` | [`PontxDirectoryNode`](PontxDirectoryNode.md)[] | - |
| `envs?` | \{ `[x: string]`: `Partial`\<[`PontSpec`](PontSpec.md)\>;  } | - |
| `ext?` | `any` | 扩展字段 |
| `externalDocs?` | `ExternalDocumentationObject` | - |
| `host?` | `string` | - |
| `name` | `string` | - |
| `namespaces` | \{ `[x: string]`: [`PontNamespace`](PontNamespace.md);  } | - |
| `pontx?` | `string` | - |
| `security?` | \{ `[x: string]`: `string`[];  }[] | - |
| `securitySchemes?` | \{ `[x: string]`: \{ `bearerFormat?`: `string` ; `description?`: `string` ; `flows?`: \{ `authorizationCode?`: \{ `authorizationUrl`: `string` ; `scopes`: \{ `[x: string]`: `string`;  } ; `tokenUrl`: `string`  } ; `clientCredentials?`: \{ `scopes`: \{ `[x: string]`: `string`;  } ; `tokenUrl`: `string`  } ; `implicit?`: \{ `authorizationUrl`: `string` ; `scopes`: \{ `[x: string]`: `string`;  }  } ; `password?`: \{ `scopes`: \{ `[x: string]`: `string`;  } ; `tokenUrl`: `string`  }  } ; `in?`: ``"query"`` \| ``"header"`` \| ``"cookie"`` ; `name?`: `string` ; `openIdConnectUrl?`: `string` ; `scheme?`: ``"basic"`` \| ``"bearer"`` ; `type?`: ``"apiKey"`` \| ``"http"`` \| ``"oauth2"`` \| ``"openIdConnect"``  };  } | - |
| `title?` | `string` | - |
| `version?` | `string` | - |

#### Defined in

[pontx-spec/src/type.ts:877](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L877)

___

### serialize

▸ `Static` **serialize**(`ds`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `ds` | [`PontSpec`](PontSpec.md) |

#### Returns

`string`

#### Defined in

[pontx-spec/src/type.ts:933](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L933)

___

### udpateApi

▸ `Static` **udpateApi**(`spec`, `apiName`, `apiSpec`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |
| `apiName` | `string` |
| `apiSpec` | [`PontAPI`](PontAPI.md) |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[pontx-spec/src/type.ts:419](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L419)

___

### udpateStruct

▸ `Static` **udpateStruct**(`spec`, `structName`, `struct`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |
| `structName` | `string` |
| `struct` | [`PontJsonSchema`](PontJsonSchema.md) |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[pontx-spec/src/type.ts:482](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L482)

___

### updateMod

▸ `Static` **updateMod**(`spec`, `mod`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |
| `mod` | [`Mod`](Mod.md) |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[pontx-spec/src/type.ts:565](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L565)

___

### validateLock

▸ `Static` **validateLock**(`ds`): `string`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `ds` | [`PontSpec`](PontSpec.md) |

#### Returns

`string`[]

#### Defined in

[pontx-spec/src/type.ts:928](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L928)
