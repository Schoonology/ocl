function test() {
  global.lastCommand = 'test';
}

module.exports = {
  run: test,
  usage: 'test test'
};
