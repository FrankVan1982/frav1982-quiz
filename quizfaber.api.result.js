//=========================================
// File name: quizfaber.api.results.js
//-----------------------------------------
// Project : QuizFaber 
// Licence : MIT
// Author  : Luca Galli
// Email   : info@quizfaber.com
//=========================================

var express = require('express');
var router = express.Router();

const BASE_ANONYMOUS_ID = 10000;

const { format } = require('date-fns');
const bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ limit: '10mb', extended: true });

const { Result, ResultHeader, ResultItem, ResultAnswerItem, Abstract, SearchParams, Revision } = require('./definitions');
const qfDb = require('./database');
const qfQuery = require('./queries');
const qfQueryR = require('./queries.result');
const qfJwt = require('./jwt');
const qfHelper = require('./helper');
const qfUtility = require('./utility');

function GetAnonymousId(id)
{
	return (BASE_ANONYMOUS_ID + id);
}

/// <summary>
/// Get all the titles (and few other information) of the quizzes for which there are results stored
/// </summary>
router.get('/getresultsabstract', [qfJwt.authenticateToken, urlencodedParser], function (req, res) {
	try {
		qfHelper.LogReqDebug(req, 'Get abstract results');

		var moduleId = 0;
		if (req.query.hasOwnProperty("moduleId")) {
			moduleId = req.query.moduleId;
		}

		var abstracts = [];
		var abstract, id, title, user, date, dateStr, mark, points, isDuplicated;

		qfDb.getPool().getConnection()
			.then(conn => {
				var queryUser = qfQuery.GetQueryStringSelectPersor(req.user.id);
				conn.query(queryUser)
					.then(async (rows) => {
						if ((rows.length === 1) && (rows[0].IsEnabled === 1)) {
							var role = rows[0].UserRole;							
							if ((role === 1) || (role === 2)) {

								// a user (not an administrator) can gets only own quiz results
								var userlogin = "";
								if (role === 2) {
									userlogin = req.user.id;
								}
								query = qfQueryR.GetQueryStringForGetResultsAbstract(userlogin, moduleId);

								if (role === 2) {
									if (moduleId === 0) {
										qfHelper.SendBadRequest(req, res, "parameter 'moduleId' is mandatory");
										return;
									}

									var queryModule = qfQueryR.GetQueryStringForGetModuleProperties(moduleId);
									var propModule = await conn.query(queryModule);
									if (propModule.length === 1) {
										if (propModule[0].Properties) {
											var props = JSON.parse(propModule[0].Properties);										
											if (props.hasOwnProperty("view")) {
												if (props.view === 'all') {
													qfHelper.LogReqDebug(req, 'View all results');
													query = qfQueryR.GetQueryStringForGetResultsAbstract(userlogin, 0);
												}
											}
										}
									}
								}

								conn.query(query)
									.then((rows) => {
										for (var i = 0; i < rows.length; i++) {
											id = rows[i].ID;
											title = rows[i].QuizName + " - " + rows[i].QuizTitle;
											user = rows[i].UserName + " - " + rows[i].UserLogin;
											date = rows[i].DateReceived;
											//dateStr = format(convertUTCDateToLocalDate(new Date(rows[i].DateReceived)), 'dd/MM/yyyy HH:mm');
											dateStr = format(new Date(rows[i].DateReceived), 'dd/MM/yyyy HH:mm');
											mark = rows[i].FinalMark;
											points = (rows[i].ReviewPoints ?? (rows[i].FinalPoints ?? 0));
											isDuplicated = rows[i].IsDuplicated

											abstract = new Abstract(id, title, user, date, dateStr, mark, points, isDuplicated);
											abstracts.push(abstract);
										}

										qfHelper.SendJSON(req, res, abstracts);
									})
									.catch(err => {
										// select failed
										qfHelper.SendInternalServerError(req, res, err, 'select failed');
									})
							}
							else {
								qfHelper.SendUnauthorized(req, res, "not an administrator or a user");
							}
						}
						else {
							qfHelper.SendUnauthorized(req, res, "user not enabled");
						}
					})
					.catch(err => {
						// select failed
						qfHelper.SendInternalServerError(req, res, err, 'select failed');
					})
					.finally(qfHelper.CloseConnection(conn));
			}).catch(err => {
				//not connected
				qfHelper.SendInternalServerError(req, res, err, 'not connected');
			});
	}
	catch (err) {
		qfHelper.SendInternalServerError(req, res, err, 'exception');
	}
});

