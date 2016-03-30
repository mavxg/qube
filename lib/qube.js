//Copyright (c) 2014 "Benjamin Norrington"

var parser = require('./parser');
var showS = parser.showS;
var showMr = parser.showMr;
var lex = require('./lexer');

function Qube(functions) {
	this.functions = functions; //and macros etc
	this._cells = [];
	this.environment = {};
	this._dataCache = {};
	this.dirty = false;

	//used by build
	this._genSyms = {};
	this._genSymCount = {};
	this.ast = {};
};
Qube.prototype.extend = function(extension) {
	var functions = {};
	for (var k in this.functions) {
		if (this.functions.hasOwnProperty(k))
			functions[k] = this.functions[k];
	}
	for (var k in extension) {
		if (extension.hasOwnProperty(k))
			functions[k] = extension[k];
	}
	this.functions = functions;
};
Qube.prototype.dataCache = function() {
	return this._dataCache;
};
Qube.prototype.clear = function(clearCaches) {
	this._cells = [];
	if (clearCaches) {
		//this._cache = {};
	}
};
Qube.prototype.expr = function(sexpr) {
	var cell = new Cell(sexpr);
	this._cells.push(cell);
	return cell;
};
Qube.prototype.exprs = function(sexprs) {
	return sexprs.map(this.expr,this);
};


function objectEquals(x, y) {
    'use strict';

    if (x === null || x === undefined || y === null || y === undefined) { return x === y; }
    // after this just checking type of one would be enough
    if (x.constructor !== y.constructor) { return false; }
    // if they are functions, they should exactly refer to same one (because of closures)
    if (x instanceof Function) { return x === y; }
    // if they are regexps, they should exactly refer to same one (it is hard to better equality check on current ES)
    if (x instanceof RegExp) { return x === y; }
    if (x === y || x.valueOf() === y.valueOf()) { return true; }
    if (Array.isArray(x) && x.length !== y.length) { return false; }

    // if they are dates, they must had equal valueOf
    if (x instanceof Date) { return false; }

    // if they are strictly equal, they both need to be object at least
    if (!(x instanceof Object)) { return false; }
    if (!(y instanceof Object)) { return false; }

    // recursive object equality check
    var p = Object.keys(x);
    return Object.keys(y).every(function (i) { 
    	return p.indexOf(i) !== -1; }) &&
        p.every(function (i) { return objectEquals(x[i], y[i]); });
}


