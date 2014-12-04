Qube
====

Hyper-cube calculation engine

## Install

npm install mavxg/qube

## Usage

    var ql = require('qube');
    var prelude = ql.prelude;
    var lex = ql.lex;
    var parse = ql.parse;
    var Qube = ql.Qube;
    
    function s(code) { return parse(lex(code)); }
    
    var qube = new Qube(prelude);
    qube.expr(s('A = B * C')[0]);
    qube.exprs(s('B[] = {1,2,3}\nC[] = {3,4,5}'));
    qube.build();

    qube.eval(s('Sum(A[B,C])')[0]);

    qube.expr(s('D = Sum(A[B,C])')[0]);
    qube.build();

    qube.eval(s('D')[0]);

