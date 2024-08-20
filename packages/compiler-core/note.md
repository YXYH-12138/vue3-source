1. `parser`用来将模板字符串解析为模板 AST 的解析器
2. `transformer`用来将模板 AST 转换为 JavaScript AST 的转换器
3. `generator`用来根据 JavaScript AST 生成渲染函数代码的生成器

- patchFlag 标记

  - 靶向更新

- 静态提升

  - 预字符串化，优化大量连续纯静态的标签节点，createStaticVNode('<p></p><p></p>...') 函数

- 缓存内联事件处理函数