function has_changed(old, now) {
	if (old.length !== now.length) return true;
	for (var i=old.length-1;i>=0;i--)
		if (old[i].originalSexpr !== now[i]) return true;
	return false;
}
Qube.prototype.recalculate = function() {
	if (this.onRecalculate) this.onRecalculate();
}
//merge assumes you want all the results of all the expressions
// you asked for and will execute everything for you.
Qube.prototype.merge = function(sexprs) {
	var old_cells = this._cells;
	if (!this.dirty && !has_changed(old_cells, sexprs)) return [];
	console.log('merge recalculating');
	//TODO: make this smarter so we don't do a full
	// recalculate for a change of just an expression
	this.clear();
	this.exprs(sexprs);
	this.build();
	//Only return cells where the result has changed.
	//Collect old cells by unique context hash or node id
	var olds = {};
	old_cells.forEach(function(c) {
		var h = c.context.hash || c.context.node;
		olds[h] = c;
	});
	var ret = [];
	this._cells.forEach(function(c) {
		var h = c.context.hash || c.context.node;
		var old = olds[h];
		if (!old || !objectEquals(old.result(), c.result())) {
			c.changed = true;
			if (old) console.log(old.result())
			console.log(c.result())
		}
			
	});
	this.dirty = false;
	return this._cells;
};
Qube.prototype.build = function() {
	var me = this;
	//compile the qube into javascript
	this.environment = {};
	this.environment._Functions = this.functions;
	this.environment._Cube = me;

	var functions = {};
	var expressions = {};
	var dimensions = {};
	var unsatisfieds = {};

	var environment = this.environment;

	this.ast = functions;
	this.dimensions = dimensions;
	this.unsatisfieds = unsatisfieds;

	function collect(sexpr, node, index) {
		//collect together functions/expressions
		switch(sexpr[0]) {
   			case 'Set*':
   			case 'Set':
   				if (sexpr[1][0] !== 'Symbol') {
   					node.errors.push('Cannot Set '+ showS(sexpr[1]));
   				} else {
   					fkey = enDot(sexpr[1]);
   					if (!functions.hasOwnProperty(fkey) || 
   						functions[fkey][0] === 'KeyDefs') {
   						functions[fkey] = [(sexpr[0] === 'Set*' ? 'Func*' : 'Func'), sexpr[1]];
   						functions[fkey].sourceNode = node;
   					}
   					sexpr[2].sourceNode = node;
   					functions[fkey].push(sexpr[2]); //just rhs
   				}
   				break;
   			case 'KeyDefs':
   				//[KeyDefs symbol function..] ... used as a fallback for
   				// category definition
   				if (sexpr[1][0] !== 'Symbol') {
   					node.errors.push('Cannot create Category ' + showS(sexpr[1]));
   				} else {
   					fkey = enDot(sexpr[1]);
   					if (!functions.hasOwnProperty(fkey)) {
   						functions[fkey] = sexpr;
   						dimensions[fkey] = sexpr;
   						sexpr.dimensions = [fkey];
   						sexpr.sourceNode = node;
   					} else if (functions[fkey][0] === 'KeyDefs') {
   						functions[fkey].push(sexpr[2]); //just rhs
   					}
   				}
   				break;
   			case 'Category':
   				if (sexpr[1][0] !== 'Symbol') {
   					node.errors.push('Cannot create Category ' + showS(sexpr[1]));
   				} else {
   					fkey = enDot(sexpr[1]);
   					if (!functions.hasOwnProperty(fkey) || 
   						functions[fkey][0] === 'KeyDefs') {
   						functions[fkey] = sexpr;
   						dimensions[fkey] = sexpr;
   						sexpr.dimensions = [fkey];
   						sexpr.sourceNode = node;
   					} else {
   						node.errors.push('Cannot redefine Category ' + showS(sexpr[1]));
   					}
   				
   				}
   				break;
   			case 'Rule':
   				node.errors.push('Rules not implemented');
   				break;
   			case 'Do':
   				for (var i = 1; i < sexpr.length; i++) {
   					collect(sexpr[i], node, index);
   				};
   				break;
   			default:
   				//expression
   				sexpr.sourceNode = node;
   				expressions[index] = sexpr; //last expression wins
   		}
	}

	//TODO: collect rules
	//  rules cannot have dimensions so they can be directly compiled
	//  change preProcessSexpr to apply rules

	//collect cells into functions/expressions
	this._cells.forEach(function(cell, index) {
		//find functions and expression
		cell.sexpr = preProcessSexpr(me, cell.sexpr);
		clearDimensions(cell.sexpr);
		collect(cell.sexpr, cell, index);
	});

	//find dimensions (over functions) 
	for (var fkey in functions) {
		findDimensions(functions[fkey], functions, dimensions, unsatisfieds);
	}

	//annotateDimensions
	var hasChanged = [];
	hasChanged[0] = true;
	var pass = 0;
	var maxPasses = 10;

	while (hasChanged[0] && pass < maxPasses) {
		hasChanged[0] = false;
		for (var fkey in functions) {
			if (!functions.hasOwnProperty(fkey)) continue;
			try {
				annotateDimensions(functions[fkey], pass, hasChanged, functions);
			} catch (e) {
				if (functions[fkey].sourceNode)
					functions[fkey].sourceNode.errors.push(e.toString());
			}
		}
		pass = pass + 1;
	}
	if (pass === maxPasses) {
		throw new Error('Dimensions Error: Could not infer dimensions');
	}

	//compile functions
	for (var fkey in functions) {
		if (!functions.hasOwnProperty(fkey)) continue;
		//try {
			environment[fkey] = compileFunc(me, functions[fkey]);
		//} catch (e) {
		//	if (functions[fkey].sourceNode)
		//		functions[fkey].sourceNode.errors.push(e.toString());
		//}
	}
	//compile expressions
	for (var index in expressions) {
		if (!expressions.hasOwnProperty(index)) continue;
		try {
			var comp = _compileExpression(me, expressions[index]);
			me._cells[index].compiled = comp;
			me._cells[index].isExpression = true;
		} catch (e) {
			me._cells[index].errors.push(e.toString());
		}
	}

	if (me.onUpdate) me.onUpdate(this.environment);

	return this.environment;
};

function _compileExpression(me, sexpr) {
	sexpr = preProcessSexpr(me, sexpr);
	annotateDimensions(sexpr, 0, [], me.ast);
	sexpr = resolveExcessDimensions(me, sexpr);
	return compileExpression(me, sexpr);
}

Qube.prototype.eval = function(sexpr) {
	//instant eval of an expression returning the result
	// -- use for context sensitive help..
	return _compileExpression(this, sexpr)();
};
Qube.prototype.meval = function(mexpr) {
	return this.eval(parser.parse(lex(mexpr))[0])
};
Qube.prototype._genSymbol = function(val) {
	if (this._genSyms[val] !== undefined)
		return this._genSyms[val];
	var hint = camelCase(val);
	if (this._genSymCount.hasOwnProperty(hint)) {
		this._genSyms[val] = hint + '_' + this._genSymCount[hint];
		this._genSymCount[hint] += 1;
	} else {
		this._genSymCount[hint] = 1;
		this._genSyms[val] = hint;
	}
	return this._genSyms[val];
};

function Cell(sexpr) {
	this.originalSexpr = sexpr.originalSexpr || sexpr;
	this.context = sexpr.context || {};
	this.sexpr = JSON.parse(JSON.stringify(sexpr));
	this.errors = [];
}

