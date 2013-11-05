function fallback() {
  global.lastCommand = 'fallback';
}

module.exports = {
  run: fallback,
  usage: 'test fallback'
};