/// <summary>
/// Gets the quizzes results given some filters  
/// </summary>
router.get('/getresults', [qfJwt.authenticateToken, urlencodedParser], function (req, res) {
	try {
		qfHelper.LogReqDebug(req, 'Get quiz results');

		var result;
		var results = [];
		var searchTitle = "";
		var searchUser = "";

		if (req.query.hasOwnProperty("title")) {
			searchTitle = decodeURIComponent(req.query.title);
			qfHelper.LogReqDebug(req,"search title : " + searchTitle);
		}
		if (req.query.hasOwnProperty("user")) {
			searchUser = decodeURIComponent(req.query.user)
			qfHelper.LogReqDebug(req,"search user : " + searchUser);
		}
		if (req.query.hasOwnProperty("fromDate")) {
			qfHelper.LogReqDebug(req, "search from date : " + req.query.fromDate);
		}
		if (req.query.hasOwnProperty("toDate")) {
			qfHelper.LogReqDebug(req, "search to date : " + req.query.toDate);
		}
		if (req.query.hasOwnProperty("fromMark")) {
			qfHelper.LogReqDebug(req, "search from mark : " + req.query.fromMark);
		}
		if (req.query.hasOwnProperty("toMark")) {
			qfHelper.LogReqDebug(req, "search to mark : " + req.query.toMark);
		}
		if (req.query.hasOwnProperty("top")) {
			qfHelper.LogReqDebug(req, "search top : " + req.query.top);
		}
		if (req.query.hasOwnProperty("last")) {
			qfHelper.LogReqDebug(req, "search last : " + req.query.last);
		}

		var incDup = 1;
		if (req.query.hasOwnProperty("incDup")) {
			qfHelper.LogReqDebug(req, "search include dup : " + req.query.incDup);
			incDup = parseInt(req.query.incDup);
			if (Number.isNaN(incDup)) {
				qfHelper.SendBadRequest(req, res, "parameter 'incDup' is not integer");
				return;
			}
		}
		if (req.query.hasOwnProperty("orderby")) {
			qfHelper.LogReqDebug(req, "search include ORDER BY : " + req.query.orderby);
		}

		var searchParams = new SearchParams(
			searchTitle,
			searchUser,
			req.query.fromDate,
			req.query.toDate,
			req.query.fromMark,
			req.query.toMark,
			req.query.top,
			req.query.last,
			incDup,
			req.query.orderby
		);

		qfDb.getPool().getConnection()
			.then(conn => {

				var queryUser = qfQuery.GetQueryStringSelectPersor(req.user.id);
				conn.query(queryUser)
					.then(async (rows) => {
						if ((rows.length === 1) && (rows[0].IsEnabled === 1)) {
							var role = rows[0].UserRole;
							
							if ((role === 1) || (role === 3) || (role === 4) || (role === 5)) {
								qfHelper.LogReqDebug(req, 'results from admin');
							}
							else {
								qfHelper.SendUnauthorized(req, res, "user is not authorized");
							}

							var queryResults = qfQueryR.GetQueryStringForQuizReport(searchParams);
							conn.query(queryResults)
								.then((rows) => {

									qfHelper.LogReqDebug(req, 'Found ' + rows.length + ' quiz results');

									for (var i = 0; i < rows.length; i++) {
										result = new Result();
										result.Header = new ResultHeader();

										result.Id = rows[i].ID;
										result.UserName = rows[i].UserName;
										result.UserLogin = rows[i].UserLogin;
										result.UserInfo = rows[i].UserInfo;
										//result.DateCompleted = format(convertUTCDateToLocalDate(new Date(rows[i].DateCompleted)), 'dd/MM/yyyy HH:mm');
										//result.DateReceived = format(convertUTCDateToLocalDate(new Date(rows[i].DateReceived)), 'dd/MM/yyyy HH:mm');
										result.DateCompleted = format(new Date(rows[i].DateCompleted), 'dd/MM/yyyy HH:mm');
										result.DateReceived = format(new Date(rows[i].DateReceived), 'dd/MM/yyyy HH:mm');
										result.ElapsedTime = rows[i].ElapsedTime;
										result.HighestMark = rows[i].HighestMark;
										result.NumCorrectAnswers = rows[i].RightQuestsNum;
										result.NumWrongAnswers = rows[i].WrongQuestsNum;
										result.NumNotValutated = rows[i].NotValuatedQuestsNum;
										result.NumNotAnswered = rows[i].NotAnsweredQuestsNum;
										result.NumOfRetake = rows[i].NumOfRetake;
										result.FinalMark = rows[i].FinalMark;
										result.FinalPoints = rows[i].FinalPoints;
										result.ReviewPoints = rows[i].ReviewPoints;
										result.ReviewMark = rows[i].ReviewMark;
										result.ReviewDate = format(new Date(rows[i].ReviewDate), 'dd/MM/yyyy HH:mm');
										result.LowestMark = rows[i].LowestMark;
										result.RoundMark = rows[i].RoundMark;
										result.IsDuplicated = rows[i].IsDuplicated;

										result.Header.Name = rows[i].QuizName;
										result.Header.Title = rows[i].QuizTitle;
										result.Header.Author = rows[i].Author;
										result.Header.Argument = rows[i].Argument;
										result.Header.Duration = rows[i].TotalTime;
										result.Header.NumOfQuestions = rows[i].QuestsNum;

										results.push(result);
									}

									qfHelper.SendJSON(req, res, results);
								})
								.catch(err => {
									// select failed
									qfHelper.SendInternalServerError(req, res, err, 'select failed');
								})
						}
						else {
							qfHelper.SendUnauthorized(req, res, "user not enabled");
						}
					})
					.catch(err => {
						// select failed
						qfHelper.SendInternalServerError(req, res, err, 'select failed');
					})
					.finally(qfHelper.CloseConnection(conn));
			}).catch(err => {
				//not connected
				qfHelper.SendInternalServerError(req, res, err, 'not connected');
			});
	}
	catch (err) {
		qfHelper.SendInternalServerError(req, res, err, 'exception');
	}

});