Cell.prototype.result = function() {
	if (this._result !== undefined) return this._result;
	if (this.errors.length > 0) return this.errors;
	if (!this.compiled) return;
	try {
		this._result = this.compiled();
		return this._result;
	} catch (e) {
		this.errors.push(e.toString());
		return this.errors;
	}
};

//Private methods

function preProcessSexpr(me, sexpr) {
	//TODO: the expand transform should be 
	//  a reduce with the whole set getting
	//  rerun if it changes.
	//sexpr = transform(me, sexpr, expandRules);
	sexpr = transform(me, sexpr, expandMacros);
	sexpr = expandNamespace(sexpr);
	sexpr = normaliseHead(sexpr);
	sexpr = transform(me, sexpr, expandDict);
	sexpr = transform(me, sexpr, expandSlice);
	return sexpr;
}

function setUnion(l,r) {
	var u = l.slice(0);
	for (var i = r.length - 1; i >= 0; i--) {
		var re = r[i];
		if (l.indexOf(re) === -1) u.push(re);
	};
	return u;
}

function setEqual(l, r) {
	if (l.length !== r.length)
		return false;
	for (var i = l.length - 1; i >= 0; i--) {
		if (r.indexOf(l[i]) === -1) return false;
	}
	return true;
}

function setSubtract(l, r) {
	var ret = [];
	for (var i = l.length - 1; i >= 0; i--) {
		var le = l[i];
		if (r.indexOf(le) === -1) ret.push(le);
	}
	return ret;
}

function clearDimensions(expr) {
	if (expr.dimensions !== undefined) {
		expr.dimensions = undefined;
		for(i=expr.length - 1; i > 0; i--)
			if (expr[i] instanceof Array)
				clearDimensions(expr[i]);
	}
}

function annotateDimensions(expr, pass, hasChanged, functions) {
	if (typeof(expr) === 'string' || expr === undefined || expr === null)
		return [];
	if (expr.dimensions !== undefined) { 
		if (expr.pass === pass) {
			return expr.dimensions;
		}
	} else {
		expr.dimensions = [];
	}
	expr.pass = pass;

	var subtract = setSubtract;
	var union = setUnion;
	var equal = setEqual;

	var ret = [];
	var x, pack, name, i, temp;
	switch(expr[0]) {
		case 'LetS':
			//(LetS symb value expr)
			ret = annotateDimensions(expr[3], pass, hasChanged, functions);
			var symb = annotateDimensions(expr[1], pass, hasChanged, functions);
			var value = annotateDimensions(expr[2], pass, hasChanged, functions);
			if (symb.length > 1)
				throw new Error('Category Error ' + 
					showS(expr[1]) + 
					' used as category but has dimensions ' + symb);
			ret = subtract(ret, symb);
			ret = union(ret, value);
			break;
		case 'IndexOf': // dim(IndexOf (Symb ..), value) is dim(value)
			annotateDimensions(expr[1], pass, hasChanged, functions); //label category
			return annotateDimensions(expr[2], pass, hasChanged, functions);
		case 'Category':
			x = annotateDimensions(expr[2], pass, hasChanged, functions);
			if (x.length > 0)
				throw new Error('Categories cannot vary over another category: ' + 
					showS(expr));
			return expr.dimensions;
		case 'Symbol':
			temp = functions[enDot(expr)];
			if (temp) {
				ret = annotateDimensions(temp, pass, hasChanged, functions);
			}
			//else (nothing)
			break;
		case 'Number':
			return expr.dimensions;
		case 'String':
		case 'Raw':
		case 'JSON':
			return expr.dimensions;
		case 'Over':
			temp = annotateDimensions(expr[1], pass, hasChanged, functions);
			var u = {};
			for(i=expr.length - 1; i > 1; i--) {
				if (expr[i] instanceof Array)
					x = annotateDimensions(expr[i], pass, hasChanged, functions);
					if (x.length > 1) {
						throw new Error('Category Error: ' + 
							showS(expr[i]) + 
							' use as category but has multiple dimensions');
					}
					u[x[0]] = true;
			}
			for (i = temp.length - 1; i >= 0; i--) {
				if (!u.hasOwnProperty(temp[i]))
					ret.push(temp[i]);
			}
			break;
		case 'RemDims':
			temp = annotateDimensions(expr[1], pass, hasChanged, functions);
			var rem = annotateDimensions(expr[2], pass, hasChanged, functions);
			ret = [];
			temp.forEach(function(d) {
				if (rem.indexOf(d) === -1) ret.push(d);
			});
			break;
		case 'NoDim': //NoDim has no dimensions
			annotateDimensions(expr[1], pass, hasChanged, functions);
			ret = [];
			break;
		case 'Func':
			for(i=expr.length - 1; i > 1; i--) {
				if (expr[i] instanceof Array)
					ret = union(ret, 
						annotateDimensions(expr[i],pass, hasChanged, functions));
			}
			break;
		default:
			for(i=expr.length - 1; i > 0; i--) {
				if (expr[i] instanceof Array)
					ret = union(ret, 
						annotateDimensions(expr[i],pass, hasChanged, functions));
			}
	}
	if (!equal(ret,expr.dimensions)) {
		expr.dimensions = ret;
		hasChanged[0] = true;
	}
	return expr.dimensions;
}


