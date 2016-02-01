var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;

var ql = require('../');
var Qube = ql.Qube;
var prelude = ql.prelude;
var lex = ql.lex;
var parse = ql.parse;

var expandNamespace = require('../lib/qube').expandNamespace;

function s(str) { return parse(lex(str)); }

describe('Lexer', function() {
	it('Simple set', function() {
		var tokens = lex('A = B');
		assert.lengthOf(tokens, 4);
	})
})

describe('Parser', function() {
})

describe('Dimension analysis', function() {
	it('No dimensions', function() {
		var qube = new Qube({});
		qube.exprs(s('A = B * 2\nB = 5'));
		qube.build();
		expect(qube.ast).to.have.property('A')
			.with.property('dimensions').with.length(0);

		expect(qube.ast).to.have.property('B')
			.with.property('dimensions').with.length(0);
	})

	it('Single dimension', function() {
		var qube = new Qube({});
		qube.exprs(s('A = B * 2\nB[] = {1,2,3}'));
		qube.build();

		expect(qube.dimensions).to.have.property('B');

		expect(qube.ast).to.have.property('A')
			.with.property('dimensions').with.length(1);

		expect(qube.ast).to.have.property('B')
			.with.property('dimensions').with.length(1);
	})

	it('Multiple dimensions', function() {
		var qube = new Qube({});
		qube.exprs(s('A = B * C\nB[] = {1,2,3}\nC[] = {3,4,5}'));
		qube.build();

		expect(qube.dimensions).to.have.property('B');
		expect(qube.dimensions).to.have.property('C');

		expect(qube.ast).to.have.property('A')
			.with.property('dimensions').with.length(2);

		expect(qube.ast).to.have.property('B')
			.with.property('dimensions').with.length(1);

		expect(qube.ast).to.have.property('C')
			.with.property('dimensions').with.length(1);
	})

	it('Multiple dimension slice', function() {
		var qube = new Qube({});
		qube.exprs(s('A[] = {1,2,3}\nB[] = {1,2,3}\nC = A * B\nD = C[A=1]'));
		qube.build();

		expect(qube.dimensions).to.have.property('A');
		expect(qube.dimensions).to.have.property('B');

		expect(qube.ast).to.have.property('A')
			.with.property('dimensions').with.length(1);

		expect(qube.ast).to.have.property('B')
			.with.property('dimensions').with.length(1);

		expect(qube.ast).to.have.property('C')
			.with.property('dimensions').with.length(2);

		expect(qube.ast).to.have.property('D')
			.with.property('dimensions').with.length(1);
	})
})

describe('Slice', function() {
	it('Double Over', function() {
		var qube = new Qube(prelude);
		qube.exprs(s('A = B * C\nB[] = {1,2,3}\nC[] = {3,4,5}\nD = Sum(A[B,C])'));
		qube.build();

		var sum = qube.environment.D();

		assert.equal(sum, 72);
	})
})


describe('Eval', function() {
	it('Sum Double Over', function() {
		var qube = new Qube(prelude);
		qube.exprs(s('A = B * C\nB[] = {1,2,3}\nC[] = {3,4,5}'));
		qube.build();

		var sum = qube.eval(s('Sum(A[B,C])')[0]);

		assert.equal(sum, 72);
	})
})

