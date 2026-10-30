# @merijnslegers/config

The shared prettier, eslint and TypeScript settings of the
[software factory](https://github.com/Merijnslegers90/software-factory)
(decision F-0002), and the em dash check from its way of working. See
[packages/README.md](https://github.com/Merijnslegers90/software-factory/blob/main/packages/README.md)
for how to use it.

```js
import config from '@merijnslegers/config/prettier';
import factory from '@merijnslegers/config/eslint';
import { findEmDashes } from '@merijnslegers/config/writing';
```
