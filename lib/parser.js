//Qube parser
//Copyright (c) 2014, Benjamin Norrington

function hashOf() {
	var ret = {};
	for (var i = arguments.length - 1; i >= 0; i--) {
		var k = arguments[i];
		ret[k] = k;
	}
	return ret;
}

//everything that can go in the head of a Cons
var heads = hashOf('Apply',
	'Set',
	'List',
	'Slice',
	'Optional',
	'Pattern',
	'Let',
	'Call' //deprecated
	);

/* M-Expr Parser */
var prefixes = {};
var postfixes = {};
var infixes = {};
var flat = 'flat';
var right = 'right';
var left = 'left';

var infix = function(pattern, name, prec, assoc) {
	if (!heads.hasOwnProperty(name)) heads[name] = name;
	infixes[pattern] = {
		'name': heads[name],
		'prec': prec,
		'assoc': assoc
	};
};

var prefix = function(pattern, name, prec) {
	if (!heads.hasOwnProperty(name)) heads[name] = name;
	prefixes[pattern] = {
		'name': heads[name],
		'prec': prec
	};
};

var postfix = function(pattern, name, prec) {
	if (!heads.hasOwnProperty(name)) heads[name] = name;
	postfixes[pattern] = {
		'name': heads[name],
		'prec': prec
	};
};

//TODO add function that takes the argument and returns the {head: ... , tail: ....} object
//  left, flat, right probably also make a difference to this function

//matchfix {x,y,z}
//compound x/:y=z
//overfix x\hat OverHat[x]

//forms containing #
//forms containing %
//forms containing _

//\& Overscript, right
//\+ Underscript right
//\+ \% Underoverscript
//\& \% Underoverscript

infix('.', '.', 7500, flat);

//Type specifier
infix(':','Type', 7450, right);

infix('_', 'Subscript', 7400, right);
//\_ \% Power[Subscript]

prefix('?', 'Help', 7300)
infix('?', 'PatternTest', 7300, flat);

var applyPrec = 7200;
//f[e]
//f[[e]]

//e++
//e--

//++e
//--e

//e1@e2,'e1[e2]',6900,right

//e1~e2~e3, 'e2[e1,e3]',6800,left

prefix('#', 'Index', 7000); //index of dimension
infix('#', 'IndexOf', 7100); //index of element in dimension
prefix('##', 'Count', 6900); //can probably use @ for index

//prefix('@', 'Name', 6800); //Don't really need this

//infix('/@', 'Map', 6700, right);
//infix('//@', 'MapAll', 6700, right);
//infix('@@', 'Apply', 6700, right);
//infix('@@@','Apply',6700,right) //Apply[e1,e2,{1}]


postfix('!', 'Factorial', 6600);
postfix('!!', 'Factorial2', 6600);

//postfix('^T','Transpose',6500);
postfix('^*', 'Conjugate', 6500);
//ConjugateTranspose

//postfix("'",'Derivative',6400) //Derivative[1][e]
//postfix("'''",...) //Derivative[n][e]

infix('<>', 'StringJoin', 6300, flat);

infix('^', 'Power', 6200, right);

//virt arrows
//sqrt
//integrate 5900
//??
//square,smallcircle
//infix('','CircleDot', 5600, flat)
//infix('**','NonCommutativeMultiply', 5500, flat);
//Cross
//Dot


prefix('-', 'Neg', 5200); //PreMinus
prefix('+', 'Noop', 5200);

infix('/', 'Divide', 5100, left);
infix('\u00f7', 'Divide', 5100, left);

//6 others

infix('*', 'Times', 4400, flat);
infix('\u00d7', 'Times', 4400, flat);

//6 others

infix('+', 'Plus', 3700, flat);
infix('-', 'Subtract', 3700, left);

//intersection
//union
//span

infix('...','RangeEx',3100,flat);
infix('..','Range',3100,flat);

infix('IN', 'In', 3050, right);

