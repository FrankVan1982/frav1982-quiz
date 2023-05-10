//=========================================
// File name: quizfaber.api.core.js
//-----------------------------------------
// Project : QuizFaber 
// Licence : MIT
// Author  : Luca Galli
// Email   : info@quizfaber.com
//=========================================

var express = require('express');
var router = express.Router();

const { format } = require('date-fns');
const bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ limit: '10mb', extended: true });

const { Login, Quiz, RetakeInfo } = require('./definitions');
const qfService = require('./services');
const qfDb = require('./database');
const qfQuery = require('./queries');
const qfQueryC = require('./queries.core');
const qfJwt = require('./jwt');
const qfHelper = require('./helper');
const qfUtility = require('./utility');

/// <summary>
/// New user registration   
/// </summary>
router.post('/registration', function (req, res) {
	try {
		qfHelper.LogReqDebug(req, 'User registration');

		var user = req.body;

		// validation of body request
		if (!user.hasOwnProperty("email")) {
			qfHelper.SendBadRequest(req, res, "Missing email field");
			return;
		}
		if (!user.hasOwnProperty("password")) {
			qfHelper.SendBadRequest(req, res, "Missing password field");
			return;
		}

		qfDb.getPool().getConnection()
			.then(conn => {
				qfHelper.LogReq(req, "Insert user : " + user.email);
				var query = qfQueryC.GetQueryStringInsertPerson(user);
				conn.query(query)
					.then(() => {
						qfHelper.LogReq(req, 'insert user done');
						qfHelper.SendOK(req, res);
					})
					.catch(err => {
						qfHelper.SendInternalServerError(req, res, 'error in inserting user', err);
					})
					.finally(qfHelper.CloseConnection(conn));
			})
			.catch(err => qfHelper.SendInternalServerError(req, res, err, 'not connected'));
	}
	catch (err) {
		qfHelper.SendInternalServerError(req, res, err, 'exception');
	}
});

