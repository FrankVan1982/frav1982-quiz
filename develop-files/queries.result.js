//=========================================
// File name: queries.result.js
//-----------------------------------------
// Project : QuizFaber 
// Licence : MIT
// Author  : Luca Galli
// Email   : info@quizfaber.com
//=========================================

const qUtility = require('./queries.utility');

/// <summary>
/// SQL query for get the questions of a quiz result, given its ID
/// </summary>
GetQueryStringForQuestionReport = (id, userLogin = "") => {
	var query = "";

	query += " SELECT q.ID, IdQuizResult,QuestNum,QuestType,Weight,ShortTextQuestion, Valid, q.Score, MaxScore, MinScore, Points, Feedback, IsCancelled, GROUP_CONCAT(Choice SEPARATOR ' ; ') AS Choices, GROUP_CONCAT(Valuation SEPARATOR ' ; ') AS Valuations, GROUP_CONCAT(AdditionalText SEPARATOR '') AS AdditionalTexts ";
	if (userLogin.length > 0) {
		query += " ,m.Properties as ModuleInfo ";
	}
	else {
		query += " ,'' as ModuleInfo ";
	}
	query += " FROM QuizResultQuestion q";
	query += " INNER JOIN QuizResultAnswer a on a.IdResultQuestion = q.ID ";
	query += " INNER JOIN QuizResult qr on qr.ID = q.IdQuizResult ";

	if (userLogin.length > 0) {
		query += " INNER JOIN Person p ON p.UserIdentity = qr.UserLogin ";
		query += " INNER JOIN GroupPerson gp ON gp.PersonID = p.ID ";
		query += " INNER JOIN `Group` g ON g.ID = gp.GroupId ";
		query += " INNER JOIN GroupModule gm ON gm.GroupId = g.ID ";
		query += " INNER JOIN ModuleQuiz mq ON mq.ModuleId = gm.ModuleId ";
		query += " INNER JOIN Module m ON m.Id = gm.ModuleId ";
		query += " INNER JOIN Quizzes qz ON qz.QZ_ID = mq.QuizId ";
	}

	query += " WHERE IdQuizResult = " + id;
	if (userLogin.length > 0) {
		query += " AND qr.UserLogin = '" + qUtility.EscapeApices(userLogin) + "' ";
		query += " AND qr.QuizName=qz.quizname ";
		//query += " AND NOW() BETWEEN gm.DateBeginViewResults AND gm.DateEndViewResults ";
		query += " AND (NOW() >= gm.DateBeginViewResults) AND ((gm.DateEndViewResults IS NULL) OR (NOW() <= gm.DateEndViewResults))";
	}
	query += " GROUP BY ID, IdQuizResult,QuestNum,QuestType,Weight,ShortTextQuestion, Valid, q.Score, MaxScore, MinScore"
	//query += " ORDER BY AnswerNum";

	return query;
}

/// <summary>
/// SQL query for get the answers of a question of a quiz result, given its question ID
/// </summary>
GetQueryStringForAnswersReport = (id, userLogin = "") => {
	var query = "";

	query += " SELECT qa.IdResultQuestion,qa.AnswerNum,qa.Choice,qa.Valuation,qa.IsGuess,qa.Score,qa.AdditionalText,qa.ShortTextAnswer,qa.ShortTextRemark ";
	query += " FROM QuizResultAnswer qa";
	query += " INNER JOIN QuizResultQuestion q on qa.IdResultQuestion = q.ID ";
	query += " INNER JOIN QuizResult qr on qr.ID = q.IdQuizResult ";

	if (userLogin.length > 0) {
		query += " INNER JOIN Person p ON p.UserIdentity = qr.UserLogin ";
		query += " INNER JOIN GroupPerson gp ON gp.PersonID = p.ID ";
		query += " INNER JOIN `Group` g ON g.ID = gp.GroupId ";
		query += " INNER JOIN GroupModule gm ON gm.GroupId = g.ID ";
		query += " INNER JOIN ModuleQuiz mq ON mq.ModuleId = gm.ModuleId ";
		query += " INNER JOIN Quizzes qz ON qz.QZ_ID = mq.QuizId ";
	}

	query += " WHERE qa.IdResultQuestion = " + id;
	if (userLogin.length > 0) {
		query += " AND qr.UserLogin = '" + qUtility.EscapeApices(userLogin) + "' ";
		query += " AND qr.QuizName=qz.quizname ";
		//query += " AND NOW() BETWEEN gm.DateBeginViewResults AND gm.DateEndViewResults ";
		query += " AND (NOW() >= gm.DateBeginViewResults) AND ((gm.DateEndViewResults IS NULL) OR (NOW() <= gm.DateEndViewResults))";
	}
	query += " GROUP BY qa.AnswerNum"

	return query;
}