function enDot(symbol) {
	return symbol.slice(1).join('.')
}

function unDot(str) {
	var symb = ['Symbol'];
	Array.prototype.push.apply(symb, str.split('.'));
	return symb;
}


//func takes non atom and path
function visit(ast, func, path, index) {
	if (path === undefined) path = [];
	func(ast, path, index);
	path.push(ast[0]);
	for(var i=0; i<ast.length; i++) {
		var node = ast[i];
		if (node instanceof Array) {
			visit(node, func, path, i);
		}
	}
	path.pop();
}

//FIX: factor out the unsatisfieds dummying
function findDimensions(expr, functions, dimensions, unsatisfieds) {
	function addDimension(symb) {
		var fkey = enDot(symb);
		if (!functions.hasOwnProperty(fkey)) {
			unsatisfieds[fkey] = true;
			functions[fkey] = ['Category', symb, ['List']];
			functions[fkey].dimensions = [fkey];
		}
		dimensions[fkey] = functions[fkey];
	}

	visit(expr, function(ast, path, index) {
		var lhs;
		switch (ast[0]) {
			case 'LetS':
			case 'LetG': {
				lhs = ast[1];
				if (lhs[0] === 'Symbol')
					addDimension(lhs);
				break;
			}
			case 'Over':
			case 'Indexed': {
				//all symbols are dimensions (Over expr symb..)
				for (var i = ast.length - 1; i >= 2; i--) {
					addDimension(ast[i]);	
				}
				break;
			}
			case 'Count': //param must be a dimension
			case 'Index': //param must be a dimension
			case 'IndexOf': //lhs must be a dimension
			case 'Name': //param must be a dimension
				lhs = ast[1];
				if (lhs !== undefined && lhs[0] === 'Symbol')
					addDimension(lhs);
				break;
		}
	});
}

function head(node) {
	if (node instanceof Array) return node[0];
}

function normaliseHead(sexpr) {
	switch (head(sexpr)) {
		case 'Set*':
		case 'Set': {
			var s = head(sexpr);
			lhs = sexpr[1];
			expr = sexpr[2];
			if (head(lhs)==='Slice') {
				var guards = lhs.slice(0); //shallow copy
				guards[0] = 'Guards';
				guards[1] = expr;
				if (guards.length === 2) {
					//guards[2] = lhs[1]; //add self if this was an empty slice
					return ['Category', lhs[1], expr];
				} else {
					return normaliseHead([s, lhs[1], guards]);
				}
			}
			break;
		}
		case 'Do':
			for (var i = 1; i < sexpr.length; i++) {
				sexpr[i] = normaliseHead(sexpr[i]);
			};
			break;
	}
	return sexpr;
}

function expandNamespace(sexpr, ns, context) {
	if (!(sexpr instanceof Array)) return sexpr;
	var fkey, i, n;
	context = context || {};
	switch(sexpr[0]) {
		case 'Call':
			if (sexpr[1][0] === 'Symbol') {
				return sexpr.map(function(expr, i) {
					if (i < 2) return expr; //don't expand the call symbol
					return expandNamespace(expr, ns, context);
				});
			}
			break;
		case 'Namespace':
			if (sexpr[1] !== null && sexpr[1][0] === 'Symbol') {
				if (ns)
				    ns = ns.slice(0);
				else
					ns = [];
				Array.prototype.push.apply(ns, sexpr[1].slice(1));
			}
			n = ['Do'];
			Array.prototype.push.apply(n, sexpr.slice(2));
			return expandNamespace(n, ns, context);
		case 'Symbol':
			if (ns !== undefined) {
				fkey = enDot(sexpr);
				if (context[fkey]) return sexpr; //don't rename captured symbols
				n = ['Symbol'];
				Array.prototype.push.apply(n, ns);
				Array.prototype.push.apply(n, sexpr.slice(1));
				return n;
			}
			return sexpr;
		case 'Set':
			if (sexpr[1][0] === 'Symbol' && 
				sexpr[2][0] === 'Namespace') {
				// X = Namespace _ ... goes to Namespace X ...
				n = sexpr[2].slice(0);
				n[1] = sexpr[1];
				return expandNamespace(n, ns, context);
			}
			break; //default
		case 'Rule':
			if (sexpr[1] && sexpr[1][0] === 'Bracket') {
				context = Object.create(context);
				sexpr[1].slice(1).forEach(function(s) {
					if (s === undefined) return;
					context[enDot(s)] = true;
				});
			}
	}
	return sexpr.map(function(expr) {
		return expandNamespace(expr, ns, context); 
	});
}

