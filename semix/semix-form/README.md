# semix-form-render

## 介绍

根据 JSONSchema 生成表单。

其中动态 JSONSchema 的语法见[动态 Schema 语法介绍]('../../semix-core/schema.md)

## 快速开始

```tsx
import { SemixForm } from "semix-form-render";

const form = SemixForm.useForm({
  schema: ApiSchema as any,
  formData: {},
  context: context,
});

return (
  <SemixForm
    widgets={{ SecurityRequirement: SecurityRequirement }}
    form={form}
    onChange={() => {
      //
    }}
  />
);
```

## 自定义表单布局

```tsx
import { SemixForm } from "semix-form-render";

const form = SemixForm.useForm({
  schema: ApiSchema as any,
  formData: {},
  context: context,
});

return (
  <SemixForm
    widgets={{ SecurityRequirement: SecurityRequirement }}
    form={form}
    onChange={() => {
      //
    }}
  >
    <SemixForm.Item dataPath='summary' />
    <SemixForm.Item dataPath='path' />
    <SemixForm.Item dataPath='schemes' />
    <SemixForm.Item dataPath='methods' />
    <SemixForm.Item dataPath='security' widget='SecurityRequirement' /> {/* 自定义组件 */}
    <SemixForm.Item dataPath='deprecated'></SemixForm.Item>
    <SemixForm.Item dataPath='visibility'>
      <Message type='notice'>
        API设计中不再允许直接配置为“公开”，API统一公开至门户操作说明请参看：
      </Message>
    </SemixForm.Item>
    <SemixForm.Item dataPath='staticInfo.returnType'>
      {/* 自定义子组件 */}
      {form.formData?.staticInfo?.returnType === "asynchronous" ? (
        <SemixForm.Item
          dataPath='staticInfo'
          schemaMapper={(schema) => {
            return {
              ...schema,
              properties: _.pickBy(schema.properties, (value, key) => {
                return ["callback", "callbackInterval", "maxCallbackTimes"].includes(key);
              }),
            };
          }}
        />
      ) : null}
    </SemixForm.Item>
    <div className='mod' style={{ borderTop: "1px solid black", marginTop: 20 }}>
      <div className='mod-title'>后端配置</div>
      <div className='mod-content'>
        <SemixForm.Item dataPath='backendService.protocol' />
        <SemixForm.Item dataPath='backendService.appName' />
        <SemixForm.Item dataPath='backendService.invokeType' />
        <SemixForm.Item dataPath='backendService.retries' />
        <SemixForm.Item dataPath='backendService.timeout' />
        <SemixForm.Item dataPath='backendService.group' />
        <SemixForm.Item dataPath='backendService.version' />
        <SemixForm.Item dataPath='backendService.method' />
        <SemixForm.Item dataPath='backendService.paramTypes' />
        <SemixForm.Item dataPath='backendService.url' />
        <SemixForm.Item dataPath='backendService.requestType' />
        <SemixForm.Item dataPath='backendService.signKeyName' />
      </div>
    </div>
  </SemixForm>
);
```
