'use strict';
var assert = require('assert');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');
var util = require('util');
var optimist = require('optimist');

/**
 * ## OCL `OCL(options)`
 *
 * Creates a new instance of OCL with the following options:
 *  * root - The location of Command modules in the filesystem, represented as a
 *    String. Required.
 *  * strict - If true, OCL will emit 'error' events if its run with a
 *    primary argument that doesn't exist as a command. Otherwise, that argument
 *    will be included in the fallback command's arguments. Defaults to `false`.
 *  * usage - If `--help` or `-h` are passed as options, this command will be
 *    used to generate a usage summary. Defaults to 'help'.
 *  * fallback - If an unknown command is specified while running, this command
 *    is used instead. Defaults to the same as `usage`.
 *  * default - The command to run when no command is specified in argv.
 *    Defaults to the same as `usage`.
 *  * manuals - If set, this location will be used as a repository of named
 *    manual files by loadManual().
 *
 * Commands are modules required from `root`. They are expected to be an Object
 * with a .run function and a .usage string.
 *
 * If the module exports a function, that function will be used as the .run
 * function instead.
 *
 * If .usage is undefined it will be loaded by loadManual() instead.
 */
function OCL(options) {
  if (!(this instanceof OCL)) {
    return new OCL(options);
  }

  options = options || {};

  this.root = options.root || null;
  this.strict = options.strict || false;
  this.usage = options.usage || 'help';
  this.fallback = options.fallback || this.usage;
  this.default = options.default || this.usage;
  this.manuals = options.manuals || null;

  assert(this.root, 'Root directory is required.');
}
util.inherits(OCL, EventEmitter);
OCL.createLoader = OCL;

/**
 * Returns `true` if `module` is a valid Command, `false` otherwise.
 */
OCL.isCommand = isCommand;
function isCommand(module) {
  return !!module &&
    typeof module === 'function' ||
    typeof module.run === 'function';
}

/**
 * Parses `argv` as an Array of Strings, whether command line arguments or
 * similar. If `options` is specified, it is used to configure `optimist`
 * accordingly.
 *
 * Returns an Object with short (e.g. `-f`) and long (e.g. `--foo`) arguments
 * as members and extraneous arguments as members of an Array at `_`. See
 * `optimist` for more information: https://github.com/substack/node-optimist
 */
OCL.prototype.parse = parse;
function parse(argv, options) {
  assert(Array.isArray(argv), 'argv must be an Array.');
  return optimist(argv).options(options || {}).argv;
}

/**
 * Synchronously parses optional `argv`, falling back to `process.argv`
 * otherwise. If a command is present, that command is run. Otherwise, the
 * configured `fallback` or `default` is run. See the constructor options for
 * more information. If `options` is specified, it is used to configure
 * `optimist` accordingly.
 */
OCL.prototype.run = run;
function run(argv, options) {
  var self = this;
  var command = null;

  options = self.parse(argv || (argv = process.argv.slice(2)), options);

  if (options.help || options.h) {
    // If we've provided --help as an option, it takes precedence. Show usage.
    command = self.getRun(self.usage);
  } else if (!options._.length) {
    command = self.getRun(self.default);
  } else {
    // Otherwise, if we've provided our own command, use that.
    command = self.getRun(options._[0]);

    // Build the new, command-local `argv` and `options`.
    if (command) {
      argv = argv.slice(argv.indexOf(options._[0]) + 1);
      options = self.parse(argv);
    } else if (self.strict) {
      return self.error('"%s" is not an slc command. See `slc help` for more information.', options._[0]);
    } else {
      command = self.getRun(self.fallback);
    }
  }

  if (!command) {
    throw new Error('No command loaded. This usually happens when no "help" command exists.');
  }

  process.env.SLC_COMMAND = command.name;
  command(argv, options, self);

  return self;
}

/**
 * Synchronously loads the Command module defined for `name`.
 *
 * Returns either a valid Command or null if the command could not be loaded.
 */
OCL.prototype.loadCommand = loadCommand;
function loadCommand(name) {
  var self = this;
  var module = null;
  var command = path.resolve(this.root, String(name));

  try {
    module = require(command);
  } catch (e) {
    if (e && e.code === 'MODULE_NOT_FOUND' && e.message.indexOf(command) != -1) {
      // In this case, the command was not found. Without the indexOf(), if the
      // command implementation had a buggy require of a module that couldn't be
      // found, it would be handled as if the command wasn't present.
      return null;
    }

    return self.error('Error loading module "%s":\n', name, e);
  }

  if (typeof module === 'function') {
    module = {
      name: name,
      run: module.run || module,
      usage: self.loadManual(name)
    };
    assert(module.usage, 'command ' + name + ' must have usage');
  } else {
    assert(typeof module === 'object',
      'Commands must export a Function or a {run,usage} Object.'
    );
    module.name = name;
  }

  if (!OCL.isCommand(module)) {
    return null;
  }

  return module;
}

/**
 * Returns the usage information for the `name` Command, represented as a
 * String. If `name` is not a valid command, returns `null`.
 */
OCL.prototype.getUsage = getUsage;
function getUsage(name) {
  var self = this;
  var module = self.loadCommand(name);

  return module ? module.usage : null;
}

/**
 * Returns the run function for the `name` Command. If `name` is not a valid
 * command, returns `null`.
 */
OCL.prototype.getRun = getRun;
function getRun(name) {
  var self = this;
  var module = self.loadCommand(name);

  return module ? module.run : null;
}

/**
 * Emits a new error event for user handling. Arguments are formatted as with
 * `util.format()`.
 */
OCL.prototype.error = error;
function error() {
  var self = this;
  var message = util.format.apply(null, arguments);

  self.emit('error', new Error(message));

  return self;
}

/**
 * Synchronously loads the manual file for `name` if it exists within the
 * configured `manuals` folder.
 *
 * Returns the file's contents if it exists; `null` otherwise.
 *
 * Files are expected to be in UTF-8 format.
 */
OCL.prototype.loadManual = loadManual;
function loadManual(name) {
  var self = this;
  var filename;

  if (!self.manuals) {
    return null;
  }

  filename = path.resolve(self.manuals, name);

  if (!fs.existsSync(filename)) {
    return null;
  }

  var usage = fs.readFileSync(filename, 'utf8');
  if(process.platform === 'win32') {
    var boldPair = new RegExp('.\b', 'g'); // any char, followed by a backspace
    var clean = usage.replace(boldPair, '');
    usage = clean;
  }
  return usage;
}

/*!
 * Export `OCL`.
 */
module.exports = OCL;