function expandMacros(me, sexpr) {
	var rep;
	var symb = sexpr[1];

	if (sexpr[0] !== 'Call' || symb[0] !== 'Symbol')
		return sexpr;

	var macro = me.functions;
	//TODO: swap symbol around
	for (var i = 1; i < symb.length; i++) {
		macro = macro[symb[i]];
		if (macro === undefined) break;
	};
	if (!macro || !macro.isMacro) return sexpr;

	rep = macro.apply(me, sexpr.slice(2));

	if (rep !== undefined) {
		rep.originalSexpr = sexpr.originalSexpr || sexpr;
		return rep;
	}

	return sexpr;
}

function expandSlice(me, expr) {
	var ret;

	function _slice(expr) {
		var ret = expr[1];
		var overs = ['Over', 0];
		for (var i = expr.length - 1; i >= 2; i--) {
			var para = expr[i];
			switch(para[0]) {
				case 'Let':
					ret = expandSlice(me, ['LetS', para[1], para[2], ret]);
					break;
				case 'Symbol':
					overs.push(para);
					break;
				default:
					ret = ['Restrict', para, ret];
			}
		}
		//wrap over on the outside
		overs[1] = ret;
		return (overs.length > 2) ? overs : ret;
	}

	function _letS(expr) {
		//(LetS symb value expr) -> (LetS (Index symb) (IndexOf symb value) expr)
		if (expr[1][0] === 'Symbol')
		{
			var symb = expr[1];
			var value = expr[2];
			var exp = expr[3];
			return ['LetS', ['Index', symb], ['IndexOf', symb, value], exp];
		}
	}

	function _guards(expr) {
		var ret = expr[1];
		var overs = ['Indexed', 0];
		var i, para;
		for (i = expr.length - 1; i >= 2; i--) {
			para = expr[i];
			if (para[0] === 'Symbol')
				overs.push(['Index', para]);
		}
		//wrap indexed on the inside
		if (overs.length > 2) {
			overs[1] = ret;
			ret = overs;
		}
		for (i = expr.length - 1; i >= 2; i--) {
			para = expr[i];
			switch(para[0]) {
				case 'Let':
					ret = ['LetG', para[1], para[2], ret];
					break;
				case 'Symbol':
					break;
				default:
					ret = ['Restrict', para, ret];
			}
		}
		return ret;
	}

	switch(expr[0]) {
		case 'Slice': ret = _slice(expr); break;
		case 'LetS': ret = _letS(expr); break;
		case 'Guards': ret = _guards(expr); break;
	}
	if (ret !== undefined) {
		ret.originalSexpr = expr.originalSexpr || expr;
		return ret;
	}

	return expr;
}

function expandDict(me, expr) {
	var ret;
	if(expr[0] === 'List' && expr[1] &&
		(expr[1][0] === 'Set' || expr[1][0] === 'Rule')) {
		ret = ['Dict'];
		for (var i = 1; i < expr.length; i++) {
			var pair = expr[i];
			switch(pair[0]) {
				case 'Set':
				case 'Rule':
					ret.push(['Pair'].concat(pair.slice(1)));
					break;
				default:
					ret = ['Error', 'Dictionary entries must all be of the form a -> b or a = b'];
					ret.originalSexpr = expr.originalSexpr || expr;
					return ret;
			}
		}
		ret.originalSexpr = expr.originalSexpr || expr;
		expr = ret;
	}
	return expr;
}

//called by compiler not by transform
function expandPostMacros(me, sexpr) {
	var symb, rep;
	
	if (sexpr[0] !== 'PostMacro')
		throw new Exception('Cannot expand non post macro' + showS(sexpr));

	symb = sexpr[1];
	
	if (symb[0] !== 'Symbol' || symb.length !== 2) return expr;

	var macro = me.functions;
	//TODO: swap symbol around
	for (var i = 1; i < symb.length; i++) {
		macro = macro[symb[i]];
		if (macro === undefined) break;
	};
	if (!macro || !macro.isPostMacro) return sexpr;

	rep = macro.apply(me, sexpr.slice(2));

	if (rep !== undefined) {
		rep.originalSexpr = sexpr.originalSexpr || sexpr;
		return rep;
	}

	return sexpr;
}

function expandExcessDimensions(sexpr) {
	var dims = sexpr.dimensions;
	if (sexpr[0] !== 'List') {
		sexpr = [sexpr];
	} else {
		sexpr = sexpr.slice(1);
	}
	var over = ['Over',sexpr];

	dims.forEach(function(d) {
		var s = d.split('.');
		s.unshift('Symbol');
		s.dimensions = [d];
		sexpr.unshift(s);
		over.push(s);
	});
	sexpr.unshift('List');
	sexpr.dimensions = dims;
	over.dimensions = [];
	return over;
}