/// <summary>
/// User login   
/// </summary>
router.post('/login', urlencodedParser, function (req, res) {
	try {
		const useSession = req.app.get('useSession');

		qfHelper.LogReqDebug(req, `Login : ${req.body.login}`);

		var domainId = 0;
		if (req.get('X-DomainId')) {
			domainId = parseInt(req.get('X-DomainId'));
			if (Number.isNaN(domainId)) {
				qfHelper.SendBadRequest(req, res, "header 'X-DomainId' is not integer");
				return;
			}
		}
		var grantId = 0;
		if (req.get('X-GrantId')) {
			grantId = parseInt(req.get('X-GrantId'));
			if (Number.isNaN(grantId)) {
				qfHelper.SendBadRequest(req, res, "header 'X-GrantId' is not integer");
				return;
			}
		}
		qfHelper.LogReqDebug(req, `domain id: ${domainId}, grant id: ${grantId} `);

		qfDb.getPool().getConnection()
			.then(conn => {
				var query = qfQuery.GetQueryStringSelectPersor(req.body.login);
				conn.query(query)
					.then(async (rows) => {
						if (rows.length === 1) {
							if (rows[0].IsEnabled === 1) {
								var user = new Login(rows[0].ID, rows[0].PersonName, rows[0].UserIdentity, rows[0].UserPassword, rows[0].UserRole);
								if (rows[0].Info && rows[0].Info.length > 0) {
									user.otherFields = JSON.parse(rows[0].Info);
								}
								user.authToken = qfJwt.generateAccessToken(req.body.login);

								var userPwd = user.password;								

								if (userPwd.toUpperCase() === req.body.pwd.toUpperCase()) {
									qfHelper.LogReqDebug(req, "user found : " + user.email);

									// check url parameters
									if (user.otherFields && user.otherFields.length > 0) {
										let searchParams = new URLSearchParams(req.body.search);
										for (var i = 0; i < user.otherFields.length; i++) {
											var urlParam = user.otherFields[i].Param;
											if (urlParam && urlParam.length > 0) {
												if (searchParams.has(urlParam)) {
													var value = user.otherFields[i].Value;
													if (searchParams.get(urlParam) !== value) {
														// errore param non coincidono
														qfHelper.SendUnauthorized(req, res, "mismatch param '" + urlParam + "' for user " + req.body.login);
														return;
													}
												}
												else {
													// errore param non specificato
													qfHelper.SendUnauthorized(req, res, "missing param '" + urlParam + "' for user " + req.body.login);
													return;
												}
											}
										}
									}

									// update last access date
									var query = qfQueryC.GetQueryStringForUpdateDateLastAccess(user.id);
									conn.query(query)
										.then(async () => {
											if (useSession) {
												qfHelper.LogReqDebug(req, 'create a new session');

												var remoteIp = qfUtility.GetRemoteIp(req);
												var userAgent = qfUtility.GetUserAgent(req);

												var querySession = qfQueryC.GetQueryStringOpenSession(user.id, remoteIp, userAgent, 0);
												await conn.query(querySession);

												var querySessionID = "SELECT LAST_INSERT_ID() AS SessionID";
												conn.query(querySessionID)
													.then((rows) => {

														user.sessionId = rows[0].SessionID;

														qfHelper.LogReq(req, 'user ' + req.body.login + ' logged in successfully, new session id = ' + user.sessionId);

														qfHelper.SendJSON(req, res, user);
													})
													.catch(err => {
														qfHelper.SendInternalServerError(req, res, err, 'select new session id failed');
													});
											}
											else {
												qfHelper.LogReq(req, 'user ' + req.body.login + ' logged in successfully, without session');
												qfHelper.SendJSON(req, res, user);
											}
										})
										.catch(err => {
											// update failed
											qfHelper.SendInternalServerError(req, res, err, 'update last date access failed');
										});
								}
								else {
									qfHelper.SendUnauthorized(req, res, "wrong password for user " + req.body.login);
								}
							}
							else {
								qfHelper.SendUnauthorized(req, res, "user not enabled : " + req.body.login);
							}
						}
						else {
							qfHelper.SendNotFound(req, res, "user not found : " + req.body.login);
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
/// User logout   
/// </summary>
router.post('/logout', [qfJwt.authenticateToken, urlencodedParser], function (req, res) {
	try {
		const useSession = req.app.get('useSession');

		qfHelper.LogReqDebug(req, 'logout');

		var quizId = 0;
		var sessionId = null;
		if (req.body.hasOwnProperty("quizId")) {
			quizId = req.body.quizId;
		}
		if (req.body.hasOwnProperty("sessionId")) {
			sessionId = req.body.sessionId;
		}

		qfDb.getPool().getConnection()
			.then(conn => {
				qfHelper.LogReqDebug(req, 'get id for user ' + req.user.id);
				var queryUser = qfQuery.GetQueryStringSelectPersor(req.user.id);
				conn.query(queryUser)
					.then(async (rows) => {

						if (useSession) {
							var personID = rows[0].ID;

							qfHelper.LogReqDebug(req, 'update session for ID=' + personID);
							var querySession = qfQueryC.GetQueryStringCloseSession(personID, sessionId, qfUtility.GetRemoteIp(req), quizId)
							var data = await conn.query(querySession);
							qfHelper.LogReqDebug(req, 'Data : ' + JSON.stringify(data));
						}
						qfHelper.SendOK(req, res);
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
/// Verify if a user is already registered  
/// </summary>
router.get('/checklogin', urlencodedParser, function (req, res) {
	try {
		// parameter validation
		if (!req.query.hasOwnProperty("login")) {
			qfHelper.SendBadRequest(req, res, "parameter 'login' is mandatory");
			return;
		}

		var login = req.query.login;
		qfHelper.LogReqDebug(req, 'Check login for : ' + login);

		qfDb.getPool().getConnection()
			.then(conn => {
				var query = qfQuery.GetQueryStringSelectPersor(login);
				conn.query(query)
					.then((rows) => {
						if (rows.length >= 1) {
							qfHelper.LogReq(req, "user found : " + login);
							qfHelper.SendOK(req, res);
						}
						else {
							qfHelper.SendNotFound(req, res, "user not found : " + login);
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
/// Verify if a user has already answered to a given quiz, just called after login
/// </summary>
router.get('/checkresult', [qfJwt.authenticateToken, urlencodedParser], function (req, res) {
	try {
		var quizName;
		var userLogin;
		var id = 0;

		if (req.query.hasOwnProperty("name")) {
			quizName = req.query.name;
		}
		else {
			qfHelper.SendBadRequest(req, res, "parameter 'name' is mandatory");
			return;
		}

		if (req.query.hasOwnProperty("login")) {
			userLogin = req.query.login;
		}
		else {
			qfHelper.SendBadRequest(req, res, "parameter 'login' is mandatory");
			return;
		}

		if (req.query.hasOwnProperty("id")) {
			id = parseInt(req.query.id);
			if (Number.isNaN(id)) {
				qfHelper.SendBadRequest(req, res, "parameter 'id' is not integer");
				return;
			}
		}

		qfHelper.LogReqDebug(req, 'Check quiz result ' + quizName + ' for user ' + userLogin + ((id > 0) ? " for quiz " + id : ""));

		qfDb.getPool().getConnection()
			.then(conn => {
				var queryUser = qfQuery.GetQueryStringSelectPersor(req.user.id);
				conn.query(queryUser)
					.then(async (rows) => {
						if ((rows.length === 1) && (rows[0].IsEnabled === 1)) {
							var query = qfQueryC.GetQueryStringForCheckResult(quizName, userLogin, req.query.id);
							conn.query(query)
								.then((rows) => {
									if (rows.length === 1) {
										qfHelper.LogReqDebug(req, "found a quiz result");

										// if a result was found
										// "State" could be null, due to the sql left join
										if ((req.query.id > 0) && (rows[0].State) && (rows[0].State !== 10)) {
											qfHelper.SendUnauthorized(req, res, quizName + " not published");
										}
										else {
											qfHelper.LogReq(req, "quiz result " + quizName + " found for user : " + userLogin);

											var retakeInfo = new RetakeInfo(rows[0].NumOfRetake, rows[0].FinalMark);
											qfHelper.SendJSON(req, res, retakeInfo);
										}
									}
									else {
										// no results found
										qfHelper.LogReqDebug(req, "no quiz results found yet");

										if (req.query.id > 0) {
											qfHelper.LogReqDebug(req, "verify if quiz " + req.query.id + " is published");

											var queryState = qfQueryC.GetQueryStringForGetTitle(req.query.id);
											conn.query(queryState)
												.then((rows) => {
													if (rows.length === 1) {
														if (rows[0].State !== 10) {
															qfHelper.SendUnauthorized(req, res, quizName + " not published");
															return;
														}
													}
													else {
														qfHelper.LogReqWarn(req, "quiz with id = " + req.query.id + " not exist into db");
													}
													qfHelper.SendNotFound(req, res, "quiz result " + quizName + " not found for user : " + userLogin);
												})
												.catch(err => {
													// select failed
													qfHelper.SendInternalServerError(req, res, err, 'select failed');
												});
										}
										else {
											qfHelper.SendNotFound(req, res, "quiz result " + quizName + " not found for user : " + userLogin);
										}
									}

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
/// Store quiz results sent by client
/// </summary>
router.post('/results', [qfJwt.authenticateToken, urlencodedParser], function (req, res) {
	try {
		qfHelper.LogReqDebug(req, 'POST Results');

		var timeStart = new Date().getTime();

		var quiz = JSON.parse(req.body.quiz);

		qfDb.getPool().getConnection()
			.then(conn => {

				var queryUser = qfQuery.GetQueryStringSelectPersor(req.user.id);
				conn.query(queryUser)
					.then(async (rows) => {
						if ((rows.length === 1) && (rows[0].IsEnabled === 1)) {
							//qfHelper.LogReq(req, 'search quiz result for user=' + quiz.currentUser.email + ', name=' + quiz.options.name + ', quiz id = ' + quiz.options.id);
							var queryCount = qfQueryC.GetQueryStringCheckDuplicatedResults(quiz.options.name, quiz.currentUser.email, quiz.options.id);
							conn.query(queryCount)
								.then((countRow) => {
									var numPreviousResults = countRow[0].NumResults;

									conn.query("START TRANSACTION")
										.then(() => {
											qfHelper.LogReqDebug(req, 'num of previous results : ' + numPreviousResults);

											var numDecimalPlacesForPoints = 2;
											if (quiz.options.hasOwnProperty("numDecimalPlacesForPoints")) {
												numDecimalPlacesForPoints = quiz.options.numDecimalPlacesForPoints;
											}

											qfHelper.LogReqDebug(req, 'Date completed: ' + quiz.dateCompleted);
											var query = qfQueryC.GetQueryStringFromQuiz(quiz, (numPreviousResults > 0 ? 1 : 0), numDecimalPlacesForPoints, qfDb.getTimezone());

											conn.query(query)
												.then(() => {

													// get the assigned quiz id from autoincrement field
													var queryQuizID = "SELECT LAST_INSERT_ID() AS QUIZID";
													conn.query(queryQuizID)
														.then(async (rows) => {

															var quizID = rows[0].QUIZID;
															qfHelper.LogReq(req, 'insert quiz row done, quiz id = ' + quizID);

															var numQuestDone = 0;

															if (quiz.questions.length === 0) {
																qfHelper.LogReqWarn(req, 'no questions to store');
																qfHelper.HandleSuccessInTransaction(req, res, conn, { id: quizID });
															}
															else {
																qfHelper.LogReqDebug(req, 'num of questions to store =' + quiz.questions.length);

																for (var i = 0; i < quiz.questions.length; i++) {
																	var question = quiz.questions[i];

																	query = qfQueryC.GetQueryStringFromQuestion(quizID, i + 1, question, numDecimalPlacesForPoints);

																	conn.query(query + "; SELECT ID,QuestNum FROM QuizResultQuestion WHERE ID = LAST_INSERT_ID()")
																		.then((rows) => {

																			var questionID = rows[1][0].ID;
																			var questNum = rows[1][0].QuestNum;

																			var questionSaved;
																			if (question.hasOwnProperty("num")) {
																				for (var j = 0; j < quiz.questions.length; j++) {
																					if (quiz.questions[j].num === questNum) {
																						questionSaved = quiz.questions[j];
																						break;
																					}
																				}
																			}
																			else {
																				// for back-compatibility
																				questionSaved = quiz.questions[questNum - 1];
																			}

																			qfHelper.LogReqDebug(req, 'insert question row done, id=' + questionID + ", num=" + questNum);

																			query = qfQueryC.GetQueryStringForAllAnswers(questionSaved, questionID);

																			conn.query(query)
																				.then(async () => {

																					numQuestDone++;
																					//qfHelper.LogReq(req,'insert answers of question ' + numQuestDone + ' done');

																					if (numQuestDone === quiz.questions.length) {
																						// all done
																						qfHelper.LogReq(req, 'all answers row inserted');

																						// store the reports has it is viewed from examinee
																						try {
																							if (req.body.hasOwnProperty("report")) {
																								qfHelper.LogReqDebug(req, 'insert quiz report');
																								var report = {
																									ID: quizID,
																									report: req.body.report,
																									origin: req.body.origin,
																									charset: quiz.options.htmlCharset,
																									language: quiz.options.htmlLanguage,
																								};
																								var queryReport = qfQuery.GetQueryStringForInsertQuizResultReport(report);
																								await conn.query(queryReport);
																							}
																						}
																						catch (err) {
																							qfHelper.LogReqError(req, "error in inserting report : " + err);
																						}

																						var diffTime = new Date().getTime() - timeStart;
																						qfHelper.LogReqDebug(req, 'RES DIFFTIME (ms) : ' + diffTime);

																						qfHelper.HandleSuccessInTransaction(req, res, conn, { id: quizID, prevResults: numPreviousResults });
																					}
																				})
																				.catch(err => {
																					qfHelper.HandleErrorInTransaction(req, res, conn, 'error in inserting answers of question ' + (i + 1), err);
																				});
																		})
																		.catch(err => {
																			qfHelper.HandleErrorInTransaction(req, res, conn, 'error in inserting question ' + (i + 1), err);
																		});
																}
															}
														})
														.catch(err => {
															qfHelper.HandleErrorInTransaction(req, res, conn, 'error in get quiz result id', err);
														});
												})
												.catch(err => {
													qfHelper.HandleErrorInTransaction(req, res, conn, 'error in inserting quiz row', err);
												});

										}).catch(err => {
											// start transaction failed
											qfHelper.CloseConnection(conn);
											qfHelper.SendInternalServerError(req, res, err, 'transaction not started');
										});
								})
								.catch(err => {
									// select failed
									qfHelper.CloseConnection(conn);
									qfHelper.SendInternalServerError(req, res, err, 'select failed');
								});
						}
						else {
							qfHelper.CloseConnection(conn);
							qfHelper.SendUnauthorized(req, res, "user not enabled");
						}
					})
					.catch(err => {
						// select failed
						qfHelper.CloseConnection(conn);
						qfHelper.SendInternalServerError(req, res, err, 'select failed');
					})

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
/// Get all the titles (and few other information) of the quizzes stored on database :
/// only the quizzes stored with all data, non only the results sent from users 
/// </summary>
router.get('/gettitles', [qfJwt.authenticateToken, urlencodedParser], function (req, res) {
	try {
		qfHelper.LogReqDebug(req, 'Get titles from quizzes');

		var limit = 0;
		var offset = 0;
		var orderby = "";
		var stateArray = [];
		var quizzes = [];
		var quiz;
		var moduleId = 0;

		if (req.query.hasOwnProperty("limit")) {
			limit = req.query.limit;
		}
		if (req.query.hasOwnProperty("offset")) {
			offset = req.query.offset;
		}
		if (req.query.hasOwnProperty("state")) {
			stateArray = JSON.parse(req.query.state);
			qfHelper.LogReq(req, 'filter by state, num of states ' + stateArray.length);
		}
		if (req.query.hasOwnProperty("orderby")) {
			orderby = req.query.orderby;
		}
		if (req.query.hasOwnProperty("moduleId")) {
			moduleId = req.query.moduleId;
		}

		qfDb.getPool().getConnection()
			.then(conn => {

				var queryUser = qfQuery.GetQueryStringSelectPersor(req.user.id);
				conn.query(queryUser)
					.then((rows) => {
						if ((rows.length === 1) && (rows[0].IsEnabled === 1)) {
							var role = rows[0].UserRole;
							if ((role === 1) || (role === 3) || (role === 4) || (role === 5) || ((role === 2) && (stateArray.length === 1) && (stateArray[0] === 10))) {
								var query = qfQueryC.GetQueryStringForGetTitles(limit, offset, orderby, moduleId, stateArray); // all the quiz titles
								conn.query(query)
									.then((rows) => {
										for (var i = 0; i < rows.length; i++) {
											var duration = 0;
											if (rows[i].Properties) {
												var properties = JSON.parse(rows[i].Properties);
												duration = properties.Duration;
											}
											quiz = new Quiz(
												rows[i].QZ_ID,
												rows[i].quizname,
												rows[i].Title,
												rows[i].Author,
												rows[i].Argument,
												rows[i].Season,
												rows[i].State,
												rows[i].Link,
												format(new Date(rows[i].DateCreated), 'dd/MM/yyyy HH:mm'),
												format(new Date(rows[i].DateModified), 'dd/MM/yyyy HH:mm'),
												duration
											);
											quiz.NumQuestions = rows[i].NumQuestions;
											quiz.TotalCount = rows[i].TotalCount;
											quiz.Audience = rows[i].Audience;
											quiz.StateDescr = rows[i].Description;

											quizzes.push(quiz);
										}

										qfHelper.SendJSON(req, res, quizzes);
									})
									.catch(err => {
										// select failed
										qfHelper.SendInternalServerError(req, res, err, 'select failed');
									})
							}
							else {
								qfHelper.SendUnauthorized(req, res, "user is not authorized");
							}
						}
						else {
							qfHelper.SendUnauthorized(req, res, "user not enabled");
						}
					}).catch(err => {
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
/// Update the session while the user answering to quiz
/// </summary>
router.post('/updatesession', qfJwt.authenticateToken, function (req, res) {
	try {
		const useSession = req.app.get('useSession');

		qfHelper.LogReqDebug(req, 'Update session');

		if (!req.body.hasOwnProperty("sessionId")) {
			qfHelper.SendBadRequest(req, res, "Missing session ID field");
			return;
		}
		if (!req.body.hasOwnProperty("sessionData")) {
			qfHelper.SendBadRequest(req, res, "Missing session data field");
			return;
		}

		if (useSession) {
			qfService.send({
				login: req.user.id,
				body: req.body
			});
		}
		else {
			qfHelper.LogReqWarn(req, "Session not enabled");
		}

		qfHelper.SendOK(req, res);
	}
	catch (err) {
		qfHelper.SendInternalServerError(req, res, err, 'exception');
	}
});

/// <summary>
/// Update the session before the user answering to quiz
/// </summary>
router.post('/updatesessionfirst', qfJwt.authenticateToken, function (req, res) {
	try {
		// body validation
		var sessionId;
		if (!req.body.hasOwnProperty("sessionId")) {
			qfHelper.SendBadRequest(req, res, "Missing session ID field");
			return;
		}
		sessionId = req.body.sessionId;

		var sessionData = null;
		if (req.body.hasOwnProperty("sessionData")) {
			sessionData = req.body.sessionData;
		}

		qfHelper.LogReqDebug(req, 'upd session for ' + req.user.id + " and ID " + sessionId);

		var timeStart = new Date().getTime();

		qfDb.getPool().getConnection()
			.then(conn => {

				var queryUser = qfQuery.GetQueryStringSelectPersor(req.user.id);
				conn.query(queryUser)
					.then(async (rows) => {
						if ((rows.length === 1) && (rows[0].IsEnabled === 1)) {
							var querySession;
							if (sessionData) {
								querySession = qfQuery.GetQueryStringUpdateDataSession(sessionId, JSON.stringify(sessionData));
							}
							else {
								querySession = qfQuery.GetQueryStringUpdateDataSession(sessionId, null);
							}
							conn.query(querySession)
								.then((data) => {
									//qfHelper.LogReq(req, 'Data : ' + JSON.stringify(data));

									var diffTime = new Date().getTime() - timeStart;
									qfHelper.LogReqDebug(req, 'DIFFTIME : ' + diffTime);
									qfHelper.SendOK(req, res);
								})
								.catch(err => {
									// select failed
									qfHelper.SendInternalServerError(req, res, err, 'update session failed');
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
/// Gets last session
/// </summary>
router.get('/getlastsession', qfJwt.authenticateToken, function (req, res) {
	try {
		qfHelper.LogReqDebug(req, 'Get last session');

		qfDb.getPool().getConnection()
			.then(conn => {
				var queryUser = qfQuery.GetQueryStringSelectPersor(req.user.id);
				conn.query(queryUser)
					.then(async (rows) => {
						if ((rows.length === 1) && (rows[0].IsEnabled === 1)) {
							var querySession = qfQueryC.GetQueryStringGetLastSessionForRecovery(rows[0].ID, req.query.sessionId);							
							conn.query(querySession)
								.then((rows) => {

									var rowsWithData = rows.filter(row => row.SessionData);
									if (rowsWithData.length > 0) {
										qfHelper.SendJSON(req, res, rowsWithData[0]);
									}
									else {
										qfHelper.SendNotFound(req, res, "no active sessions for user : " + req.user.id);
									}
								})
								.catch(err => {
									// select failed
									qfHelper.SendInternalServerError(req, res, err, 'select last session failed');
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


module.exports = router;