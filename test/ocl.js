var path = require('path');
var Loader = require('../');
var expect = require('chai').expect;

var ROOT_DIR = path.resolve(__dirname, 'commands');
var MAN_DIR = path.resolve(__dirname, 'manuals');

function _createLoader(options) {
  return Loader.createLoader(options || {
    root: ROOT_DIR,
    fallback: 'fallback',
    default: 'index',
    manuals: MAN_DIR
  });
}

describe('Optimist Command Loader', function () {
  it('should exist', function () {
    expect(Loader).to.be.a('function');
    expect(Loader.createLoader).to.be.a('function');
  });

  describe('createLoader', function () {
    it('should require a root directory', function () {
      expect(function () {
        Loader.createLoader();
      }).to.throw('Root directory is required.');
    });

    it('should return a Loader', function () {
      var loader = Loader.createLoader({
        root: ROOT_DIR
      });

      expect(loader).to.be.an.instanceof(Loader);
    });
  });

  describe('parse', function () {
    var loader;

    beforeEach(function () {
      loader = _createLoader();
    });

    it('should require an Array', function () {
      expect(function () {
        loader.parse();
      }).to.throw('argv must be an Array.');
    });

    it('should return an object', function () {
      expect(loader.parse([])).to.be.an('object');
    });

    it('should store short flags', function () {
      expect(loader.parse(['-f'])).to.have.property('f', true);
    });

    it('should store short options', function () {
      expect(loader.parse(['-f', '42'])).to.have.property('f', 42);
    });

    it('should store long flags', function () {
      expect(loader.parse(['--foo'])).to.have.property('foo', true);
    });

    it('should store long options', function () {
      expect(loader.parse(['--foo', '42'])).to.have.property('foo', 42);
    });

    it('should store args in _', function () {
      expect(loader.parse(['foo'])).to.have.property('_')
        .an.instanceof(Array)
        .that.deep.equals(['foo']);
    });

    it('should accept optimist options', function () {
      expect(loader.parse([], {
        foo: {
          default: 'bar'
        }
      })).to.have.property('foo', 'bar');
    });
  });

  describe('run', function () {
    var loader;

    beforeEach(function () {
      global.lastCommand = null;
      loader = _createLoader();
    });

    it('should run any provided command', function () {
      loader.run(['test']);

      expect(global.lastCommand).to.equal('test');
    });

    it('should fallback appropriately', function () {
      loader.run(['doesnotexist']);

      expect(global.lastCommand).to.equal('fallback');
    });

    it('should default appropriately', function () {
      loader.run([]);

      expect(global.lastCommand).to.equal('default');
    });

    it('should return the command return value', function () {
      expect(loader.run(['return'])).to.equal(42);
    });
  });

  describe('loadCommand', function () {
    var loader;

    beforeEach(function () {
      global.lastCommand = null;
      loader = _createLoader();
    });

    it('should return a {run,usage} object for object commands', function () {
      var command = loader.loadCommand('test');

      expect(command).to.be.an('object');
      expect(command).to.have.property('run').a('function');
      expect(command).to.have.property('usage').a('string');

      command.run();

      expect(global.lastCommand).to.equal('test');
    });

    it('should return a {run,usage} object for function commands', function () {
      var command = loader.loadCommand('function');

      expect(command).to.be.an('object');
      expect(command).to.have.property('run').a('function');
      expect(command).to.have.property('usage').a('string');

      command.run();

      expect(global.lastCommand).to.equal('function');
    });

    it('should return null for missing commands', function () {
      expect(loader.loadCommand('doesnotexist')).to.equal(null);
    });

    it('should return null for invalid commands', function () {
      expect(loader.loadCommand('invalid')).to.equal(null);
    });

    it('should load usage from files for function commands', function () {
      var command = loader.loadCommand('function');

      expect(command).to.have.property('usage', 'test function\n');

      command.run();

      expect(global.lastCommand).to.equal('function');
    });
  });

  describe('getUsage', function () {});
  describe('getRun', function () {});
  describe('loadManual', function () {});
});