function resolveExcessDimensions(me, sexpr) {
	var expr2;
	//TODO: this next line is hiding a bug elsewhere
	if (sexpr.dimensions === undefined) sexpr.dimensions = [];
	else if (sexpr.dimensions.length > 0) {
		expr2 = expandExcessDimensions(sexpr);
		expr2.sourceNode = sexpr.sourceNode;
		sexpr = expr2;
		annotateDimensions(expr, 0, [], me.ast); 
	}
	return sexpr;
}

function _compileFunc(me, code, sexpr) {
    var func;
    var dims = sexpr.dimensions.map(me._genSymbol, me);

    function _undefined() { return; }

    try {
        /*jshint evil:true */
        func = new Function(dims, code);
        func.source = code;
    } catch (er) {
        console.log('Could not compile: ' + code);
        console.log(er.message);
        func = _undefined;
    }
    switch(sexpr[0]) {
    	case 'KeyDefs' :
        case 'Category': return indexed(func, me.environment);
        case 'Func*':    return unmemoize(func);
        default:         return memoize(func);
    }
}

function compileExpression(me, sexpr) {
	var func = _compileFunc(me, 
		'var env = this; return (' + 
    		compileExpr(me, sexpr) + ');', sexpr);
	return func.bind(me.environment);
}

function compileFunc(me, sexpr) {
    var func = _compileFunc(me,
    	'var env = this;' + 
    	compileExpr(me, sexpr), sexpr);
    return func;
}

function compileRule(me, sexpr) {
	throw "Unimplemented: compileRule";
}

function isFunction(me, symb) {
	var base = me.functions;
	for (var i = 1; i < symb.length; i++) {
		var name = symb[i]
		if (base[name] === undefined) return false;
		base = base[name];
	}
	return true;
}

function compileOver(me, expr, context) {
	var exp = compileExpr(me, expr[1], context);
	var dims = expr.dimensions.map(me._genSymbol, me).join(', ');
	var retDims = expr.slice(2).map(function(e) { 
		return '"' + e.dimensions[0] + '"'; });
	var overs = expr.slice(2).map(function(e) { 
		//var pack = e.dimensions[0].split('.',1)[0];
		//var name = e.dimensions[0].slice(pack.length+1);
		return {//pack: pack,
				name: e.dimensions[0],
				sym: me._genSymbol(e.dimensions[0]) ,
			};
		});

	var vars = '    var _k0m = 1';
	var ends = [];
	var starts = [];
	var indexes = [];
	var headers = (expr[1] && expr[1][0] === 'List') ? expr[1].slice(1) : [expr[1]];
	overs.forEach(function(o, i) {
		var obj = 'env["' + o.name + '"]';
		indexes.push('_k' + (i+1));
		vars = vars + ', _k' + (i+1) + ', _k' + (i+1) +
		'm = _k'+ i +'m * ' + obj +'.len()'; //.len must be defined on category
		starts.push(obj + '.forEach(function(v, ' + o.sym + ') {\n_k' + (i+1) + ' = _k' + i +'m * ' + o.sym + ';');
		ends.push('})');
	});
	//var t = dims.length	> 0 ? 'this, ' : 'this'
	var ov = '(function(' + dims + ') { var _ret=[], _val;\n' + vars + ';\n' +
	 starts.join('\n    ') +
	 '\n_val = '+exp+';\nif (_val !== undefined) _ret['+ indexes.join(' + ') +'] = _val;\n' +
	 ends.join('') +
	 ';\n_ret.headers = [' + headers.map(function(e) { return '"' + showMr(e) + '"'; }).join(', ') + ']' +
	 ';\n_ret.dimensions = ['+ retDims.join(', ') +'];\nreturn _ret; \n}('+ dims + '))';
	return ov;
};

//TODO: (Symbol name parent grandparent)
//   current is other way up.

