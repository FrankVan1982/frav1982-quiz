//=========================================
// File name: queries.js
//-----------------------------------------
// Project : QuizFaber 
// Licence : MIT
// Author  : Luca Galli
// Email   : info@quizfaber.com
//=========================================

const qUtility = require('./queries.utility');

/// <summary>
/// SQL query for verify if a user is already registered
/// </summary>
GetQueryStringSelectPersor = (login) => {
	var query = "";

	query += "SELECT p.ID,PersonName,p.UserIdentity,p.UserPassword,p.UserRole,p.Info,p.IsEnabled,r.RoleName FROM Person p ";
	query += "INNER JOIN PersonRole r ON r.ID = p.UserRole ";
	query += "WHERE UserIdentity = '" + qUtility.EscapeApices(login) + "'";

	return query;
}

/// <summary>
/// SQL query for get the server settings
/// </summary>
GetQueryStringForGetServerSettings = () => {
	return "SELECT ServerName,ServerDescription,DbVersion,ServerVersion,Environment,PortalBaseUrl,PhpMyAdminUrl,OwnerUrl,FooterText  FROM Settings";
}

/// <summary>
/// SQL query for update quiz
/// </summary>
GetQueryStringUpdateQuiz = (quiz) => {

	var query = "UPDATE Quizzes SET ";

	var setList = "";

	if (quiz.hasOwnProperty("State"))
	{
		if (setList.length > 0) setList += ",";
		setList += " State=" + quiz.State;
	}
	if (quiz.hasOwnProperty("Link"))
	{
		if (setList.length > 0) setList += ",";
		setList += " Link='" + qUtility.EscapeApices(quiz.Link) + "'";
	}
	if (quiz.hasOwnProperty("Title")) {
		if (setList.length > 0) setList += ",";
		setList += " Title='" + qUtility.EscapeApices(quiz.Title) + "'";
	}

	query += setList + ", DateModified=NOW() WHERE QZ_ID=" + quiz.Id;

	return query;
}

/// <summary>
/// SQL query for the size (in MBytes) of database
/// </summary>
GetQueryStringForDbSize = (dbName) => {
	return "SELECT sum(round(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2))  as 'dbsize' FROM information_schema.tables WHERE TABLE_SCHEMA ='" + dbName + "'";
}

/// <summary>
/// SQL query for update a session (temp data)
/// </summary>
GetQueryStringGetDataSession = (sessionId) => {
	return "SELECT SessionData FROM QuizSession WHERE SessionID=" + sessionId;
}

/// <summary>
/// SQL query for update a session (temp data)
/// </summary>
GetQueryStringUpdateDataSession = (sessionId, sessionData) => {
	var query;
	if (sessionData !== null) {
		query = "UPDATE QuizSession SET SessionData='" + qUtility.EscapeApices(sessionData) + "', DateLastUpdate=NOW() WHERE SessionID=" + sessionId;
	}
	else {
		query = "UPDATE QuizSession SET SessionData=NULL, DateLastUpdate=NOW() WHERE SessionID=" + sessionId;
	}
	return query;
}

/// SQL query for insert a log row
/// </summary>
GetQueryStringInsertWebLog = (userName, level, msg) => {
	var listValue = "";

	listValue += "'" + qUtility.EscapeApices(userName) + "',";
	listValue += level + ",";
	listValue += "'" + qUtility.EscapeApices(msg) + "',";
	listValue += "NOW()";

	return "INSERT INTO WebLog(UserIdentity, SeverityLevel, Message, DateCreated) VALUES (" + listValue + ")";
}

/// <summary>
/// SQL query for store report of a quiz results (what the student see in the response page)
/// </summary>
GetQueryStringForInsertQuizResultReport = (report) => {
	var listValue = "";

	listValue += report.ID.toString() + ",";  // Id
	listValue += "'" + qUtility.EscapeApices(report.report) + "',"; // report
	listValue += "'" + qUtility.EscapeApices(report.origin) + "',"; // origin
	listValue += "'" + qUtility.EscapeApices(report.charset) + "',"; // charset
	listValue += "'" + qUtility.EscapeApices(report.language) + "'"; // language

	return "INSERT INTO QuizResultReport (ID,Report,Origin,Charset,Language) VALUES (" + listValue + ")";
}

/// <summary>
/// SQL query for get the statistics
/// </summary>
GetQueryStringForDbTimezone = () => {
	//return "SELECT CAST(time_format(TIMEDIFF(NOW(), UTC_TIMESTAMP), '%H') AS INT) AS tz";
	return "SELECT time_format(TIMEDIFF(NOW(), UTC_TIMESTAMP), '%H:%i') AS tz";
}


module.exports = {	
	GetQueryStringSelectPersor,
	GetQueryStringForInsertQuizResultReport,
	GetQueryStringUpdateQuiz,
	GetQueryStringForGetServerSettings,
	GetQueryStringForDbSize,
	GetQueryStringGetDataSession,
	GetQueryStringUpdateDataSession,
	GetQueryStringInsertWebLog,
	GetQueryStringForDbTimezone
}