infix('==', 'Equal', 3000, flat);
infix('!=', 'Unequal', 3000, flat);
infix('\u2260', 'Unequal', 3000, flat);
infix('>', 'Greater', 3000, flat);
infix('>=', 'GreaterEqual', 3000, flat);
infix('\u2265', 'GreaterEqual', 3000, flat);
infix('<', 'Less', 3000, flat);
infix('<=', 'LessEqual', 3000, flat);
infix('\u2264', 'LessEqual', 3000, flat);
//Note these all have a special form Inequality[a,Less,b.LessEqual,c]

infix('\u2208', 'Element', 2500, flat); // \in
infix('\u2209', 'NotElement', 2500, flat); // \notin
//subset
//superset

//forall

prefix('!', 'Not', 2300, right);
prefix('\u00ac', 'Not', 2300, right);

infix('&&', 'And', 2200, flat);
//wedge

//xor

infix('||', 'Or', 2000, flat);
//vee

infix('->', 'Rule', 1100, right);

//replaceAll

// //

infix('=', 'Set', 300, right);

// >> Put //put to filename
// >>> PutAppend

var parse = function(ts) { //,multi) {
	var tokens = ts.reverse();
	var token = tokens.pop();
	var inslice = false;
	var memo;
	var ast;

	function getToken() { 
		token = tokens.pop();
		return token;
	}

	function getOperator(val) {
		if (token.value != val) {
			throw new Error("'" + val + "' expected but got {" + token.type + "} " + token.value);
		}
		return getToken();
	}

	function getA(head) {
		return function() {
			var t = [head, token.value];
			getToken();
			return t;
		};
	}

	var getNumber = getA('Number');
	var getString = getA('String');
	var getSymbol = getA('Symbol'); // we use Symbol to distinguish from built ins (to maintain no keywords)
	
	function getListLike(head,sep) {
		return function() {
			var node = [head];
			getToken();
		
			if (token.type === 'bracket' && token.value === sep) {
				getToken();
				return node;
			}
			getArguments(node);
			getOperator(sep);
		
			return node;
		};
	}

	getList = getListLike('List','}');
	getSlice = getListLike('Slice',']');
	getBracket = getListLike('Bracket',')');
	
	function getArguments(node) {
		while (true) {
			node.push(parseOperators(parsePrimary(),0));
			if (token.type !== 'comma') {
				break;
			}
			getToken();
		}
	}

	var _blanks = {
		'_': 'Blank',
		'_.': 'Blank',
		'__': 'BlankSequence',
		'___': 'BlankNullSequence'
	};

	function getBlank(symb) {
		var type = token.value,
			optional = false,
			blnk = [_blanks[type]];
		getToken();
		if (type === '_.') {
			return ['Optional',(symb ? ['Pattern', symb, blnk] : blnk)];
		}
		if (token.type === 'symbol') {
			blnk.push(getSymbol());
		}
		return (symb ? ['Pattern',symb,blnk] : blnk);
	}

	function getDotted(symb) {
		getToken();
		var rhs = getSymbol();
		var temp = symb.slice(0);
		temp.push(rhs[1]);
		if (token.type === 'operator' && token.value === '.') {
			return getDotted(temp);
		}
		return temp;
	}

	function getFactor() {
		var temp;
		if (token.type === 'symbol') {
			temp = getSymbol();
			if (token.type === 'blank') {
				return getBlank(temp);
			} else if (token.type === 'operator' && token.value === '.') {
				return getDotted(temp);
			}
			return temp;
		}
		if (token.type === 'blank') {
			return getBlank(false);
		}
		if (token.type === 'number') {
			return getNumber(false);
		}
		if (token.type === 'string') {
			return getString();
		}
		if (token.type === 'bracket') {
			switch (token.value) {
				case '(':
					return getBracket();
					//getToken();
					//temp = parseOperators(parsePrimary(), 0);
					//getOperator(')');
					//return ['Bracket',temp]; //add bracket so we can merge the flat stuff.
				case '{':
					return getList();
					//case '"': return getString();
					//case '%': //something about Out
					//case '#': //something about Slot
				case '[':
					return getSlice();
			}
		}
		// throw error
		return;
	}

	function getFunction(head) {
		var ast = ['Slice', head];
		inslice = true;
		getToken();
		if (token.type === 'bracket' && token.value === ']') {
			getToken();
			inslice = false;
			return parseArguments(ast); //we might be called again
		}
		getArguments(ast);
		getOperator(']'); //expect ']'
		inslice = false;
		return parseArguments(ast); //we might be called again
	}

	function getFunctionCall(head) {
		var ast = [heads.Call, head];
		getToken();
		if (token.type === 'bracket' && token.value === ')') {
			getToken();
			return parseArguments(ast); //we might be called again
		}
		getArguments(ast);
		getOperator(')'); //expect ']'
		return parseArguments(ast); //we might be called again
	}
	
	function parseArguments(lhs) {
		if (token.type === 'bracket' && token.value === '[')
			lhs = getFunction(lhs);
		if (token.type === 'bracket' && token.value === '(')
			lhs = getFunctionCall(lhs);
		return lhs;
	}
	
	function parseLookaheadOperator(min_prec) {
		var rhs = parsePrimary(), 
			lookahead = token;
		while (true) {
			if ((token.type === 'bracket' && (token.value === '{' || token.value === '(')) ||
				token.type === 'symbol' || token.type === 'number' || token.type === 'string') {
					// Juxtaposition means apply
					if (applyPrec >= min_prec) { // ||
					   //(applyPrec === min_prec && op.assoc === right)) {
						rhs = parseOperators(rhs, applyPrec);
						continue;
					}
					return rhs;
			} else {
				if (lookahead.type !== 'operator') {
					break;
				}
				if ((op = infixes[token.value])) {
					if (op.prec > min_prec || //This must be > and not >= for left assoc to work
					   (op.prec === min_prec && op.assoc === right)) {
						rhs = parseOperators(rhs,op.prec);
						continue;
					}
				} else if ((op = postfixes[token.value])) {
					if (op.prec > min_prec) {
						getToken();
						rhs = [op.name,rhs];
						continue;
					}
				}
			}
			break;
		}
		return rhs;
	}

	function parseOperators(lhs, min_prec) {
		var rhs = null, op;
		while (true) {
			if ((token.type === 'bracket' && (token.value === '{' || token.value === '(')) ||
				token.type === 'symbol' || token.type === 'number' || token.type === 'string') {
					// Juxtaposition means apply TODO: accept comma for multiple arguments
					if (applyPrec >= min_prec) {
						rhs = parseLookaheadOperator(applyPrec);
						lhs = parseArguments([lhs, rhs]);
						continue;
					}
					return lhs;
			} else {
				if (token.type !== 'operator') {
					//TODO handle special case for derivative
					break;
				}
				if ((op = infixes[token.value])) {
					if (op.prec >= min_prec) {
						getToken();
						rhs = parseLookaheadOperator(op.prec);
						if (inslice && op.name == 'Set')
							lhs = ['Let', lhs, rhs];
						else
							lhs = [op.name, lhs, rhs]; //{head:op.name, tail:[lhs,rhs]}; //TODO flat?
						lhs = parseArguments(lhs);
						continue;
					}
				} else if ((op = postfixes[token.value])) {
					if (op.prec >= min_prec) {
						getToken();
						lhs = [op.name,lhs]; //{head:op.name, tail:[lhs]};
						lhs = parseArguments(lhs);
						continue;
					}
				} else {
					throw new Error('Operator ' + token.value + ' is not infix or postfix.');
				}
				
			}
			break;
		}
		return lhs;
	}

	function parsePrimary() {
		var po, temp;
		if (token.type === 'operator') {
			//if (token.value === '.') // special parse a dot at the start of a number
			if ((po = prefixes[token.value])) {
				getToken();
				temp = parseLookaheadOperator(po.prec);
				//TODO do something special if Neg and temp is Number
				return [po.name, temp];
			}
		}
		return parseArguments(getFactor());
	}
	
	//if (multi) {
		ast = [];
		while (tokens.length > 0) {
			memo = parseOperators(parsePrimary(), 0);
			if (token.type !== 'EOL') {
				var err = [];
				while (tokens.length > 0 && token.type !== 'EOL') {
					err.push(token.type + ':' + token.value);
					getToken();
				}
				ast.push(['Error', 'Unexpected tokens before end of line', memo, err]);
			} else {
				ast.push(memo);
			}
			getToken();
		} 
	//} else {
	//	ast = parseOperators(parsePrimary(), 0);
	//	if (tokens.length > 0 && token.type !== 'EOL')
	//		throw new Error('End of line not reached. ' + tokens[0].type + ':' + tokens[0].value);
	//}
	return ast;
};