/// <summary>
/// Gets the questions of a quiz result, given its ID
/// </summary>
router.get('/getresultdetails', [qfJwt.authenticateToken, urlencodedParser], function (req, res) {
	try {
		qfHelper.LogReqDebug(req, 'Get quiz results details');

		var id;
		var anonymize = 0;

		if (req.query.hasOwnProperty("id")) {
			id = parseInt(req.query.id);
			if (Number.isNaN(id)) {
				qfHelper.SendBadRequest(req, res, "parameter 'id' is not integer");
				return;
			}
		}
		else {
			qfHelper.SendBadRequest(req, res, "parameter 'id' is mandatory");
			return;
		}

		if (req.query.hasOwnProperty("anonymize")) {
			anonymize = parseInt(req.query.anonymize);
			if (Number.isNaN(anonymize)) {
				qfHelper.SendBadRequest(req, res, "parameter 'anonymize' is not integer");
				return;
			}
		}

		qfHelper.LogReqDebug(req, 'Search quiz results with ID=' + id + " for user " + req.user.id);

		qfDb.getPool().getConnection()
			.then(conn => {
				var queryUser = qfQuery.GetQueryStringSelectPersor(req.user.id);
				conn.query(queryUser)
					.then((rows) => {
						if ((rows.length === 1) && (rows[0].IsEnabled === 1)) {
							var role = rows[0].UserRole;

							if ((role === 6) && (anonymize !== 1)) {
								// examiner only can ask anonymous results
								qfHelper.SendBadRequest(req, res, "Examiner always asks anonymous results");
								return;
							}

							if ((role === 1) || (role === 2) || (role === 3) || (role === 4) || (role === 5) || (role === 6)) {
								var query = qfQueryR.GetQueryStringForQuestionReport(id, ((role === 2) ? req.user.id : ""));

								conn.query(query)
									.then(async (rows) => {

										if (rows.length === 0) {
											qfHelper.SendNotFound(req, res, "quiz result not found");
										}
										else {
											var item;
											var items = [];

											qfHelper.LogReqDebug(req, 'found quiz results');

											for (var i = 0; i < rows.length; i++) {
												item = new ResultItem();
												item.Id = rows[i].ID;
												item.QuestNum = rows[i].QuestNum;
												item.TypeOfQuest = rows[i].QuestType;
												item.Weight = rows[i].Weight;
												item.SelectedAnswers = (rows[i].QuestType === 3) ? rows[i].AdditionalTexts : rows[i].Choices;
												item.CorrectedAnswers = rows[i].Valuations;
												item.Score = rows[i].Score;
												item.MaxScore = rows[i].MaxScore;
												item.MinScore = rows[i].MinScore;
												item.ShortTextQuestion = rows[i].ShortTextQuestion;
												item.Valid = rows[i].Valid;
												item.Points = rows[i].Points;
												item.Feedback = rows[i].Feedback;
												item.IsCancelled = rows[i].IsCancelled;
												item.ModuleInfo = rows[i].ModuleInfo; // the same for all answers

												items.push(item);
											}

											qfHelper.LogReqDebug(req, 'getting report..');

											var queryReport = qfQueryR.GetQueryStringForQuizResultReport(id);
											var resultReport = await conn.query(queryReport);

											var revision = new Revision();
											if (resultReport.length === 1)
											{
												qfHelper.LogReq(req, 'found report with ID=' + id);

												var xmlReport = resultReport[0].Report;

												if (anonymize === 1) {
													var anonymousId = GetAnonymousId(id);
													var userName = resultReport[0].UserName;
													qfHelper.LogReqDebug(req, 'replace ' + userName + " with " + anonymousId);
													xmlReport = xmlReport.replace(userName, anonymousId.toString());
												}

												if (resultReport[0].ReviewPoints) {
													qfHelper.LogReq(req, 'show review points');
													xmlReport = qfUtility.ShowReviewPointsIntoReport(xmlReport, resultReport[0].ReviewPoints);
												}

												if (items[0].ModuleInfo !== '') {
													var moduleInfo = JSON.parse(items[0].ModuleInfo);

													if (moduleInfo.hasOwnProperty('hideRowsInSummary')) {
														if (moduleInfo.hideRowsInSummary) {
															qfHelper.LogReq(req, 'hide rows in summary');
															xmlReport = qfUtility.HideSummaryRowsFromReport(xmlReport);
														}
													}
													if (moduleInfo.hasOwnProperty('replacePoints')) {
														if (moduleInfo.replacePoints) {
															qfHelper.LogReq(req, 'replace points');
															if (resultReport[0].FinalPoints) {
																xmlReport = qfUtility.ReplacePointsFromReport(xmlReport, resultReport[0].FinalPoints.toString());
															}
														}
													}
												}
												revision = new Revision(xmlReport, resultReport[0].Origin, resultReport[0].Charset, resultReport[0].Language);
											}
											else {
												qfHelper.LogReqWarn(req, 'report not found');
											}

											qfHelper.SendJSON(req, res, { Answers: items, Revision: revision });
										}
									})
									.catch(err => {
										// query select failed
										qfHelper.SendInternalServerError(req, res, err, 'select failed');
									})
							}
							else {
								qfHelper.SendUnauthorized(req, res, "user is not an administrator or a user");
							}
						}
						else {
							qfHelper.SendUnauthorized(req, res, "user not enabled");
						}
					})
					.catch(err => {
						// select failed
						qfHelper.SendInternalServerError(req, res, err, 'select failed');
					})
					.finally(qfHelper.CloseConnection(conn));

			}).catch(err => {
				//not connected
				qfHelper.SendInternalServerError(req, res, err, 'not connected');
			});
	}
	catch (err) {
		qfHelper.SendInternalServerError(req, res, err, 'exception');
	}
});

