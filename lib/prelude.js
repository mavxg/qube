//Copyright (c) 2014 "Benjamin Norrington"

var parser = require('./parser');
var moment = require('moment');
var numeral = require('numeral');
var momentwd = require('moment-business');

var showM = parser.showM;
var showMr = parser.showMr;
var showS = parser.showS;


function Sum(list) {
	if (list === undefined) return 0;
	var sum = 0;
	var values = list.filter(isNumeric);
	values.forEach(function(v) { sum += v; });
	return sum;
}

function Product(list){
	if(Array.isArray(list)){
		//Remove any which are not numbers
		var filteredList = list.filter(function(elem){
			return isNumeric(elem);
		});

		if(filteredList.length > 0){
			return filteredList.reduce(function(prev,curr){
				return prev * curr;
			});
		}
	}	
	return 1;
}

function Max(list) {
	var max;
	list.forEach(function(v,i) { 
		if ((max === undefined || max < v) && !isNaN(v)){
			max = v; 	
		} 
	});
	return max;
}

function Min(list) {
	var min;
	list.forEach(function(v,i) { 
		if ((min === undefined || min > v) && !isNaN(v)){
			min = v; 	
		} 
	});
	return min;
}

function CountNumbers(list){
	var num = 0;
	list.forEach(function(v,i){
		if(!isNaN(v)){
			num++;
		}
	});
	return num;
}

function RemoveLast(list, num) {
	if(list !== undefined && list.length>0) {
		if(num === undefined) num = 1;
		return list.slice(0,(list.length-Math.abs(num)));
	}
	else {
		return undefined;
	}
}

function Count(list){
	var num = 0;
	list.forEach(function(v,i){
		num++;
	});
	return num;
}

function first(func, list) {
	var ret;
	list.some(function(element) {
		if (func(element)) {
			ret = element;
			return true;
		}
		return false;
	});
	return ret;
}

function range(start, end, step) {
	if (end === undefined) {
		end = start;
		start = 0;
	}
	if (step === undefined) step = 1;
	if (step <= 0) return [];

	var ret = [], cur = start;
	while (cur < end) {
		ret.push(cur);
		cur = cur + step;
	}
	return ret;
}

function Head(list) {
	var head;
	if (list === null || list === undefined) return list;
	list.some(function(v,i) { head = v; return true;});
	return head;
}

function Tail(list) {
	if(list !== undefined && list.length>0) {
		return list.slice(1);
	}
	else {
		return undefined;
	}
}

function Last(list) {
	var tmp = list.slice(0);	
	return Head(tmp.reverse());
}

function Round(list) {  
	if(Array.isArray(lst)) {
        return list.map(Math.round);
    }
    return Math.round(list);       
}

function Average(list) {
	var count = 0;
	var sum = 0;
	list.forEach(function(v,i){
		if(!isNaN(v)){
			sum += v;
			count++;
		}	
	});	
	return sum / count;
}

function Help(functionName){
	var path = functionName.split('.');	
	var ret = [];	
	//TODO: make this a macro
	//for (var i = 0; i < path.length; i++) {			
	//	ret.push(Cube.Functions[path[i]].Description);	
	//};	
	return ret.join('\n');
}

Stdev.Description = "Estimates standard deviation based on a sample\nSyntax: Stdev(x)\nParameters: x (A list of numbers)";
function Stdev(list) {  
    var avg = Average(list);
    var flist = filterListToNumbers(list); 
    var res = flist.reduce(function(a,v){
        return a + Math.pow(v-avg,2);
    },0);  
    var variance = res / (Count(flist) -1);
    return Math.sqrt(variance);        	
}


Stdevp.Description = "Calculates standard deviation based on the entire population\nSyntax: Stdevp(x)\nParameters: x (A list of numbers)";
function Stdevp(list) {  
    var avg = Average(list);  
    var flist = filterListToNumbers(list);  
    var res = flist.reduce(function(a,v){
        return a + Math.pow(v-avg,2);
    },0);  
    var variance = res / Count(flist);
    return Math.sqrt(variance);    
}

