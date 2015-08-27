var parser = require('./parser');

module.exports = {
	Qube:    require('./lib/qube').Qube,
	parse:   parser.parse,
	showS:   parser.showS,
	showMr:  parser.showMr,
	lex:     require('./lib/lexer'),
	prelude: require('./lib/prelude'),
};