/// <summary>
/// Gets the questions of a quiz result, given its ID
/// </summary>
router.get('/getresultanswers', [qfJwt.authenticateToken, urlencodedParser], function (req, res) {
	try {
		qfHelper.LogReqDebug(req, 'Get quiz results answers');

		var id;
		if (req.query.hasOwnProperty("id")) {
			id = parseInt(req.query.id);
			if (Number.isNaN(id)) {
				qfHelper.SendBadRequest(req, res, "parameter 'id' is not integer");
				return;
			}
		}
		else {
			qfHelper.SendBadRequest(req, res, "parameter 'id' is mandatory");
			return;
		}

		qfHelper.LogReqDebug(req, 'Search quiz results answers with ID=' + id + " for user " + req.user.id);

		qfDb.getPool().getConnection()
			.then(conn => {
				var queryUser = qfQuery.GetQueryStringSelectPersor(req.user.id);
				conn.query(queryUser)
					.then((rows) => {
						if ((rows.length === 1) && (rows[0].IsEnabled === 1)) {
							var role = rows[0].UserRole;

							if ((role === 1) || (role === 2) || (role === 6)) {
								var query = qfQueryR.GetQueryStringForAnswersReport(id, ((role === 2) ? req.user.id : ""));

								conn.query(query)
									.then(async (rows) => {

										if (rows.length === 0) {
											qfHelper.SendNotFound(req, res, "quiz result answers not found for ID=" + id);
										}
										else {
											var item;
											var items = [];

											qfHelper.LogReq(req, 'found quiz answers results for ID=' + id);

											for (var i = 0; i < rows.length; i++) {
												item = new ResultAnswerItem();
												item.Id = rows[i].ID;
												item.IdResultQuestion = rows[i].IdResultQuestion;
												item.AnswerNum = rows[i].AnswerNum;
												item.Choice = rows[i].Choice;
												item.Valuation = rows[i].Valuation;
												item.IsGuess = (rows[i].IsGuess === 1) ? true : false;
												item.Score = rows[i].Score;
												item.AdditionalText = rows[i].AdditionalText;
												item.ShortTextAnswer = rows[i].ShortTextAnswer;
												item.ShortTextRemark = rows[i].ShortTextRemark;

												items.push(item);
											}

											qfHelper.SendJSON(req, res, items);
										}
									})
									.catch(err => {
										// query select failed
										qfHelper.SendInternalServerError(req, res, err, 'select failed');
									})
							}
							else {
								qfHelper.SendUnauthorized(req, res, "user is not an administrator or a user");
							}
						}
						else {
							qfHelper.SendUnauthorized(req, res, "user not enabled");
						}
					})
					.catch(err => {
						// select failed
						qfHelper.SendInternalServerError(req, res, err, 'select failed');
					})
					.finally(qfHelper.CloseConnection(conn));

			}).catch(err => {
				//not connected
				qfHelper.SendInternalServerError(req, res, err, 'not connected');
			});
	}
	catch (err) {
		qfHelper.SendInternalServerError(req, res, err, 'exception');
	}
});