function listSquaredReduced(list) {
	return list.reduce(function(a,b) {
		return a + Math.pow(b,2);
	},0);
}   

function filterListToNumbers(list) {
	return list.filter(function(a) {
		return (!isNaN(a)); 
	});
}    

function correlation(list) {
    var avg = Average(list);  
    function listLessAverage(l,b) {
    	return l.map(function(a) {
        	return a-b;
        });
	}       
    return {
        Average: avg,
        LessAverage: listLessAverage(list,avg),   
        SumSquared: listSquaredReduced(listLessAverage(list,avg)),
    };
}

Correl.Description = "Returns the correlation coefficient of two lists of the same length\nSyntax: Correl(x,y)\nParameters:\n x (A list of numbers)\n y (A list of numbers)";
function Correl(listA, listB) {
    var a = correlation(listA);
    var b = correlation(listB);
    
    var sumTotal = 0;
    for (var i = 0; i < listA.length; i++) {
        sumTotal += (a.LessAverage[i] * b.LessAverage[i]);
    }; 
    
    return sumTotal / Math.sqrt(a.SumSquared * b.SumSquared);
}

function Covariance(listA, listB, sample) {
	var aBar = 0;
	var bBar = 0;
	var q = 0;
	var n = 0;
	listA.forEach(function(a, i) {
		var b = listB[i];
		if (b === undefined || a === undefined) return;
		n += 1;
		aBar += a;
		bBar += b;
	});
	aBar = aBar / n;
	bBar = bBar / n;
	listA.forEach(function(a, i) {
		var b = listB[i];
		if (b === undefined || a === undefined) return;
		q += (a - aBar)*(b - bBar);
	});
	return q / (n - sample);
}

function CovarianceS(listA, listB) {
	return Covariance(listA, listB, 1);
}

function CovarianceP(listA, listB) {
	return Covariance(listA, listB, 0);
}

function Unique(list) {
	var included = {}, ret = [];
	list.forEach(function(v, i) {
		if (!included.hasOwnProperty(v)) {
			ret.push(v);
			included[v] = true;
		}
	});
	return ret;
}

function _Table(list, ast) {
	//TODO: use the ast to figure out the table.
	return showS(ast);
}

function _csv(headers, rows) {
	function cell(h) {
		var c = h.toString();
		if (/,/.test(c)) c = '"' + c + '"';
		return c;
	}
	var str = new String(headers.map(cell).join(',') + '\n' +
		   rows.map(function(row) { 
		   	  return row.map(cell).join(',') 
		   }).join('\n') + '\n');
	str.contentType = 'text/csv'
	return str;
}

function BasicTable(headers, rows, highlight) {
	//var c = document.createElement.bind(document);
	var table = document.createElement('table')
	var head = document.createElement('thead');//table.createTHead()
	var body = document.createElement('tbody');
	table.appendChild(head);
	table.appendChild(body);//table.createTBody();
	table.className = 'pure-table pure-table-horizontal';
	if (highlight === undefined) highlight = 0;

	var hr = head.insertRow();

	headers.forEach(function(h, i) {
		var th = document.createElement('th');
		hr.appendChild(th);
		if (i < highlight) th.className = 'highlight';
		if (isElement(h)) {
			th.appendChild(h);
		} else {
			th.appendChild(document.createTextNode(h.toString()));
		}
	});

	var maxrows = 1000;

	if (rows.length > maxrows) {
		var foot = document.createElement('tfoot');
		table.appendChild(foot);
		var tr = foot.insertRow();
		var td = tr.insertCell(-1);
		td.colSpan = headers.length;
		td.className = 'info'
		td.appendChild(document.createTextNode(".... " + (rows.length - maxrows).toString() + " more rows."));
		rows = rows.slice(0,maxrows);
	}

	rows.forEach(function(r, j) {
		var tr = body.insertRow();
		r.forEach(function(e, i) {
			var th = tr.insertCell(-1);
			if (i < highlight) th.className = 'highlight';
			if (isElement(e)) {
				th.appendChild(e);
			} else {
				th.appendChild(document.createTextNode(e === undefined ? 'NULL' : e.toString()));
				if (e === true) {
					th.className = 'success';
				} else if (e === false) {
					th.className = 'error';
				}
			}
		});
	});

	return table;
}

