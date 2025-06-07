# h5 vue

使用 Tailwindcss + Daisyui + vue3 的 h5/PC 响应式项目

## Vite

使用 vite 的脚手架，手动选择技术栈，而不是使用 template

- Vue
- Ts
- VueRouter
- Pinia

### Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

### Vite configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## daisyui

[daisyui]()

## Other

- Biome: Linter + Formater
- tailwindcss