/// <summary>
/// SQL query for get the quizzes results given some filters 
/// </summary>
GetQueryStringForQuizReport = (searchParams) => {

	var query = "";

	query += " SELECT qr.ID, qr.QuizName,qr.QuizTitle,qr.UserName,p.Info AS UserInfo,qr.UserLogin,qr.DateCompleted,qr.DateReceived,qr.QuestsNum,qr.HighestMark,qr.LowestMark,qr.RoundMark,qr.FinalMark,qr.FinalPoints,qr.ReviewMark,qr.ReviewPoints,qr.ReviewDate,qr.TotalTime,qr.ElapsedTime,qr.RightQuestsNum,qr.WrongQuestsNum,qr.NotAnsweredQuestsNum, qr.NotValuatedQuestsNum, qr.NumOfRetake, qr.IsDuplicated, q.Author,q.Argument ";
	query += " FROM QuizResult qr ";
	query += " LEFT JOIN Person p ON p.UserIdentity = qr.UserLogin ";
	query += " LEFT JOIN Quizzes q ON q.QZ_ID=qr.QuizID ";

	if (searchParams.Names || searchParams.Title || searchParams.User || (searchParams.FromDate && searchParams.ToDate) || (searchParams.FromMark && searchParams.ToMark) || searchParams.Last) {
		var whereCond = "";

		if (searchParams.Names && searchParams.Names.length > 0) {			
			const namesListWithQuota = searchParams.Names.map(x => "'" + qUtility.EscapeSpecialChar(x) + "'");
			const namesCommaSep = namesListWithQuota.join(',');
			whereCond += " qr.QuizName IN (" + namesCommaSep + ") ";
		}

		if (searchParams.Title) {
			whereCond += " (qr.QuizName LIKE '%" + qUtility.EscapeSpecialChar(searchParams.Title) + "%' OR ";
			whereCond += " qr.QuizTitle LIKE '%" + qUtility.EscapeSpecialChar(searchParams.Title) + "%' OR ";
			whereCond += " CONCAT(qr.QuizName,' - ',qr.QuizTitle) LIKE '%" + qUtility.EscapeSpecialChar(searchParams.Title) + "%') ";
		}

		if (searchParams.User) {
			if (whereCond.length > 0) whereCond += " AND ";
			whereCond += " (qr.UserName LIKE '%" + qUtility.EscapeSpecialChar(searchParams.User) + "%' OR ";
			whereCond += " qr.UserLogin LIKE '%" + qUtility.EscapeSpecialChar(searchParams.User) + "%' OR ";
			whereCond += " CONCAT(qr.UserName,' - ',qr.UserLogin) LIKE '%" + qUtility.EscapeSpecialChar(searchParams.User) + "%') ";
		}

		if (searchParams.FromDate && searchParams.ToDate) {
			if (whereCond.length > 0) whereCond += " AND ";
			whereCond += " (qr.DateReceived BETWEEN '" + searchParams.FromDate + "' AND '" + searchParams.ToDate + "') ";
		}

		if (searchParams.FromMark && searchParams.ToMark) {
			if (whereCond.length > 0) whereCond += " AND ";
			whereCond += " (qr.FinalMark >= " + searchParams.FromMark + " AND qr.FinalMark <= " + searchParams.ToMark + " ) ";
		}

		if (searchParams.Last) {
			if (whereCond.length > 0) whereCond += " AND ";
			whereCond += " (qr.DateReceived > DATE_SUB(LEAST(CURRENT_TIMESTAMP, UTC_TIMESTAMP()), INTERVAL " + searchParams.Last.toString() + " MINUTE)) ";
		}

		if (searchParams.IncludeDup === 0) {
			if (whereCond.length > 0) whereCond += " AND ";
			whereCond += " (IsDuplicated IS NULL OR IsDuplicated=0)";
		}

		query += " WHERE " + whereCond + " ";
	}

	if (searchParams.orderby) {
		query += " ORDER BY " + searchParams.orderby;
	}
	else {
		query += " ORDER BY qr.DateReceived DESC ";
	}

	if (searchParams.Top) {
		query += " LIMIT " + searchParams.Top.toString();
	}

	return query;
}