//Table({Math.round(Net Income), Tax, Revenue})
// returns only defined values
function Values(list) {
	return list.filter(function() { return true; });
}

function TypeOf(x) {
	return typeof(x);
}


function queryString(data) {
	var query = [];
    for (var key in data) {
        query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
    }
    return query.join('&');
}

FETCHING = {}; //sentinal
//gets data from jsonp call with caching in Cube
//note: refetch is cube.clearDataCache() then recalc.
function _data(cube, url, args, extras) {
	var fullurl = url + '?' + queryString(args);
	var cache = cube.dataCache();
	var data = cache[fullurl];
	var name = extras.name || decodeURIComponent(fullurl);
	if (data === undefined) {
		cache[fullurl] = FETCHING;
		//make async call here for data
		JSONp.get(url, args, {
			onSuccess: function(data) {
				cache[fullurl] = data;
				cube.dirty = true;
				cube.recalculate();
			},
			onError: function(e) {
				cache[fullurl] = new Error("Problem fetching: " + name);
				cube.dirty = true;
				cube.recalculate();
			},
			onTimeout: function() {
				cache[fullurl] = new Error("Timeout while fetching: " + name);
				cube.dirty = true;
				cube.recalculate();

			},
			timeout: extras.timeout,
		})
	}
	if (data === FETCHING) throw "Fetching: " + name;
	if (data instanceof Error) throw data;
	return data;
}

function _binaryFetch(cube, url, args) {
	var oReq = new XMLHttpRequest();
	var cache = cube.dataCache();
	var data = cache[url];
	var name = args.name || decodeURIComponent(url);
	if (data === undefined) {
		cache[url] = FETCHING;

		oReq.onload = function(e) {
			cache[url] = oReq.response;
			cube.dirty = true;
			cube.recalculate();
		};
		oReq.onerror = function() {
			cache[url] = new Error("Error while fetching:" + name);
			cube.dirty = true;
			cube.recalculate();
		};

		if ("withCredentials" in oReq) {
			//for Chrome/Firefox/Opera/Safari.
			oReq.open('GET', url, true);
			oReq.withCredentials = true;
		} else if (typeof XDomainRequest != "undefined") {
			//for IE.
			oReq = new XDomainRequest();
			oReq.open('GET', url);
		} else {
			throw "Browser doesnt support cross site requests";
		}
		
		oReq.responseType = "arraybuffer";
		oReq.send();
	}
	if (data === FETCHING) throw "Fetching: " + name;
	if (data instanceof Error) throw data;
	return data;
}

function dot(key, obj) {
	if (arguments.length === 1)
		return dot.bind(null, key);
	if (obj === null || obj === undefined) return obj;
	return obj[key];
}

function index(items, keys) {
	var rkeys = {};
	var values = {};
	var ilen = items.length;
	var klen = keys.length;
	var elem;
	var key;
	var i, j;
	var keyVal;
	var current;
	var ret = {values: values, keys: {}};

	for (j = 0; j < klen; j++) {
		key = keys[j];
		rkeys[key] = {};	
	};

	for (i = 0; i < ilen; i++) {
		elem = items[i];
		current = values;
		for (j = klen -1; j >=0 ; j--) {
			key = keys[j];
			keyVal = elem[key];
			rkeys[key][keyVal] = true; //keep keys
			if (current.hasOwnProperty(keyVal)) {
				current = current[keyVal]
			} else {
				current = current[keyVal] = (j === 0 ? [] : {});
			}
		}
		current.push(elem);
	};

	for (var k in rkeys) {
		var kl = ret.keys[k] = [];
		for (var kv in rkeys[k]) {
			kl.push(kv);
		}
	}

	return ret;

}