/// <summary>
/// Update the score of a question that belong to a quiz results 
/// </summary>
router.post('/editresultdetails', qfJwt.authenticateToken, function (req, res) {
	try {
		qfHelper.LogReqDebug(req, 'Edit quiz results details');

		qfDb.getPool().getConnection()
			.then(conn => {
				var queryUser = qfQuery.GetQueryStringSelectPersor(req.user.id);
				conn.query(queryUser)
					.then(async (rows) => {
						if ((rows.length === 1) && (rows[0].IsEnabled === 1))
						{
							var role = rows[0].UserRole;
							if ((role === 1) || (role === 6))
							{
								if (req.body.hasOwnProperty("results"))
								{
									var results = req.body.results;
									qfHelper.LogReqDebug(req, 'number of results to edit : ' + results.length);

									for (var i = 0; i < results.length; i++) {
										var result = results[i];
										var queryResult = qfQueryR.GetQueryStringUpdateQuestionResult(result);
										if (queryResult.length > 0) {
											qfHelper.LogReq(req, "edit result with ID=" + result.Id);
											var data = await conn.query(queryResult);
											qfHelper.LogReq(req, 'Data : ' + JSON.stringify(data));
										}
									}
									qfHelper.SendOK(req, res);
								}
								else {
									qfHelper.SendBadRequest(req, res, "body has not 'results' properties");
								}
							}
							else {
								qfHelper.SendUnauthorized(req, res, "user is not authorized");
							}
						}
						else {
							qfHelper.SendUnauthorized(req, res, "user not enabled");
						}
					})
					.catch(err => {
						// update failed
						qfHelper.SendInternalServerError(req, res, err, 'update failed');
					})
					.finally(qfHelper.CloseConnection(conn));

			}).catch(err => {
				//not connected
				qfHelper.SendInternalServerError(req, res, err, 'not connected');
			});
	}
	catch (err) {
		qfHelper.SendInternalServerError(req, res, err, 'exception');
	}
});

