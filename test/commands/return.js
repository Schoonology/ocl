function _return() {
  global.lastCommand = 'return';
  return 42;
}

module.exports = {
  run: _return,
  usage: 'test return'
};
