# OCL: the Optimist Command Loader

## Isn't this what ___ does?

Probably, and probably not. This is, _quite specifically_, a git-style command
parser for Optimist. Not something _kinda like_ Optimist, but Optimist.

## Why?

I originally built OCL to bring apps like [`slc`][slc] and [`bacn`][bacn] more
in line with patterns I started using in [`discovery`][discovery]'s HTTP
trackers application and elsewhere. With these patterns, the purpose of OCL
is to gracefully co-exist with [`rc`][rc] and [`optimist`][optimist].

If so, the following becomes possible:

```
// This file is assumed to be located in a project's bin/ directory.

// Create a command loader for modules in the lib/commands directory.
var loader = require('ocl')({ root: __dirname + '../lib/commands' });

// Load configuration options from the same argv.
// NOTE: This same line can (and should) exist in each command that uses the
// `rc` config. Alternatively, it can be composed into lib/config.js.
var rc = require('rc')('discovery', {});

// Load commands, falling back to lib/commands/help in a pickle.
loader.run();
```

Or, to use Optimist's dynamic help formatting:

```
// This file is assumed to be located in a project's bin/ directory.

// Load options from JSON in bin/options.
var options = require('./options.json');

// Create a command loader for modules in the lib/commands directory.
var loader = require('ocl')({ root: __dirname + '../lib/commands' });

var optimist = require('optimist').options(options);

// Load configuration from the same argv.
var rc = require('rc')('discovery', {}, optimist.argv);

// Display dynamic help, if needed.
if (rc.help) {
  optimist.showHelp();
  process.exit(0);
}

// Load commands as before (lib/commands/help may still be loaded, and can
// fall back to optimist.showHelp().
loader.run();
```


[slc]: https://github.com/strongloop/slc
[bacn]: https://github.com/strongloop/bacn
[rc]: https://github.com/dominictarr/rc
[optimist]: https://github.com/substack/node-optimist