function compileExpr(me, expr, context) {
	var ex, pack, name;
	context = context || {};

	function pairWise(expr, spacer) {
		return expr.slice(1).map(function(e) { 
			return compileExpr(me, e, context); 
		}).join(spacer);
	}

	if (expr === undefined) return 0; //treat null as 0 (as per Spreadsheets)
	switch(expr[0]) {
		case 'PostMacro':
			return compileExpr(me, expandPostMacros(me, expr));
		case 'KeyDefs':
			return 'return env._Functions.Unique(env._Functions.Concat(' +
			 	expr.slice(2).map(function(e) { 
					return compileExpr(me, e, context); 
				}).join(', ') + '));';
		case 'Category':
			return 'return (' + compileExpr(me, expr[2], context) + ');';
		case 'Func*':
		case 'Func':
			var exprs = expr.slice(2).map(function(e) {
				return '_ret = (' + compileExpr(me, e, context) + ');';
			});
			var ov = 'var _ret;\n' + 
				exprs.join('\nif(_ret !== undefined) return _ret;\n') +
				'\nreturn _ret;';
			return ov;
		case 'RemDims':
		case 'NoDim':
			return compileExpr(me, expr[1], context);
		case 'Cube':
			return 'env._Cube';
		case 'Quote':
			return quote(expr[1]);
		case 'LetG':
			return '('+ compileExpr(me, expr[1], context) +' == '+ 
				compileExpr(me, expr[2], context)+') ? (' + 
				compileExpr(me, expr[3], context) + ') : undefined';
		case 'LetS':
			//TODO: add range check as current code only checks start not end.
			return '(function(' + compileExpr(me, expr[1], context) + 
				') { \nreturn ('+ compileExpr(me, expr[1], context) +
				' >= 0) ? ('+ compileExpr(me, expr[3], context) +
				') : undefined; \n}('+ compileExpr(me, expr[2], context) +'))';
		case 'Restrict':
			return '('+ compileExpr(me, expr[1], context) +') ? (' + 
				compileExpr(me, expr[2], context) + ') : undefined';
		case 'Call':
			if (expr[1] && expr[1][0] === 'Symbol' && isFunction(me, expr[1])) {
				return 'env._Functions.' + expr[1].slice(1).join('.') + '(' +
					expr.slice(2).map(function(e) { 
						return compileExpr(me, e, context); 
					}).join(', ') + ')';
			} else {
				//TODO: probably want to make Symbol more sensible and have it 
				// just run this bit of code.
				return compileExpr(me, expr[1], context) + '(' +
					expr.slice(2).map(function(e) { 
						return compileExpr(me, e, context); 
					}).join(', ') + ')';
			}
		case 'Pair':
			return compileExpr(me, expr[1], context) + ':' + 
				compileExpr(me, expr[2], context);
		case 'Dict':         return '{' + pairWise(expr, ', ') + '}';
		case 'List':         return '[' + pairWise(expr, ', ') + ']';
		case 'Times':        return '(' + pairWise(expr, ' * ') + ')';
		case 'Neg':
			return '(-(' + compileExpr(me, expr[1], context) + '))';
		case 'Plus':         return '(' + pairWise(expr, ' + ') + ')';
		case 'Subtract':     return '(' + pairWise(expr, ' - ') + ')';
		case 'Power':
			return 'Math.pow(' + 
				compileExpr(me, expr[1], context) + ', ' + 
				compileExpr(me, expr[2], context) + ')';
		case 'Bracket':
			return '(' + compileExpr(me, expr[1], context) + ')';
		case 'Divide':       return '(' + pairWise(expr, ' / ') + ')';
		case 'And':          return '(' + pairWise(expr, ' && ') + ')';
		case 'Or':           return '(' + pairWise(expr, ' || ') + ')';
		case 'Not':
			return '!(' + compileExpr(me, expr[1], context) + ')';
		case 'GreaterEqual': return '(' + pairWise(expr, ' >= ') + ')';
		case 'Greater':      return '(' + pairWise(expr, ' > ') + ')';
		case 'Unequal':      return '(' + pairWise(expr, ' != ') + ')';
		case 'Equal':        return '(' + pairWise(expr, ' == ') + ')';
		case 'LessEqual':    return '(' + pairWise(expr, ' <= ') + ')';
		case 'Less':         return '(' + pairWise(expr, ' < ') + ')';
		case 'Indexed*':
			if (expr[1][0] !== 'List') throw new Error('Indexed* requires literal list');
			if (expr.length > 3) throw new Error('Indexed* does not yet support multiple args');
			return '(function() {\nswitch (' + 
				compileExpr(me, expr[2], context) + 
				') {\n' +
				expr[1].slice(1).map(function(e,i) { 
					return '  case ' + i +
					 ': return ' + compileExpr(me, e, context) + ';\n';
					}).join('') + '}; })()';
		case 'Indexed':
			//TODO: this needs optimizing
			if (expr.length > 3) throw new Error('Indexed does not yet support multiple args');
			ex = compileExpr(me, expr[1], context);
			return '(' + ex + ')[' + compileExpr(me, expr[2], context) + ']';
		case 'Index':
			if (!expr[1] || 
				!expr[1].dimensions || 
				expr[1].dimensions.length !== 1)
				throw new Error('Invalid index parameter ' + showS(expr));
			return me._genSymbol(expr[1].dimensions[0]);
		case 'IndexOf':
			ex = compileExpr(me, expr[2], context);
			expr = expr[1];
			if (!expr.dimensions || expr.dimensions.length !== 1)
				throw new Error('Invalid indexOf parameter ' + showS(expr));
			//TODO: better store of dimensions as symbol
			pack = expr.dimensions[0]; //.split('.',1)[0];
			//name = expr.dimensions[0].slice(pack.length+1);
			return "env['" + pack + "'].indexOf(" + ex + ")";
		case 'Over':
			return compileOver(me, expr);
		case 'Symbol':
			var fkey = enDot(expr);
			if (context[fkey]) return context[fkey];
			//if symbol defined (then annotateDimensions of definition)
			if (me.ast.hasOwnProperty(fkey)) {
				var dims = me.ast[fkey].dimensions.map(me._genSymbol, me);
				return "env['" + fkey +"'](" + dims.join(', ') + ")";
			}
			return '"' + expr[expr.length - 1] + '"'; //TODO: swap Symbol args so this is expr[1]
		case 'String': return '"' + expr[1].replace(/"/g, '\\"') + '"';
		case 'Raw': return expr[1];
		case 'JSON': return JSON.stringify(expr[1]);
		case 'Number': return expr[1].toString();
		case 'Error':  throw new Error(expr[1]);
		case 'Rule':
			if (expr[1] && expr[1][0] === 'Bracket') {
				var parameters = Object.create(context);
				makeParameters(expr[1].slice(1), parameters);
				var lambda = '(function('+ objValues(parameters).join(', ') +
					') { return (' + compileExpr(me, expr[2], parameters) + 
					'); })'
				return lambda;
			}
		case 'If':
			return '((' + compileExpr(me, expr[1], context) + ')' +
			       ' ? (' + compileExpr(me, expr[2], context) + ') : (' +
			       compileExpr(me, expr[3], context) + '))';
		case 'Cond':
			var condRet = 'var _ret;\n';
			var hasElse = (expr.length%2 == 0);
			for (var i = 1; i < expr.length-(hasElse ? 1 : 0); i=i+2) {
				condRet += 	((i == 1) ? '' : 'else ') + 'if(' + compileExpr(me, expr[i], context) + '){\n' +
							'_ret=' + compileExpr(me, expr[i+1], context) + ';}\n';
			};
			//If the conditional has an odd num of args, the last one is an else fallthrough
			condRet += hasElse ? 'else{\n_ret=' + compileExpr(me, expr[expr.length-1], context) + '}' : '';
			return '(function(){'+condRet + 'return _ret;})()';
		default:
			throw new Error('Compile Error: Not implemented for ' + showS(expr));
	}
}

function transform(me, ast, func) {
	var ret = func(me, ast);
	if (ret === undefined) ret = [];
	for(var i=0; i<ret.length; i++) {
		var node = ret[i], node1;
		if (node instanceof Array) {
			node1 = transform(me, node, func);
			if (node !== node1) ret[i] = node1; //NOTE (in place edit)
		}
	}
	return ret;
}

// utilities

//TODO: this might make conflicting symbols
// could just define that symbols are the same except for the characters
function makeParameters(list, ret) {
	list.forEach(function(s) {
		if (s === undefined) return;
		if (s[0] !== 'Symbol' || s.length > 2) 
			throw new Error('Function parameters must be simple symbols');
		ret[s[1]] = '$' + s[1].replace(/[^a-zA-Z_\-]/g, '$'); 
	})
}

function objValues(obj) {
	var ret = [];
	for (var k in obj) {
		if (obj.hasOwnProperty(k)) ret.push(obj[k]);
	}
	return ret;
}

function camelCase(name) {
	return (name
		.toLowerCase()
		.replace(/[^a-zA-Z]+([a-zA-Z]|$)/g,
			function(s,m) { return m.toUpperCase(); }));
}

function quote(expr) {
	if (expr instanceof Array) {
		return '[' + expr.map(function(e) { return quote(e); }).join(', ') + ']';
	} 
	switch(typeof(expr)) {
		case 'string': return "'" + expr + "'";
		case 'number': return expr.toString();
		default: return expr.toString();
	}
}

// runtime

function joinComma(items) { 
	return Array.prototype.join.call(items, ',');
}

//memoize assumes indirect recursion
function memoize(func, hasher) {
	hasher = (hasher !== undefined) ? hasher : joinComma;
	var memo = function() {
		var cache = memo.cache, args = hasher(arguments);
		if (cache[args] === undefined)
			cache[args] = memo.func.apply(this, arguments);
		return cache[args];
	};
	memo.func = func; //so we can replace the func
	memo.clearCache = function() { memo.cache = {}; };
	memo.cache = {};
	return memo;
}

//place to store dependedOn
function unmemoize(func) {
	var memo = function() {
		return memo.func.apply(this, arguments);
	};
	memo.func = func; //so we can replace the func
	memo.clearCache = function() { };
	return memo;
}

function indexed(func, athis) {
	var memo = function(i) {
		if (memo.cache === undefined)
			memo.cache = memo.func.apply(athis);
		return memo.cache[i];
	};
	memo.func = func; //so we can replace the function
	memo.clearCache = function() { memo.cache = undefined; };
	memo.cache = undefined;
	memo.len = function() { 
		if (memo.cache === undefined)
			memo(0);
		return memo.cache.length;
	};
	memo.forEach = function(f) {
		if (memo.cache === undefined)
			memo(0);
		memo.cache.forEach(f);
	};
	memo.indexOf = function(v)  {
		if (memo.cache === undefined)
			memo(0);
		return memo.cache.indexOf(v); //TODO: cache the index of
	};
	return memo;
}

module.exports = {
	Qube: Qube,
	expandNamespace: expandNamespace,
};