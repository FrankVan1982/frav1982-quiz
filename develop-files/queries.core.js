//=========================================
// File name: queries.core.js
//-----------------------------------------
// Project : QuizFaber 
// Licence : MIT
// Author  : Luca Galli
// Email   : info@quizfaber.com
//=========================================

const qUtility = require('./queries.utility');

/// <summary>
/// SQL query for verify if a user has already answered to a given quiz
/// </summary>
GetQueryStringForCheckResult = (name, login, id) => {
	var query = "";

	query += " SELECT r.NumOfRetake,r.FinalMark,q.State ";
	query += " FROM QuizResult r ";
	query += " LEFT JOIN Quizzes q ON q.QZ_ID = r.QuizID ";
	query += " WHERE r.QuizName = '" + qUtility.EscapeApices(name) + "' AND r.UserLogin = '" + qUtility.EscapeApices(login) + "'";
	if (id > 0) {
		query += " AND r.QuizID=" + id;
	}
	query += " ORDER BY NumOfRetake DESC";
	query += " LIMIT 1";

	return query;
}

/// <summary>
/// SQL query for new user registration
/// </summary>
GetQueryStringInsertPerson = (person) => {
	var listValue = "";

	listValue += "'" + qUtility.EscapeApices(person.name) + "',";
	listValue += "'" + qUtility.EscapeApices(person.email) + "',";
	listValue += "'" + person.password + "',";
	listValue += "2,";
	listValue += "'" + qUtility.EscapeApices(JSON.stringify(person.otherFields)) + "',";
	listValue += "1,";
	listValue += "NOW(),NOW(),'R'";

	return "INSERT INTO Person (PersonName,UserIdentity,UserPassword,UserRole,Info,IsEnabled,DateCreated,DateModified,Source) VALUES (" + listValue + ")";
}

/// <summary>
/// SQL query for get quiz given its ID
/// </summary>
GetQueryStringForGetTitle = (id) => {
	var query = "";

	query += "SELECT QZ_ID, quizname, Title, Author, Argument, Season, NumQuestions, State, Link, DateCreated, DateModified FROM Quizzes";
	if (id > 0) {
		query += " WHERE QZ_ID=" + id;
	}
	return query;
}

/// <summary>
/// SQL query for get titles of all quizzes
/// </summary>
GetQueryStringForGetTitles = (limit, offset, orderby, moduleId, stateArray) => {
	var query = "";

	query += "SELECT QZ_ID, quizname, Title, Author, Argument, Season, NumQuestions, State, qs.Description, Link, DateCreated, DateModified, Properties ";
	if ((limit > 0) && (offset >= 0)) {
		if ((moduleId > 0) || (stateArray.length > 0)) {
			query += ",(select count(*) FROM Quizzes cntQ ";
			query += (moduleId > 0) ? "INNER JOIN ModuleQuiz cntM ON cntM.QuizId = cntQ.QZ_ID" : "";
			query += " WHERE 1 ";
			query += (moduleId > 0) ? " AND cntM.ModuleId = " + moduleId : "";
			query += (stateArray.length > 0) ? " AND cntQ.State IN ( " + stateArray.join(',') + ") " : "";
			query += " ) AS TotalCount "
		}
		else {
			query += ",(select count(*) FROM Quizzes) AS TotalCount ";
		}
	}
	query += ",(";
	query += "SELECT COUNT(*) FROM Person p ";
	query += "INNER JOIN GroupPerson gp ON gp.PersonID = p.ID ";
	query += "INNER JOIN`Group` g ON g.ID = gp.GroupId ";
	query += "INNER JOIN GroupModule gm ON gm.GroupId = g.ID ";
	query += "INNER JOIN ModuleQuiz mq ON mq.ModuleId = gm.ModuleId ";
	query += "WHERE mq.QuizId = q.QZ_ID AND p.IsEnabled=1 ";
	query += ") AS Audience ";

	query += " FROM Quizzes q ";
	query += " INNER JOIN QuizState qs ON qs.Code = q.State ";

	var hasWhere = false;
	if (moduleId > 0) {
		query += " INNER JOIN ModuleQuiz mqz ON mqz.QuizId = q.QZ_ID ";
		query += " WHERE mqz.ModuleId = " + moduleId + " ";
		hasWhere = true;
	}
	if (stateArray.length > 0) {
		if (hasWhere) {
			query += " AND q.State IN (";
		}
		else {
			query += " WHERE q.State IN (";
		}
		query += stateArray.join(',');
		query += ") ";
	}
	if (orderby.length > 0) {
		query += " ORDER BY " + orderby;
	}

	// usefull for gui pagination:
	if ((limit > 0) && (offset >= 0)) {
		query += " LIMIT " + offset + "," + limit;
	}
	return query;
}

