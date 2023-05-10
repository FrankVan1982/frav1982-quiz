//=========================================
// File name: recovery.js
//-----------------------------------------
// Project : QuizFaber 4.1.9
// Licence : GNU General Public License v3.0
// Author  : Luca Galli
// Email   : info@quizfaber.com
//-----------------------------------------
// Main functions for managing recovery of quizzes
//=========================================


function GetLastSession()
{
	$.ajax({
		url: options.saveQuizUrl + '/getlastsession',
		type: 'GET',
		headers: {
			Authorization: 'Bearer ' + quiz.currentUser.authToken
		},
		data: { sessionId: quiz.currentUser.sessionId },
		success: function (data, textStatus, jqXHR) {

			//if (jqXHR.status !== "204") {
			// exist an active session
			var lastSession = JSON.parse(data);
			if (lastSession.SessionData) {
				//PostSessionRecovery(lastSession);
				quiz.lastSessionId = lastSession.SessionID;
				StartQuizNow();
			}
			else {
				PostSessionFirst();
			}
			//}
		},
		error: function (xhr, textStatus, errorThrown) {
			if (xhr.status === 404) // not found, no active session
			{
				PostSessionFirst();
			}
			else {
				EnsureMessageBoxVisibility();
				PrintError('Server error : ' + xhr.status + (errorThrown ? (' - ' + errorThrown) : ''), 'I');
			}
		}
	});
}

function PostSessionFirst()
{
	var quizDuplicate = JSON.parse(JSON.stringify(quiz));
	delete quizDuplicate.currentUser;
	delete quizDuplicate.options; // in this step, opt is always null
	delete quizDuplicate.isQuizRecovered;

	var contentObj = {
		sessionId: quiz.currentUser.sessionId,
		sessionData: quizDuplicate
	};
	var content = JSON.stringify(contentObj);

	$.ajax({
		url: options.saveQuizUrl + '/updatesessionfirst',
		type: 'POST',
		data: content,
		contentType: "application/json",
		headers: {
			Authorization: 'Bearer ' + quiz.currentUser.authToken
		},
		complete: function (xhr, textStatus) {
			StartQuizNow();
		}
	});
}

function GetRecoverySession(questionIndex, questionTime)
{
	$.ajax({
		url: options.saveQuizUrl + '/getlastsession',
		type: 'GET',
		headers: {
			Authorization: 'Bearer ' + quiz.currentUser.authToken
		},
		data: { sessionId: quiz.currentUser.sessionId },
		success: function (data) {
			// exist an active session
			var lastSession = JSON.parse(data);
			PostSessionRecovery(lastSession, questionIndex, questionTime);
		},
		error: function (xhr, textStatus, errorThrown) {
			// failed to load the active session
			PrintGlobalWarning("Sessione non ripristinata");
			// starts the quiz anyway
			ContinuePageLoad(questionIndex, questionTime);			
		}
	});
}

function PostSessionRecovery(lastSession, questionIndex, questionTime)
{

	var contentObj = {
		sessionId: quiz.currentUser.sessionId,
		sessionData: JSON.parse(lastSession.SessionData)
	};
	var content = JSON.stringify(contentObj);

	$.ajax({
		url: options.saveQuizUrl + '/updatesessionfirst',
		type: 'POST',
		data: content,
		contentType: "application/json",
		headers: {
			Authorization: 'Bearer ' + quiz.currentUser.authToken
		},
		complete: function (xhr, textStatus) {
			ResetLastSessionData(lastSession, questionIndex, questionTime);
		}
	});
}

function ResetLastSessionData(lastSession, questionIndex, questionTime)
{
	var contentObj = {
		sessionId: lastSession.SessionID,
		sessionData: ''
	};
	var content = JSON.stringify(contentObj);

	$.ajax({
		url: options.saveQuizUrl + '/updatesessionfirst',
		type: 'POST',
		data: content,
		contentType: "application/json",
		headers: {
			Authorization: 'Bearer ' + quiz.currentUser.authToken
		},
		complete: function (xhr, textStatus) {
			ResumeQuiz(lastSession, questionIndex, questionTime);
		}
	});
}

function ResumeQuiz(lastSession, questionIndex, questionTime)
{
	var user = JSON.parse(JSON.stringify(quiz.currentUser)); // copy of user
	quiz = JSON.parse(lastSession.SessionData);
	quiz.currentUser = user;
	quiz.isQuizRecovered = true;
	quiz.lastSessionId = null;
	//quiz.recoveryDeltaTime += ComputeRecoveryTime(lastSession.DateLastUpdate);  // += because more than recoveries can happen

	//GoFirstPage('./pages/');
	ContinuePageLoad(questionIndex, questionTime);
}

//function ComputeRecoveryTime(dateLastUpdate)
//{
//	var recoveryDate = new Date(dateLastUpdate);
//	var nowDate = new Date();

//	return Math.floor((nowDate.getTime() - recoveryDate.getTime()) / 1000);
//}