describe('Namespaces', function() {
	it('Un Nested', function() {
		var qube = new Qube(prelude);
		var subspace = ['Namespace', null];
		Array.prototype.push.apply(subspace, s('B[] = {1,2,3}\nC[] = {3,4,5}'));
		var ex = '["Do",["Set",["Slice",["Symbol","B"]],["List",["Number",1],["Number",2],["Number",3]]],["Set",["Slice",["Symbol","C"]],["List",["Number",3],["Number",4],["Number",5]]]]'
		qube.exprs(s('A = B * C'));
		var cell = qube.expr(subspace);
		qube.build();
		//console.log(JSON.stringify(cell.sexpr));
		//console.log(ex);
		var sum = qube.eval(s('Sum(A[B,C])')[0]);

		assert.equal(sum, 72);
	})

	it('Single Nested', function() {
		var qube = new Qube(prelude);
		var subspace = ['Namespace', null];
		Array.prototype.push.apply(subspace, s('B[] = {1,2,3}\nC[] = {3,4,5}\nD = Sum(C[C])'));
		subspace = ['Set', ['Symbol', 'X'], subspace];
		qube.exprs(s('A = X.B * X.C'));
		qube.expr(subspace);
		qube.build();

		var sum = qube.eval(s('Sum(A[X.B,X.C])')[0]);
		var d = qube.eval(s('X.D')[0]);  //ensure Call not namespaced

		assert.equal(sum, 72);
		assert.equal(d, 12);
	})

	it('Double Nested', function() {
		var qube = new Qube(prelude);
		var subsubspace = ['Namespace', null];
		Array.prototype.push.apply(subsubspace, s('C[] = {3,4,5}'));
		var subspace = ['Namespace', null];
		var c = s('B[] = {1,2,3}\nY = ');
		c[1][2] = subsubspace;
 		Array.prototype.push.apply(subspace, c);
		qube.exprs(s('A = X.B * X.Y.C'));
		qube.expr(['Set', ['Symbol', 'X'], subspace]);
		qube.build();

		var sum = qube.eval(s('Sum(A[X.B,X.Y.C])')[0]);

		assert.equal(sum, 72);
	})

	it('Double Nested Named', function() {
		var qube = new Qube(prelude);
		var subsubspace = ['Namespace',['Symbol','H']]
		Array.prototype.push.apply(subsubspace, s('A[]= {3,4,5}\nB = A * 10'));
		var subspace = ['Namespace',['Symbol','Z'],subsubspace];
		Array.prototype.push.apply(subspace, s('C[] = {1,2,3}\nD = C * C'));
		qube.expr(subspace);
		qube.build();

		//var sum = qube.eval(s('Sum(Z.H.B[Z.H.A])')[0]);
		//var sum = qube.eval(s('Sum(Z.H.D[Z.H.C])')[0]); //This works and shouldn't
		var sum = qube.eval(s('Sum(Z.D[Z.C])')[0]); //This doesn't work

		assert.equal(sum, 14);
	})

	it('Lambda function', function() {
		var qube = new Qube(prelude);
		var subspace = ['Namespace', null];
		Array.prototype.push.apply(subspace, s('B[] = {1,2,3}\nC[] = {3,4,5}\nD = Sum(Map((a) -> a + 1, C[C]))'));
		subspace = ['Set', ['Symbol', 'X'], subspace];
		qube.exprs(s('A = X.B * X.C'));
		qube.expr(subspace);
		qube.build();

		var sum = qube.eval(s('Sum(A[X.B,X.C])')[0]);
		var d = qube.eval(s('X.D')[0]);  //ensure Call not namespaced

		assert.equal(sum, 72);
		assert.equal(d, 15);
	})

	it('Namespace macro', function() {
		var qube = new Qube(prelude);
		qube.exprs(s('A = X.B * X.C'));
		qube.exprs(s('Namespace(X, B[] = {1,2,3},C[] = {3,4,5},D = Sum(Map((a) -> a + 1, C[C])))'));
		qube.build();

		var sum = qube.eval(s('Sum(A[X.B,X.C])')[0]);
		var d = qube.eval(s('X.D')[0]);  //ensure Call not namespaced

		assert.equal(sum, 72);
		assert.equal(d, 15);
	})
})


describe('KeyDefs', function() {
	it('No Category Override', function() {
		var qube = new Qube(prelude);
		qube.expr(['KeyDefs',['Symbol','B'], s('{1,2,3}')[0]]);
		qube.exprs(s('A = B * C\nC[] = {3,4,5}'));
		qube.build();

		var sum = qube.eval(s('Sum(A[B,C])')[0]);

		assert.equal(sum, 72);
	})

	it('With Category Override', function() {
		var qube = new Qube(prelude);
		qube.expr(['KeyDefs',['Symbol','B'], s('{1,2}')[0]]);
		qube.exprs(s('A = B * C\nC[] = {3,4,5}\nB[] = {1,2,3}'));
		qube.build();

		var sum = qube.eval(s('Sum(A[B,C])')[0]);

		assert.equal(sum, 72);
	})

	it('Double KeyDef', function() {
		var qube = new Qube(prelude);
		qube.expr(['KeyDefs',['Symbol','B'], s('{1,2}')[0]]);
		qube.exprs(s('A = B * C\nC[] = {3,4,5}'));
		qube.expr(['KeyDefs',['Symbol','B'], s('{3,1}')[0]]);
		qube.build();

		var sum = qube.eval(s('Sum(A[B,C])')[0]);

		assert.equal(sum, 72);
	})
})