/// <summary>
/// Edit a quiz result for feedback and manage the teacher review of "open answer" questions
/// </summary>
router.post('/editresult', qfJwt.authenticateToken, function (req, res) {
	try {
		qfHelper.LogReqDebug(req, 'Edit quiz result');

		qfDb.getPool().getConnection()
			.then(conn => {
				var queryUser = qfQuery.GetQueryStringSelectPersor(req.user.id);
				conn.query(queryUser)
					.then(async (rows) => {
						if ((rows.length === 1) && (rows[0].IsEnabled === 1)) {
							var role = rows[0].UserRole;
							if ((role === 1) || (role === 6)) {
								var reviewedResult = req.body;

								// validation of body request
								if (!reviewedResult.hasOwnProperty("Id")) {
									qfHelper.SendBadRequest(req, res, "Missing result ID field");
									return;
								}

								var queryResult = qfQueryR.GetQueryStringUpdateQuizResultForReview(reviewedResult);
								qfHelper.LogReq(req, "edit result with ID=" + reviewedResult.Id);
								var data = await conn.query(queryResult);
								qfHelper.LogReq(req, 'Data : ' + JSON.stringify(data));
								if (data.affectedRows === 1) qfHelper.SendOK(req, res); else qfHelper.SendNotFound(req, res, "quiz not found: " + reviewedResult.Id);
							}
							else {
								qfHelper.SendUnauthorized(req, res, "user is not authorized");
							}
						}
						else {
							qfHelper.SendUnauthorized(req, res, "user not enabled");
						}
					})
					.catch(err => {
						// update failed
						qfHelper.SendInternalServerError(req, res, err, 'update failed');
					})
					.finally(qfHelper.CloseConnection(conn));
			}).catch(err => {
				//not connected
				qfHelper.SendInternalServerError(req, res, err, 'not connected');
			});
	}
	catch (err) {
		qfHelper.SendInternalServerError(req, res, err, 'exception');
	}
});

/// <summary>
/// Remove the quiz results
/// </summary>
router.post('/removeresults', qfJwt.authenticateToken, function (req, res) {
	try {
		qfHelper.LogReqDebug(req, 'delete quiz results');

		qfDb.getPool().getConnection()
			.then(conn => {
				var queryUser = qfQuery.GetQueryStringSelectPersor(req.user.id);
				conn.query(queryUser)
					.then(async (rows) => {
						if ((rows.length === 1) && (rows[0].IsEnabled === 1)) {
							var role = rows[0].UserRole;
							if (role === 1) {
								// validation of body request
								if (!req.body.hasOwnProperty("results")) {
									qfHelper.SendBadRequest(req, res, "Missing results array field");
									return;
								}

								var i;
								var results = req.body.results;
								for (i = 0; i < results.length; i++) {
									if (!results[i].hasOwnProperty("resultId")) {
										qfHelper.SendBadRequest(req, res, "Missing resultId field");
										return;
									}
								}
								// end of validation

								// delete records
								for (i = 0; i < results.length; i++) {
									qfHelper.LogReq(req, "remove result, ID=" + results[i].resultId);
									var query = qfQueryR.GetQueryStringDeleteResult(results[i].resultId);
									var data = await conn.query(query);
									qfHelper.LogReq(req, 'Data : ' + JSON.stringify(data));
								}
								qfHelper.SendOK(req, res);
							}
							else {
								qfHelper.SendUnauthorized(req, res, "user is not authorized");
							}
						}
						else {
							qfHelper.SendUnauthorized(req, res, "user not enabled");
						}
					})
					.catch(err => {
						// update failed
						qfHelper.SendInternalServerError(req, res, err, 'select failed');
					})
					.finally(qfHelper.CloseConnection(conn));
			}).catch(err => {
				//not connected
				qfHelper.SendInternalServerError(req, res, err, 'not connected');
			});
	}
	catch (err) {
		qfHelper.SendInternalServerError(req, res, err, 'exception');
	}
});