/// <summary>
/// SQL query for update the date of last access
/// </summary>
GetQueryStringForUpdateDateLastAccess = (id) => {
	return "UPDATE Person SET DateLastAccess=NOW() WHERE id=" + id;
}

/// <summary>
/// SQL query for store quiz results sent by the client
/// </summary>
GetQueryStringFromQuiz = (quiz, isDuplicated, numDecimalPlacesForPoints, timezone) => {

	var listValue = "";

	listValue += "'" + qUtility.EscapeApices(quiz.options.name) + "',";  // QuizName
	listValue += "'" + qUtility.EscapeApices(quiz.options.title) + "',"; // QuizTitle
	listValue += quiz.options.id + ","; // QuizID
	listValue += "'" + qUtility.EscapeApices(quiz.currentUser.name) + "',"; // UserName
	listValue += "'" + qUtility.EscapeApices(quiz.currentUser.email) + "',"; // UserLogin
	//listValue += "'" + quiz.dateCompletedStr + "',";  // DateCompleted
	listValue += "CONVERT_TZ('" + quiz.dateCompletedStr + "','+00:00',@@session.time_zone),";  // DateCompleted
	//listValue += "STR_TO_DATE('" + quiz.dateCompleted + "', '%Y-%m-%dT%T.%fZ'),";  // DateCompleted
	//listValue += "'" + GetStringFromCurrentUtcDate() + "',";  // DateReceived
	listValue += "NOW(),";  // DateReceived
	listValue += quiz.options.numOfQuestions + ","; // QuestsNum
	listValue += quiz.options.maxmark + ",";  // HighestMark
	listValue += quiz.options.minmark + ",";  // LowestMark
	listValue += quiz.options.roundmark + ",";  // RoundMark
	listValue += quiz.mark + ","; // FinalMark
	listValue += (quiz.points ? quiz.points.toFixed(numDecimalPlacesForPoints) : "NULL") + ","; // FinalPoints
	listValue += quiz.options.maxtime + ",";  // TotalTime
	listValue += quiz.time + ",";  // ElapsedTime
	listValue += quiz.nRight + ","; // RightQuestsNum
	listValue += quiz.nWrong + ","; // WrongQuestsNum
	listValue += (quiz.nNotValuated ? quiz.nNotValuated : "NULL") + ","; // NotValuatedQuestsNum
	listValue += (quiz.nNotAnswered ? quiz.nNotAnswered : "NULL") + ","; // NotAnsweredQuestsNum
	listValue += quiz.numOfRetake + ","; // NumOfRetake
	listValue += isDuplicated; // IsDuplicated

	return "INSERT INTO QuizResult (QuizName,QuizTitle,QuizID,UserName,UserLogin,DateCompleted,DateReceived,QuestsNum,HighestMark,LowestMark,RoundMark,FinalMark,FinalPoints,TotalTime,ElapsedTime,RightQuestsNum,WrongQuestsNum,NotValuatedQuestsNum,NotAnsweredQuestsNum,NumOfRetake,IsDuplicated) VALUES (" + listValue + ")";
}

/// <summary>
/// SQL query for store all answers of a quiz results
/// </summary>
GetQueryStringForAllAnswers = (question, questionID) => {
	var allQueries = "";

	for (var j = 0; j < question.answers.length; j++) {
		var answer = question.answers[j];
		query = GetQueryStringFromAnswer(questionID, j + 1, answer);

		if (allQueries !== "") allQueries += ";";
		allQueries += query;
	}

	return allQueries;
}

/// <summary>
/// SQL query for store a question of a quiz results
/// </summary>
GetQueryStringFromQuestion = (quizID, num, question, numDecimalPlacesForPoints) => {
	var listValue = "";

	listValue += quizID.toString() + ",";  // IdQuizResult
	if (question.hasOwnProperty("num")) {
		listValue += question.num + ",";  // QuestNum
	}
	else {
		// for back-compatibility
		listValue += num + ",";  // QuestNum
	}
	listValue += question.typeOfQuestion + ",";  // QuestType						
	listValue += question.weight + ",";  // Weight
	listValue += "LEFT('" + qUtility.EscapeApices(question.shortTextQuestion) + "',1000),";  // ShortTextQuestion
	listValue += question.valid + ",";  // Valid
	listValue += question.nScore + ",";  // Score
	listValue += question.maxScore + ",";  // MaxScore
	listValue += question.minScore + ",";  // MinScore
	listValue += (question.nPoints ? question.nPoints.toFixed(numDecimalPlacesForPoints) : "NULL");  // Points

	return "INSERT INTO QuizResultQuestion (IdQuizResult,QuestNum,QuestType,Weight,ShortTextQuestion, Valid, Score, MaxScore, MinScore, Points) VALUES (" + listValue + ")";
}

