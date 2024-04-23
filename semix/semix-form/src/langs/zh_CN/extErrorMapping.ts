export default {
  index: {
    submit: '提交',
    pleaseEnterTheVerdict: '请输入判断条件',
    actualReturn: '实际返回的http状态码',
    accordingToInterface:
      '根据接口实际返回的 http 状态码，来进行本次调用是否错误的判断。网关优先对 http 状态码，如果http状态码返回正确，再通过“是否错误判断条件”进行判断。',
    statusCodeJudgment: 'http状态码判断条件',
    pleaseEnterWord: '请输入response字段路径',
    wrongOrNot: '是否错误判断条件',
    errorMessage: '错误信息字段名称',
    errorCodeWord: '错误码字段名称',
    thisConfigurationIsNot:
      '该配置不影响API运行时返回结果，仅用于在网关日志中提取正确的错误信息。',
    bypassError: '旁路错误信息映射',
  },
};