/// <summary>
/// Retrieve result
/// </summary>
router.post('/retrieveresult', qfJwt.authenticateToken, function (req, res) {
	try {
		qfHelper.LogReqDebug(req, 'Retrieve result');

		qfDb.getPool().getConnection()
			.then(conn => {

				var queryUser = qfQuery.GetQueryStringSelectPersor(req.user.id);
				conn.query(queryUser)
					.then(async (rows) => {
						if ((rows.length === 1) && (rows[0].IsEnabled === 1)) {
							var role = rows[0].UserRole;
							if ((role === 1) || (role === 5)) {
								var result = req.body;

								qfHelper.LogReq(req, "search quiz : " + result.quizName);
								var queryQuiz = qfQuery.GetQueryStringForGetQuiz(result.quizName);
								conn.query(queryQuiz)
									.then((rowsQuiz) => {
										if (rowsQuiz.length === 1) {
											var quiz = rowsQuiz[0];
											qfHelper.LogReq(req, 'Quiz : ' + JSON.stringify(quiz));

											qfHelper.LogReq(req, "search person : " + result.identityId);
											var queryPerson = qfQuery.GetQueryStringSelectPersor(result.identityId);
											conn.query(queryPerson)
												.then((rowsPerson) => {
													if (rowsPerson.length === 1) {
														var person = rowsPerson[0];
														qfHelper.LogReq(req, 'Person : ' + JSON.stringify(person));

														var queryRetrieve = qfQueryR.GetQueryStringInsertRetrieveResult(result.quizName, quiz.Title, result.identityId, person.PersonName, result.date, quiz.NumQuestions, result.points, result.report);
														conn.query(queryRetrieve)
															.then((data) => {
																qfHelper.LogReq(req, 'Data : ' + JSON.stringify(data));
																qfHelper.SendOK(req, res);
															})
															.catch(err => {
																qfHelper.SendInternalServerError(req, res, err, 'retrieve failed');
															})
													}
													else {
														qfHelper.SendInternalServerError(req, res, err, 'more than one person selected');
													}
												})
												.catch(err => {
													qfHelper.SendInternalServerError(req, res, err, 'select person failed');
												})

										}
										else {
											qfHelper.SendInternalServerError(req, res, err, 'more than one quiz selected');
										}
									})
									.catch(err => {
										qfHelper.SendInternalServerError(req, res, err, 'select quiz failed');
									})
							}
							else {
								qfHelper.SendUnauthorized(req, res, "user is not authorized");
							}
						}
						else {
							qfHelper.SendUnauthorized(req, res, "user not enabled");
						}
					})
					.catch(err => {
						// select failed
						qfHelper.SendInternalServerError(req, res, err, 'select failed');
					})
					.finally(qfHelper.CloseConnection(conn));
			})
			.catch(err => {
				//not connected
				qfHelper.SendInternalServerError(req, res, err, 'not connected');
			});
	}
	catch (err) {
		qfHelper.SendInternalServerError(req, res, err, 'exception');
	}
});

/// <summary>
/// Insert the HTML report associated to a quiz result
/// </summary>
router.post('/report', qfJwt.authenticateToken, function (req, res) {
	try {

		qfHelper.LogReqDebug(req, 'store report');

		var report = req.body;

		// field validation
		if (report.hasOwnProperty("ID")) {
			var Id = parseInt(report.ID);
			if (Number.isNaN(Id)) {
				qfHelper.SendBadRequest(req, res, "field 'ID' is not integer");
				return;
			}
		}
		else {
			qfHelper.SendBadRequest(req, res, "field 'ID' is mandatory");
			return;
		}

		qfDb.getPool().getConnection()
			.then(conn => {
				var queryUser = qfQuery.GetQueryStringSelectPersor(req.user.id);
				conn.query(queryUser)
					.then(async (rows) => {
						if ((rows.length === 1) && (rows[0].IsEnabled === 1)) {
							var role = rows[0].UserRole;
							if ((role === 1) || (role === 4) || (role === 5)) {
								qfHelper.LogReqDebug(req, "search report " + report.ID);
								var querySelect = qfQueryR.GetQueryStringForQuizResultReport(report.ID);
								var dataSelect = await conn.query(querySelect);

								var query;
								if (dataSelect.length === 0) {
									qfHelper.LogReq(req, "insert new report");
									query = qfQuery.GetQueryStringForInsertQuizResultReport(report);
								}
								else {
									qfHelper.LogReq(req, "update report " + report.ID);
									query = qfQueryR.GetQueryStringForUpdateQuizResultReport(report);
								}

								var data = await conn.query(query);
								qfHelper.LogReq(req, 'Data : ' + JSON.stringify(data));
								qfHelper.SendOK(req, res);
							}
							else {
								qfHelper.SendUnauthorized(req, res, "user is not authorized");
							}
						}
						else {
							qfHelper.SendUnauthorized(req, res, "user not enabled");
						}
					})
					.catch(err => {
						// select failed
						qfHelper.SendInternalServerError(req, res, err, 'select failed');
					})
					.finally(qfHelper.CloseConnection(conn));

			}).catch(err => {
				//not connected
				qfHelper.SendInternalServerError(req, res, err, 'not connected');
			});
	}
	catch (err) {
		qfHelper.SendInternalServerError(req, res, err, 'exception');
	}
});