/// <summary>
/// SQL query for update a question result  
/// </summary>
GetQueryStringUpdateQuestionResult = (result) => {

	var query = "";
	var setList = "";

	query += "UPDATE QuizResultQuestion SET ";

	if (result.hasOwnProperty("Valid")) {
		if (setList.length > 0) setList += " , ";
		setList += " Valid = " + result.Valid;
	}
	if (result.hasOwnProperty("Score")) {
		if (setList.length > 0) setList += " , ";
		setList += " Score = " + result.Score;
	}
	if (result.hasOwnProperty("MaxScore")) {
		if (setList.length > 0) setList += " , ";
		setList += " MaxScore = " + result.MaxScore;
	}
	if (result.hasOwnProperty("MinScore")) {
		if (setList.length > 0) setList += " , ";
		setList += " MinScore = " + result.MinScore;
	}
	if (result.hasOwnProperty("Points")) {
		if (setList.length > 0) setList += " , ";
		setList += " Points = " + result.Points;
	}
	if (result.hasOwnProperty("Feedback")) {
		if (setList.length > 0) setList += " , ";
		setList += " Feedback = '" + qUtility.EscapeApices(result.Feedback) + "'";
	}

	if (setList.length > 0) {
		query += setList + " WHERE ID = " + result.Id;
	}

	return query;
}

/// <summary>
/// SQL query for update a quiz result after the teacher review 
/// </summary>
GetQueryStringUpdateQuizResultForReview = (result) => {

	var query = "";
	var setList = " ReviewDate = NOW() ";

	query += "UPDATE QuizResult SET ";

	if (result.hasOwnProperty("ReviewMark")) {
		setList += " ,ReviewMark = " + result.ReviewMark;
	}
	if (result.hasOwnProperty("ReviewPoints")) {
		setList += " ,ReviewPoints = " + result.ReviewPoints;
	}
	//if (result.hasOwnProperty("FinalPoints")) {
	//	setList += " ,FinalPoints = " + result.FinalPoints;
	//}
	if (result.hasOwnProperty("RightQuestsNum")) {
		setList += " ,RightQuestsNum = " + result.RightQuestsNum;
	}
	if (result.hasOwnProperty("WrongQuestsNum")) {
		setList += " ,WrongQuestsNum = " + result.WrongQuestsNum;
	}
	if (result.hasOwnProperty("NotAnsweredQuestsNum")) {
		setList += " ,NotAnsweredQuestsNum = " + result.NotAnsweredQuestsNum;
	}
	if (result.hasOwnProperty("NotValuatedQuestsNum")) {
		setList += " ,NotValuatedQuestsNum = " + result.NotValuatedQuestsNum;
	}

	if (setList.length > 0) {
		query += setList + " WHERE ID = " + result.Id;
	}

	return query;
}

