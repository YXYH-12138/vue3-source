# vue3 源码学习

## 使用 pnpm 搭建 monorepo 环境

- 初始化 `pnpm init`

- 安装模块使用 `-w` 表示安装到根目录，如 `pnpm install vue -w`

指定工作目录，新建`pnpm-workspace.yaml`文件

```yaml
packages:
  - "packages/*"
```

如果想提升依赖，和 npm 保持一致，可以新建`.npmrc`文件

```
shamefully-hoist = true
```
