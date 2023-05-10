//=========================================
// File name: helper.js
//-----------------------------------------
// Project : QuizFaber 
// Licence : MIT
// Author  : Luca Galli
// Email   : info@quizfaber.com
//=========================================

const { format } = require('date-fns');
const qfMailer = require('./mailer');
const qfService = require('./services');

var logDbEnabled = process.env.LOG_DB_ENABLED || '0';

///////////////// LOGGING FUNCTION ////////////////////////

/// <summary>
/// Return '1' if database log is enabled
/// </summary>
function IsDbLogEnabled()
{
	return (logDbEnabled === '1');
}

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
/// Logs a message in console (called from rest APIs)
/// </summary>
function LogReq(req, msg)
{
	if (GetLogLevel() <= 1)
	{
		console.log(GetHeaderLogReq(req) + " - " + msg);
		LogToDb(GetUserName(req), 1, msg);
	}
}

/// <summary>
/// Logs a debug message in console (called from rest APIs)
/// </summary>
function LogReqDebug(req, msg)
{
	if (GetLogLevel() <= 0)
	{
		console.debug(GetHeaderLogReq(req) + " - " + msg);
		LogToDb(GetUserName(req), 0, msg);
	}
}

/// <summary>
/// Logs a warning message in console (called from rest APIs)
/// </summary>
function LogReqWarn(req, msg)
{
	if (GetLogLevel() <= 2)
	{
		console.warn(GetHeaderLogReq(req) + " - " + msg);
		LogToDb(GetUserName(req), 2, msg);
	}
}

/// <summary>
/// Logs a error message in console (called from rest APIs)
/// </summary>
function LogReqError(req, msg)
{
	if (GetLogLevel() <= 3)
	{
		console.error(GetHeaderLogReq(req) + " - " + msg);
		LogToDb(GetUserName(req), 3, msg);
	}
}

function GetHeaderLogReq(req)
{
	var header = format(new Date(), 'dd/MM/yyyy HH:mm');
	header += " " + GetUserName(req).padEnd(20);
	return header + " " + req.originalUrl;
}

function GetUserName(req)
{
	if (req.hasOwnProperty('user'))
	{
		return req.user.id;
	}
	return "";
}


function LogToDb(userName, level, msg)
{
	if (logDbEnabled == '1')
	{
		qfService.sendLog({
			userName,
			level,
			msg
		});
	}
}

function CloseConnection(conn)
{
	conn.end();
}

function HandleSuccessInTransaction(req, res, conn, obj)
{
	conn.query("COMMIT").then(() => CloseConnection(conn));
	if (obj)
	{
		SendJSON(req, res, obj);
	}
	else
	{
		SendOK(req, res);
	}
}

function HandleErrorInTransaction(req, res, conn, msg, err)
{
	conn.query("ROLLBACK").then(() => CloseConnection(conn));
	SendInternalServerError(req, res, err, msg);
}


///////////////// HTTP FUNCTION ////////////////////////

/// <summary>
/// Sends HTTP status code 200 OK
/// </summary>
function SendOK(req, res)
{
	SendResponseSuccess(req, res, "OK");
}

/// <summary>
/// Sends HTTP status code 200 OK with body
/// </summary>
function SendJSON(req, res, obj)
{
	var text = JSON.stringify(obj);
	SendResponseSuccess(req, res, text);
}

/// <summary>
/// Sends HTTP status code 500 Internal Server Error
/// </summary>
function SendInternalServerError(req, res, err, msg)
{
	SendResponseFailed(req, res, "internal server error - " + msg + " : " + err, 500, '', err);
}

/// <summary>
/// Sends HTTP status code 401 Unauthorized
/// </summary>
function SendUnauthorized(req, res, msg)
{
	SendResponseFailed(req, res, "unauthorized - " + msg, 401);
}

/// <summary>
/// Sends HTTP status code 403 Forbidden
/// </summary>
function SendForbidden(req, res, msg)
{
	SendResponseFailed(req, res, "forbidden - " + msg, 403);
}

/// <summary>
/// Sends HTTP status code 404 Not Found
/// </summary>
function SendNotFound(req, res, msg)
{
	SendResponseFailed(req, res, "not found - " + msg, 404);
}

/// <summary>
/// Sends HTTP status code 400 Bad Request
/// </summary>
function SendBadRequest(req, res, msg)
{
	SendResponseFailed(req, res, "bad request - " + msg, 400);
}

/// <summary>
/// Sends 408 Request Timeout
/// </summary>
function SendRequestTimeout(req, res, msg, msgToClient = '')
{
	SendResponseFailed(req, res, "Request timeout - " + msg, 408, msgToClient);
}

function SendResponseSuccess(req, res, msg)
{
	var text = "Return " + msg.length + " bytes - ";

	var shortMsg = "";
	if (msg.length > 80) {
		if (GetLogLevel() <= 0) {
			shortMsg = msg.substring(0, 80);
		}
	}
	else {
		shortMsg = msg;
	}

	text += shortMsg;
	LogReq(req, text);

	res.set("Connection", "close");
	res.send(msg);
}

function SendResponseFailed(req, res, msg, statusCode, msgToClient = '', err = null)
{
	LogReqError(req, msg);
	res.set("Connection", "close");
	if (msgToClient.length === 0)
	{
		res.sendStatus(statusCode);
	}
	else
	{
		if (msgToClient)
		{
			res.statusMessage = msgToClient.toString().replace(/[^a-z0-9]/gi, '');
		}

		res.status(statusCode).send();

		//if (err) {
		//	res.status(statusCode).send(err.toString().replace(/[^a-z0-9]/gi, ''));
		//}
		//else {
		//	res.status(statusCode).send();
		//}
	}

	if (process.env.NOTIFY_ALERT_HTTP_STATUS)
	{
		if (process.env.NOTIFY_ALERT_HTTP_STATUS.includes(statusCode.toString()))
		{
			var ip = (req.headers['x-forwarded-for'] || '').split(',').pop().trim() || req.socket.remoteAddress;
			qfMailer.AlertNotification(msg, ip);
		}
	}
}

module.exports =
{
	LogReq, LogReqDebug, LogReqWarn, LogReqError, IsDbLogEnabled, GetLogLevel,
	CloseConnection,
	HandleSuccessInTransaction, HandleErrorInTransaction,
	SendOK, SendJSON,
	SendInternalServerError, SendUnauthorized, SendForbidden, SendNotFound, SendBadRequest, SendRequestTimeout,
	SendResponseSuccess, SendResponseFailed
}