/// <summary>
/// SQL query for get abstract of quiz results
/// </summary>
GetQueryStringForGetResultsAbstract = (userLogin, moduleId) => {
	var query;

	if (userLogin.length > 0) {
		query = "SELECT ID, QuizName, QuizTitle, UserName, UserLogin, DateReceived, IsDuplicated ";
		query += " FROM QuizResult qr ";

		if (moduleId > 0) {
			query += " INNER JOIN ModuleQuiz mq ON mq.QuizId = qr.QuizID ";
		}
		query += " WHERE UserLogin='" + qUtility.EscapeApices(userLogin) + "' ";

		if (moduleId > 0) {
			query += " AND mq.ModuleId = " + moduleId;
		}
	}
	else {
		query = "SELECT ID, QuizName, QuizTitle, UserName, UserLogin, DateReceived, FinalMark, FinalPoints, ReviewPoints, IsDuplicated ";
		query += " FROM QuizResult qr ";

		if (moduleId > 0)
		{
			query += " INNER JOIN ModuleQuiz mq ON mq.QuizId = qr.QuizID ";
			query += " WHERE mq.ModuleId = " + moduleId;
		}
	}
	return query;
}

/// <summary>
/// SQL query for delete a quiz result, given its ID
/// </summary>
GetQueryStringDeleteResult = (resultId) => {
	return "DELETE FROM QuizResult WHERE ID = " + resultId;
}

/// <summary>
/// SQL query for insert a fake quiz result
/// </summary>
GetQueryStringInsertRetrieveResult = (quizName, quizTitle, identityId, personName, date, numQuestions, points, report) => {
	var query = "CALL CreateFakeQuizResult(";

	query += "'" + qUtility.EscapeApices(quizName) + "',";
	query += "'" + qUtility.EscapeApices(quizTitle) + "',";
	query += "'" + qUtility.EscapeApices(personName) + "',";
	query += "'" + qUtility.EscapeApices(identityId) + "',";
	query += "'" + date + "',";
	query += numQuestions + ",";
	query += points + ",";
	query += "'" + qUtility.EscapeApices(report) + "'";
	query += ")";

	return query;
}

/// <summary>
/// SQL query for get the report of a quiz results (what the student see in the response page) by report id
/// </summary>
GetQueryStringForQuizResultReport = (reportID) => {
	var query = "SELECT qrr.ID, qrr.Report, qrr.Origin, qrr.Charset, qrr.Language, qr.FinalMark, qr.HighestMark, qr.FinalPoints, qr.ReviewPoints, qr.UserName, qr.UserLogin, qr.QuizName, qr.QuizTitle ";
	query += " FROM QuizResultReport qrr ";
	query += " INNER JOIN QuizResult qr ON qr.ID = qrr.ID ";
	query += " WHERE qrr.ID=" + reportID;

	return query;
}

/// <summary>
/// SQL query for update report of a quiz results (what the student see in the response page)
/// </summary>
GetQueryStringForUpdateQuizResultReport = (report) => {

	var query = "UPDATE QuizResultReport SET ";
	query += " Report='" + qUtility.EscapeApices(report.report) + "',";
	query += " Charset='" + report.charset + "',";
	query += " Language='" + report.language + "'";
	query += " WHERE ID = " + report.ID;

	return query;
}

/// <summary>
/// SQL query for get module properties
/// </summary>
GetQueryStringForGetModuleProperties = (id) => {
	return "SELECT Properties FROM Module WHERE ID = " + id;
}

/// <summary>
/// SQL query for get quiz names that belog to a given domains
/// </summary>
GetQueryStringForQuizNamesFromDomains = (domainsList) => {
	var query = "SELECT quizname FROM Quizzes q ";
	query += " INNER JOIN ModuleQuiz mq ON mq.QuizId = q.QZ_ID ";
	query += " INNER JOIN DomainModule dm ON dm.ModuleId = mq.ModuleId ";
	query += " WHERE dm.DomainId IN(" + domainsList.join(',') + ") ";
	return query;
}

module.exports = {
	GetQueryStringForQuestionReport,
	GetQueryStringForAnswersReport,
	GetQueryStringForQuizReport,
	GetQueryStringUpdateQuestionResult,
	GetQueryStringUpdateQuizResultForReview,
	GetQueryStringForGetResultsAbstract,
	GetQueryStringDeleteResult,
	GetQueryStringInsertRetrieveResult,
	GetQueryStringForQuizResultReport,
	GetQueryStringForUpdateQuizResultReport,
	GetQueryStringForGetModuleProperties,
	GetQueryStringForQuizNamesFromDomains
}