//Pretty printing

//TODO: this needs to take a prec so we can
// avoid too many brackets in output.
function showMr(s, skip) {
	if (s === undefined) return 'NULL';
	if (!skip && s.originalSexpr !== undefined) return showMr(s.originalSexpr);
	switch (s[0]) {
		case 'Number': return s[1].toString();
		case 'String': return s[1];
		case 'Symbol': return s.slice(1).join('.');
		case 'List':   return '{' + s.slice(1).map(showMr).join(', ') + '}';
		case 'Over':
		case 'Slice':  return showMr(s[1], true) + '[' + s.slice(2).map(showMr).join(', ') + ']';
		case 'Call':   return showMr(s[1], true) + '(' + s.slice(2).map(showMr).join(', ') + ')';
		case 'Set':
		case 'Set*':
		case 'Let': return showMr(s[1], true) +'=' + showMr(s[2]);
		case 'LetS':
			if (s[1][0] === 'Index' && s[2][0] === 'IndexOf') {
				return showMr(s[3], true) + '[' + showMr(s[1][1], true) + '=' + showMr(s[2][2], true) + ']';
			}
		case 'Neg': return '(-' + showMr(s[1]) + ')';
		case 'Plus': return '(' + s.slice(1).map(showMr).join(' + ') + ')';
		case 'Times': return '(' + s.slice(1).map(showMr).join(' * ') + ')';
		case 'Subtract': return '(' + s.slice(1).map(showMr).join(' - ') + ')';
		case 'Divide': return '(' + s.slice(1).map(showMr).join(' / ') + ')';
		case 'Power': return '(' + s.slice(1).map(showMr).join('^') + ')';
		case 'Bracket': return '(' + showMr(s[1], true) + ')';
		case 'Equal': return showMr(s[1], true) + '==' + showMr(s[2])
		case 'Restrict': return showMr(s[2], true) + '[' + showMr(s[1]) + ']';
		case 'JSON':
		case 'Raw': return JSON.stringify(s[1]);
		//TODO: make the infix check 
		default: return showS(s);
	}
}

function showM(s) {
	return ['String', showMr(s)];
}

var simple = /^\S+$/;
function showS(sexp) {
	//if (sexp instanceof Cons)
	//	return '(' + sexp.head + ' ' + sexp.tail.map(show).join(' ') + ')';
	//if (typeof(sexp) === 'number')
	//	return sexp.toString();
	//if (typeof(sexp) === 'string')
	//	return '"' + sexp + '"';
	if (sexp instanceof Array)
		return '(' + sexp.map(showS).join(' ') + ')';
	else if ((sexp instanceof String || typeof sexp === 'string'))
		return (simple.test(sexp) ? sexp : '`' + sexp + '`');
	else if (sexp === undefined)
		return 'NULL';
	return sexp.toString();
}

exports.parse = parse;
exports.showM = showM;
exports.showMr = showMr;
exports.showS = showS;