/// <summary>
/// Gets the HTML report associated to a quiz result
/// </summary>
router.get('/getreport', qfJwt.authenticateToken, function (req, res) {
	try {

		qfHelper.LogReqDebug(req, 'get report');

		// parameter validation
		var reportId;
		var anonymize = 0;

		if (req.query.hasOwnProperty("ID")) {
			reportId = parseInt(req.query.ID);
			if (Number.isNaN(reportId)) {
				qfHelper.SendBadRequest(req, res, "parameter 'ID' is not integer");
				return;
			}
		}
		else {
			qfHelper.SendBadRequest(req, res, "parameter 'ID' is mandatory");
			return;
		}

		if (req.query.hasOwnProperty("anonymize")) {
			anonymize = parseInt(req.query.anonymize);
			if (Number.isNaN(anonymize)) {
				qfHelper.SendBadRequest(req, res, "parameter 'anonymize' is not integer");
				return;
			}
		}

		qfDb.getPool().getConnection()
			.then(conn => {
				var queryUser = qfQuery.GetQueryStringSelectPersor(req.user.id);
				conn.query(queryUser)
					.then(async (rows) => {
						if ((rows.length === 1) && (rows[0].IsEnabled === 1)) {
							var role = rows[0].UserRole;

							if ((role === 6) && (anonymize !== 1)) {
								// examiner only can ask anonymous results
								qfHelper.SendBadRequest(req, res, "Examiner always asks anonymous results");
								return;
							}

							if ((role === 1) || (role === 4) || (role === 5)) {
								qfHelper.LogReq(req, "search report " + reportId);
								var querySelect = qfQueryR.GetQueryStringForQuizResultReport(reportId);
								var dataSelect = await conn.query(querySelect);
								if (dataSelect.length === 1)
								{
									var report = dataSelect[0];
									if (anonymize === 1)
									{
										var anonymousId = GetAnonymousId(reportId);
										var userName = dataSelect[0].UserName;
										qfHelper.LogReqDebug(req, 'replace ' + userName + " with " + anonymousId);
										report.Report = report.Report.replace(userName, anonymousId.toString());
									}
									if (dataSelect[0].ReviewPoints)
									{
										qfHelper.LogReq(req, 'show review points');
										report.Report = qfUtility.ShowReviewPointsIntoReport(report.Report, dataSelect[0].ReviewPoints);
									}
									qfHelper.SendJSON(req, res, report);
								}
								else {
									qfHelper.SendNotFound(req, res, "report not found : " + reportId);
								}
							}
							else {
								qfHelper.SendUnauthorized(req, res, "user is not authorized");
							}
						}
						else {
							qfHelper.SendUnauthorized(req, res, "user not enabled");
						}
					})
					.catch(err => {
						// select failed
						qfHelper.SendInternalServerError(req, res, err, 'select failed');
					})
					.finally(qfHelper.CloseConnection(conn));

			}).catch(err => {
				//not connected
				qfHelper.SendInternalServerError(req, res, err, 'not connected');
			});
	}
	catch (err) {
		qfHelper.SendInternalServerError(req, res, err, 'exception');
	}
});


module.exports = router;