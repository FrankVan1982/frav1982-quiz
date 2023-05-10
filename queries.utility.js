//=========================================
// File name: queries.utility.js
//-----------------------------------------
// Project : QuizFaber 
// Licence : MIT
// Author  : Luca Galli
// Email   : info@quizfaber.com
//=========================================

/*
 The escape character (\) needs to be escaped as (\\).
The single quote (') needs to be escaped as (\') or ('') in single-quote quoted strings.
The double quote (") needs to be escaped as (\") or ("") in double-quote quoted strings.
The wild card character for a single character (_) needs to be escaped as (\_).
The wild card character for multiple characters (%) needs to be escaped as (\%).
 */
function EscapeSpecialChar(str) {
	if (str) {
		var outStr = str.toString();

		outStr = outStr.replace(/[\\]/g, '\\\\\\\\')  // this means that \ became \\\\ in LIKE
			.replace(/'/g, "\\'")
			.replace(/_/g, '\\_')
			.replace(/%/g, '\\%');

		return outStr;
	}
	return "";
}

/*
 * Escape chars for compose SQL in string
  */
function EscapeApices(str) {
	if (str) {
		var outStr = str.toString();

		outStr = outStr.replace(/[\\]/g, '\\\\')
			.replace(/'/g, "\\'")

		return outStr;
	}
	return "";
}

module.exports = { EscapeSpecialChar, EscapeApices }