function map(func, list) {
	if (list === null || list === undefined) return list;
	return list.map(func);
}

//list of list to list
// or join multiple arguments
function concat() {
	var list = Array.prototype.concat.apply([], arguments);	
	if(list.some(function(elem){
		var test =  Array.isArray(elem); // returning without assignment didnt work properly?
		return test;
	})) {
		return concat.apply(this, list);
	}	
	return list;
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function addperiod(list, amount, period){
	function parse(element){
		var ret = element.clone();
		return ret.add(amount, period);
	}
	if(Array.isArray(list)) return list.map(function(i){ return parse(i); });
	return parse(list);
}

function workday(list, days, includeThis){	

	function parse(element){
		if(includeThis){
			if(element.isWeekDay()){
				if(days>1) days--;
				if(days<-1) days++;
			}
		}
		var ret = element.clone();
		return ret.addWeekDays(days);		
	}
	if(Array.isArray(list)) return list.map(function(i){ return parse(i); });
	return parse(list);
}

function eomonth(list) {
	function parse(element){
		var eo = moment([element.year(), element.month()]);
		return moment(eo).endOf('month');
	}
	if(Array.isArray(list)) return list.map(function(i){ return parse(i); });
	return parse(list);
}

function datevalue(list, format){
	function parse(element){
		if(format) return moment.utc(element, format, true); //strict parsing as UTC
		return moment.utc(element);
	}
	if(Array.isArray(list)) return list.map(function(i){ return parse(i); });
	return parse(list);
}

function datediff(dateAList, dateB, part){
	function parse(element){
		return element.diff(dateB, part);
	}
	if(Array.isArray(dateAList)) return dateAList.map(function(i){ return parse(i); });
	return parse(dateAList);
}

function text(list, fmt){
	function format(element){
		if(moment.isMoment(element)) return element.format(fmt);

		else if(isNumeric(element))  return numeral(element).format(fmt);



		else if(element)             return element.toLocaleString();
		else                         return element;
	}

	if(Array.isArray(list)) return list.map(function(i){ return format(i); });
	return format(list);
}

function elementAt(list, pos){	
	if(list === undefined) return undefined;
	if(!Array.isArray(list)) return list[pos];
	
	var ret = [];
	list.forEach(function(elem){
		ret.push(elem[pos]);
	});
	return ret;
}

function dateRange(from, to, step, period, format) {
	from = datevalue(from, format);
	to = datevalue(to, format);
	if(from >= to)
		throw "From date must be before to date";
	if(!isNumeric(step))
		throw "Step must be a number";
	step = Math.abs(step || 1);
	period = period || 'days';
	var dates = [];
	while(from <= to) {
		dates.push(from);
		from = addperiod(from, step, period);		
	}
	return dates;
}

function isBlank(n) {
	var ret = (n === null || n === undefined || n === "" || Number.isNaN(n) || (Array.isArray(n) && n.length == 0));
	return ret;
}

function sort(list) {
	if(Array.isArray(list)){
		var ret = list.slice();
		return ret.sort();
	}
	return list;
}

function isDate(n, format) {
	if(format) {
		return moment(n, format).isValid();
	}
	return moment(n).isValid();
}

function coalesce(){
	var list = Array.prototype.slice.call(arguments);
	var ret = {};
	if(Array.isArray(list)){
		ret = list.filter(function(i){
			return !isBlank(i);
		});		
	} else {
		ret = isBlank(list) ? undefined : list;
	}	
	return Head(ret);
}

function property(obj) {
	var props = [];
	for(var propertyName in obj) {
		props.push(propertyName);
	}
    return props;
}

function trim(list){
	if(Array.isArray(list)){		
		return list.filter(function(i){
			return !isBlank(i);
		});
	}
	throw "Cannot trim a non-list" ;
}

//Macros

function makeRecursion(func) {
	var funcy = function(expr) {
		var head = expr[0];
		if (head == 'Symbol') {
			return ['Let', ['Index', expr], func(expr)];
		}
		if (head == 'Subtract' || head == 'Plus') {
			var lhs = expr[1], rhs = expr[2];
			if (lhs[0] == 'Symbol' && rhs[0] == 'Number') {
				return ['Let', ['Index', lhs], [head, func(lhs), rhs]];
			}
		}
	};
	funcy.isMacro = true;
	return funcy;
}

function _if(bool, yes, no) {
	return ['If', bool, yes, no];
}
_if.isMacro = true;

function cond() {
	var params = [].slice.call(arguments);
	params.unshift('Cond');
	return params;
}
cond.isMacro = true;

//This should only be called at the base level
// as Flip(X, Line, {Net Income, etc})
// or X = Flip(Line, {Net Income, etc})
function flip(symb, catSymb, expr) {
	if (expr[0] !== 'List')
		return ['Error', 'Flip joins a list of expr', sexpr];
	var qexpr = ['List'];
	expr.slice(1).forEach(function(s) {
		qexpr.push(showM(s));
	});
	var cat = ['Category', catSymb, qexpr];
	var func = ['Set*', symb, ['Indexed*', expr, ['Index', catSymb]]]; //need Indexed* and Set* to not do memo
	return ['Do', cat, func]; //Do A B is same as A\nB
}
flip.isMacro = true;


function Namespace(symb, rest) {
	var n = ['Namespace'];
	Array.prototype.push.apply(n, arguments);
	return n;
}
Namespace.isMacro = true;

//Table({Table({Graph.Line(Net Income[Month])},{Assum})})
//Table({Graph.Line(Net Income[Month][Growth]*Year)})
//Table({Graph.Line(Net Income[Month][Growth])})
//Table({Graph.Line(Net Income[Month][Growth])},{Year})
//Y = Table({Graph.Line(Net Income[Month][Growth])})
function postTable(exprs, quoteds, dims) {
	return expandDims(['Symbol', 'BasicTable'], exprs, quoteds, dims);
}
postTable.isPostMacro = true;

function expandDims(symb, exprs, quoteds, dims) {
	//exprs and quoteds are both expected to be list literals

	// ***** TODO : don't bother with all this dimension stuff
	//    just call annotateDimentions on it during compile.
	if (dims === undefined) {
		dims = exprs.dimensions;
	} else {
		dims = dims.slice(1).map(function(d) { 
			return d.dimensions[0]; 
		});
	}

	var len = ['Number', dims.length];
	var heads = ['List'];
	heads.dimensions = [];
	var fexpr = ['List'];
	fexpr.dimensions = dims;
	var type = (dims.length > 0) ? 'Over' : 'List';
	var over = [type, fexpr];
	over.dimensions = [];
	dims.forEach(function(d) { 
		var s = d.split('.'); 
		s.unshift('Symbol');
		s.dimensions = [d];
		fexpr.push(s); over.push(s); heads.push(['String', s[2]]); 
	});
	exprs.slice(1).forEach(function(d) { fexpr.push(d); });
	quoteds.slice(1).forEach(function(d) { heads.push(d); });
	return ['Call', symb, heads, over, len]; 
}
expandDims.isPostMacro = true;

//pages should be of form {symb=value,...}
function pivot(expr, pages, rows, cols, descriptions) {
	return ['NoDim', ['PostMacro', ['Symbol', 'Pivot'], expr, 
		showM(expr), pages, cols, rows, descriptions]]; 
}
pivot.isMacro = true;

function postPivot(expr, quoted, pages, rows, cols, descriptions) {
	pages = pages || ['List'];
	descriptions = descriptions || ['List'];
	rows = rows || ['List'];
	cols = cols || ['List'];
	var descrips = {};

	descriptions.slice(1).forEach(function(desc, i) {
		//assume symbol with single dimension
		var dim = desc.dimensions[0];
		if (!descrips.hasOwnProperty(dim)) descrips[dim] = {syms:[], names:[]};
		descrips[dim].syms.push(desc);
		descrips[dim].names.push(showM(desc));
	});
	
	var page_titles = pages.map(function(s, i) {
		return (i === 0 ? 'List' : showM(s[1]));
	});
	var page_values = pages.map(function(s, i) {
		if (i === 0)
		  return 'List'
		var ret = ['Over', s[1], s[1]];
		ret.dimensions = [];
		return ret;
	});
	
	var page_selected = pages.map(function(s, i) {
		return (i === 0 ? 'List' : s[2]);
	});
	
	var data = expr;
	pages.slice(1).forEach(function(s) {
		data = ['LetS', ['Index', s[1]], ['IndexOf', s[1], s[2]], data];
	});
	
	
	var col_headers = ['List'];
	var col_dims = [];
	cols.slice(1).forEach(function(col, i) {
		var dim = col.dimensions[0];
		col_dims.push(dim);
		col_headers.push(col);
		if (descrips[dim]) {
			Array.prototype.push.apply(col_headers, descrips[dim].syms);
		}
	});
	
	var row_titles = ['List'];
	var row_headers = ['List'];
	var row_dims = [];
	rows.slice(1).forEach(function(row, i) {
		var dim = row.dimensions[0];
		row_dims.push(dim);
		row_headers.push(row);
		row_titles.push(showM(row));
		if (descrips[dim]) {
			Array.prototype.push.apply(row_titles, descrips[dim].names);
			Array.prototype.push.apply(row_headers, descrips[dim].syms);
		}
	});
	
	col_headers.dimensions = col_dims;
	var cx = cols.slice(1);
	cx.reverse();
	col_headers = ['Over', col_headers].concat(cx);
	col_headers.dimensions = [];
	
	
	row_headers.dimensions = row_dims;
	var rx = rows.slice(1);
	rx.reverse()
	row_headers = ['Over', row_headers].concat(rx);
	row_headers.dimensions = [];
	row_titles.dimensions = [];
	
	data.dimensions = row_dims.concat(col_dims);
	data = ['Over', data].concat(cols.slice(1));
	data.dimensions = row_dims;
	data = ['Over', data].concat(rows.slice(1));
	data.dimensions = [];
	
	return ['Call', ['Symbol', '_Pivot'], quoted, 
			page_titles, page_values, page_selected,
			col_headers, 
			row_titles, row_headers, 
			data]; 
}
postPivot.isPostMacro = true;

function _Pivot(title, page_titles, page_values, page_selected, col_headers, row_titles, row_headers, data) {
	var d = document.createElement('div');

	page_values = page_values || [];
	page_selected = page_selected || [];
	page_titles = page_titles || [];
	row_titles = row_titles || [];
	row_headers = row_headers || [];

	var nColH = col_headers[0].length - 1;
	var rows = data.length;
	var cols = data[0].length;
	var rowHs = row_titles.length;

	function page(title, values, selected) {
		return "<label for='"+ title +"'>"+title+" = </label> \
        <select name='"+title+"'>" + values.map(function(value, index) {
        	return "<option" + (selected == value ? " selected" : "") + 
        			">" + value + "</option>"
        }).join('') + "</select>";
	}

	//draw header
	var thead = '';
	for (var i = 0; i <= nColH; i++) {
		var prev = '';
		thead += '<tr>';
		for (var j = 0; j < rowHs; j++) {
			if (i === nColH) {
				thead += "<th class='highlight'>" + row_titles[j] + "</th>";
			} else {
				thead += "<th class='empty highlight'></th>";
			}
		}
		for (var j = 0; j < cols; j++) {
			var head = col_headers[j][i];
			if (head === prev) {
				thead += '<th></th>';
			} else {
				prev = head;
				thead += "<th>" + head.toString() + "</th>";
			}
		}
		thead += '</tr>';
	}

	//draw body
	var tbody = '';
	for (var i = 0; i < rows; i++) {
		tbody += '<tr>';
		for (var j = 0; j < rowHs; j++) {
			tbody += "<td class='highlight'>" + row_headers[i][j] + "</td>";
		}
		for (var j = 0; j < cols; j++) {
			tbody += "<td>" + data[i][j] + "</td>";
		}
		tbody += '</tr>';
	}

	d.innerHTML = "<div class='result'> \
<div class='pure-g'> \
<h3 class='pure-u-2-5' style='margin-top: 20px;'>" + title + "</h3> \
<form class='pure-form pure-u-3-5' style='text-align: right;'> \
    <fieldset> "+ page_titles.map(function(title, i) {
    	return page(title, page_values[i], page_selected[i])
    }).join('') +"</fieldset> \
</form> \
</div> \
<table class='pure-table pure-table-horizontal'> \
<thead>"+thead+"</thead> \
<tbody>"+tbody+"</tbody> \
</table> \
</div>";
	return d;
}

function quoteM(expr) {
	return showM(expr);
}
quoteM.isMacro = true;

function expand(expr) {
	return expandMacros(expr);
}
expand.isMacro = true;

function quoteS(expr) {
	return ['String', showS(expr)];
}
quoteS.isMacro = true;

function nodim(expr) {
	return ['NoDim', expr];
}
nodim.isMacro = true;

function graphLine(expr, over, series) {
	if (series !== undefined) {
		//expr, over, series
	} else if (over !== undefined) {
		//{expr, expr2}, over
	} else {
		//expr[over][over]
		if (expr[0] == 'Slice' &&
			expr[1][0] == 'Slice' &&
			expr[2][0] == 'Symbol' &&
			expr[1][2][0] == 'Symbol') {
			var iexpr = expr[1][1];
			var xexpr = ['Over', expr[1][2], expr[1][2]];
			var sexpr = ['Over', expr[2], expr[2]];
			var eexpr = ['Over', ['Over', iexpr,  expr[1][2]], expr[2]];
			return ['Call', 
				['Symbol', 'Graph', 'LineB'], 
				showM(iexpr), eexpr, xexpr, sexpr];
		}
	}
	return ['Call', ['Symbol', 'Graph', 'Line'], showM(expr), expr]; 
}
graphLine.isMacro = true;

function fetch(url, args, extras) {
	return ['Call', ['Symbol', '_data'], ['Cube'], url, args, extras];
}
fetch.isMacro = true;

function binaryfetch(url, args) {
	return ['Call', ['Symbol', '_binaryFetch'], ['Cube'], url, args];
}
binaryfetch.isMacro = true;

function data(varPrefix, dataExpr, index, value){
	
	var actions = ['Do'];
	var prefix = varPrefix[1];
	var indices = [];
	var lstIndices = ['List'];
	value = value || [];

	index.slice(1).forEach(function(elem){
		var item = elem[0] == 'Set' ? {Name:elem[1][1], Symbol:elem[2][1]} : {Name:elem[1]};
	    indices.push(item);
	    lstIndices.push(['String', item.Name]);
	});    

    var dotter = function(lst){
    	var cat = lst[0].hasOwnProperty('Symbol') ? lst[0].Symbol : prefix + lst[0].Name;
		if(lst.length > 1){
			return ['Call', ['Symbol', 'Dot'], ['Symbol', cat], dotter(lst.slice(1))];
		}
		
		return ['Call', ['Symbol', 'Dot'], ['Symbol', cat],
		       ['Call', ['Symbol', 'Dot'], ['String', 'values'], ['Symbol', prefix + ' INX']]];				
	}

	//Create the data and index objects
	actions.push(['Set', ['Symbol', prefix + ' RAW'], dataExpr]);
	actions.push(['Set', ['Symbol', prefix + ' INX'], ['Call', ['Symbol', 'Index'], ['Symbol', prefix + ' RAW'], lstIndices]]);
	
	//Set the indices as new categories (if they're not using an existing category)
	indices.forEach(function(elem){
		if(!elem.hasOwnProperty('Symbol')){
			actions.push(['Category', ['Symbol', prefix + elem.Name], ['Call', ['Symbol', 'Dot'], 
			['String', elem.Name], ['Call', ['Symbol', 'Dot'], ['String', 'keys'], ['Symbol', prefix + ' INX']]]]);
		}
	});

	//pull out the values as new symbols
	value.forEach(function(elem){
		if(Array.isArray(elem)){
			actions.push(['Set', ['Symbol', prefix + elem[1]], 
						 ['Call', ['Symbol', 'Head'],
						 ['Call', ['Symbol', 'Map'], ['Call', ['Symbol', 'Dot'], elem], dotter(indices)]]]);
		}
	});
	
	return actions;
}
data.isMacro = true;

module.exports = {
	Math: Math,
	JSON: JSON,
	Sin: Math.sin,
	Cos: Math.cos,
	Tan: Math.tan,

	//_tableColumn: _tableColumn, //internal - for table compile
	_Pivot: _Pivot,

	Sum: Sum,
	Product: Product,
	Max: Max,
	Min: Min,
	Average: Average,
	Range: range,
	Head: Head,
	Tail: Tail,
	End: Last,
	Unique: Unique,
	_Table: _Table,
	BasicTable: BasicTable,
	Values: Values,
	Round:Round,
	Stdev:Stdev,
	Stdevp:Stdevp,
	Count:Count,
	CountNumbers:CountNumbers,
	Help:Help,
	Correl:Correl,
	CovarianceS: CovarianceS,
	CovarianceP: CovarianceP,
	"typeof": TypeOf,
	Dot: dot,
	Map: map,
	_data: _data,


	_binaryFetch: _binaryFetch,
	_csv: _csv,	
	Init: RemoveLast,
	First: first,
	Concat: concat,
	Index: index,
	ElementAt: elementAt,
	Sort: sort,
	Coalesce: coalesce,
	Property: property,
	Trim: trim,

	//Macros
	Prev: makeRecursion(function(symb) { return ['Subtract', ['Index', symb], ['Number', 1]];}),
	Next: makeRecursion(function(symb) { return ['Plus', ['Index', symb], ['Number', 1]];}),
	This: makeRecursion(function(symb) { return ['Index', symb];}),
	First: makeRecursion(function(symb) { return ['Number', 0];}),
	Last: makeRecursion(function(symb) { return ['Subtract', ['Count', symb], ['Number', 1]];}),
	Pivot: pivot,
	Quote: quoteM,
	QuoteS: quoteS,
	Expand: expand, //usage Expand(QuoteS(...))
	NoDim: nodim,
	Flip: flip,
	If: _if,
	Cond: cond,
	Graph: {
		Line: graphLine,
	},
	Fetch: fetch,
	BinaryFetch: binaryfetch,
	Data: data,
	Namespace: Namespace,
	IsNumeric:isNumeric,
	IsBlank:isBlank,
	IsDate:isDate,

	//PostMacros
	//TABLE: postTable,
	Pivot: postPivot,
	ExpandDims: expandDims,

	//Dated
	Text: text,
	DateValue: datevalue,
	EoMonth: eomonth,
	Workday: workday,
	AddPeriod: addperiod,
	DateDif: datediff,
	DateRange: dateRange,
};