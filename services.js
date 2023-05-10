//=========================================
// File name: services.js
//-----------------------------------------
// Project : QuizFaber 
// Licence : MIT
// Author  : Luca Galli
// Email   : info@quizfaber.com
//=========================================

const qfDb = require('./database');
const qfQuery = require('./queries');
const qfLogger = require('./logger');
const { Queue } = require('./definitions');

const sessionQ = new Queue();
const logQ = new Queue();

var dispatcherQueueLimit = process.env.DISPATCHER_QUEUE_LIMIT || 7;
var dispatcherLogQueueLimit = 100;
var dispatcherTimeout = process.env.DISPATCHER_TIMEOUT || 1000;
var dispatcherTimeoutAfterRun = 100;

/// <summary>
/// Add a session update data into session update queue
/// </summary>
function send(item)
{
	sessionQ.send(item);	
}

/// <summary>
/// Add a session update data into session update queue
/// </summary>
function sendLog(item)
{
	logQ.send(item);
}

/// <summary>
/// Clear the session update queue
/// </summary>
function clear()
{
	sessionQ.clear();	
}

/// <summary>
/// Dispatch session update to database
/// </summary>
function dispatcher()
{
	try
	{
		if (sessionQ.length() > 0)
		{
			qfLogger.Log("dispatcher, queue len=" + sessionQ.length());

			var sessionQLimit = new Queue();

			var count = 0;
			while (sessionQ.length() > 0 && (count < dispatcherQueueLimit)) {
				sessionQLimit.send(sessionQ.receive());
				count++;
			}

			qfDb.getPool().getConnection()
				.then(conn => {
					var timeStart = new Date().getTime();
					UpdateSession(conn, sessionQLimit, timeStart);
				}).catch(err => {
					qfLogger.LogError('not connected: ' + err);
				});
		}
		else
		{
			setTimeout(dispatcher, dispatcherTimeout);
		}
	}
	catch (err)
	{
		qfLogger.LogError(err);
	}	
}

/// <summary>
/// Dispatch logs to database
/// </summary>
function dispatcherLog()
{
	try
	{
		if (logQ.length() > 0)
		{
			qfLogger.LogDebug("dispatcher log, queue len=" + logQ.length());

			var logQLimit = new Queue();

			var count = 0;
			while (logQ.length() > 0 && (count < dispatcherLogQueueLimit)) {
				logQLimit.send(logQ.receive());
				count++;
			}

			qfDb.getPool().getConnection()
				.then(conn => {
					WriteLog(conn, logQLimit);
				}).catch(err => {
					qfLogger.LogError('not connected: ' + err);
				});
		}
		else
		{
			setTimeout(dispatcherLog, dispatcherTimeout);
		}
	}
	catch (err)
	{
		qfLogger.LogError(err);
	}
}

/// <summary>
/// Update sessions into database (using the same connection)
/// </summary>
UpdateSession = (conn, queue, timeStart) => {

	var item = queue.receive();
	if (item) {
		qfLogger.Log("Process user : " + item.login + ", session id=" + item.body.sessionId);

		var queryUser = qfQuery.GetQueryStringSelectPersor(item.login);
		conn.query(queryUser)
			.then((rows) => {
				if ((rows.length === 1) && (rows[0].IsEnabled === 1)) {

					var querySession = qfQuery.GetQueryStringGetDataSession(item.body.sessionId);
					conn.query(querySession)
						.then((rows) => {
							if (rows.length > 0) {
								
								var dataJson = rows[0].SessionData;

								if (dataJson)
								{
									var quizTemp = JSON.parse(dataJson);
									var n = item.body.sessionData.questionIndex;
									//Log(req, "update question index : " + n + " - already answered : " + item.body.sessionData.question.alreadyAnswered);
									quizTemp.questions[n] = item.body.sessionData.question;
									quizTemp.time = item.body.sessionData.time;
									if (item.body.sessionData.hasOwnProperty("updateTime")) {
										quizTemp.updateTime = item.body.sessionData.updateTime;
									}
									if (item.body.sessionData.hasOwnProperty("shadowDeltaTime")) {
										quizTemp.shadowDeltaTime = item.body.sessionData.shadowDeltaTime;
									}
									quizTemp.currentQuestionPage = item.body.sessionData.currentQuestionPage;
									
									dataJson = JSON.stringify(quizTemp);
									var udpateSession = qfQuery.GetQueryStringUpdateDataSession(item.body.sessionId, dataJson);
									
									conn.query(udpateSession)
										.then((data) => {
											UpdateSession(conn, queue, timeStart);
										})
										.catch(err => {
											qfLogger.LogError("UpdateSession: " + err);
											UpdateSession(conn, queue, timeStart);
										});
								}
								else {
									qfLogger.LogWarn("UpdateSession: no data in session for user " + item.login);
									UpdateSession(conn, queue, timeStart);
								}
							}
							else {
								qfLogger.LogWarn("UpdateSession: session not found for user " + item.login);
								UpdateSession(conn, queue, timeStart);
							}
						})
						.catch(err => {
							// select failed
							qfLogger.LogError("UpdateSession: " + err);
							UpdateSession(conn, queue, timeStart);
						})
				}
				else {
					qfLogger.LogWarn("UpdateSession: user not enabled");
					UpdateSession(conn, queue, timeStart);
				}
			})
			.catch(err => {
				// select failed
				qfLogger.LogError("UpdateSession: " + err);
				UpdateSession(conn, queue, timeStart);
			})
	}
	else {
		conn.end();

		var diffTime = new Date().getTime() - timeStart;
		qfLogger.LogDebug('DIFFTIME (ms) : ' + diffTime);

		setTimeout(dispatcher, dispatcherTimeoutAfterRun);
	}

}


WriteLog = (conn, queue) => {

	var item = queue.receive();
	if (item)
	{
		var queryLog = qfQuery.GetQueryStringInsertWebLog(item.userName, item.level, item.msg);
		conn.query(queryLog)
			.then((data) => {
				WriteLog(conn, queue);
			})
			.catch(err => {
				qfLogger.LogError("WriteLog: " + err);
				WriteLog(conn, queue);
			});
	}
	else
	{
		conn.end();
		setTimeout(dispatcherLog, dispatcherTimeoutAfterRun);
	}
}

module.exports = {
	dispatcher, send, clear,
	dispatcherLog, sendLog
}