/// <summary>
/// SQL query for store a session (login)
/// </summary>
GetQueryStringOpenSession = (personId, ipLogin, userAgent, isRecoverable) => {
	var listValue = "";

	listValue += personId.toString() + ",";  // personId
	listValue += "'" + ipLogin + "',";  // ipLogin
	if (userAgent) {
		listValue += "'" + qUtility.EscapeApices(userAgent) + "',";  // user agent
	}
	else {
		listValue += "NULL,"
	}
	listValue += isRecoverable;  // isRecoverable

	return "INSERT INTO QuizSession (PersonID,IpLogin,UserAgent,IsRecoverable,DateCreated) VALUES (" + listValue + ",NOW())";
}

/// <summary>
/// SQL query for update a session (logout)
/// </summary>
GetQueryStringCloseSession = (personId, sessionId, ipLogout, quizId) => {
	var sqlString = "UPDATE QuizSession SET ";

	sqlString += " IpLogout='" + ipLogout + "'";
	sqlString += " , DateLastUpdate=NOW() ";
	if (quizId > 0) {
		sqlString += ", QuizID=" + quizId.toString();
	}
	sqlString += " WHERE PersonID=" + personId;
	if (sessionId !== null) {
		sqlString += " AND SessionID=" + sessionId;
	}

	return sqlString;
}

/// <summary>
/// SQL query for select last session for a user, given his/her person ID
/// </summary>
GetQueryStringGetLastSessionForRecovery = (personId, sessionId) => {
	var query = "SELECT SessionID, SessionData,DateCreated,DateLastUpdate FROM QuizSession ";
	query += " WHERE PersonID = " + personId;
	query += " AND IpLogout IS NULL AND QuizID IS NULL ";
	// query += " AND SessionData IS NOT NULL ";  // removed for query optimization : 0.5 sec => 0.05 sec
	query += " AND DateCreated >= NOW() - INTERVAL 4 HOUR ";
	if (sessionId) {
		query += "AND SessionID<>" + sessionId;
	}
	query += " ORDER BY DateCreated DESC ";
	// query += " LIMIT 1"; // removed for query optimization : returns all rows
	return query;
}

/// <summary>
/// SQL query for check if a user has more that a quiz result for a given quiz
/// </summary>
GetQueryStringCheckDuplicatedResults = (quizName, userLogin, quizId) => {
	var query = "";

	query += "SELECT COUNT(ID) AS NumResults FROM QuizResult ";
	query += " WHERE QuizName = '" + qUtility.EscapeApices(quizName) + "' ";
	query += " AND UserLogin = '" + qUtility.EscapeApices(userLogin) + "' ";
	if (quizId > 0) {
		query += " AND QuizID = " + quizId;
	}
	return query;
}

/// <summary>
/// SQL query for store an answerof a quiz results
/// </summary>
function GetQueryStringFromAnswer(questionID, answerNum, answer) {
	var listValue = "";

	listValue += questionID.toString() + ","; // IdResultQuestion
	listValue += answerNum.toString() + ","; // AnswerNum
	listValue += "LEFT('" + qUtility.EscapeApices(answer.choice) + "',500),"; // Choice
	listValue += "LEFT('" + qUtility.EscapeApices(answer.valuation) + "',500),"; // Valuation
	listValue += answer.isGuess + ","; // IsGuess
	listValue += answer.score + ","; // Score
	listValue += "LEFT('" + qUtility.EscapeApices(answer.additionalText) + "',65535),"; // AdditionalText
	listValue += "LEFT('" + qUtility.EscapeApices(answer.shortTextAnswer) + "',1000),"; // ShortTextAnswer
	listValue += "LEFT('" + qUtility.EscapeApices(answer.shortTextRemark) + "',1000)"; // ShortTextRemark

	return "INSERT INTO QuizResultAnswer (IdResultQuestion,AnswerNum,Choice,Valuation,IsGuess,Score,AdditionalText,ShortTextAnswer,ShortTextRemark) VALUES (" + listValue + ")";
}

module.exports = {
	GetQueryStringForCheckResult,
	GetQueryStringInsertPerson,
	GetQueryStringForGetTitle,
	GetQueryStringForGetTitles,
	GetQueryStringForUpdateDateLastAccess,
	GetQueryStringFromQuiz,
	GetQueryStringForAllAnswers,
	GetQueryStringFromQuestion,
	GetQueryStringOpenSession,
	GetQueryStringCloseSession,
	GetQueryStringGetLastSessionForRecovery,
	GetQueryStringCheckDuplicatedResults
}