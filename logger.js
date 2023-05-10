//=========================================
// File name: logger.js
//-----------------------------------------
// Project : QuizFaber 
// Licence : MIT
// Author  : Luca Galli
// Email   : info@quizfaber.com
//=========================================

const { format } = require('date-fns');

///////////////// LOGGING FUNCTION ////////////////////////

/// <summary>
/// Return the log level
/// </summary>
function GetLogLevel()
{
	if (process.env.LOG_LEVEL) {
		return parseInt(process.env.LOG_LEVEL);
	}
	return 1; // INFO level
}

/// <summary>
/// Logs a message in console
/// </summary>
function Log(msg, arg1 = '', arg2 = '')
{
	if (GetLogLevel() <= 1)
	{
		var header = GetHeaderLog();
		console.log(header + " - " + msg, arg1, arg2);
	}
}

/// <summary>
/// Logs a debug message in console
/// </summary>
function LogDebug(msg)
{
	if (GetLogLevel() <= 0)
	{
		var header = GetHeaderLog();
		console.debug(header + " - " + msg);
	}
}

/// <summary>
/// Logs a warning message in console
/// </summary>
function LogWarn(msg)
{
	if (GetLogLevel() <= 2)
	{
		var header = GetHeaderLog();
		console.warn(header + " - WARNING - " + msg);
	}
}

/// <summary>
/// Logs a error message in console
/// </summary>
function LogError(msg)
{
	if (GetLogLevel() <= 3)
	{
		var header = GetHeaderLog();
		console.error(header + " - ERROR - " + msg);
	}
}


function GetHeaderLog()
{
	var header = format(new Date(), 'dd/MM/yyyy HH:mm');
	return header;
}

module.exports =
{
	Log, LogDebug, LogWarn, LogError, GetLogLevel
}